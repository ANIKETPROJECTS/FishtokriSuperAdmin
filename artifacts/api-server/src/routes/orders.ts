import { Router } from "express";
import mongoose from "mongoose";
import { getSubHubDbConnection } from "../db/sub-hub-connections.js";
import { getCustomersConnection } from "../db/customers-connection.js";
import { syncOrderBankPayments } from "./banking.js";
import {
  applyOrderInventoryOnCreate,
  applyOrderInventoryOnUpdate,
  applyOrderInventoryOnDelete,
} from "./inventory.js";

const router = Router();

async function getCustomersCollection() {
  const conn = await getCustomersConnection();
  return conn.db.collection("customers");
}

const ORDERS_DB = "orders";
const COLLECTION = "orders";

async function getOrdersDb() {
  return getSubHubDbConnection(ORDERS_DB);
}

function toId(id: string): mongoose.mongo.BSON.ObjectId | null {
  try { return new mongoose.mongo.ObjectId(id); } catch { return null; }
}

// GET /api/orders — list with search, filter, sort, pagination
router.get("/", async (req, res) => {
  try {
    const conn = await getOrdersDb();
    const db = conn.db;

    const {
      q = "",
      status = "",
      deliveryType = "",
      tab = "",
      sort = "createdAt",
      order = "desc",
      page = "1",
      limit = "20",
      from = "",
      to = "",
      assignedTo = "",
    } = req.query as Record<string, string>;

    const filter: any = {};

    if (q) {
      const re = { $regex: q, $options: "i" };
      const orClauses: any[] = [
        { customerName: re },
        { phone: re },
        { deliveryArea: re },
        { address: re },
        { "items.name": re },
      ];
      // Match by order id — full ObjectId or trailing fragment (case-insensitive,
      // hex-only). Reference shown in UI is `#<last6>` from the _id, so support
      // partial hex matches too.
      const hex = q.replace(/^#/, "").toLowerCase();
      if (/^[0-9a-f]+$/.test(hex)) {
        if (hex.length === 24) {
          const oid = toId(hex);
          if (oid) orClauses.push({ _id: oid });
        } else {
          // Match any _id whose hex string ends with the query fragment.
          orClauses.push({
            $expr: {
              $regexMatch: {
                input: { $toString: "$_id" },
                regex: `${hex}$`,
                options: "i",
              },
            },
          });
        }
      }
      filter.$or = orClauses;
    }

    // Tab semantics: takeaway-deliveryType orders are always treated as completed (History).
    // - "current": active statuses AND deliveryType != takeaway
    // - "history": history statuses OR deliveryType == takeaway
    const ACTIVE = ["pending", "confirmed", "preparing", "out_for_delivery"];
    const HISTORY = ["delivered", "cancelled"];

    const statusList = status
      ? status.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    if (tab === "current") {
      const list = statusList.length ? statusList.filter((s) => ACTIVE.includes(s)) : ACTIVE;
      filter.status = { $in: list };
      filter.deliveryType = { $ne: "takeaway" };
    } else if (tab === "history") {
      const list = statusList.length ? statusList.filter((s) => HISTORY.includes(s)) : HISTORY;
      filter.$or = [
        ...(filter.$or ?? []).map((c: any) => ({ ...c })),
      ];
      const historyClause = { $or: [{ status: { $in: list } }, { deliveryType: "takeaway" }] };
      if (filter.$or && filter.$or.length) {
        filter.$and = [{ $or: filter.$or }, historyClause];
        delete filter.$or;
      } else {
        Object.assign(filter, historyClause);
      }
    } else if (statusList.length) {
      filter.status = statusList.length === 1 ? statusList[0] : { $in: statusList };
    }
    if (deliveryType) filter.deliveryType = deliveryType;
    if (assignedTo) filter.assignedDeliveryPersonId = assignedTo;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const sortDir = order === "asc" ? 1 : -1;
    const sortObj: any = {};
    const allowedSorts = ["createdAt", "customerName", "status"];
    sortObj[allowedSorts.includes(sort) ? sort : "createdAt"] = sortDir;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      db.collection(COLLECTION).find(filter).sort(sortObj).skip(skip).limit(limitNum).toArray(),
      db.collection(COLLECTION).countDocuments(filter),
    ]);

    res.json({ orders, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    req.log.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch orders" });
  }
});

// GET /api/orders/stats — summary counts per status
router.get("/stats", async (req, res) => {
  try {
    const conn = await getOrdersDb();
    const agg = await conn.db.collection(COLLECTION).aggregate([
      { $group: { _id: { status: "$status", deliveryType: "$deliveryType" }, count: { $sum: 1 } } },
    ]).toArray();

    const ACTIVE = ["pending", "confirmed", "preparing", "out_for_delivery"];
    const HISTORY = ["delivered", "cancelled"];

    // Raw per-status counts (used by some legacy callers).
    const rawStats: Record<string, number> = {};
    // Display stats: takeaway-deliveryType orders are bucketed under "takeaway",
    // not under their underlying status. Delivered/cancelled keep their status.
    const stats: Record<string, number> = {};
    let takeawayActive = 0;
    let takeawayHistory = 0;

    for (const row of agg) {
      const st = row._id?.status ?? "unknown";
      const dt = row._id?.deliveryType ?? "delivery";
      const c = row.count ?? 0;
      rawStats[st] = (rawStats[st] ?? 0) + c;
      if (dt === "takeaway") {
        if (HISTORY.includes(st)) {
          takeawayHistory += c;
        } else {
          takeawayActive += c;
        }
      } else {
        stats[st] = (stats[st] ?? 0) + c;
      }
    }
    stats.takeaway = takeawayActive + takeawayHistory;

    const total = Object.values(rawStats).reduce((a, b) => a + b, 0);
    const currentTotal = ACTIVE.reduce((s, k) => s + (stats[k] ?? 0), 0);
    const historyTotal = HISTORY.reduce((s, k) => s + (stats[k] ?? 0), 0) + takeawayActive + takeawayHistory;

    res.json({ stats, rawStats, total, currentTotal, historyTotal });
  } catch (err) {
    req.log.error({ err }, "Failed to get order stats");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch order stats" });
  }
});

// POST /api/orders — create new order manually (admin)
router.post("/", async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      phone,
      email,
      items,
      deliveryType,
      address,
      deliveryArea,
      notes,
      status,
      subHubId,
      subHubName,
      superHubId,
      superHubName,
      createCustomerIfMissing,
      newCustomerExtras,
      deliveryAddressDetail,
      subtotal,
      discount,
      slotCharge,
      total: totalIn,
      couponId,
      couponCode,
      couponTitle,
      couponIds,
      couponCodes,
      coupons,
      paymentStatus,
      payments,
      paidAmount,
      paymentMode,
      scheduleType,
      deliveryDate,
      timeslotId,
      timeslotLabel,
      timeslotStart,
      timeslotEnd,
    } = req.body ?? {};

    if (!customerName || !String(customerName).trim()) {
      res.status(400).json({ error: "ValidationError", message: "Customer name is required" });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "ValidationError", message: "At least one item is required" });
      return;
    }
    const dt = deliveryType === "takeaway" ? "takeaway" : "delivery";
    if (dt === "delivery" && !String(address ?? "").trim()) {
      res.status(400).json({ error: "ValidationError", message: "Delivery address is required" });
      return;
    }

    const cleanItems = items.map((it: any) => ({
      productId: it.productId ? String(it.productId) : undefined,
      name: String(it.name ?? "").trim(),
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      unit: it.unit ?? "",
    })).filter((it: any) => it.name);

    if (cleanItems.length === 0) {
      res.status(400).json({ error: "ValidationError", message: "Items must have a name" });
      return;
    }

    let resolvedCustomerId: string | undefined = customerId ? String(customerId) : undefined;

    // Optionally create customer if missing
    if (!resolvedCustomerId && createCustomerIfMissing && (email || phone)) {
      const cCol = await getCustomersCollection();
      const existing = email
        ? await cCol.findOne({ email: String(email).toLowerCase().trim() })
        : await cCol.findOne({ phone: String(phone).trim() });
      if (existing) {
        resolvedCustomerId = String(existing._id);
      } else {
        const extras = (newCustomerExtras && typeof newCustomerExtras === "object") ? newCustomerExtras : {};
        const firstAddress =
          dt === "delivery" && deliveryAddressDetail && typeof deliveryAddressDetail === "object"
            ? { label: "Home", ...deliveryAddressDetail }
            : dt === "delivery" && address
              ? { label: "Home", address: String(address).trim(), area: deliveryArea ?? "" }
              : null;
        const newCustomer = {
          name: String(customerName).trim(),
          email: email ? String(email).toLowerCase().trim() : "",
          phone: phone ? String(phone).trim() : "",
          alternatePhone: extras.alternatePhone ? String(extras.alternatePhone).trim() : "",
          dateOfBirth: extras.dateOfBirth ? String(extras.dateOfBirth).trim() : "",
          gender: extras.gender ? String(extras.gender).trim() : "",
          notes: extras.notes ? String(extras.notes).trim() : "",
          addresses: firstAddress ? [firstAddress] : [],
          orders: [],
          usedCoupons: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const insert = await cCol.insertOne(newCustomer as any);
        resolvedCustomerId = String(insert.insertedId);
      }
    }

    const computedSubtotal = cleanItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    const sub = Number(subtotal);
    const subTotalNum = Number.isFinite(sub) && sub > 0 ? sub : computedSubtotal;
    const discountNum = Math.max(0, Number(discount) || 0);
    const slotChargeNum = Math.max(0, Number(slotCharge) || 0);
    const totalNum = Number.isFinite(Number(totalIn)) && Number(totalIn) > 0
      ? Number(totalIn)
      : Math.max(0, subTotalNum - discountNum + slotChargeNum);

    const orderDoc: any = {
      customerId: resolvedCustomerId ?? undefined,
      customerName: String(customerName).trim(),
      phone: phone ? String(phone).trim() : "",
      email: email ? String(email).trim() : "",
      items: cleanItems,
      subtotal: subTotalNum,
      discount: discountNum,
      slotCharge: slotChargeNum,
      total: totalNum,
      deliveryType: dt,
      address: dt === "delivery" ? String(address ?? "").trim() : "",
      deliveryArea: dt === "delivery" ? String(deliveryArea ?? "").trim() : "",
      deliveryAddressDetail: dt === "delivery" && deliveryAddressDetail ? deliveryAddressDetail : undefined,
      pickupLocation: dt === "takeaway" ? (subHubName || "FishTokri Store") : "",
      notes: notes ? String(notes).trim() : "",
      status: status || "pending",
      source: "admin_manual",
      subHubId: subHubId ? String(subHubId) : undefined,
      subHubName: subHubName ?? undefined,
      superHubId: superHubId ? String(superHubId) : undefined,
      superHubName: superHubName ?? undefined,
      // Coupons (single + multi)
      couponId: couponId ? String(couponId) : undefined,
      couponCode: couponCode ?? undefined,
      couponTitle: couponTitle ?? undefined,
      couponIds: Array.isArray(couponIds) ? couponIds.map((x: any) => String(x)) : undefined,
      couponCodes: Array.isArray(couponCodes) ? couponCodes.map((x: any) => String(x)) : undefined,
      coupons: Array.isArray(coupons) ? coupons : undefined,
      // Payment
      paymentStatus: ["paid", "partial", "unpaid"].includes(String(paymentStatus))
        ? String(paymentStatus)
        : "unpaid",
      payments: Array.isArray(payments)
        ? payments
            .map((p: any) => ({
              mode: String(p?.mode ?? "").trim(),
              amount: Math.max(0, Number(p?.amount) || 0),
              reference: p?.reference ? String(p.reference).trim() : "",
              paidAt: p?.paidAt ? new Date(p.paidAt) : new Date(),
            }))
            .filter((p: any) => p.mode && p.amount > 0)
        : [],
      paidAmount: Math.max(0, Number(paidAmount) || 0),
      dueAmount: Math.max(0, totalNum - (Number(paidAmount) || 0)),
      paymentMode: paymentMode ? String(paymentMode) : undefined,
      // Schedule
      scheduleType: scheduleType === "instant" ? "instant" : "slot",
      deliveryDate: deliveryDate ? String(deliveryDate) : undefined,
      timeslotId: timeslotId ? String(timeslotId) : undefined,
      timeslotLabel: timeslotLabel ?? undefined,
      timeslotStart: timeslotStart ?? undefined,
      timeslotEnd: timeslotEnd ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    Object.keys(orderDoc).forEach((k) => orderDoc[k] === undefined && delete orderDoc[k]);

    const conn = await getOrdersDb();
    const result = await conn.db.collection(COLLECTION).insertOne(orderDoc);

    // Sync inventory (deduct stock for active orders).
    try {
      const deducted = await applyOrderInventoryOnCreate({
        _id: result.insertedId,
        subHubId: orderDoc.subHubId,
        subHubName: orderDoc.subHubName,
        status: orderDoc.status,
        items: orderDoc.items,
      });
      if (deducted) {
        await conn.db.collection(COLLECTION).updateOne(
          { _id: result.insertedId },
          { $set: { inventoryDeducted: true } }
        );
        orderDoc.inventoryDeducted = true;
      }
    } catch (e) {
      req.log.error({ err: e }, "Failed to sync inventory on order create");
    }

    // Mirror order payments into banking ▸ payments so the ledger stays in sync.
    if (Array.isArray(orderDoc.payments) && orderDoc.payments.length > 0) {
      try {
        await syncOrderBankPayments({
          orderId: String(result.insertedId),
          customerName: orderDoc.customerName,
          payments: orderDoc.payments,
          orderRef: `#${String(result.insertedId).slice(-6).toUpperCase()}`,
        });
      } catch (e) {
        req.log.error({ err: e }, "Failed to sync order payments to banking");
      }
    }

    res.status(201).json({ order: { ...orderDoc, _id: result.insertedId } });
  } catch (err) {
    req.log.error({ err }, "Failed to create order");
    res.status(500).json({ error: "InternalError", message: "Failed to create order" });
  }
});

