import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { SubHub } from "../db/models/sub-hub.js";
import { getSubHubDbConnection } from "../db/sub-hub-connections.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router({ mergeParams: true });
router.use(requireAuth as any);

async function getSubHubDb(subHubId: string, res: any) {
  const sub = await SubHub.findById(subHubId);
  if (!sub) {
    res.status(404).json({ error: "NotFound", message: "Sub hub not found" });
    return null;
  }
  if (!sub.dbName) {
    res.status(400).json({ error: "NoDB", message: "This sub hub has no database linked. Edit the sub hub and set a database name." });
    return null;
  }
  const conn = await getSubHubDbConnection(sub.dbName);
  return { sub, conn };
}

function toId(id: string) {
  try { return new mongoose.Types.ObjectId(id); } catch { return null; }
}

router.get("/stats", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const db = ctx.conn.db;
    const [products, categories, coupons, orders] = await Promise.all([
      db.collection("products").countDocuments(),
      db.collection("categories").countDocuments(),
      db.collection("coupons").countDocuments(),
      db.collection("orders").countDocuments(),
    ]);
    res.json({ stats: { products, categories, coupons, orders, dbName: ctx.sub.dbName } });
  } catch (err) {
    req.log.error({ err }, "Failed to get sub hub menu stats");
    res.status(500).json({ error: "InternalError", message: "Failed to get stats" });
  }
});

router.get("/products", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const search = String(req.query.search || "");
    const query: any = search ? { name: { $regex: search, $options: "i" } } : {};
    const products = await ctx.conn.db.collection("products").find(query).sort({ name: 1 }).toArray();
    res.json({ products, total: products.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get products");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch products" });
  }
});

router.post("/products", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const { name, description, price, mrp, unit, stock, category, imageUrl, isAvailable } = req.body;
    if (!name) { res.status(400).json({ error: "ValidationError", message: "Name is required" }); return; }
    const doc = { name, description: description ?? "", price: Number(price) || 0, mrp: Number(mrp) || 0, unit: unit ?? "", stock: Number(stock) || 0, category: category ?? "", imageUrl: imageUrl ?? "", isAvailable: isAvailable !== false, createdAt: new Date(), updatedAt: new Date() };
    const result = await ctx.conn.db.collection("products").insertOne(doc);
    res.status(201).json({ product: { ...doc, _id: result.insertedId } });
  } catch (err) {
    req.log.error({ err }, "Failed to create product");
    res.status(500).json({ error: "InternalError", message: "Failed to create product" });
  }
});

router.put("/products/:productId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.productId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid product ID" }); return; }
    const { name, description, price, mrp, unit, stock, category, imageUrl, isAvailable } = req.body;
    const update: any = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = Number(price) || 0;
    if (mrp !== undefined) update.mrp = Number(mrp) || 0;
    if (unit !== undefined) update.unit = unit;
    if (stock !== undefined) update.stock = Number(stock) || 0;
    if (category !== undefined) update.category = category;
    if (imageUrl !== undefined) update.imageUrl = imageUrl;
    if (isAvailable !== undefined) update.isAvailable = isAvailable;
    const result = await ctx.conn.db.collection("products").findOneAndUpdate({ _id: oid }, { $set: update }, { returnDocument: "after" });
    if (!result) { res.status(404).json({ error: "NotFound", message: "Product not found" }); return; }
    res.json({ product: result });
  } catch (err) {
    req.log.error({ err }, "Failed to update product");
    res.status(500).json({ error: "InternalError", message: "Failed to update product" });
  }
});

