import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { getCustomersConnection } from "../db/customers-connection.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();
router.use(requireAuth as any);

const customerSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    dateOfBirth: String,
    addresses: { type: Array, default: [] },
    orders: { type: Array, default: [] },
  },
  { timestamps: true }
);

async function getCustomerModel() {
  const conn = await getCustomersConnection();
  if (conn.models["Customer"]) return conn.models["Customer"];
  return conn.model("Customer", customerSchema, "customers");
}

function serializeCustomer(doc: any) {
  return {
    id: String(doc._id),
    name: doc.name ?? "",
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    dateOfBirth: doc.dateOfBirth ?? "",
    addresses: doc.addresses ?? [],
    orders: doc.orders ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

router.get("/", async (req, res) => {
  try {
    const Customer = await getCustomerModel();
    const { search, sort = "createdAt_desc", page = "1", limit = "20" } = req.query as Record<string, string>;

    const filter: Record<string, any> = {};
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === "name_asc") sortObj = { name: 1 };
    else if (sort === "name_desc") sortObj = { name: -1 };
    else if (sort === "email_asc") sortObj = { email: 1 };
    else if (sort === "email_desc") sortObj = { email: -1 };
    else if (sort === "createdAt_asc") sortObj = { createdAt: 1 };
    else if (sort === "createdAt_desc") sortObj = { createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort(sortObj).skip(skip).limit(limitNum),
      Customer.countDocuments(filter),
    ]);

    res.json({ customers: customers.map(serializeCustomer), total, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err }, "Failed to get customers");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch customers" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const Customer = await getCustomerModel();
    const customer = await Customer.findById(req.params.id);
    if (!customer) { res.status(404).json({ error: "NotFound", message: "Customer not found" }); return; }
    res.json({ customer: serializeCustomer(customer) });
  } catch (err) {
    req.log.error({ err }, "Failed to get customer");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch customer" });
  }
});

router.post("/", async (req, res) => {
  try {
    const Customer = await getCustomerModel();
    const { name, email, phone, dateOfBirth, addresses } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: "ValidationError", message: "Name and email are required" });
      return;
    }

    const existing = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(400).json({ error: "DuplicateEmail", message: "A customer with this email already exists" });
      return;
    }

    const customer = await Customer.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() ?? "",
      dateOfBirth: dateOfBirth ?? "",
      addresses: addresses ?? [],
      orders: [],
    });

    res.status(201).json({ customer: serializeCustomer(customer) });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ error: "DuplicateEmail", message: "A customer with this email already exists" });
      return;
    }
    req.log.error({ err }, "Failed to create customer");
    res.status(500).json({ error: "InternalError", message: "Failed to create customer" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const Customer = await getCustomerModel();
    const customer = await Customer.findById(req.params.id);
    if (!customer) { res.status(404).json({ error: "NotFound", message: "Customer not found" }); return; }

    const { name, email, phone, dateOfBirth, addresses } = req.body;

    if (email && email.toLowerCase().trim() !== String(customer.email)) {
      const existing = await Customer.findOne({ email: email.toLowerCase().trim(), _id: { $ne: customer._id } });
      if (existing) {
        res.status(400).json({ error: "DuplicateEmail", message: "A customer with this email already exists" });
        return;
      }
    }

    if (name !== undefined) customer.name = name.trim();
    if (email !== undefined) customer.email = email.toLowerCase().trim();
    if (phone !== undefined) (customer as any).phone = phone.trim();
    if (dateOfBirth !== undefined) (customer as any).dateOfBirth = dateOfBirth;
    if (addresses !== undefined) (customer as any).addresses = addresses;

    await customer.save();
    res.json({ customer: serializeCustomer(customer) });
  } catch (err) {
    req.log.error({ err }, "Failed to update customer");
    res.status(500).json({ error: "InternalError", message: "Failed to update customer" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const Customer = await getCustomerModel();
    const customer = await Customer.findById(req.params.id);
    if (!customer) { res.status(404).json({ error: "NotFound", message: "Customer not found" }); return; }
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete customer");
    res.status(500).json({ error: "InternalError", message: "Failed to delete customer" });
  }
});

export default router;