// GET /api/orders/:id — single order
router.get("/:id", async (req, res) => {
  try {
    const oid = toId(req.params.id);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid order ID" }); return; }
    const conn = await getOrdersDb();
    const order = await conn.db.collection(COLLECTION).findOne({ _id: oid });
    if (!order) { res.status(404).json({ error: "NotFound", message: "Order not found" }); return; }
    res.json({ order });
  } catch (err) {
    req.log.error({ err }, "Failed to get order");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch order" });
  }
});

// PUT /api/orders/:id — update status / notes / customer info
router.put("/:id", async (req, res) => {
  try {
    const oid = toId(req.params.id);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid order ID" }); return; }
    const {
      status, notes,
      assignedDeliveryPersonId, assignedDeliveryPersonName,
      customerName, phone, email, address, deliveryArea, deliveryAddressDetail,
      paymentStatus, payments, paidAmount, paymentMode,
      items, deliveryType,
      superHubId, superHubName, subHubId, subHubName,
      scheduleType, deliveryDate, timeslotId, timeslotLabel, timeslotStart, timeslotEnd,
      couponId, couponCode, couponTitle, couponIds, couponCodes, coupons,
      subtotal, discount, slotCharge, total,
    } = req.body;
    const update: any = { updatedAt: new Date() };
    if (status !== undefined) update.status = status;
    if (notes !== undefined) update.notes = notes;
    if (assignedDeliveryPersonId !== undefined) update.assignedDeliveryPersonId = assignedDeliveryPersonId;
    if (assignedDeliveryPersonName !== undefined) update.assignedDeliveryPersonName = assignedDeliveryPersonName;
    if (customerName !== undefined) update.customerName = customerName;
    if (phone !== undefined) update.phone = phone;
    if (email !== undefined) update.email = email;
    if (address !== undefined) update.address = address;
    if (deliveryArea !== undefined) update.deliveryArea = deliveryArea;
    if (deliveryAddressDetail !== undefined) update.deliveryAddressDetail = deliveryAddressDetail;
    if (deliveryType !== undefined) update.deliveryType = deliveryType;
    if (superHubId !== undefined) update.superHubId = superHubId;
    if (superHubName !== undefined) update.superHubName = superHubName;
    if (subHubId !== undefined) update.subHubId = subHubId;
    if (subHubName !== undefined) update.subHubName = subHubName;
    if (scheduleType !== undefined) update.scheduleType = scheduleType;
    if (deliveryDate !== undefined) update.deliveryDate = deliveryDate;
    if (timeslotId !== undefined) update.timeslotId = timeslotId;
    if (timeslotLabel !== undefined) update.timeslotLabel = timeslotLabel;
    if (timeslotStart !== undefined) update.timeslotStart = timeslotStart;
    if (timeslotEnd !== undefined) update.timeslotEnd = timeslotEnd;
    if (couponId !== undefined) update.couponId = couponId;
    if (couponCode !== undefined) update.couponCode = couponCode;
    if (couponTitle !== undefined) update.couponTitle = couponTitle;
    if (Array.isArray(couponIds)) update.couponIds = couponIds;
    if (Array.isArray(couponCodes)) update.couponCodes = couponCodes;
    if (Array.isArray(coupons)) update.coupons = coupons;
    if (subtotal !== undefined) update.subtotal = Number(subtotal) || 0;
    if (discount !== undefined) update.discount = Number(discount) || 0;
    if (slotCharge !== undefined) update.slotCharge = Number(slotCharge) || 0;
    if (total !== undefined) update.total = Number(total) || 0;
    if (Array.isArray(items)) {
      update.items = items.map((it: any) => ({
        productId: it?.productId ? String(it.productId) : undefined,
        name: String(it?.name ?? "").trim(),
        price: Number(it?.price) || 0,
        quantity: Number(it?.quantity) || 0,
        unit: String(it?.unit ?? "").trim(),
      })).filter((it: any) => it.name && it.quantity > 0);
    }

    if (paymentStatus !== undefined && ["paid", "partial", "unpaid"].includes(String(paymentStatus))) {
      update.paymentStatus = String(paymentStatus);
    }
    if (paymentMode !== undefined) update.paymentMode = paymentMode ? String(paymentMode) : "";
    if (Array.isArray(payments)) {
      update.payments = payments
        .map((p: any) => ({
          mode: String(p?.mode ?? "").trim(),
          amount: Math.max(0, Number(p?.amount) || 0),
          reference: p?.reference ? String(p.reference).trim() : "",
          paidAt: p?.paidAt ? new Date(p.paidAt) : new Date(),
        }))
        .filter((p: any) => p.mode && p.amount > 0);
    }
    if (paidAmount !== undefined) {
      const paidNum = Math.max(0, Number(paidAmount) || 0);
      update.paidAmount = paidNum;
      // recompute due against existing total (fall back to items sum for legacy orders)
      const conn0 = await getOrdersDb();
      const existing = await conn0.db.collection(COLLECTION).findOne(
        { _id: oid },
        { projection: { total: 1, items: 1 } }
      );
      let totalNum = Number(existing?.total) || 0;
      if (totalNum <= 0 && Array.isArray(existing?.items)) {
        totalNum = existing.items.reduce(
          (s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1),
          0
        );
        update.total = totalNum;
      }
      update.dueAmount = Math.max(0, totalNum - paidNum);
    }
    const conn = await getOrdersDb();
    const prev = await conn.db.collection(COLLECTION).findOne({ _id: oid });
    if (!prev) { res.status(404).json({ error: "NotFound", message: "Order not found" }); return; }
    const result = await conn.db.collection(COLLECTION).findOneAndUpdate(
      { _id: oid },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!result) { res.status(404).json({ error: "NotFound", message: "Order not found" }); return; }

    // Sync inventory if status transitioned between active/cancelled.
    try {
      const wasDeducted = (prev as any).inventoryDeducted === true;
      const nowDeducted = await applyOrderInventoryOnUpdate(
        prev as any,
        result as any,
        wasDeducted,
      );
      if (wasDeducted !== nowDeducted) {
        await conn.db.collection(COLLECTION).updateOne(
          { _id: oid },
          { $set: { inventoryDeducted: nowDeducted } }
        );
        (result as any).inventoryDeducted = nowDeducted;
      }
    } catch (e) {
      req.log.error({ err: e }, "Failed to sync inventory on order update");
    }

    // If the payments list was touched, re-sync this order's banking payments.
    if (Array.isArray(payments)) {
      try {
        await syncOrderBankPayments({
          orderId: String((result as any)._id),
          customerName: (result as any).customerName,
          payments: (result as any).payments || [],
          orderRef: `#${String((result as any)._id).slice(-6).toUpperCase()}`,
        });
      } catch (e) {
        req.log.error({ err: e }, "Failed to sync order payments to banking");
      }
    }

    res.json({ order: result });
  } catch (err) {
    req.log.error({ err }, "Failed to update order");
    res.status(500).json({ error: "InternalError", message: "Failed to update order" });
  }
});

