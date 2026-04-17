import { Router, type IRouter } from "express";
import { mongoose } from "../db/index.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();
router.use(requireAuth as any);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    itemCode: { type: String, default: "" },
    itemType: { type: String, default: "Raw Material" },
    categoryId: { type: mongoose.Schema.Types.ObjectId, required: true },
    categoryName: { type: String, default: "" },
    unit: { type: String, default: "kg" },
    purchasePrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    openingStock: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    description: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

function getCategoryModel() {
  if (mongoose.models["VendorItemCategory"]) return mongoose.models["VendorItemCategory"];
  return mongoose.model("VendorItemCategory", categorySchema, "vendor_item_categories");
}

function getItemModel() {
  if (mongoose.models["VendorItem"]) return mongoose.models["VendorItem"];
  return mongoose.model("VendorItem", itemSchema, "vendor_items");
}

function toId(id: string) {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

function serializeCategory(doc: any) {
  return {
    id: String(doc._id),
    name: doc.name ?? "",
    description: doc.description ?? "",
    status: doc.status ?? "active",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function serializeItem(doc: any) {
  return {
    id: String(doc._id),
    name: doc.name ?? "",
    itemCode: doc.itemCode ?? "",
    itemType: doc.itemType ?? "Raw Material",
    categoryId: String(doc.categoryId ?? ""),
    categoryName: doc.categoryName ?? "",
    unit: doc.unit ?? "kg",
    purchasePrice: doc.purchasePrice ?? 0,
    sellingPrice: doc.sellingPrice ?? 0,
    openingStock: doc.openingStock ?? 0,
    currentStock: doc.currentStock ?? 0,
    description: doc.description ?? "",
    status: doc.status ?? "active",
    notes: doc.notes ?? "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

router.get("/categories", async (req, res) => {
  try {
    const Category = getCategoryModel();
    const categories = await Category.find({}).sort({ name: 1 });
    res.json({ categories: categories.map(serializeCategory), total: categories.length });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch vendor item categories");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch categories" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const Category = getCategoryModel();
    const name = String(req.body.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "ValidationError", message: "Category name is required" });
      return;
    }
    const category = await Category.create({
      name,
      description: String(req.body.description ?? "").trim(),
      status: req.body.status === "inactive" ? "inactive" : "active",
    });
    res.status(201).json({ category: serializeCategory(category) });
  } catch (err: any) {
    req.log.error({ err }, "Failed to create vendor item category");
    res.status(500).json({ error: "InternalError", message: err.message ?? "Failed to create category" });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const oid = toId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "InvalidId", message: "Invalid category ID" });
      return;
    }
    const Category = getCategoryModel();
    const Item = getItemModel();
    const update: any = {};
    if (req.body.name !== undefined) update.name = String(req.body.name).trim();
    if (req.body.description !== undefined) update.description = String(req.body.description).trim();
    if (req.body.status !== undefined) update.status = req.body.status === "inactive" ? "inactive" : "active";
    if (!update.name && req.body.name !== undefined) {
      res.status(400).json({ error: "ValidationError", message: "Category name is required" });
      return;
    }
    const category = await Category.findByIdAndUpdate(oid, update, { returnDocument: "after" });
    if (!category) {
      res.status(404).json({ error: "NotFound", message: "Category not found" });
      return;
    }
    await Item.updateMany({ categoryId: oid }, { $set: { categoryName: category.name } });
    res.json({ category: serializeCategory(category) });
  } catch (err: any) {
    req.log.error({ err }, "Failed to update vendor item category");
    res.status(500).json({ error: "InternalError", message: err.message ?? "Failed to update category" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const oid = toId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "InvalidId", message: "Invalid category ID" });
      return;
    }
    const Category = getCategoryModel();
    const Item = getItemModel();
    const itemCount = await Item.countDocuments({ categoryId: oid });
    if (itemCount > 0) {
      res.status(400).json({ error: "CategoryInUse", message: "Move or delete items in this category first" });
      return;
    }
    await Category.findByIdAndDelete(oid);
    res.json({ message: "Category deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete vendor item category");
    res.status(500).json({ error: "InternalError", message: "Failed to delete category" });
  }
});

router.get("/items", async (req, res) => {
  try {
    const Item = getItemModel();
    const query: any = {};
    if (req.query.categoryId) {
      const oid = toId(String(req.query.categoryId));
      if (oid) query.categoryId = oid;
    }
    if (req.query.itemType && req.query.itemType !== "all") query.itemType = String(req.query.itemType);
    if (req.query.search) {
      const regex = { $regex: String(req.query.search), $options: "i" };
      query.$or = [{ name: regex }, { itemCode: regex }, { categoryName: regex }, { description: regex }];
    }
    const items = await Item.find(query).sort({ categoryName: 1, name: 1 });
    res.json({ items: items.map(serializeItem), total: items.length });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch vendor items");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch items" });
  }
});

