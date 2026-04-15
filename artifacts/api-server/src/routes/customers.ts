import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { getCustomersConnection } from "../db/customers-connection.js";
import { getSubHubDbConnection } from "../db/sub-hub-connections.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();
router.use(requireAuth as any);

const ACTIVE_ORDER_STATUSES = new Set(["pending", "confirmed", "preparing", "out_for_delivery"]);

const customerSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    dateOfBirth: String,
    addresses: { type: Array, default: [] },
    orders: { type: Array, default: [] },
    usedCoupons: { type: Array, default: [] },
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
    usedCoupons: doc.usedCoupons ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function normalize(value: any) {
  return String(value ?? "").trim().toLowerCase();
}

function getOrderId(order: any) {
  return String(order?._id ?? order?.id ?? order?.orderId ?? "");
}

function matchesCustomer(order: any, customer: any) {
  const phone = normalize(customer.phone);
  const email = normalize(customer.email);
  const name = normalize(customer.name);
  const id = normalize(customer.id);

  const orderPhones = [
    order.phone,
    order.customerPhone,
    order.mobile,
    order.customer?.phone,
    order.deliveryAddress?.phone,
  ].map(normalize).filter(Boolean);

  const orderEmails = [
    order.email,
    order.customerEmail,
    order.customer?.email,
  ].map(normalize).filter(Boolean);

  const orderNames = [
    order.customerName,
    order.name,
    order.customer?.name,
  ].map(normalize).filter(Boolean);

  const orderCustomerIds = [
    order.customerId,
    order.userId,
    order.customer?._id,
    order.customer?.id,
  ].map(normalize).filter(Boolean);

  return (
    (phone && orderPhones.includes(phone)) ||
    (email && orderEmails.includes(email)) ||
    (id && orderCustomerIds.includes(id)) ||
    (name && orderNames.includes(name))
  );
}

function buildOrdersQuery(customers: any[]) {
  const phones = [...new Set(customers.map((c) => normalize(c.phone)).filter(Boolean))];
  const emails = [...new Set(customers.map((c) => normalize(c.email)).filter(Boolean))];
  const names = [...new Set(customers.map((c) => normalize(c.name)).filter(Boolean))];
  const ids = [...new Set(customers.map((c) => String(c.id)).filter(Boolean))];
  const orderIds = customers
    .flatMap((c) => (Array.isArray(c.orders) ? c.orders : []))
    .map(getOrderId)
    .filter(Boolean);
  const objectIds = orderIds
    .map((id) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const or: any[] = [];
  if (phones.length) {
    or.push({ phone: { $in: phones } }, { customerPhone: { $in: phones } }, { "customer.phone": { $in: phones } });
  }
  if (emails.length) {
    or.push({ email: { $in: emails } }, { customerEmail: { $in: emails } }, { "customer.email": { $in: emails } });
  }
  if (names.length) {
    or.push({ customerName: { $in: names } }, { name: { $in: names } }, { "customer.name": { $in: names } });
  }
  if (ids.length) {
    or.push({ customerId: { $in: ids } }, { userId: { $in: ids } }, { "customer.id": { $in: ids } });
  }
  if (objectIds.length) {
    or.push({ _id: { $in: objectIds } });
  }
  return or.length ? { $or: or } : null;
}

async function enrichCustomers(customers: any[], log?: any) {
  if (!customers.length) return customers;
  const query = buildOrdersQuery(customers);
  if (!query) return customers.map((c) => ({ ...c, currentOrders: [], orderHistory: c.orders ?? [] }));

  let liveOrders: any[] = [];
  try {
    const ordersConn = await getSubHubDbConnection("orders");
    liveOrders = await ordersConn.db.collection("orders").find(query).sort({ createdAt: -1 }).limit(1000).toArray();
  } catch (err) {
    log?.warn?.({ err }, "Could not enrich customers with live orders");
  }

  return customers.map((customer) => {
    const linkedOrders = liveOrders.filter((order) => matchesCustomer(order, customer));
    const combined = [...(Array.isArray(customer.orders) ? customer.orders : []), ...linkedOrders];
    const seen = new Set<string>();
    const orders = combined.filter((order) => {
      const id = getOrderId(order);
      const key = id || JSON.stringify(order);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const currentOrders = orders.filter((order) => ACTIVE_ORDER_STATUSES.has(normalize(order.status)));
    const orderHistory = orders.filter((order) => !ACTIVE_ORDER_STATUSES.has(normalize(order.status)));
    return { ...customer, orders, currentOrders, orderHistory };
  });
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

    const enriched = await enrichCustomers(customers.map(serializeCustomer), req.log);
    res.json({ customers: enriched, total, page: pageNum, limit: limitNum });
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
    const [enriched] = await enrichCustomers([serializeCustomer(customer)], req.log);
    res.json({ customer: enriched });
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
