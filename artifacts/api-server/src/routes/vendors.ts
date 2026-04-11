import { Router, type IRouter } from "express";
import { mongoose } from "../db/index.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();
router.use(requireAuth as any);

// ─── SCHEMAS ──────────────────────────────────────────────────────────────────

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    category: { type: String, default: "General" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    notes: { type: String, default: "" },
    totalPurchases: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const purchaseItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: "kg" },
  pricePerUnit: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  expiryDate: { type: String, default: "" },
}, { _id: true });

const purchaseSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Vendor" },
    vendorName: { type: String, default: "" },
    invoiceNumber: { type: String, default: "" },
    purchaseDate: { type: Date, default: Date.now },
    items: [purchaseItemSchema],
    totalAmount: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

const batchSchema = new mongoose.Schema({
  batchRef: { type: String, default: "" },
  vendorId: { type: String, default: "" },
  vendorName: { type: String, default: "" },
  quantity: { type: Number, default: 0 },
  remaining: { type: Number, default: 0 },
  unit: { type: String, default: "kg" },
  pricePerUnit: { type: Number, default: 0 },
  purchaseDate: { type: Date, default: Date.now },
  expiryDate: { type: String, default: "" },
  purchaseId: { type: String, default: "" },
}, { _id: true });

const inventorySchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, trim: true },
    category: { type: String, default: "General" },
    unit: { type: String, default: "kg" },
    totalQuantity: { type: Number, default: 0 },
    batches: [batchSchema],
  },
  { timestamps: true }
);

// ─── MODELS ───────────────────────────────────────────────────────────────────

function getVendorModel() {
  if (mongoose.models["Vendor"]) return mongoose.models["Vendor"];
  return mongoose.model("Vendor", vendorSchema, "vendors");
}

function getPurchaseModel() {
  if (mongoose.models["VendorPurchase"]) return mongoose.models["VendorPurchase"];
  return mongoose.model("VendorPurchase", purchaseSchema, "vendor_purchases");
}

function getInventoryModel() {
  if (mongoose.models["Inventory"]) return mongoose.models["Inventory"];
  return mongoose.model("Inventory", inventorySchema, "inventory");
}

// ─── SERIALIZERS ──────────────────────────────────────────────────────────────

