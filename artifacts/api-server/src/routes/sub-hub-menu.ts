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

// ─── STATS ────────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const db = ctx.conn.db;
    const [products, categories, coupons, combos, carousels, pincodes, sections] = await Promise.all([
      db.collection("products").countDocuments(),
      db.collection("categories").countDocuments(),
      db.collection("coupons").countDocuments(),
      db.collection("combos").countDocuments(),
      db.collection("carousels").countDocuments(),
      db.collection("pincodes").countDocuments(),
      db.collection("sections").countDocuments(),
    ]);
    res.json({ stats: { products, categories, coupons, combos, carousels, pincodes, sections, dbName: ctx.sub.dbName } });
  } catch (err) {
    req.log.error({ err }, "Failed to get sub hub menu stats");
    res.status(500).json({ error: "InternalError", message: "Failed to get stats" });
  }
});

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
router.get("/products", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const search = String(req.query.search || "");
    const query: any = search ? { name: { $regex: search, $options: "i" } } : {};
    const products = await ctx.conn.db.collection("products").find(query).sort({ sortOrder: 1, name: 1 }).toArray();
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
    const { name, description, category, subCategory, priceVariants, images, tags, nutrition, isActive, sortOrder } = req.body;
    if (!name) { res.status(400).json({ error: "ValidationError", message: "Name is required" }); return; }
    const doc = {
      name,
      description: description ?? "",
      category: category ?? "",
      subCategory: subCategory ?? "",
      priceVariants: Array.isArray(priceVariants) ? priceVariants : [],
      images: Array.isArray(images) ? images : [],
      tags: Array.isArray(tags) ? tags : [],
      nutrition: Array.isArray(nutrition) ? nutrition : [],
      isActive: isActive !== false,
      sortOrder: Number(sortOrder) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
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
    const { name, description, category, subCategory, priceVariants, images, tags, nutrition, isActive, sortOrder } = req.body;
    const update: any = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;
    if (subCategory !== undefined) update.subCategory = subCategory;
    if (priceVariants !== undefined) update.priceVariants = priceVariants;
    if (images !== undefined) update.images = images;
    if (tags !== undefined) update.tags = tags;
    if (nutrition !== undefined) update.nutrition = nutrition;
    if (isActive !== undefined) update.isActive = isActive;
    if (sortOrder !== undefined) update.sortOrder = Number(sortOrder) || 0;
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

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
router.get("/categories", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const categories = await ctx.conn.db.collection("categories").find({}).sort({ sortOrder: 1, name: 1 }).toArray();
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
    const { name, imageUrl, isActive, sortOrder, subCategories } = req.body;
    if (!name) { res.status(400).json({ error: "ValidationError", message: "Name is required" }); return; }
    const doc = {
      name,
      imageUrl: imageUrl ?? "",
      isActive: isActive !== false,
      sortOrder: Number(sortOrder) || 0,
      subCategories: Array.isArray(subCategories) ? subCategories : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
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
    const { name, imageUrl, isActive, sortOrder, subCategories } = req.body;
    const update: any = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (imageUrl !== undefined) update.imageUrl = imageUrl;
    if (isActive !== undefined) update.isActive = isActive;
    if (sortOrder !== undefined) update.sortOrder = Number(sortOrder) || 0;
    if (subCategories !== undefined) update.subCategories = subCategories;
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

// ─── COUPONS ──────────────────────────────────────────────────────────────────
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
    const { code, type, discountValue, minOrderAmount, maxUsage, isFirstTimeOnly, categoryId, isActive, expiresAt } = req.body;
    if (!code) { res.status(400).json({ error: "ValidationError", message: "Code is required" }); return; }
    const existing = await ctx.conn.db.collection("coupons").findOne({ code: { $regex: `^${code}$`, $options: "i" } });
    if (existing) { res.status(400).json({ error: "DuplicateCoupon", message: "Coupon code already exists" }); return; }
    const doc: any = {
      code: code.toUpperCase(),
      type: type ?? "percentage",
      discountValue: Number(discountValue) || 0,
      minOrderAmount: Number(minOrderAmount) || 0,
      usedCount: 0,
      isFirstTimeOnly: isFirstTimeOnly === true,
      isActive: isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (maxUsage) doc.maxUsage = Number(maxUsage);
    if (categoryId) doc.categoryId = categoryId;
    if (expiresAt) doc.expiresAt = new Date(expiresAt);
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
    const { code, type, discountValue, minOrderAmount, maxUsage, isFirstTimeOnly, categoryId, isActive, expiresAt } = req.body;
    const update: any = { updatedAt: new Date() };
    if (code !== undefined) update.code = code.toUpperCase();
    if (type !== undefined) update.type = type;
    if (discountValue !== undefined) update.discountValue = Number(discountValue) || 0;
    if (minOrderAmount !== undefined) update.minOrderAmount = Number(minOrderAmount) || 0;
    if (maxUsage !== undefined) update.maxUsage = maxUsage ? Number(maxUsage) : null;
    if (isFirstTimeOnly !== undefined) update.isFirstTimeOnly = isFirstTimeOnly;
    if (categoryId !== undefined) update.categoryId = categoryId || null;
    if (isActive !== undefined) update.isActive = isActive;
    if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : null;
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

// ─── COMBOS ───────────────────────────────────────────────────────────────────
router.get("/combos", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const combos = await ctx.conn.db.collection("combos").find({}).sort({ sortOrder: 1, name: 1 }).toArray();
    res.json({ combos, total: combos.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get combos");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch combos" });
  }
});

router.post("/combos", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const { name, description, price, originalPrice, discount, images, items, tags, nutrition, isActive, sortOrder } = req.body;
    if (!name) { res.status(400).json({ error: "ValidationError", message: "Name is required" }); return; }
    const doc = {
      name,
      description: description ?? "",
      price: Number(price) || 0,
      originalPrice: Number(originalPrice) || 0,
      discount: Number(discount) || 0,
      images: Array.isArray(images) ? images : [],
      items: Array.isArray(items) ? items : [],
      tags: Array.isArray(tags) ? tags : [],
      nutrition: Array.isArray(nutrition) ? nutrition : [],
      isActive: isActive !== false,
      sortOrder: Number(sortOrder) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await ctx.conn.db.collection("combos").insertOne(doc);
    res.status(201).json({ combo: { ...doc, _id: result.insertedId } });
  } catch (err) {
    req.log.error({ err }, "Failed to create combo");
    res.status(500).json({ error: "InternalError", message: "Failed to create combo" });
  }
});

router.put("/combos/:comboId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.comboId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid combo ID" }); return; }
    const { name, description, price, originalPrice, discount, images, items, tags, nutrition, isActive, sortOrder } = req.body;
    const update: any = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = Number(price) || 0;
    if (originalPrice !== undefined) update.originalPrice = Number(originalPrice) || 0;
    if (discount !== undefined) update.discount = Number(discount) || 0;
    if (images !== undefined) update.images = images;
    if (items !== undefined) update.items = items;
    if (tags !== undefined) update.tags = tags;
    if (nutrition !== undefined) update.nutrition = nutrition;
    if (isActive !== undefined) update.isActive = isActive;
    if (sortOrder !== undefined) update.sortOrder = Number(sortOrder) || 0;
    const result = await ctx.conn.db.collection("combos").findOneAndUpdate({ _id: oid }, { $set: update }, { returnDocument: "after" });
    if (!result) { res.status(404).json({ error: "NotFound", message: "Combo not found" }); return; }
    res.json({ combo: result });
  } catch (err) {
    req.log.error({ err }, "Failed to update combo");
    res.status(500).json({ error: "InternalError", message: "Failed to update combo" });
  }
});

