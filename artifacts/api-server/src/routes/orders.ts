import { Router } from "express";
import mongoose from "mongoose";
import { getSubHubDbConnection } from "../db/sub-hub-connections.js";
import { getCustomersConnection } from "../db/customers-connection.js";

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
      filter.$or = [
        { customerName: re },
        { phone: re },
        { deliveryArea: re },
        { address: re },
        { "items.name": re },
      ];
    }

    if (status) {
      const statuses = status.split(",").map((s: string) => s.trim()).filter(Boolean);
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
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
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray();

    const stats: Record<string, number> = {};
    for (const row of agg) stats[row._id ?? "unknown"] = row.count;

    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    res.json({ stats, total });
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
      // Coupon
      couponId: couponId ? String(couponId) : undefined,
      couponCode: couponCode ?? undefined,
      couponTitle: couponTitle ?? undefined,
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
      customerName, phone, address, deliveryArea,
    } = req.body;
    const update: any = { updatedAt: new Date() };
    if (status !== undefined) update.status = status;
    if (notes !== undefined) update.notes = notes;
    if (assignedDeliveryPersonId !== undefined) update.assignedDeliveryPersonId = assignedDeliveryPersonId;
    if (assignedDeliveryPersonName !== undefined) update.assignedDeliveryPersonName = assignedDeliveryPersonName;
    if (customerName !== undefined) update.customerName = customerName;
    if (phone !== undefined) update.phone = phone;
    if (address !== undefined) update.address = address;
    if (deliveryArea !== undefined) update.deliveryArea = deliveryArea;
    const conn = await getOrdersDb();
    const result = await conn.db.collection(COLLECTION).findOneAndUpdate(
      { _id: oid },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!result) { res.status(404).json({ error: "NotFound", message: "Order not found" }); return; }
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
    const result = await conn.db.collection(COLLECTION).deleteOne({ _id: oid });
    req.log.info({ deletedCount: result.deletedCount }, "Delete result");
    if (result.deletedCount === 0) { res.status(404).json({ error: "NotFound", message: "Order not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete order");
    res.status(500).json({ error: "InternalError", message: "Failed to delete order" });
  }
});

export default router;
