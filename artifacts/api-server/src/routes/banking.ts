import { Router, type IRouter } from "express";
import { mongoose } from "../db/index.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();
router.use(requireAuth as any);

// ── Schemas ────────────────────────────────────────────────────────────────

const accountSchema = new mongoose.Schema(
  {
    accountName: { type: String, required: true, trim: true },
    bankName:    { type: String, required: true, trim: true },
    accountNo:   { type: String, default: "", trim: true },
    ifscCode:    { type: String, default: "", trim: true },
    balance:     { type: Number, default: 0 },
  },
  { timestamps: true },
);

const receiptSchema = new mongoose.Schema(
  {
    date:                 { type: Date, required: true },
    paymentMode:          { type: String, required: true, trim: true },
    depositAccountName:   { type: String, required: true, trim: true },
    oppositeAccountName:  { type: String, required: true, trim: true },
    amount:               { type: Number, required: true },
    notes:                { type: String, default: "" },
  },
  { timestamps: true },
);

const paymentSchema = new mongoose.Schema(
  {
    date:                 { type: Date, required: true },
    paymentMode:          { type: String, required: true, trim: true },
    depositAccountName:   { type: String, required: true, trim: true },
    oppositeAccountName:  { type: String, required: true, trim: true },
    amount:               { type: Number, required: true },
    notes:                { type: String, default: "" },
  },
  { timestamps: true },
);

function getAccountModel() {
  if (mongoose.models["BankAccount"]) return mongoose.models["BankAccount"];
  return mongoose.model("BankAccount", accountSchema, "bank_accounts");
}

function getReceiptModel() {
  if (mongoose.models["BankReceipt"]) return mongoose.models["BankReceipt"];
  return mongoose.model("BankReceipt", receiptSchema, "bank_receipts");
}

function getPaymentModel() {
  if (mongoose.models["BankPayment"]) return mongoose.models["BankPayment"];
  return mongoose.model("BankPayment", paymentSchema, "bank_payments");
}

function toId(id: string) {
  try { return new mongoose.Types.ObjectId(id); } catch { return null; }
}

function serializeAccount(doc: any) {
  return {
    id:          String(doc._id),
    accountName: doc.accountName ?? "",
    bankName:    doc.bankName ?? "",
    accountNo:   doc.accountNo ?? "",
    ifscCode:    doc.ifscCode ?? "",
    balance:     doc.balance ?? 0,
    createdAt:   doc.createdAt,
    updatedAt:   doc.updatedAt,
  };
}

function serializeTx(doc: any) {
  return {
    id:                   String(doc._id),
    date:                 doc.date,
    paymentMode:          doc.paymentMode ?? "",
    depositAccountName:   doc.depositAccountName ?? "",
    oppositeAccountName:  doc.oppositeAccountName ?? "",
    amount:               doc.amount ?? 0,
    notes:                doc.notes ?? "",
    createdAt:            doc.createdAt,
    updatedAt:            doc.updatedAt,
  };
}

// ── Accounts ───────────────────────────────────────────────────────────────

router.get("/accounts", async (_req, res) => {
  try {
    const Account = getAccountModel();
    const docs = await Account.find().sort({ createdAt: -1 });
    res.json(docs.map(serializeAccount));
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/accounts", async (req, res) => {
  try {
    const Account = getAccountModel();
    const doc = await Account.create(req.body);
    res.status(201).json(serializeAccount(doc));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

router.put("/accounts/:id", async (req, res) => {
  try {
    const Account = getAccountModel();
    const oid = toId(req.params.id);
    if (!oid) return res.status(400).json({ message: "Invalid id" });
    const doc = await Account.findByIdAndUpdate(oid, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Account not found" });
    res.json(serializeAccount(doc));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

router.delete("/accounts/:id", async (req, res) => {
  try {
    const Account = getAccountModel();
    const oid = toId(req.params.id);
    if (!oid) return res.status(400).json({ message: "Invalid id" });
    const doc = await Account.findByIdAndDelete(oid);
    if (!doc) return res.status(404).json({ message: "Account not found" });
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Receipts ───────────────────────────────────────────────────────────────

router.get("/receipts", async (_req, res) => {
  try {
    const Receipt = getReceiptModel();
    const docs = await Receipt.find().sort({ date: -1, createdAt: -1 });
    res.json(docs.map(serializeTx));
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/receipts", async (req, res) => {
  try {
    const Receipt = getReceiptModel();
    const doc = await Receipt.create(req.body);
    res.status(201).json(serializeTx(doc));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

router.put("/receipts/:id", async (req, res) => {
  try {
    const Receipt = getReceiptModel();
    const oid = toId(req.params.id);
    if (!oid) return res.status(400).json({ message: "Invalid id" });
    const doc = await Receipt.findByIdAndUpdate(oid, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Receipt not found" });
    res.json(serializeTx(doc));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

router.delete("/receipts/:id", async (req, res) => {
  try {
    const Receipt = getReceiptModel();
    const oid = toId(req.params.id);
    if (!oid) return res.status(400).json({ message: "Invalid id" });
    const doc = await Receipt.findByIdAndDelete(oid);
    if (!doc) return res.status(404).json({ message: "Receipt not found" });
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ── Payments ───────────────────────────────────────────────────────────────

router.get("/payments", async (_req, res) => {
  try {
    const Payment = getPaymentModel();
    const docs = await Payment.find().sort({ date: -1, createdAt: -1 });
    res.json(docs.map(serializeTx));
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/payments", async (req, res) => {
  try {
    const Payment = getPaymentModel();
    const doc = await Payment.create(req.body);
    res.status(201).json(serializeTx(doc));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

router.put("/payments/:id", async (req, res) => {
  try {
    const Payment = getPaymentModel();
    const oid = toId(req.params.id);
    if (!oid) return res.status(400).json({ message: "Invalid id" });
    const doc = await Payment.findByIdAndUpdate(oid, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Payment not found" });
    res.json(serializeTx(doc));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

router.delete("/payments/:id", async (req, res) => {
  try {
    const Payment = getPaymentModel();
    const oid = toId(req.params.id);
    if (!oid) return res.status(400).json({ message: "Invalid id" });
    const doc = await Payment.findByIdAndDelete(oid);
    if (!doc) return res.status(404).json({ message: "Payment not found" });
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