router.post("/items", async (req, res) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const categoryId = toId(String(req.body.categoryId ?? ""));
    if (!name) {
      res.status(400).json({ error: "ValidationError", message: "Item name is required" });
      return;
    }
    if (!categoryId) {
      res.status(400).json({ error: "ValidationError", message: "Category is required" });
      return;
    }
    const Category = getCategoryModel();
    const Item = getItemModel();
    const category = await Category.findById(categoryId);
    if (!category) {
      res.status(404).json({ error: "NotFound", message: "Category not found" });
      return;
    }
    const item = await Item.create({
      name,
      itemCode: String(req.body.itemCode ?? "").trim(),
      itemType: String(req.body.itemType ?? "Raw Material").trim() || "Raw Material",
      categoryId,
      categoryName: category.name,
      unit: String(req.body.unit ?? "kg").trim() || "kg",
      purchasePrice: Number(req.body.purchasePrice) || 0,
      sellingPrice: Number(req.body.sellingPrice) || 0,
      openingStock: Number(req.body.openingStock) || 0,
      currentStock: req.body.currentStock !== undefined ? Number(req.body.currentStock) || 0 : Number(req.body.openingStock) || 0,
      description: String(req.body.description ?? "").trim(),
      status: req.body.status === "inactive" ? "inactive" : "active",
      notes: String(req.body.notes ?? "").trim(),
    });
    res.status(201).json({ item: serializeItem(item) });
  } catch (err: any) {
    req.log.error({ err }, "Failed to create vendor item");
    res.status(500).json({ error: "InternalError", message: err.message ?? "Failed to create item" });
  }
});

router.put("/items/:id", async (req, res) => {
  try {
    const oid = toId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "InvalidId", message: "Invalid item ID" });
      return;
    }
    const Category = getCategoryModel();
    const Item = getItemModel();
    const update: any = {};
    if (req.body.name !== undefined) update.name = String(req.body.name).trim();
    if (req.body.itemCode !== undefined) update.itemCode = String(req.body.itemCode).trim();
    if (req.body.itemType !== undefined) update.itemType = String(req.body.itemType).trim() || "Raw Material";
    if (req.body.unit !== undefined) update.unit = String(req.body.unit).trim() || "kg";
    if (req.body.purchasePrice !== undefined) update.purchasePrice = Number(req.body.purchasePrice) || 0;
    if (req.body.sellingPrice !== undefined) update.sellingPrice = Number(req.body.sellingPrice) || 0;
    if (req.body.openingStock !== undefined) update.openingStock = Number(req.body.openingStock) || 0;
    if (req.body.currentStock !== undefined) update.currentStock = Number(req.body.currentStock) || 0;
    if (req.body.description !== undefined) update.description = String(req.body.description).trim();
    if (req.body.notes !== undefined) update.notes = String(req.body.notes).trim();
    if (req.body.status !== undefined) update.status = req.body.status === "inactive" ? "inactive" : "active";
    if (req.body.categoryId !== undefined) {
      const categoryId = toId(String(req.body.categoryId));
      if (!categoryId) {
        res.status(400).json({ error: "ValidationError", message: "Category is required" });
        return;
      }
      const category = await Category.findById(categoryId);
      if (!category) {
        res.status(404).json({ error: "NotFound", message: "Category not found" });
        return;
      }
      update.categoryId = categoryId;
      update.categoryName = category.name;
    }
    if (!update.name && req.body.name !== undefined) {
      res.status(400).json({ error: "ValidationError", message: "Item name is required" });
      return;
    }
    const item = await Item.findByIdAndUpdate(oid, update, { returnDocument: "after" });
    if (!item) {
      res.status(404).json({ error: "NotFound", message: "Item not found" });
      return;
    }
    res.json({ item: serializeItem(item) });
  } catch (err: any) {
    req.log.error({ err }, "Failed to update vendor item");
    res.status(500).json({ error: "InternalError", message: err.message ?? "Failed to update item" });
  }
});

router.delete("/items/:id", async (req, res) => {
  try {
    const oid = toId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "InvalidId", message: "Invalid item ID" });
      return;
    }
    const Item = getItemModel();
    await Item.findByIdAndDelete(oid);
    res.json({ message: "Item deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete vendor item");
    res.status(500).json({ error: "InternalError", message: "Failed to delete item" });
  }
});

export default router;