function serializeVendor(doc: any) {
  return {
    id: String(doc._id),
    name: doc.name ?? "",
    phone: doc.phone ?? "",
    email: doc.email ?? "",
    address: doc.address ?? "",
    category: doc.category ?? "General",
    status: doc.status ?? "active",
    notes: doc.notes ?? "",
    totalPurchases: doc.totalPurchases ?? 0,
    totalSpent: doc.totalSpent ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function serializePurchase(doc: any) {
  return {
    id: String(doc._id),
    vendorId: String(doc.vendorId),
    vendorName: doc.vendorName ?? "",
    invoiceNumber: doc.invoiceNumber ?? "",
    purchaseDate: doc.purchaseDate,
    items: (doc.items ?? []).map((item: any) => ({
      id: String(item._id),
      productName: item.productName ?? "",
      quantity: item.quantity ?? 0,
      unit: item.unit ?? "kg",
      pricePerUnit: item.pricePerUnit ?? 0,
      totalPrice: item.totalPrice ?? 0,
      expiryDate: item.expiryDate ?? "",
    })),
    totalAmount: doc.totalAmount ?? 0,
    notes: doc.notes ?? "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function serializeInventory(doc: any) {
  return {
    id: String(doc._id),
    productName: doc.productName ?? "",
    category: doc.category ?? "General",
    unit: doc.unit ?? "kg",
    totalQuantity: doc.totalQuantity ?? 0,
    batches: (doc.batches ?? []).map((b: any) => ({
      id: String(b._id),
      batchRef: b.batchRef ?? "",
      vendorId: b.vendorId ?? "",
      vendorName: b.vendorName ?? "",
      quantity: b.quantity ?? 0,
      remaining: b.remaining ?? 0,
      unit: b.unit ?? "kg",
      pricePerUnit: b.pricePerUnit ?? 0,
      purchaseDate: b.purchaseDate,
      expiryDate: b.expiryDate ?? "",
      purchaseId: b.purchaseId ?? "",
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ─── VENDOR ROUTES ────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const Vendor = getVendorModel();
    const { search, category, status, sort = "createdAt_desc", page = "1", limit = "20" } = req.query as Record<string, string>;

    const filter: Record<string, any> = {};
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ name: regex }, { phone: regex }, { email: regex }, { address: regex }];
    }
    if (category && category !== "all") filter.category = new RegExp(`^${category}$`, "i");
    if (status && status !== "all") filter.status = status;

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === "name_asc") sortObj = { name: 1 };
    else if (sort === "name_desc") sortObj = { name: -1 };
    else if (sort === "totalSpent_desc") sortObj = { totalSpent: -1 };
    else if (sort === "totalSpent_asc") sortObj = { totalSpent: 1 };
    else if (sort === "totalPurchases_desc") sortObj = { totalPurchases: -1 };
    else if (sort === "createdAt_asc") sortObj = { createdAt: 1 };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [vendors, total] = await Promise.all([
      Vendor.find(filter).sort(sortObj).skip(skip).limit(limitNum),
      Vendor.countDocuments(filter),
    ]);

    res.json({ vendors: vendors.map(serializeVendor), total, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err }, "Failed to get vendors");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch vendors" });
  }
});

router.post("/", async (req, res) => {
  try {
    const Vendor = getVendorModel();
    const { name, phone, email, address, category, status, notes } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: "ValidationError", message: "Vendor name is required" });
      return;
    }

    const vendor = await Vendor.create({
      name: name.trim(),
      phone: phone?.trim() ?? "",
      email: email?.toLowerCase().trim() ?? "",
      address: address?.trim() ?? "",
      category: category?.trim() || "General",
      status: status || "active",
      notes: notes?.trim() ?? "",
    });

    res.status(201).json({ vendor: serializeVendor(vendor) });
  } catch (err) {
    req.log.error({ err }, "Failed to create vendor");
    res.status(500).json({ error: "InternalError", message: "Failed to create vendor" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const Vendor = getVendorModel();
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) { res.status(404).json({ error: "NotFound", message: "Vendor not found" }); return; }

    const { name, phone, email, address, category, status, notes } = req.body;
    if (name !== undefined) vendor.name = name.trim();
    if (phone !== undefined) (vendor as any).phone = phone.trim();
    if (email !== undefined) (vendor as any).email = email.toLowerCase().trim();
    if (address !== undefined) (vendor as any).address = address.trim();
    if (category !== undefined) (vendor as any).category = category.trim();
    if (status !== undefined) (vendor as any).status = status;
    if (notes !== undefined) (vendor as any).notes = notes.trim();

    await vendor.save();
    res.json({ vendor: serializeVendor(vendor) });
  } catch (err) {
    req.log.error({ err }, "Failed to update vendor");
    res.status(500).json({ error: "InternalError", message: "Failed to update vendor" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const Vendor = getVendorModel();
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) { res.status(404).json({ error: "NotFound", message: "Vendor not found" }); return; }
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ message: "Vendor deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete vendor");
    res.status(500).json({ error: "InternalError", message: "Failed to delete vendor" });
  }
});

// ─── PURCHASE ROUTES ──────────────────────────────────────────────────────────

router.get("/all-purchases", async (req, res) => {
  try {
    const Purchase = getPurchaseModel();
    const { page = "1", limit = "30", search, vendorId } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};
    if (vendorId) filter.vendorId = vendorId;
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ vendorName: regex }, { invoiceNumber: regex }];
    }

    const [purchases, total] = await Promise.all([
      Purchase.find(filter).sort({ purchaseDate: -1 }).skip(skip).limit(limitNum),
      Purchase.countDocuments(filter),
    ]);

    res.json({ purchases: purchases.map(serializePurchase), total, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err }, "Failed to get all purchases");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch all purchases" });
  }
});