router.delete("/products/:productId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.productId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid product ID" }); return; }
    await ctx.conn.db.collection("products").deleteOne({ _id: oid });
    res.json({ message: "Product deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "InternalError", message: "Failed to delete product" });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const categories = await ctx.conn.db.collection("categories").find({}).sort({ name: 1 }).toArray();
    res.json({ categories, total: categories.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get categories");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch categories" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const { name, imageUrl, isActive } = req.body;
    if (!name) { res.status(400).json({ error: "ValidationError", message: "Name is required" }); return; }
    const doc = { name, imageUrl: imageUrl ?? "", isActive: isActive !== false, createdAt: new Date(), updatedAt: new Date() };
    const result = await ctx.conn.db.collection("categories").insertOne(doc);
    res.status(201).json({ category: { ...doc, _id: result.insertedId } });
  } catch (err) {
    req.log.error({ err }, "Failed to create category");
    res.status(500).json({ error: "InternalError", message: "Failed to create category" });
  }
});

router.put("/categories/:catId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.catId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid category ID" }); return; }
    const { name, imageUrl, isActive } = req.body;
    const update: any = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (imageUrl !== undefined) update.imageUrl = imageUrl;
    if (isActive !== undefined) update.isActive = isActive;
    const result = await ctx.conn.db.collection("categories").findOneAndUpdate({ _id: oid }, { $set: update }, { returnDocument: "after" });
    if (!result) { res.status(404).json({ error: "NotFound", message: "Category not found" }); return; }
    res.json({ category: result });
  } catch (err) {
    req.log.error({ err }, "Failed to update category");
    res.status(500).json({ error: "InternalError", message: "Failed to update category" });
  }
});

router.delete("/categories/:catId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.catId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid category ID" }); return; }
    await ctx.conn.db.collection("categories").deleteOne({ _id: oid });
    res.json({ message: "Category deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete category");
    res.status(500).json({ error: "InternalError", message: "Failed to delete category" });
  }
});

router.get("/coupons", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const coupons = await ctx.conn.db.collection("coupons").find({}).sort({ createdAt: -1 }).toArray();
    res.json({ coupons, total: coupons.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get coupons");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch coupons" });
  }
});

router.post("/coupons", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const { code, discount, discountType, minOrder, maxDiscount, expiryDate, isActive } = req.body;
    if (!code) { res.status(400).json({ error: "ValidationError", message: "Code is required" }); return; }
    const existing = await ctx.conn.db.collection("coupons").findOne({ code: { $regex: `^${code}$`, $options: "i" } });
    if (existing) { res.status(400).json({ error: "DuplicateCoupon", message: "Coupon code already exists" }); return; }
    const doc = { code: code.toUpperCase(), discount: Number(discount) || 0, discountType: discountType ?? "percentage", minOrder: Number(minOrder) || 0, maxDiscount: Number(maxDiscount) || 0, expiryDate: expiryDate ? new Date(expiryDate) : null, isActive: isActive !== false, createdAt: new Date(), updatedAt: new Date() };
    const result = await ctx.conn.db.collection("coupons").insertOne(doc);
    res.status(201).json({ coupon: { ...doc, _id: result.insertedId } });
  } catch (err) {
    req.log.error({ err }, "Failed to create coupon");
    res.status(500).json({ error: "InternalError", message: "Failed to create coupon" });
  }
});

router.put("/coupons/:couponId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.couponId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid coupon ID" }); return; }
    const { code, discount, discountType, minOrder, maxDiscount, expiryDate, isActive } = req.body;
    const update: any = { updatedAt: new Date() };
    if (code !== undefined) update.code = code.toUpperCase();
    if (discount !== undefined) update.discount = Number(discount) || 0;
    if (discountType !== undefined) update.discountType = discountType;
    if (minOrder !== undefined) update.minOrder = Number(minOrder) || 0;
    if (maxDiscount !== undefined) update.maxDiscount = Number(maxDiscount) || 0;
    if (expiryDate !== undefined) update.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (isActive !== undefined) update.isActive = isActive;
    const result = await ctx.conn.db.collection("coupons").findOneAndUpdate({ _id: oid }, { $set: update }, { returnDocument: "after" });
    if (!result) { res.status(404).json({ error: "NotFound", message: "Coupon not found" }); return; }
    res.json({ coupon: result });
  } catch (err) {
    req.log.error({ err }, "Failed to update coupon");
    res.status(500).json({ error: "InternalError", message: "Failed to update coupon" });
  }
});

router.delete("/coupons/:couponId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.couponId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid coupon ID" }); return; }
    await ctx.conn.db.collection("coupons").deleteOne({ _id: oid });
    res.json({ message: "Coupon deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete coupon");
    res.status(500).json({ error: "InternalError", message: "Failed to delete coupon" });
  }
});

export default router;