router.delete("/combos/:comboId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.comboId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid combo ID" }); return; }
    await ctx.conn.db.collection("combos").deleteOne({ _id: oid });
    res.json({ message: "Combo deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete combo");
    res.status(500).json({ error: "InternalError", message: "Failed to delete combo" });
  }
});

// ─── CAROUSELS ────────────────────────────────────────────────────────────────
router.get("/carousels", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const carousels = await ctx.conn.db.collection("carousels").find({}).sort({ order: 1 }).toArray();
    res.json({ carousels, total: carousels.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get carousels");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch carousels" });
  }
});

router.post("/carousels", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const { imageUrl, title, linkUrl, order, isActive } = req.body;
    if (!imageUrl) { res.status(400).json({ error: "ValidationError", message: "Image URL is required" }); return; }
    const doc = {
      imageUrl,
      title: title ?? null,
      linkUrl: linkUrl ?? null,
      order: Number(order) || 0,
      isActive: isActive !== false,
    };
    const result = await ctx.conn.db.collection("carousels").insertOne(doc);
    res.status(201).json({ carousel: { ...doc, _id: result.insertedId } });
  } catch (err) {
    req.log.error({ err }, "Failed to create carousel");
    res.status(500).json({ error: "InternalError", message: "Failed to create carousel" });
  }
});

router.put("/carousels/:carouselId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.carouselId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid carousel ID" }); return; }
    const { imageUrl, title, linkUrl, order, isActive } = req.body;
    const update: any = {};
    if (imageUrl !== undefined) update.imageUrl = imageUrl;
    if (title !== undefined) update.title = title || null;
    if (linkUrl !== undefined) update.linkUrl = linkUrl || null;
    if (order !== undefined) update.order = Number(order) || 0;
    if (isActive !== undefined) update.isActive = isActive;
    const result = await ctx.conn.db.collection("carousels").findOneAndUpdate({ _id: oid }, { $set: update }, { returnDocument: "after" });
    if (!result) { res.status(404).json({ error: "NotFound", message: "Carousel not found" }); return; }
    res.json({ carousel: result });
  } catch (err) {
    req.log.error({ err }, "Failed to update carousel");
    res.status(500).json({ error: "InternalError", message: "Failed to update carousel" });
  }
});

