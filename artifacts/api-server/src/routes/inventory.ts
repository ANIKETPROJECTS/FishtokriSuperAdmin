import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { SubHub } from "../db/models/sub-hub.js";
import { SuperHub } from "../db/models/super-hub.js";
import { getSubHubDbConnection } from "../db/sub-hub-connections.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();
router.use(requireAuth as any);

const MOVEMENTS_COLLECTION = "inventory_movements";
const ADJUSTMENTS_COLLECTION = "inventory_adjustments";

function toId(id: string) {
  try { return new mongoose.Types.ObjectId(id); } catch { return null; }
}

async function getCtx(subHubId: string, res: any) {
  const sub = await SubHub.findById(subHubId);
  if (!sub) { res.status(404).json({ error: "NotFound", message: "Sub hub not found" }); return null; }
  if (!sub.dbName) { res.status(400).json({ error: "NoDB", message: "Sub hub has no database linked" }); return null; }
  const conn = await getSubHubDbConnection(sub.dbName);
  return { sub, conn };
}

// ─── PRODUCT LIST (for selected sub-hub) ──────────────────────────────────────
router.get("/products", async (req, res) => {
  try {
    const subHubId = String(req.query.subHubId || "");
    if (!subHubId) { res.status(400).json({ error: "ValidationError", message: "subHubId is required" }); return; }
    const ctx = await getCtx(subHubId, res);
    if (!ctx) return;
    const search = String(req.query.search || "");
    const query: any = search ? { name: { $regex: search, $options: "i" } } : {};
    const products = await ctx.conn.db.collection("products").find(query).sort({ category: 1, name: 1 }).toArray();
    res.json({
      products: products.map((p: any) => ({
        id: String(p._id),
        name: p.name,
        category: p.category ?? "",
        subCategory: p.subCategory ?? "",
        unit: p.unit ?? "",
        price: Number(p.price) || 0,
        quantity: Number(p.quantity) || 0,
        status: p.status ?? "available",
        imageUrl: p.imageUrl ?? "",
      })),
      total: products.length,
      subHub: { id: String(ctx.sub._id), name: ctx.sub.name, dbName: ctx.sub.dbName },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list inventory products");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch products" });
  }
});

// ─── MOVEMENT HISTORY ─────────────────────────────────────────────────────────
router.get("/movements", async (req, res) => {
  try {
    const subHubId = String(req.query.subHubId || "");
    if (!subHubId) { res.status(400).json({ error: "ValidationError", message: "subHubId is required" }); return; }
    const ctx = await getCtx(subHubId, res);
    if (!ctx) return;
    const productId = String(req.query.productId || "");
    const orderId = String(req.query.orderId || "");
    const type = String(req.query.type || "");
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const filter: any = {};
    if (productId) filter.productId = productId;
    if (orderId) filter.orderId = orderId;
    if (type) filter.type = type;
    const rows = await ctx.conn.db
      .collection(MOVEMENTS_COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    res.json({ movements: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "Failed to list inventory movements");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch movements" });
  }
});

// ─── ADJUSTMENTS ──────────────────────────────────────────────────────────────
router.get("/adjustments", async (req, res) => {
  try {
    const subHubId = String(req.query.subHubId || "");
    if (!subHubId) { res.status(400).json({ error: "ValidationError", message: "subHubId is required" }); return; }
    const ctx = await getCtx(subHubId, res);
    if (!ctx) return;
    const rows = await ctx.conn.db
      .collection(ADJUSTMENTS_COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
    res.json({ adjustments: rows, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "Failed to list inventory adjustments");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch adjustments" });
  }
});

router.post("/adjustments", async (req, res) => {
  try {
    const { subHubId, superHubId, date, reason, notes, items } = req.body ?? {};
    if (!subHubId) { res.status(400).json({ error: "ValidationError", message: "subHubId is required" }); return; }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "ValidationError", message: "At least one item is required" }); return;
    }
    if (!reason || !String(reason).trim()) {
      res.status(400).json({ error: "ValidationError", message: "Reason is required" }); return;
    }
    const ctx = await getCtx(subHubId, res);
    if (!ctx) return;

    const superHub = superHubId ? await SuperHub.findById(superHubId) : null;
    const products = ctx.conn.db.collection("products");
    const movements = ctx.conn.db.collection(MOVEMENTS_COLLECTION);

    const adjustmentItems: any[] = [];
    const movementDocs: any[] = [];
    const now = new Date();

    for (const it of items) {
      const pid = toId(String(it.productId || ""));
      if (!pid) continue;
      const existing = await products.findOne({ _id: pid });
      if (!existing) continue;
      const before = Number(existing.quantity) || 0;
      const newQty = Number(it.newQuantity);
      if (!Number.isFinite(newQty)) continue;
      const delta = newQty - before;
      if (delta === 0 && !it.force) {
        adjustmentItems.push({
          productId: String(pid),
          productName: existing.name,
          unit: existing.unit ?? "",
          quantityBefore: before,
          newQuantity: newQty,
          quantityAdjusted: 0,
        });
        continue;
      }
      await products.updateOne({ _id: pid }, { $set: { quantity: newQty, updatedAt: now } });
      adjustmentItems.push({
        productId: String(pid),
        productName: existing.name,
        unit: existing.unit ?? "",
        quantityBefore: before,
        newQuantity: newQty,
        quantityAdjusted: delta,
      });
      movementDocs.push({
        type: "adjustment",
        productId: String(pid),
        productName: existing.name,
        unit: existing.unit ?? "",
        change: delta,
        balance: newQty,
        reason: String(reason).trim(),
        notes: notes ? String(notes).trim() : "",
        createdAt: now,
      });
    }

    if (adjustmentItems.length === 0) {
      res.status(400).json({ error: "ValidationError", message: "No valid items to adjust" }); return;
    }

    if (movementDocs.length > 0) await movements.insertMany(movementDocs);

    const adjustmentDoc = {
      date: date ? new Date(date) : now,
      reason: String(reason).trim(),
      notes: notes ? String(notes).trim() : "",
      subHubId: String(ctx.sub._id),
      subHubName: ctx.sub.name,
      superHubId: superHub ? String(superHub._id) : "",
      superHubName: superHub?.name ?? "",
      items: adjustmentItems,
      createdAt: now,
    };
    const result = await ctx.conn.db.collection(ADJUSTMENTS_COLLECTION).insertOne(adjustmentDoc);
    res.status(201).json({ adjustment: { ...adjustmentDoc, _id: result.insertedId } });
  } catch (err) {
    req.log.error({ err }, "Failed to create inventory adjustment");
    res.status(500).json({ error: "InternalError", message: "Failed to save adjustment" });
  }
});

// ─── ORDER SYNC HELPERS (used by orders.ts) ───────────────────────────────────
type OrderForSync = {
  _id: any;
  subHubId?: string;
  subHubName?: string;
  status?: string;
  items?: Array<{ productId?: string; name?: string; quantity?: number; unit?: string }>;
};

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "preparing", "out_for_delivery", "delivered"]);