router.get("/:vendorId/purchases", async (req, res) => {
  try {
    const Purchase = getPurchaseModel();
    const { page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [purchases, total] = await Promise.all([
      Purchase.find({ vendorId: req.params.vendorId }).sort({ purchaseDate: -1 }).skip(skip).limit(limitNum),
      Purchase.countDocuments({ vendorId: req.params.vendorId }),
    ]);

    res.json({ purchases: purchases.map(serializePurchase), total, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err }, "Failed to get purchases");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch purchases" });
  }
});

router.post("/:vendorId/purchases", async (req, res) => {
  try {
    const Vendor = getVendorModel();
    const Purchase = getPurchaseModel();
    const Inventory = getInventoryModel();

    const vendor = await Vendor.findById(req.params.vendorId);
    if (!vendor) { res.status(404).json({ error: "NotFound", message: "Vendor not found" }); return; }

    const { invoiceNumber, purchaseDate, items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "ValidationError", message: "At least one item is required" });
      return;
    }

    const processedItems = items.map((item: any) => ({
      productName: item.productName?.trim(),
      quantity: Number(item.quantity) || 0,
      unit: item.unit || "kg",
      pricePerUnit: Number(item.pricePerUnit) || 0,
      totalPrice: (Number(item.quantity) || 0) * (Number(item.pricePerUnit) || 0),
      expiryDate: item.expiryDate || "",
    }));

    const totalAmount = processedItems.reduce((sum: number, i: any) => sum + i.totalPrice, 0);

    const purchase = await Purchase.create({
      vendorId: vendor._id,
      vendorName: vendor.name,
      invoiceNumber: invoiceNumber?.trim() || "",
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      items: processedItems,
      totalAmount,
      notes: notes?.trim() || "",
    });

    // Update vendor stats
    (vendor as any).totalPurchases = ((vendor as any).totalPurchases || 0) + 1;
    (vendor as any).totalSpent = ((vendor as any).totalSpent || 0) + totalAmount;
    await vendor.save();

    // Auto-manage inventory: add/update products and batches
    for (const item of processedItems) {
      if (!item.productName) continue;

      const nameRegex = new RegExp(`^${item.productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      let invItem = await Inventory.findOne({ productName: nameRegex });

      const batchRef = `B-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

      if (!invItem) {
        invItem = await Inventory.create({
          productName: item.productName,
          category: (vendor as any).category || "General",
          unit: item.unit,
          totalQuantity: item.quantity,
          batches: [{
            batchRef,
            vendorId: String(vendor._id),
            vendorName: vendor.name,
            quantity: item.quantity,
            remaining: item.quantity,
            unit: item.unit,
            pricePerUnit: item.pricePerUnit,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
            expiryDate: item.expiryDate || "",
            purchaseId: String(purchase._id),
          }],
        });
      } else {
        (invItem as any).totalQuantity = ((invItem as any).totalQuantity || 0) + item.quantity;
        (invItem as any).batches.push({
          batchRef,
          vendorId: String(vendor._id),
          vendorName: vendor.name,
          quantity: item.quantity,
          remaining: item.quantity,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          expiryDate: item.expiryDate || "",
          purchaseId: String(purchase._id),
        });
        await invItem.save();
      }
    }

    res.status(201).json({ purchase: serializePurchase(purchase) });
  } catch (err) {
    req.log.error({ err }, "Failed to create purchase");
    res.status(500).json({ error: "InternalError", message: "Failed to create purchase" });
  }
});

// ─── INVENTORY ROUTES ─────────────────────────────────────────────────────────

router.get("/inventory/all", async (req, res) => {
  try {
    const Inventory = getInventoryModel();
    const { search, sort = "productName_asc" } = req.query as Record<string, string>;

    const filter: Record<string, any> = {};
    if (search) filter.productName = new RegExp(search, "i");

    let sortObj: Record<string, 1 | -1> = { productName: 1 };
    if (sort === "quantity_desc") sortObj = { totalQuantity: -1 };
    else if (sort === "quantity_asc") sortObj = { totalQuantity: 1 };
    else if (sort === "updatedAt_desc") sortObj = { updatedAt: -1 };

    const items = await Inventory.find(filter).sort(sortObj);
    res.json({ inventory: items.map(serializeInventory), total: items.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get inventory");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch inventory" });
  }
});

export default router;