router.delete("/carousels/:carouselId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.carouselId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid carousel ID" }); return; }
    await ctx.conn.db.collection("carousels").deleteOne({ _id: oid });
    res.json({ message: "Carousel deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete carousel");
    res.status(500).json({ error: "InternalError", message: "Failed to delete carousel" });
  }
});

// ─── SECTIONS ─────────────────────────────────────────────────────────────────
router.get("/sections", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const sections = await ctx.conn.db.collection("sections").find({}).sort({ sortOrder: 1 }).toArray();
    res.json({ sections, total: sections.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get sections");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch sections" });
  }
});

router.post("/sections", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const { title, type, sortOrder, isActive } = req.body;
    if (!title) { res.status(400).json({ error: "ValidationError", message: "Title is required" }); return; }
    const doc = {
      title,
      type: type ?? "products",
      sortOrder: Number(sortOrder) || 0,
      isActive: isActive !== false,
    };
    const result = await ctx.conn.db.collection("sections").insertOne(doc);
    res.status(201).json({ section: { ...doc, _id: result.insertedId } });
  } catch (err) {
    req.log.error({ err }, "Failed to create section");
    res.status(500).json({ error: "InternalError", message: "Failed to create section" });
  }
});

router.put("/sections/:sectionId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.sectionId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid section ID" }); return; }
    const { title, type, sortOrder, isActive } = req.body;
    const update: any = {};
    if (title !== undefined) update.title = title;
    if (type !== undefined) update.type = type;
    if (sortOrder !== undefined) update.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) update.isActive = isActive;
    const result = await ctx.conn.db.collection("sections").findOneAndUpdate({ _id: oid }, { $set: update }, { returnDocument: "after" });
    if (!result) { res.status(404).json({ error: "NotFound", message: "Section not found" }); return; }
    res.json({ section: result });
  } catch (err) {
    req.log.error({ err }, "Failed to update section");
    res.status(500).json({ error: "InternalError", message: "Failed to update section" });
  }
});

router.delete("/sections/:sectionId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.sectionId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid section ID" }); return; }
    await ctx.conn.db.collection("sections").deleteOne({ _id: oid });
    res.json({ message: "Section deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete section");
    res.status(500).json({ error: "InternalError", message: "Failed to delete section" });
  }
});

// ─── PINCODES ─────────────────────────────────────────────────────────────────
router.get("/pincodes", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const pincodes = await ctx.conn.db.collection("pincodes").find({}).sort({ pincode: 1 }).toArray();
    res.json({ pincodes, total: pincodes.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get pincodes");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch pincodes" });
  }
});

router.post("/pincodes", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const { pincode, area, city, isActive } = req.body;
    if (!pincode) { res.status(400).json({ error: "ValidationError", message: "Pincode is required" }); return; }
    const existing = await ctx.conn.db.collection("pincodes").findOne({ pincode });
    if (existing) { res.status(400).json({ error: "Duplicate", message: "Pincode already exists" }); return; }
    const doc = {
      pincode: String(pincode),
      area: area ?? "",
      city: city ?? "",
      isActive: isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await ctx.conn.db.collection("pincodes").insertOne(doc);
    res.status(201).json({ pincode: { ...doc, _id: result.insertedId } });
  } catch (err) {
    req.log.error({ err }, "Failed to create pincode");
    res.status(500).json({ error: "InternalError", message: "Failed to create pincode" });
  }
});

router.put("/pincodes/:pincodeId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.pincodeId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid pincode ID" }); return; }
    const { pincode, area, city, isActive } = req.body;
    const update: any = { updatedAt: new Date() };
    if (pincode !== undefined) update.pincode = String(pincode);
    if (area !== undefined) update.area = area;
    if (city !== undefined) update.city = city;
    if (isActive !== undefined) update.isActive = isActive;
    const result = await ctx.conn.db.collection("pincodes").findOneAndUpdate({ _id: oid }, { $set: update }, { returnDocument: "after" });
    if (!result) { res.status(404).json({ error: "NotFound", message: "Pincode not found" }); return; }
    res.json({ pincode: result });
  } catch (err) {
    req.log.error({ err }, "Failed to update pincode");
    res.status(500).json({ error: "InternalError", message: "Failed to update pincode" });
  }
});

router.delete("/pincodes/:pincodeId", async (req, res) => {
  try {
    const ctx = await getSubHubDb(req.params.id, res);
    if (!ctx) return;
    const oid = toId(req.params.pincodeId);
    if (!oid) { res.status(400).json({ error: "InvalidId", message: "Invalid pincode ID" }); return; }
    await ctx.conn.db.collection("pincodes").deleteOne({ _id: oid });
    res.json({ message: "Pincode deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete pincode");
    res.status(500).json({ error: "InternalError", message: "Failed to delete pincode" });
  }
});

export default router;