function orderShouldDeduct(order: OrderForSync) {
  if (!order || !order.subHubId) return false;
  const status = String(order.status ?? "").toLowerCase();
  return ACTIVE_STATUSES.has(status);
}

async function applyDelta(order: OrderForSync, direction: "deduct" | "restore") {
  if (!order.subHubId) return;
  const sub = await SubHub.findById(order.subHubId);
  if (!sub?.dbName) return;
  const conn = await getSubHubDbConnection(sub.dbName);
  const products = conn.db.collection("products");
  const movements = conn.db.collection(MOVEMENTS_COLLECTION);
  const now = new Date();
  const orderId = String(order._id);
  const orderRef = `#${orderId.slice(-6).toUpperCase()}`;
  const items = Array.isArray(order.items) ? order.items : [];

  for (const it of items) {
    if (!it.productId) continue;
    const pid = toId(String(it.productId));
    if (!pid) continue;
    const qty = Math.max(0, Number(it.quantity) || 0);
    if (qty <= 0) continue;
    const change = direction === "deduct" ? -qty : qty;
    const updated = await products.findOneAndUpdate(
      { _id: pid },
      { $inc: { quantity: change }, $set: { updatedAt: now } },
      { returnDocument: "after" }
    );
    if (!updated) continue;
    await movements.insertOne({
      type: direction === "deduct" ? "order_deduct" : "order_restore",
      productId: String(pid),
      productName: (updated as any).name ?? it.name ?? "",
      unit: (updated as any).unit ?? it.unit ?? "",
      change,
      balance: Number((updated as any).quantity) || 0,
      orderId,
      orderRef,
      createdAt: now,
    });
  }
}

export async function applyOrderInventoryOnCreate(order: OrderForSync) {
  if (!orderShouldDeduct(order)) return false;
  await applyDelta(order, "deduct");
  return true;
}

export async function applyOrderInventoryOnDelete(order: OrderForSync, wasDeducted: boolean) {
  if (!wasDeducted) return false;
  if (!order?.subHubId) return false;
  await applyDelta(order, "restore");
  return true;
}

export async function applyOrderInventoryOnUpdate(prev: OrderForSync, next: OrderForSync, wasDeducted: boolean) {
  const wantsDeducted = orderShouldDeduct(next);
  if (wasDeducted === wantsDeducted) return wasDeducted;
  if (!wasDeducted && wantsDeducted) {
    await applyDelta(next, "deduct");
    return true;
  }
  if (wasDeducted && !wantsDeducted) {
    // Restore using the previous items snapshot (in case items changed)
    await applyDelta({ ...prev, _id: next._id }, "restore");
    return false;
  }
  return wasDeducted;
}

export default router;