// DELETE /api/orders/:id — delete an order
router.delete("/:id", async (req, res) => {
  try {
    const oid = toId(req.params.id);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid order ID" }); return; }
    const conn = await getOrdersDb();
    req.log.info({ id: req.params.id, oid: oid.toHexString() }, "Attempting to delete order");
    const existing = await conn.db.collection(COLLECTION).findOne({ _id: oid });
    if (!existing) { res.status(404).json({ error: "NotFound", message: "Order not found" }); return; }
    const result = await conn.db.collection(COLLECTION).deleteOne({ _id: oid });
    req.log.info({ deletedCount: result.deletedCount }, "Delete result");
    if (result.deletedCount === 0) { res.status(404).json({ error: "NotFound", message: "Order not found" }); return; }

    // Restore inventory for any deducted items.
    try {
      await applyOrderInventoryOnDelete(existing as any, (existing as any).inventoryDeducted === true);
    } catch (e) {
      req.log.error({ err: e }, "Failed to restore inventory on order delete");
    }

    try {
      await syncOrderBankPayments({ orderId: req.params.id, payments: [] });
    } catch (e) {
      req.log.error({ err: e }, "Failed to remove order payments from banking");
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete order");
    res.status(500).json({ error: "InternalError", message: "Failed to delete order" });
  }
});

export default router;
