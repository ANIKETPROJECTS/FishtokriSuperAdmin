import { Router } from "express";
import mongoose from "mongoose";
import { getSubHubDbConnection } from "../db/sub-hub-connections.js";

const router = Router();

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
