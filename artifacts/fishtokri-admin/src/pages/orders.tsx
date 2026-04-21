import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Search, X, RefreshCw, ClipboardList, Clock, CheckCircle2, XCircle,
  Truck, Package, ChevronLeft, ChevronRight, Eye, MapPin,
  Phone, User, SlidersHorizontal, ArrowUpDown, UserCheck,
  ShoppingBag, Building2, AlertCircle, ChevronDown, Check,
  Pencil, Trash2, Plus, Store, Home, Trash, Mail, Calendar, Tag, Ticket, Zap,
  Wallet, CreditCard, Banknote, Smartphone, Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

function getToken() {
  return localStorage.getItem("fishtokri_token") || "";
}
function getBase() {
  return import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${getBase()}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? "Request failed");
  }
  return res.json();
}

// ─── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:   { label: "Pending",   color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",   icon: Clock },
  confirmed: { label: "Confirmed", color: "text-blue-600",    bg: "bg-blue-50 border-blue-200",     icon: CheckCircle2 },
  preparing: { label: "Preparing", color: "text-purple-600",  bg: "bg-purple-50 border-purple-200", icon: Package },
  out_for_delivery: { label: "Out for Delivery", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200", icon: Truck },
  delivered: { label: "Delivered", color: "text-green-600",   bg: "bg-green-50 border-green-200",   icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-600",     bg: "bg-red-50 border-red-200",       icon: XCircle },
};

const ACTIVE_STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery"];
const HISTORY_STATUSES = ["delivered", "cancelled"];
const ALL_STATUSES = Object.keys(STATUS_CONFIG);

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function formatDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRupees(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function orderTotal(items: any[]) {
  return (items ?? []).reduce((s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
}

// ─── ADDRESS FORMATTING ───────────────────────────────────────────────────────
function getAddressFields(a: any) {
  if (!a) return null;
  return {
    label: a.label || a.type || "",
    contactName: a.name || a.contactName || "",
    phone: a.phone || a.contactPhone || a.mobile || "",
    houseNo: a.houseNo || a.flatNo || a.house || a.apartment || "",
    building: a.building || a.buildingName || a.society || "",
    street: a.street || a.streetName || a.road || a.addressLine1 || "",
    area: a.area || a.locality || a.neighbourhood || "",
    landmark: a.landmark || "",
    city: a.city || "",
    state: a.state || "",
    pincode: a.pincode || a.zipCode || a.zip || "",
    instructions: a.instructions || a.deliveryInstructions || "",
    isDefault: !!a.isDefault,
  };
}

function formatAddressLines(a: any): string[] {
  const f = getAddressFields(a);
  if (!f) return [];
  const lines = [
    [f.houseNo, f.building].filter(Boolean).join(", "),
    [f.street, f.area].filter(Boolean).join(", "),
    f.landmark ? `Landmark: ${f.landmark}` : "",
    [f.city, f.state, f.pincode].filter(Boolean).join(", "),
  ].filter(Boolean);
  // Fallbacks for legacy short-form addresses
  if (lines.length === 0) {
    const legacy = a?.address || a?.line1 || a?.fullAddress || "";
    if (legacy) lines.push(legacy);
    if (f.area && !legacy.includes(f.area)) lines.push(f.area);
  }
  return lines;
}

function formatAddressOneLine(a: any): string {
  return formatAddressLines(a).join(" · ");
}

// ─── FILTER DELIVERY PERSONS BY HUB ───────────────────────────────────────────
function getDeliveryPersonsForOrder(order: any, allPersons: any[]) {
  const orderSuperIds: string[] = [
    ...(Array.isArray(order.superHubIds) ? order.superHubIds : []),
    ...(order.superHubId ? [String(order.superHubId)] : []),
  ].map(String).filter(Boolean);

  const orderSubIds: string[] = [
    ...(Array.isArray(order.subHubIds) ? order.subHubIds : []),
    ...(order.subHubId ? [String(order.subHubId)] : []),
  ].map(String).filter(Boolean);

  if (orderSuperIds.length === 0 && orderSubIds.length === 0) {
    return { persons: allPersons, filtered: false };
  }

  const matched = allPersons.filter((p) => {
    const pSuperIds = (p.superHubIds ?? []).map(String);
    const pSubIds = (p.subHubIds ?? []).map(String);
    const matchesSuper = orderSuperIds.some((id) => pSuperIds.includes(id) || String(p.superHubId) === id);
    const matchesSub = orderSubIds.some((id) => pSubIds.includes(id) || String(p.subHubId) === id);
    return matchesSuper || matchesSub;
  });

  return { persons: matched, filtered: true };
}

// ─── HUB BADGE ─────────────────────────────────────────────────────────────────
function HubBadge({ person }: { person: any }) {
  const hubs = [
    ...(person.superHubNames ?? (person.superHubName ? [person.superHubName] : [])),
    ...(person.subHubNames ?? (person.subHubName ? [person.subHubName] : [])),
  ].filter(Boolean);

  if (hubs.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
      <Building2 className="w-2.5 h-2.5" />
      {hubs[0]}{hubs.length > 1 ? ` +${hubs.length - 1}` : ""}
    </span>
  );
}

// ─── INLINE DELIVERY ASSIGN ───────────────────────────────────────────────────
function InlineDeliverySelect({
  order,
  persons,
  saving,
  onAssign,
}: {
  order: any;
  persons: any[];
  saving: boolean;
  onAssign: (orderId: string, personId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { persons: filtered, filtered: isFiltered } = getDeliveryPersonsForOrder(order, persons);
  const assigned = order.assignedDeliveryPersonId;
  const assignedName = order.assignedDeliveryPersonName;

  if (saving) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="w-4 h-4 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
        <span className="text-[11px] text-gray-400">Saving…</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`group flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all w-full max-w-[175px] hover:shadow-sm
            ${assigned
              ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
              : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-white hover:border-gray-300"
            }`}
        >
          {assigned ? (
            <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0">
              <Truck className="w-3 h-3 text-orange-600" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 text-gray-400" />
            </div>
          )}
          <span className="flex-1 text-left truncate leading-tight">
            {assigned ? assignedName || "Assigned" : "Unassigned"}
          </span>
          <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""} ${assigned ? "text-orange-400" : "text-gray-300"}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64 shadow-xl border border-gray-100 rounded-2xl overflow-hidden" align="start" sideOffset={6}>
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50/80">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assign Delivery Partner</p>
          {isFiltered && (
            <p className="text-[10px] text-blue-500 flex items-center gap-0.5 mt-0.5">
              <Building2 className="w-2.5 h-2.5" />
              {filtered.length} hub partner{filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Options list */}
        <div className="max-h-56 overflow-y-auto py-1">
          {/* Unassign option */}
          <button
            onClick={() => { onAssign(String(order._id), ""); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 transition-colors group ${!assigned ? "bg-gray-50/50" : ""}`}
          >
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100">
              <X className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-400" />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-red-500">Remove assignment</span>
            {!assigned && <Check className="w-3 h-3 text-gray-300 ml-auto" />}
          </button>

          {/* Divider */}
          <div className="mx-3 my-1 border-t border-gray-100" />

          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <User className="w-6 h-6 text-gray-200 mx-auto mb-1" />
              <p className="text-[11px] text-gray-400">No partners for this hub</p>
            </div>
          ) : (
            filtered.map((p) => {
              const isSelected = assigned === p.id;
              const hubs = [
                ...(p.superHubNames ?? (p.superHubName ? [p.superHubName] : [])),
                ...(p.subHubNames ?? (p.subHubName ? [p.subHubName] : [])),
              ].filter(Boolean);
              return (
                <button
                  key={p.id}
                  onClick={() => { onAssign(String(order._id), p.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-orange-50 transition-colors text-left
                    ${isSelected ? "bg-orange-50/80" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs
                    ${isSelected ? "bg-orange-200 text-orange-700" : "bg-[#162B4D]/10 text-[#162B4D]"}`}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isSelected ? "text-orange-700" : "text-[#162B4D]"}`}>{p.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {p.phone && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5" />{p.phone}
                        </span>
                      )}
                      {hubs.length > 0 && (
                        <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1 py-0.5 rounded-full flex items-center gap-0.5">
                          <Building2 className="w-2 h-2" />{hubs[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function Orders() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const isCreatePage = location === "/orders/new" || location.endsWith("/orders/new");

  const [activeTab, setActiveTab] = useState<"current" | "history" | "all">("current");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Data
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<Record<string, number>>({});

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Payment-on-deliver dialog
  const [deliverPayOpen, setDeliverPayOpen] = useState(false);
  const [deliverPayStatus, setDeliverPayStatus] = useState<"unpaid" | "partial" | "paid">("paid");
  const [deliverPayEntries, setDeliverPayEntries] = useState<{ mode: string; amount: string; reference: string }[]>([]);

  // Delivery assignment
  const [deliveryPersons, setDeliveryPersons] = useState<any[]>([]);
  const [assigningDelivery, setAssigningDelivery] = useState(false);
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState("");
  const [inlineAssigningId, setInlineAssigningId] = useState<string | null>(null);
  const [showAllPersons, setShowAllPersons] = useState(false);

  // Edit order
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editForm, setEditForm] = useState({ customerName: "", phone: "", address: "", deliveryArea: "", notes: "", status: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete order
  const [deletingOrder, setDeletingOrder] = useState<any>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Create order
  // Create-order open state is driven by URL (/orders/new)
  const [creatingSaving, setCreatingSaving] = useState(false);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [chosenCustomer, setChosenCustomer] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", alternatePhone: "", dateOfBirth: "", gender: "", notes: "" });
  const [orderItems, setOrderItems] = useState<{ name: string; price: string; quantity: string; unit: string }[]>([]);
  const [orderDeliveryType, setOrderDeliveryType] = useState<"delivery" | "takeaway">("delivery");
  const [orderAddressMode, setOrderAddressMode] = useState<"saved" | "new">("saved");
  const [selectedAddressIdx, setSelectedAddressIdx] = useState<number | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: "Home", contactName: "", phone: "",
    houseNo: "", building: "", street: "", area: "", landmark: "",
    city: "", state: "", pincode: "", instructions: "",
  });
  const [orderNotes, setOrderNotes] = useState("");

  // Hub & product picker state
  const [superHubs, setSuperHubs] = useState<any[]>([]);
  const [loadingSuperHubs, setLoadingSuperHubs] = useState(false);
  const [selectedSuperHubId, setSelectedSuperHubId] = useState<string>("");
  const [subHubs, setSubHubs] = useState<any[]>([]);
  const [loadingSubHubs, setLoadingSubHubs] = useState(false);
  const [selectedSubHubId, setSelectedSubHubId] = useState<string>("");
  const [subHubProducts, setSubHubProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<{ productId: string; name: string; price: number; unit: string; quantity: number }[]>([]);

  // Coupons / timeslots / scheduling
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [appliedCouponIds, setAppliedCouponIds] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState<string>("");
  const [couponError, setCouponError] = useState<string>("");
  const [timeslots, setTimeslots] = useState<any[]>([]);
  const [loadingTimeslots, setLoadingTimeslots] = useState(false);
  const [selectedTimeslotId, setSelectedTimeslotId] = useState<string>("");
  const [orderScheduleType, setOrderScheduleType] = useState<"instant" | "slot">("slot");
  const [orderDate, setOrderDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Payment
  type PaymentEntry = { mode: string; amount: string; reference: string };
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "partial" | "paid">("unpaid");
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);

  const resetCreateForm = useCallback(() => {
    setCustomerMode("existing");
    setCustomerSearch(""); setChosenCustomer(null); setCustomerDropdownOpen(false);
    setNewCustomer({ name: "", phone: "", email: "", alternatePhone: "", dateOfBirth: "", gender: "", notes: "" });
    setOrderItems([]);
    setOrderDeliveryType("delivery");
    setOrderAddressMode("saved"); setSelectedAddressIdx(null);
    setNewAddress({
      label: "Home", contactName: "", phone: "",
      houseNo: "", building: "", street: "", area: "", landmark: "",
      city: "", state: "", pincode: "", instructions: "",
    });
    setOrderNotes("");
    setSelectedSuperHubId(""); setSelectedSubHubId("");
    setSubHubs([]); setSubHubProducts([]); setSelectedProducts([]);
    setProductSearch(""); setProductPickerOpen(false);
    setCoupons([]); setAppliedCouponIds([]); setCouponCode(""); setCouponError("");
    setTimeslots([]); setSelectedTimeslotId("");
    setOrderScheduleType("slot");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setPaymentStatus("unpaid");
    setPaymentEntries([]);
  }, []);

  // Load all customers when create-order modal opens
  useEffect(() => {
    if (!isCreatePage) return;
    if (allCustomers.length === 0) {
      setLoadingCustomers(true);
      apiFetch(`/api/customers?limit=100&sort=name_asc`)
        .then((d) => setAllCustomers(d.customers ?? []))
        .catch(() => setAllCustomers([]))
        .finally(() => setLoadingCustomers(false));
    }
    if (superHubs.length === 0) {
      setLoadingSuperHubs(true);
      apiFetch(`/api/super-hubs`)
        .then((d) => setSuperHubs(d.superHubs ?? []))
        .catch(() => setSuperHubs([]))
        .finally(() => setLoadingSuperHubs(false));
    }
  }, [isCreatePage, allCustomers.length, superHubs.length]);

  // Load sub-hubs when super-hub changes
  useEffect(() => {
    if (!selectedSuperHubId) { setSubHubs([]); setSelectedSubHubId(""); return; }
    setLoadingSubHubs(true);
    apiFetch(`/api/super-hubs/${selectedSuperHubId}/sub-hubs`)
      .then((d) => setSubHubs(d.subHubs ?? []))
      .catch(() => setSubHubs([]))
      .finally(() => setLoadingSubHubs(false));
    setSelectedSubHubId("");
    setSubHubProducts([]);
    setSelectedProducts([]);
  }, [selectedSuperHubId]);

  // Load products, coupons, timeslots when sub-hub changes
  useEffect(() => {
    if (!selectedSubHubId) {
      setSubHubProducts([]); setCoupons([]); setTimeslots([]);
      setAppliedCouponIds([]); setSelectedTimeslotId("");
      return;
    }
    setLoadingProducts(true);
    apiFetch(`/api/sub-hubs/${selectedSubHubId}/menu/products`)
      .then((d) => setSubHubProducts(d.products ?? []))
      .catch(() => setSubHubProducts([]))
      .finally(() => setLoadingProducts(false));

    setLoadingCoupons(true);
    apiFetch(`/api/sub-hubs/${selectedSubHubId}/menu/coupons`)
      .then((d) => setCoupons(d.coupons ?? []))
      .catch(() => setCoupons([]))
      .finally(() => setLoadingCoupons(false));

    setLoadingTimeslots(true);
    apiFetch(`/api/sub-hubs/${selectedSubHubId}/menu/timeslots`)
      .then((d) => setTimeslots(d.timeslots ?? []))
      .catch(() => setTimeslots([]))
      .finally(() => setLoadingTimeslots(false));

    setSelectedProducts([]);
    setAppliedCouponIds([]); setCouponCode(""); setCouponError("");
    setSelectedTimeslotId("");
  }, [selectedSubHubId]);

  const activeCoupons = useMemo(() => {
    const now = Date.now();
    return coupons.filter((c) => {
      if (c.isActive === false) return false;
      if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return false;
      return true;
    });
  }, [coupons]);

  const activeTimeslots = useMemo(() => timeslots.filter((t) => t.isActive !== false), [timeslots]);

  const productCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of subHubProducts) {
      const cat = String(p.category || "").trim() || "Uncategorized";
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subHubProducts]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    let list = subHubProducts;
    if (pickerCategory) {
      const target = pickerCategory === "Uncategorized" ? "" : pickerCategory.toLowerCase();
      list = list.filter((p) => {
        const c = String(p.category ?? "").trim().toLowerCase();
        return target === "" ? c === "" : c === target;
      });
    }
    if (!q) return list;
    return list.filter((p) =>
      [p.name, p.category, p.subCategory].some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [subHubProducts, productSearch, pickerCategory]);

  const filteredCategories = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return productCategories;
    return productCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [productCategories, productSearch]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return allCustomers;
    return allCustomers.filter((c) =>
      [c.name, c.email, c.phone].some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [allCustomers, customerSearch]);

  const itemsSubtotal = useMemo(() => {
    const customSum = orderItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
    const productSum = selectedProducts.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0);
    return customSum + productSum;
  }, [orderItems, selectedProducts]);

  const totalItemCount = useMemo(() => {
    const cust = orderItems.filter((it) => it.name.trim() && Number(it.quantity) > 0).length;
    return cust + selectedProducts.length;
  }, [orderItems, selectedProducts]);

  const appliedCoupons = useMemo(
    () => appliedCouponIds
      .map((id) => activeCoupons.find((c) => String(c._id) === id))
      .filter(Boolean) as any[],
    [activeCoupons, appliedCouponIds]
  );

  const couponDiscount = useMemo(() => {
    if (appliedCoupons.length === 0) return 0;
    let total = 0;
    for (const c of appliedCoupons) {
      const min = Number(c.minOrderAmount) || 0;
      if (itemsSubtotal < min) continue;
      const v = Number(c.discountValue) || 0;
      if (c.type === "percentage") {
        total += Math.round((itemsSubtotal * v) / 100);
      } else {
        total += v;
      }
    }
    return Math.min(itemsSubtotal, total);
  }, [appliedCoupons, itemsSubtotal]);

  const selectedTimeslot = useMemo(
    () => activeTimeslots.find((t) => String(t._id) === selectedTimeslotId) || null,
    [activeTimeslots, selectedTimeslotId]
  );

  const slotExtraCharge = useMemo(() => Number(selectedTimeslot?.extraCharge) || 0, [selectedTimeslot]);

  const newOrderTotal = useMemo(
    () => Math.max(0, itemsSubtotal - couponDiscount + slotExtraCharge),
    [itemsSubtotal, couponDiscount, slotExtraCharge]
  );

  const paidTotal = useMemo(
    () => paymentEntries.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [paymentEntries]
  );
  const dueAmount = Math.max(0, newOrderTotal - paidTotal);

  const PAYMENT_MODES = [
    { value: "cash", label: "Cash", Icon: Banknote },
    { value: "upi", label: "UPI", Icon: Smartphone },
    { value: "card", label: "Card", Icon: CreditCard },
    { value: "bank_transfer", label: "Bank Transfer", Icon: Landmark },
    { value: "wallet", label: "Wallet", Icon: Wallet },
    { value: "other", label: "Other", Icon: Tag },
  ];

  // Auto-populate / clear entries on status change
  useEffect(() => {
    if (paymentStatus === "unpaid") {
      if (paymentEntries.length > 0) setPaymentEntries([]);
      return;
    }
    if (paymentEntries.length === 0) {
      setPaymentEntries([
        {
          mode: "cash",
          amount: paymentStatus === "paid" ? String(newOrderTotal || 0) : "",
          reference: "",
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus]);

  const toggleCoupon = (id: string) => {
    setAppliedCouponIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
    setCouponError("");
  };

  const applyCouponByCode = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponError("Enter a coupon code"); return; }
    const match = activeCoupons.find((c) => String(c.code).toUpperCase() === code);
    if (!match) { setCouponError("Invalid or inactive coupon"); return; }
    const min = Number(match.minOrderAmount) || 0;
    if (itemsSubtotal < min) { setCouponError(`Min order ₹${min} required`); return; }
    const id = String(match._id);
    if (appliedCouponIds.includes(id)) { setCouponError("Coupon already applied"); return; }
    setAppliedCouponIds((ids) => [...ids, id]);
    setCouponCode("");
    setCouponError("");
  };

  const handleCreateOrder = async () => {
    // Validate customer
    let customerName = "";
    let phone = "";
    let email = "";
    let customerId: string | undefined;

    if (customerMode === "existing") {
      if (!chosenCustomer) {
        toast({ title: "Select a customer", description: "Pick an existing customer or switch to 'New Customer'.", variant: "destructive" });
        return;
      }
      customerName = chosenCustomer.name;
      phone = chosenCustomer.phone;
      email = chosenCustomer.email;
      customerId = chosenCustomer.id;
    } else {
      if (!newCustomer.name.trim()) {
        toast({ title: "Customer name required", variant: "destructive" });
        return;
      }
      const phoneTrim = newCustomer.phone.trim();
      if (!phoneTrim) {
        toast({ title: "Phone number required", description: "Phone is required for new customers.", variant: "destructive" });
        return;
      }
      if (!/^\d{10}$/.test(phoneTrim)) {
        toast({ title: "Invalid phone", description: "Phone must be a 10-digit number.", variant: "destructive" });
        return;
      }
      customerName = newCustomer.name.trim();
      phone = phoneTrim;
      email = newCustomer.email.trim();
    }

    // Validate hub
    if (!selectedSuperHubId || !selectedSubHubId) {
      toast({ title: "Select a hub", description: "Choose both super-hub and sub-hub to fulfil this order.", variant: "destructive" });
      return;
    }

    // Validate items (products + custom)
    const productItems = selectedProducts
      .filter((p) => p.quantity > 0)
      .map((p) => ({ productId: p.productId, name: p.name, price: p.price, quantity: p.quantity, unit: p.unit }));
    const customItems = orderItems
      .map((it) => ({
        name: it.name.trim(),
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 0,
        unit: it.unit.trim(),
      }))
      .filter((it) => it.name && it.quantity > 0);
    const cleanItems = [...productItems, ...customItems];
    if (cleanItems.length === 0) {
      toast({ title: "Add at least one item", description: "Pick a product from the sub-hub catalog or add a custom item.", variant: "destructive" });
      return;
    }

    // Resolve address for delivery
    let address = "";
    let deliveryArea = "";
    let deliveryAddressDetail: any = undefined;
    if (orderDeliveryType === "delivery") {
      if (chosenCustomer && orderAddressMode === "saved" && selectedAddressIdx !== null) {
        const a = (chosenCustomer.addresses ?? [])[selectedAddressIdx];
        address = formatAddressOneLine(a) || a?.address || a?.line1 || a?.fullAddress || "";
        const f = getAddressFields(a);
        deliveryArea = f?.area || f?.city || "";
        deliveryAddressDetail = a;
      } else {
        const f = newAddress;
        if (!f.pincode || !/^\d{6}$/.test(f.pincode)) {
          toast({ title: "Pincode required", description: "Enter a valid 6-digit pincode for the delivery address.", variant: "destructive" });
          return;
        }
        if (!f.city) {
          toast({ title: "City required", description: "Enter a city for the delivery address.", variant: "destructive" });
          return;
        }
        address = formatAddressOneLine(f);
        deliveryArea = f.area || f.city || "";
        deliveryAddressDetail = { ...f };
      }
      if (!address) {
        toast({ title: "Delivery address required", variant: "destructive" });
        return;
      }
    }

    const superHub = superHubs.find((h) => h.id === selectedSuperHubId);
    const subHub = subHubs.find((h) => h.id === selectedSubHubId);

    // Validate scheduling (only for delivery orders — takeaway is instant for today)
    if (orderDeliveryType === "delivery") {
      if (orderScheduleType === "slot" && activeTimeslots.length > 0 && !selectedTimeslotId) {
        toast({ title: "Pick a delivery slot", description: "Select a time slot or switch to instant delivery.", variant: "destructive" });
        return;
      }
      if (!orderDate) {
        toast({ title: "Pick a delivery date", variant: "destructive" });
        return;
      }
    }

    // Validate payment
    if (paymentStatus !== "unpaid") {
      const validEntries = paymentEntries.filter((p) => p.mode && Number(p.amount) > 0);
      if (validEntries.length === 0) {
        toast({ title: "Add payment details", description: "Enter at least one payment with mode and amount.", variant: "destructive" });
        return;
      }
      if (paymentStatus === "paid" && paidTotal !== newOrderTotal) {
        toast({ title: "Payment mismatch", description: `Total paid (${formatRupees(paidTotal)}) must equal order total (${formatRupees(newOrderTotal)}).`, variant: "destructive" });
        return;
      }
      if (paymentStatus === "partial" && (paidTotal <= 0 || paidTotal >= newOrderTotal)) {
        toast({ title: "Invalid partial payment", description: `Paid amount must be between ₹0 and ${formatRupees(newOrderTotal)}.`, variant: "destructive" });
        return;
      }
    }

    setCreatingSaving(true);
    try {
      const payload: any = {
        customerId,
        customerName, phone, email,
        items: cleanItems,
        deliveryType: orderDeliveryType,
        address,
        deliveryArea,
        deliveryAddressDetail,
        superHubId: selectedSuperHubId,
        superHubName: superHub?.name ?? "",
        subHubId: selectedSubHubId,
        subHubName: subHub?.name ?? "",
        notes: orderNotes.trim(),
        status: "pending",
        createCustomerIfMissing: customerMode === "new",
        newCustomerExtras: customerMode === "new" ? {
          alternatePhone: newCustomer.alternatePhone.trim(),
          dateOfBirth: newCustomer.dateOfBirth.trim(),
          gender: newCustomer.gender.trim(),
          notes: newCustomer.notes.trim(),
        } : undefined,
        // Pricing breakdown
        subtotal: itemsSubtotal,
        discount: couponDiscount,
        slotCharge: slotExtraCharge,
        total: newOrderTotal,
        // Coupons (multi)
        couponId: appliedCoupons[0] ? String(appliedCoupons[0]._id) : undefined,
        couponCode: appliedCoupons[0]?.code,
        couponTitle: appliedCoupons[0]?.title,
        couponIds: appliedCoupons.map((c) => String(c._id)),
        couponCodes: appliedCoupons.map((c) => c.code),
        coupons: appliedCoupons.map((c) => ({
          id: String(c._id),
          code: c.code,
          title: c.title,
          type: c.type,
          discountValue: Number(c.discountValue) || 0,
          minOrderAmount: Number(c.minOrderAmount) || 0,
        })),
        // Payment
        paymentStatus,
        paidAmount: paidTotal,
        paymentMode: paymentEntries[0]?.mode,
        payments: paymentEntries
          .filter((p) => p.mode && Number(p.amount) > 0)
          .map((p) => ({
            mode: p.mode,
            amount: Number(p.amount) || 0,
            reference: p.reference?.trim() || "",
          })),
        // Schedule (takeaway is forced to instant fulfillment for today)
        scheduleType: orderDeliveryType === "takeaway" ? "instant" : orderScheduleType,
        deliveryDate: orderDeliveryType === "takeaway"
          ? new Date().toISOString().slice(0, 10)
          : orderDate,
        timeslotId: orderDeliveryType === "takeaway"
          ? undefined
          : (selectedTimeslot ? String(selectedTimeslot._id) : undefined),
        timeslotLabel: orderDeliveryType === "takeaway" ? undefined : selectedTimeslot?.label,
        timeslotStart: orderDeliveryType === "takeaway" ? undefined : selectedTimeslot?.startTime,
        timeslotEnd: orderDeliveryType === "takeaway" ? undefined : selectedTimeslot?.endTime,
      };
      await apiFetch("/api/orders", { method: "POST", body: JSON.stringify(payload) });
      toast({ title: "Order created", description: `${customerName} · ${formatRupees(cleanItems.reduce((s, i) => s + i.price * i.quantity, 0))}` });
      resetCreateForm();
      setLocation("/orders");
      load();
      loadStats();
    } catch (err: any) {
      toast({ title: "Failed to create order", description: err.message, variant: "destructive" });
    } finally {
      setCreatingSaving(false);
    }
  };

  useEffect(() => {
    apiFetch("/api/users?role=delivery_person&limit=100")
      .then((d) => setDeliveryPersons(d.users ?? []))
      .catch(() => {});
  }, []);

  // Persons to show in the modal (hub-filtered or all)
  const modalPersons = useMemo(() => {
    if (!selectedOrder) return deliveryPersons;
    const { persons, filtered } = getDeliveryPersonsForOrder(selectedOrder, deliveryPersons);
    if (showAllPersons || !filtered) return deliveryPersons;
    return persons;
  }, [selectedOrder, deliveryPersons, showAllPersons]);

  const modalFiltered = useMemo(() => {
    if (!selectedOrder) return false;
    const { filtered } = getDeliveryPersonsForOrder(selectedOrder, deliveryPersons);
    return filtered;
  }, [selectedOrder, deliveryPersons]);

  const modalFilteredCount = useMemo(() => {
    if (!selectedOrder) return deliveryPersons.length;
    const { persons } = getDeliveryPersonsForOrder(selectedOrder, deliveryPersons);
    return persons.length;
  }, [selectedOrder, deliveryPersons]);

  const effectiveStatus = useMemo(() => {
    if (statusFilter) return statusFilter;
    if (activeTab === "current") return ACTIVE_STATUSES.join(",");
    if (activeTab === "history") return HISTORY_STATUSES.join(",");
    return "";
  }, [activeTab, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: search,
        sort: sortField,
        order: sortDir,
        page: String(page),
        limit: String(LIMIT),
      });
      if (statusFilter) {
        params.set("status", statusFilter);
      } else if (activeTab === "current") {
        params.set("status", ACTIVE_STATUSES.join(","));
      } else if (activeTab === "history") {
        params.set("status", HISTORY_STATUSES.join(","));
      }
      if (deliveryTypeFilter) params.set("deliveryType", deliveryTypeFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const data = await apiFetch(`/api/orders?${params}`);
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch (err: any) {
      toast({ title: "Error loading orders", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [search, sortField, sortDir, page, activeTab, statusFilter, deliveryTypeFilter, dateFrom, dateTo, toast]);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiFetch("/api/orders/stats");
      setStatsData(data.stats ?? {});
    } catch { }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [activeTab, search, statusFilter, deliveryTypeFilter, dateFrom, dateTo, sortField, sortDir]);
  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !editStatus) return;

    // When marking as delivered, prompt for payment collection unless already fully paid.
    if (editStatus === "delivered" && selectedOrder.paymentStatus !== "paid") {
      const total = Number(selectedOrder.total) > 0
        ? Number(selectedOrder.total)
        : orderTotal(selectedOrder.items);
      const alreadyPaid = Number(selectedOrder.paidAmount) || 0;
      const due = Math.max(0, total - alreadyPaid);
      setDeliverPayStatus(due > 0 ? "paid" : "paid");
      setDeliverPayEntries([
        { mode: "cash", amount: String(due > 0 ? due : total), reference: "" },
      ]);
      setDeliverPayOpen(true);
      return;
    }

    setSavingStatus(true);
    try {
      await apiFetch(`/api/orders/${selectedOrder._id}`, { method: "PUT", body: JSON.stringify({ status: editStatus }) });
      toast({ title: "Order status updated" });
      setSelectedOrder((o: any) => ({ ...o, status: editStatus }));
      load();
      loadStats();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSavingStatus(false); }
  };

  const deliverPayPaidTotal = useMemo(
    () => deliverPayEntries.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [deliverPayEntries]
  );

  const handleDeliverWithPayment = async () => {
    if (!selectedOrder) return;
    const orderTotalAmount = Number(selectedOrder.total) > 0
      ? Number(selectedOrder.total)
      : orderTotal(selectedOrder.items);
    const existingPaid = Number(selectedOrder.paidAmount) || 0;
    const existingPayments: any[] = Array.isArray(selectedOrder.payments) ? selectedOrder.payments : [];

    if (deliverPayStatus !== "unpaid") {
      const validEntries = deliverPayEntries.filter((p) => p.mode && Number(p.amount) > 0);
      if (validEntries.length === 0) {
        toast({ title: "Add payment details", description: "Enter at least one payment with mode and amount.", variant: "destructive" });
        return;
      }
    }

    const newPaidTotal = existingPaid + (deliverPayStatus === "unpaid" ? 0 : deliverPayPaidTotal);
    if (deliverPayStatus === "paid" && newPaidTotal !== orderTotalAmount) {
      toast({ title: "Payment mismatch", description: `Total paid (${formatRupees(newPaidTotal)}) must equal order total (${formatRupees(orderTotalAmount)}).`, variant: "destructive" });
      return;
    }
    if (deliverPayStatus === "partial" && (newPaidTotal <= 0 || newPaidTotal >= orderTotalAmount)) {
      toast({ title: "Invalid partial payment", description: `Paid amount must be between ₹0 and ${formatRupees(orderTotalAmount)}.`, variant: "destructive" });
      return;
    }

    const mergedPayments = [
      ...existingPayments,
      ...(deliverPayStatus === "unpaid"
        ? []
        : deliverPayEntries
            .filter((p) => p.mode && Number(p.amount) > 0)
            .map((p) => ({
              mode: p.mode,
              amount: Number(p.amount) || 0,
              reference: p.reference?.trim() || "",
            }))),
    ];

    setSavingStatus(true);
    try {
      const payload: any = {
        status: "delivered",
        paymentStatus: deliverPayStatus,
        paidAmount: newPaidTotal,
        paymentMode: mergedPayments[0]?.mode,
        payments: mergedPayments,
      };
      await apiFetch(`/api/orders/${selectedOrder._id}`, { method: "PUT", body: JSON.stringify(payload) });
      toast({ title: "Marked as delivered", description: deliverPayStatus === "paid" ? "Payment recorded." : deliverPayStatus === "partial" ? "Partial payment recorded." : "No payment recorded." });
      setSelectedOrder((o: any) => ({
        ...o,
        status: "delivered",
        paymentStatus: deliverPayStatus,
        paidAmount: newPaidTotal,
        dueAmount: Math.max(0, orderTotalAmount - newPaidTotal),
        payments: mergedPayments,
      }));
      setDeliverPayOpen(false);
      load();
      loadStats();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingStatus(false);
    }
  };

  const inlineAssign = async (orderId: string, personId: string) => {
    setInlineAssigningId(orderId);
    try {
      const person = deliveryPersons.find((p) => p.id === personId);
      const payload = personId
        ? { assignedDeliveryPersonId: personId, assignedDeliveryPersonName: person?.name ?? "" }
        : { assignedDeliveryPersonId: "", assignedDeliveryPersonName: "" };
      await apiFetch(`/api/orders/${orderId}`, { method: "PUT", body: JSON.stringify(payload) });
      toast({ title: personId ? `Assigned to ${person?.name}` : "Assignment removed" });
      setOrders((prev) => prev.map((o) => String(o._id) === orderId ? { ...o, ...payload } : o));
      if (selectedOrder && String(selectedOrder._id) === orderId) setSelectedOrder((o: any) => ({ ...o, ...payload }));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setInlineAssigningId(null); }
  };

  const handleAssignDelivery = async () => {
    if (!selectedOrder) return;
    setAssigningDelivery(true);
    const resolvedId = selectedDeliveryPersonId === "__none__" ? "" : selectedDeliveryPersonId;
    try {
      const person = deliveryPersons.find((p) => p.id === resolvedId);
      const payload = resolvedId
        ? { assignedDeliveryPersonId: resolvedId, assignedDeliveryPersonName: person?.name ?? "" }
        : { assignedDeliveryPersonId: "", assignedDeliveryPersonName: "" };
      await apiFetch(`/api/orders/${selectedOrder._id}`, { method: "PUT", body: JSON.stringify(payload) });
      toast({ title: resolvedId ? `Assigned to ${person?.name}` : "Assignment removed" });
      setSelectedOrder((o: any) => ({ ...o, ...payload }));
      setOrders((prev) => prev.map((o) => String(o._id) === String(selectedOrder._id) ? { ...o, ...payload } : o));
      setSelectedDeliveryPersonId("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setAssigningDelivery(false); }
  };

  const openEditOrder = (o: any) => {
    setEditingOrder(o);
    setEditForm({
      customerName: o.customerName ?? "",
      phone: o.phone ?? "",
      address: o.address ?? "",
      deliveryArea: o.deliveryArea ?? "",
      notes: o.notes ?? "",
      status: o.status ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    setSavingEdit(true);
    try {
      await apiFetch(`/api/orders/${editingOrder._id}`, { method: "PUT", body: JSON.stringify(editForm) });
      toast({ title: "Order updated successfully" });
      setOrders((prev) => prev.map((o) => String(o._id) === String(editingOrder._id) ? { ...o, ...editForm } : o));
      if (selectedOrder && String(selectedOrder._id) === String(editingOrder._id)) {
        setSelectedOrder((o: any) => ({ ...o, ...editForm }));
      }
      setEditingOrder(null);
      loadStats();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSavingEdit(false); }
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;
    setConfirmingDelete(true);
    try {
      await apiFetch(`/api/orders/${deletingOrder._id}`, { method: "DELETE" });
      toast({ title: "Order deleted" });
      setOrders((prev) => prev.filter((o) => String(o._id) !== String(deletingOrder._id)));
      setTotal((t) => t - 1);
      if (selectedOrder && String(selectedOrder._id) === String(deletingOrder._id)) setSelectedOrder(null);
      setDeletingOrder(null);
      loadStats();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setConfirmingDelete(false); }
  };

  const clearFilters = () => {
    setSearch(""); setStatusFilter(""); setDeliveryTypeFilter("");
    setDateFrom(""); setDateTo(""); setSortField("createdAt"); setSortDir("desc");
  };

  const hasFilters = !!(search || statusFilter || deliveryTypeFilter || dateFrom || dateTo);

  const totalAll = Object.values(statsData).reduce((a, b) => a + b, 0);
  const totalActive = ACTIVE_STATUSES.reduce((s, k) => s + (statsData[k] ?? 0), 0);
  const totalHistory = HISTORY_STATUSES.reduce((s, k) => s + (statsData[k] ?? 0), 0);

  const TABS = [
    { key: "current" as const, label: "Current Orders", count: totalActive, icon: Clock, color: "text-blue-600" },
    { key: "history" as const, label: "History", count: totalHistory, icon: CheckCircle2, color: "text-green-600" },
    { key: "all" as const, label: "All Orders", count: totalAll, icon: ClipboardList, color: "text-gray-600" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {!isCreatePage && (<>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#162B4D]">Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track and manage all customer orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { load(); loadStats(); }} className="h-8 gap-1.5 text-gray-500">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { resetCreateForm(); setLocation("/orders/new"); }} className="h-8 gap-1.5 bg-[#1A56DB] hover:bg-[#1447B4] text-white">
            <Plus className="w-3.5 h-3.5" /> New Order
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s === statusFilter ? "" : s); setActiveTab("all"); }}
              className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${statusFilter === s ? `${cfg.bg} shadow-sm` : "bg-white border-gray-100 hover:border-gray-200"}`}
            >
              <Icon className={`w-4 h-4 mb-1.5 ${cfg.color}`} />
              <p className={`text-lg font-bold leading-none ${cfg.color}`}>{statsData[s] ?? 0}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {TABS.map(({ key, label, count, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setStatusFilter(""); }}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === key
                  ? "border-[#1A56DB] text-[#1A56DB] bg-blue-50/40"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${activeTab === key ? "text-[#1A56DB]" : color}`} />
              {label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === key ? "bg-[#1A56DB] text-white" : "bg-gray-100 text-gray-500"}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-50 overflow-x-auto scrollbar-none bg-gray-50/50">
          <button
            onClick={() => setStatusFilter("")}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !statusFilter
                ? "bg-[#162B4D] text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            All
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${!statusFilter ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
              {totalAll}
            </span>
          </button>
          {ALL_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            const count = statsData[s] ?? 0;
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => { setStatusFilter(isActive ? "" : s); setActiveTab("all"); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  isActive
                    ? `${cfg.bg} ${cfg.color} shadow-sm`
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <Icon className={`w-3 h-3 ${isActive ? cfg.color : "text-gray-400"}`} />
                {cfg.label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/60" : "bg-gray-100 text-gray-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-50 flex flex-wrap gap-2.5 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, area..."
              className="pl-8 h-9 text-sm"
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5" /></button>}
          </div>

          <Select value={`${sortField}:${sortDir}`} onValueChange={(v) => { const [f, d] = v.split(":"); setSortField(f); setSortDir(d as any); }}>
            <SelectTrigger className="h-9 w-44 text-sm gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt:desc">Newest First</SelectItem>
              <SelectItem value="createdAt:asc">Oldest First</SelectItem>
              <SelectItem value="customerName:asc">Name A–Z</SelectItem>
              <SelectItem value="customerName:desc">Name Z–A</SelectItem>
              <SelectItem value="status:asc">Status A–Z</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-9 gap-1.5 ${showFilters ? "bg-blue-50 border-blue-200 text-[#1A56DB]" : "text-gray-500"}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters {hasFilters && <span className="bg-[#1A56DB] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{[statusFilter, deliveryTypeFilter, dateFrom, dateTo].filter(Boolean).length}</span>}
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-gray-400 hover:text-red-500 gap-1">
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>

        {/* Expandable Filter Row */}
        {showFilters && (
          <div className="px-4 pb-3 flex flex-wrap gap-3 bg-gray-50/60 border-b border-gray-100 pt-3">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Delivery Type</Label>
              <Select value={deliveryTypeFilter} onValueChange={(v) => setDeliveryTypeFilter(v === "_all" ? "" : v)}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All types</SelectItem>
                  <SelectItem value="slot">Slot</SelectItem>
                  <SelectItem value="instant">Instant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-50">
          {loading ? "Loading..." : `${total} order${total !== 1 ? "s" : ""} found`}
          {statusFilter && <span className="ml-1">· filtered by <strong>{STATUS_CONFIG[statusFilter]?.label}</strong></span>}
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No orders found</p>
            {hasFilters && <button onClick={clearFilters} className="mt-2 text-sm text-[#1A56DB] hover:underline font-semibold">Clear filters</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-left">Delivery</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Delivery Partner</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => {
                  const total = orderTotal(o.items);
                  return (
                    <tr key={String(o._id)} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#162B4D]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <User className="w-3.5 h-3.5 text-[#162B4D]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#162B4D] text-sm">{o.customerName}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{o.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#162B4D] font-medium">{Array.isArray(o.items) ? o.items.length : 0} item{o.items?.length !== 1 ? "s" : ""}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[140px]">{(o.items ?? []).map((i: any) => i.name).join(", ")}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#162B4D]">{formatRupees(total)}</span>
                        {o.instantDeliveryCharge ? <p className="text-xs text-orange-500">+{formatRupees(o.instantDeliveryCharge)} delivery</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-600 capitalize">{o.deliveryType ?? "—"}</p>
                        {o.timeslotLabel && <p className="text-xs text-gray-400 max-w-[140px] truncate">{o.timeslotLabel}</p>}
                        {o.deliveryArea && <p className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{o.deliveryArea}</p>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                      <td className="px-4 py-3">
                        {deliveryPersons.length > 0 ? (
                          <InlineDeliverySelect
                            order={o}
                            persons={deliveryPersons}
                            saving={inlineAssigningId === String(o._id)}
                            onAssign={inlineAssign}
                          />
                        ) : (
                          o.assignedDeliveryPersonName
                            ? <span className="text-xs font-medium text-orange-700">{o.assignedDeliveryPersonName}</span>
                            : <span className="text-xs text-gray-300 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setEditStatus(o.status);
                              setSelectedDeliveryPersonId(o.assignedDeliveryPersonId ?? "");
                              setShowAllPersons(false);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A56DB] hover:text-[#1447B4] bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                            title="View order"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            onClick={() => openEditOrder(o)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
                            title="Edit order"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => setDeletingOrder(o)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
                            title="Delete order"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
            <p className="text-xs text-gray-400">Page {page} of {pages} · {total} total</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 w-7 p-0">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
                const pg = i + 1;
                return (
                  <Button
                    key={pg}
                    variant={pg === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pg)}
                    className={`h-7 w-7 p-0 text-xs ${pg === page ? "bg-[#1A56DB] border-[#1A56DB]" : ""}`}
                  >
                    {pg}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="h-7 w-7 p-0">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
      </>)}

      {/* Edit Order Modal */}
      <Dialog open={!!editingOrder} onOpenChange={(o) => { if (!o) setEditingOrder(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          {editingOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#162B4D] flex items-center gap-2">
                  <Pencil className="w-4 h-4" />
                  Edit Order
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-500">Customer Name</Label>
                    <Input
                      value={editForm.customerName}
                      onChange={(e) => setEditForm((f) => ({ ...f, customerName: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="Customer name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-500">Phone</Label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      className="h-9 text-sm"
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500">Delivery Address</Label>
                  <Input
                    value={editForm.address}
                    onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Full address"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500">Delivery Area</Label>
                  <Input
                    value={editForm.deliveryArea}
                    onChange={(e) => setEditForm((f) => ({ ...f, deliveryArea: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Area / locality"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500">Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500">Notes</Label>
                  <Input
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Order notes"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingOrder(null)} className="h-9">Cancel</Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="bg-emerald-600 hover:bg-emerald-700 h-9 text-white"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingOrder} onOpenChange={(o) => { if (!o && !confirmingDelete) setDeletingOrder(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          {deletingOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-red-600 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete Order
                </DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-3">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete the order for{" "}
                  <span className="font-semibold text-[#162B4D]">{deletingOrder.customerName}</span>?
                </p>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-1">
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    This action cannot be undone.
                  </p>
                  <p className="text-xs text-gray-500">
                    {Array.isArray(deletingOrder.items) ? deletingOrder.items.length : 0} item(s) ·{" "}
                    {formatRupees(orderTotal(deletingOrder.items))} ·{" "}
                    <StatusBadge status={deletingOrder.status} />
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDeletingOrder(null)} disabled={confirmingDelete} className="h-9">Cancel</Button>
                <Button
                  onClick={handleDeleteOrder}
                  disabled={confirmingDelete}
                  className="bg-red-600 hover:bg-red-700 h-9 text-white"
                >
                  {confirmingDelete ? "Deleting..." : "Delete Order"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Order Page */}
      {isCreatePage && (
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { if (!creatingSaving) { setLocation("/orders"); resetCreateForm(); } }}
                disabled={creatingSaving}
                className="h-8 w-8 p-0"
                aria-label="Back to orders"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-[#162B4D] flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create New Order
                </h1>
                <p className="text-[11px] text-gray-400">Fill in the details and create the order</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { if (!creatingSaving) { setLocation("/orders"); resetCreateForm(); } }}
              disabled={creatingSaving}
              className="h-8 w-8 p-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-5">
          <div className="space-y-5 pt-1">
            {/* HUB SELECTION (must be picked first) */}
            <div className="space-y-2 p-3 rounded-2xl border border-blue-100 bg-blue-50/40">
              <p className="text-[10px] font-bold text-[#1A56DB] uppercase tracking-widest">Step 1 · Fulfillment Hub *</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-500">Super Hub</Label>
                  <Select value={selectedSuperHubId} onValueChange={setSelectedSuperHubId} disabled={loadingSuperHubs}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={loadingSuperHubs ? "Loading..." : "Select super hub"} />
                    </SelectTrigger>
                    <SelectContent>
                      {superHubs.length === 0 ? (
                        <div className="p-2 text-xs text-gray-400 text-center">No super hubs found</div>
                      ) : superHubs.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            {h.name}
                            {h.location && <span className="text-[10px] text-gray-400">· {h.location}</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-500">Sub Hub</Label>
                  <Select value={selectedSubHubId} onValueChange={setSelectedSubHubId} disabled={!selectedSuperHubId || loadingSubHubs}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={
                        !selectedSuperHubId ? "Select super hub first" :
                        loadingSubHubs ? "Loading..." :
                        subHubs.length === 0 ? "No sub-hubs" : "Select sub hub"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {subHubs.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            {h.name}
                            {h.location && <span className="text-[10px] text-gray-400">· {h.location}</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedSubHubId && (
                <p className="text-[11px] text-gray-500 inline-flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" /> {loadingProducts ? "Loading catalog..." : `${subHubProducts.length} products available in this sub-hub`}
                </p>
              )}
            </div>

            {/* CUSTOMER SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer</p>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                  <button
                    onClick={() => { setCustomerMode("existing"); setChosenCustomer(null); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${customerMode === "existing" ? "bg-white text-[#1A56DB] shadow-sm" : "text-gray-500"}`}
                  >Existing</button>
                  <button
                    onClick={() => { setCustomerMode("new"); setChosenCustomer(null); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${customerMode === "new" ? "bg-white text-[#1A56DB] shadow-sm" : "text-gray-500"}`}
                  >New Customer</button>
                </div>
              </div>

              {customerMode === "existing" ? (
                <div className="space-y-2">
                  <Popover open={customerDropdownOpen} onOpenChange={setCustomerDropdownOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors text-left"
                      >
                        {chosenCustomer ? (
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-full bg-[#1A56DB] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                              {chosenCustomer.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[#162B4D] text-sm truncate">{chosenCustomer.name || "(No name)"}</p>
                              <p className="text-[11px] text-gray-400 truncate">
                                {chosenCustomer.phone || chosenCustomer.email || "—"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {loadingCustomers ? "Loading customers..." : `Select a customer (${allCustomers.length} available)`}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${customerDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-0 shadow-xl border border-gray-100 rounded-2xl overflow-hidden"
                      align="start"
                      sideOffset={6}
                      style={{ width: "var(--radix-popover-trigger-width)", maxHeight: "min(420px, var(--radix-popover-content-available-height))" }}
                    >
                      <div className="p-2 border-b border-gray-100 bg-gray-50/80">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <Input
                            autoFocus
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            placeholder="Search name, phone or email..."
                            className="pl-7 h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div
                        className="max-h-[320px] overflow-y-auto overscroll-contain py-1"
                        onWheel={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                      >
                        {loadingCustomers ? (
                          <p className="p-4 text-xs text-gray-400 text-center">Loading...</p>
                        ) : filteredCustomers.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className="text-xs text-gray-400">No customers match.</p>
                            <button
                              onClick={() => {
                                setCustomerMode("new");
                                setNewCustomer((n) => ({ ...n, name: customerSearch.trim() }));
                                setCustomerDropdownOpen(false);
                              }}
                              className="mt-1 text-xs text-[#1A56DB] font-semibold hover:underline"
                            >
                              + Create new customer
                            </button>
                          </div>
                        ) : (
                          filteredCustomers.map((c) => {
                            const isSelected = chosenCustomer?.id === c.id;
                            return (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setChosenCustomer(c);
                                  setSelectedAddressIdx(c.addresses?.length ? 0 : null);
                                  setOrderAddressMode(c.addresses?.length ? "saved" : "new");
                                  setCustomerDropdownOpen(false);
                                  setCustomerSearch("");
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors text-left ${isSelected ? "bg-blue-50/60" : ""}`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${isSelected ? "bg-[#1A56DB] text-white" : "bg-[#162B4D]/10 text-[#162B4D]"}`}>
                                  {c.name?.charAt(0).toUpperCase() || "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold truncate ${isSelected ? "text-[#1A56DB]" : "text-[#162B4D]"}`}>
                                    {c.name || "(No name)"}
                                  </p>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                    {c.phone && <span className="inline-flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{c.phone}</span>}
                                    {c.email && <span className="inline-flex items-center gap-0.5 truncate"><Mail className="w-2.5 h-2.5" />{c.email}</span>}
                                  </div>
                                  {Array.isArray(c.addresses) && c.addresses.length > 0 && (
                                    <p className="text-[10px] text-emerald-600 mt-0.5 inline-flex items-center gap-0.5">
                                      <Home className="w-2.5 h-2.5" /> {c.addresses.length} saved address{c.addresses.length > 1 ? "es" : ""}
                                    </p>
                                  )}
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-[#1A56DB] flex-shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {chosenCustomer && (
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-[#1A56DB] uppercase tracking-widest">Customer Details</p>
                        <button onClick={() => { setChosenCustomer(null); setSelectedAddressIdx(null); }} className="text-gray-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <div className="flex items-center gap-1 text-gray-600"><User className="w-3 h-3 text-gray-400" /> {chosenCustomer.name || "—"}</div>
                        <div className="flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3 text-gray-400" /> {chosenCustomer.phone || "—"}</div>
                        <div className="flex items-center gap-1 text-gray-600 col-span-2 truncate"><Mail className="w-3 h-3 text-gray-400" /> {chosenCustomer.email || "—"}</div>
                        {chosenCustomer.dateOfBirth && (
                          <div className="flex items-center gap-1 text-gray-600 col-span-2"><span className="text-gray-400">DOB:</span> {chosenCustomer.dateOfBirth}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-500">Name *</Label>
                    <Input value={newCustomer.name} onChange={(e) => setNewCustomer((n) => ({ ...n, name: e.target.value }))} className="h-9 text-sm" placeholder="Customer name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-500">Phone *</Label>
                    <Input
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer((n) => ({ ...n, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                      className="h-9 text-sm"
                      placeholder="10-digit phone"
                      inputMode="numeric"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-500">Alternate Phone</Label>
                    <Input
                      value={newCustomer.alternatePhone}
                      onChange={(e) => setNewCustomer((n) => ({ ...n, alternatePhone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                      className="h-9 text-sm"
                      placeholder="Optional"
                      inputMode="numeric"
                      maxLength={10}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-500">Email</Label>
                    <Input value={newCustomer.email} onChange={(e) => setNewCustomer((n) => ({ ...n, email: e.target.value }))} className="h-9 text-sm" placeholder="email@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-500">Date of Birth</Label>
                    <Input
                      type="date"
                      value={newCustomer.dateOfBirth}
                      onChange={(e) => setNewCustomer((n) => ({ ...n, dateOfBirth: e.target.value }))}
                      max={new Date().toISOString().slice(0, 10)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-500">Gender</Label>
                    <Select
                      value={newCustomer.gender || "unspecified"}
                      onValueChange={(v) => setNewCustomer((n) => ({ ...n, gender: v === "unspecified" ? "" : v }))}
                    >
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unspecified">Prefer not to say</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-500">Internal Notes</Label>
                    <Textarea
                      value={newCustomer.notes}
                      onChange={(e) => setNewCustomer((n) => ({ ...n, notes: e.target.value }))}
                      placeholder="Anything to remember about this customer (optional)"
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                  <p className="col-span-2 text-[11px] text-gray-400">Customer will be saved automatically. The delivery address you enter below becomes their first saved address.</p>
                </div>
              )}
            </div>

            {/* DELIVERY TYPE */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order Type</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOrderDeliveryType("delivery")}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${orderDeliveryType === "delivery" ? "border-[#1A56DB] bg-blue-50" : "border-gray-100 bg-white hover:border-gray-200"}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${orderDeliveryType === "delivery" ? "bg-[#1A56DB] text-white" : "bg-gray-100 text-gray-400"}`}>
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#162B4D]">Delivery</p>
                    <p className="text-[11px] text-gray-400">Send to customer's address</p>
                  </div>
                </button>
                <button
                  onClick={() => setOrderDeliveryType("takeaway")}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${orderDeliveryType === "takeaway" ? "border-emerald-500 bg-emerald-50" : "border-gray-100 bg-white hover:border-gray-200"}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${orderDeliveryType === "takeaway" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#162B4D]">Takeaway</p>
                    <p className="text-[11px] text-gray-400">Customer picks up at store</p>
                  </div>
                </button>
              </div>
            </div>

            {/* ADDRESS (only for delivery) */}
            {orderDeliveryType === "delivery" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delivery Address</p>
                  {chosenCustomer && Array.isArray(chosenCustomer.addresses) && chosenCustomer.addresses.length > 0 && (
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                      <button
                        onClick={() => setOrderAddressMode("saved")}
                        className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md ${orderAddressMode === "saved" ? "bg-white text-[#1A56DB] shadow-sm" : "text-gray-500"}`}
                      >Saved</button>
                      <button
                        onClick={() => setOrderAddressMode("new")}
                        className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md ${orderAddressMode === "new" ? "bg-white text-[#1A56DB] shadow-sm" : "text-gray-500"}`}
                      >New</button>
                    </div>
                  )}
                </div>
                {chosenCustomer && orderAddressMode === "saved" && Array.isArray(chosenCustomer.addresses) && chosenCustomer.addresses.length > 0 ? (
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                    {chosenCustomer.addresses.map((a: any, i: number) => {
                      const f = getAddressFields(a);
                      const lines = formatAddressLines(a);
                      const isSelected = selectedAddressIdx === i;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedAddressIdx(i)}
                          className={`w-full flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${isSelected ? "border-[#1A56DB] bg-blue-50" : "border-gray-100 bg-white hover:border-gray-200"}`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-[#1A56DB] text-white" : "bg-gray-100 text-gray-400"}`}>
                            <Home className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-[#162B4D]">{f?.label || `Address ${i + 1}`}</p>
                              {f?.isDefault && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">DEFAULT</span>}
                              {f?.contactName && <span className="text-[10px] text-gray-500">· {f.contactName}</span>}
                              {f?.phone && <span className="text-[10px] text-gray-400 inline-flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{f.phone}</span>}
                            </div>
                            {lines.length > 0 ? (
                              lines.map((ln, li) => (
                                <p key={li} className="text-[11.5px] text-gray-600 leading-tight">{ln}</p>
                              ))
                            ) : (
                              <p className="text-[11px] text-gray-400 italic">No address details</p>
                            )}
                            {f?.instructions && <p className="text-[10px] text-amber-700 italic mt-0.5">Note: {f.instructions}</p>}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#1A56DB] flex-shrink-0 mt-1" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2 p-3 bg-gray-50/60 border border-gray-100 rounded-xl">
                    <div className="grid grid-cols-3 gap-2">
                      <Input value={newAddress.label} onChange={(e) => setNewAddress((a) => ({ ...a, label: e.target.value }))} placeholder="Label (Home/Work)" className="h-9 text-sm" />
                      <Input value={newAddress.contactName} onChange={(e) => setNewAddress((a) => ({ ...a, contactName: e.target.value }))} placeholder="Contact name" className="h-9 text-sm" />
                      <Input value={newAddress.phone} onChange={(e) => setNewAddress((a) => ({ ...a, phone: e.target.value }))} placeholder="Contact phone" className="h-9 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={newAddress.houseNo} onChange={(e) => setNewAddress((a) => ({ ...a, houseNo: e.target.value }))} placeholder="House / Flat no." className="h-9 text-sm" />
                      <Input value={newAddress.building} onChange={(e) => setNewAddress((a) => ({ ...a, building: e.target.value }))} placeholder="Building / Society" className="h-9 text-sm" />
                    </div>
                    <Input value={newAddress.street} onChange={(e) => setNewAddress((a) => ({ ...a, street: e.target.value }))} placeholder="Street / Road" className="h-9 text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={newAddress.area} onChange={(e) => setNewAddress((a) => ({ ...a, area: e.target.value }))} placeholder="Area / Locality" className="h-9 text-sm" />
                      <Input value={newAddress.landmark} onChange={(e) => setNewAddress((a) => ({ ...a, landmark: e.target.value }))} placeholder="Landmark" className="h-9 text-sm" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input value={newAddress.city} onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))} placeholder="City *" className="h-9 text-sm" />
                      <Input value={newAddress.state} onChange={(e) => setNewAddress((a) => ({ ...a, state: e.target.value }))} placeholder="State" className="h-9 text-sm" />
                      <Input value={newAddress.pincode} onChange={(e) => setNewAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="Pincode *" className="h-9 text-sm" />
                    </div>
                    <Input value={newAddress.instructions} onChange={(e) => setNewAddress((a) => ({ ...a, instructions: e.target.value }))} placeholder="Delivery instructions (optional)" className="h-9 text-sm" />
                  </div>
                )}
              </div>
            )}

            {orderDeliveryType === "takeaway" && (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <Store className="w-4 h-4 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800">Takeaway from FishTokri Store</p>
                  <p className="text-[11px] text-emerald-600">Customer will collect this order directly from the store. No delivery address required.</p>
                </div>
              </div>
            )}

            {/* ITEMS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Items <span className="text-gray-300">({totalItemCount})</span></p>
                <div className="flex items-center gap-3">
                  <Popover open={productPickerOpen} onOpenChange={(o) => { setProductPickerOpen(o); if (!o) { setPickerCategory(null); setProductSearch(""); } }}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={!selectedSubHubId}
                        className="text-xs font-semibold text-[#1A56DB] hover:underline inline-flex items-center gap-1 disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" /> Add product
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-0 shadow-xl border border-gray-100 rounded-2xl overflow-hidden w-[420px]"
                      align="end"
                      sideOffset={6}
                      style={{ maxHeight: "min(420px, var(--radix-popover-content-available-height))" }}
                    >
                      <div className="p-2 border-b border-gray-100 bg-gray-50/80 space-y-2">
                        {pickerCategory && (
                          <button
                            type="button"
                            onClick={() => { setPickerCategory(null); setProductSearch(""); }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1A56DB] hover:underline"
                          >
                            <ChevronDown className="w-3 h-3 rotate-90" /> Back to categories
                          </button>
                        )}
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <Input
                            autoFocus
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder={pickerCategory ? `Search in ${pickerCategory}...` : "Search categories or products..."}
                            className="pl-7 h-8 text-sm"
                          />
                        </div>
                        {pickerCategory && (
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            {pickerCategory} <span className="text-gray-300">· {filteredProducts.length} item{filteredProducts.length === 1 ? "" : "s"}</span>
                          </p>
                        )}
                      </div>
                      <div
                        className="max-h-[320px] overflow-y-auto overscroll-contain py-1"
                        onWheel={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                      >
                        {loadingProducts ? (
                          <p className="p-4 text-xs text-gray-400 text-center">Loading products...</p>
                        ) : !pickerCategory && !productSearch.trim() ? (
                          filteredCategories.length === 0 ? (
                            <p className="p-4 text-xs text-gray-400 text-center">No categories available.</p>
                          ) : (
                            filteredCategories.map((c) => (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => { setPickerCategory(c.name); setProductSearch(""); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left"
                              >
                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                  <Package className="w-4 h-4 text-[#1A56DB]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-[#162B4D] truncate">{c.name}</p>
                                  <p className="text-[11px] text-gray-400">{c.count} product{c.count === 1 ? "" : "s"}</p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 -rotate-90" />
                              </button>
                            ))
                          )
                        ) : filteredProducts.length === 0 ? (
                          <p className="p-4 text-xs text-gray-400 text-center">No products match.</p>
                        ) : (
                          filteredProducts.map((p) => {
                            const pid = String(p._id);
                            const already = selectedProducts.find((sp) => sp.productId === pid);
                            return (
                              <button
                                key={pid}
                                onClick={() => {
                                  setSelectedProducts((prev) => {
                                    const exists = prev.find((sp) => sp.productId === pid);
                                    if (exists) {
                                      return prev.map((sp) => sp.productId === pid ? { ...sp, quantity: sp.quantity + 1 } : sp);
                                    }
                                    return [...prev, {
                                      productId: pid,
                                      name: p.name,
                                      price: Number(p.price) || 0,
                                      unit: p.unit ?? "",
                                      quantity: 1,
                                    }];
                                  });
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors text-left ${already ? "bg-blue-50/40" : ""}`}
                              >
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-gray-300" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-[#162B4D] truncate">{p.name}</p>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                    <span className="font-semibold text-[#1A56DB]">{formatRupees(p.price)}</span>
                                    {p.unit && <span>/ {p.unit}</span>}
                                    {p.category && <span className="truncate">· {p.category}</span>}
                                  </div>
                                </div>
                                {already ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">×{already.quantity}</span>
                                ) : (
                                  <Plus className="w-3.5 h-3.5 text-[#1A56DB] flex-shrink-0" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                      {selectedProducts.length > 0 && (
                        <div className="p-2 border-t border-gray-100 bg-gray-50/80 text-[11px] text-gray-500 flex items-center justify-between">
                          <span>{selectedProducts.length} selected</span>
                          <button onClick={() => setProductPickerOpen(false)} className="font-semibold text-[#1A56DB] hover:underline">Done</button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <button
                    onClick={() => setOrderItems((arr) => [...arr, { name: "", price: "", quantity: "1", unit: "" }])}
                    className="text-xs font-semibold text-gray-500 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Custom item
                  </button>
                </div>
              </div>

              {!selectedSubHubId && selectedProducts.length === 0 && orderItems.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-700 inline-flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Select a sub-hub above to choose products from its catalog, or add a custom item.</span>
                </div>
              )}

              {/* Selected catalog products */}
              {selectedProducts.length > 0 && (
                <div className="space-y-1.5">
                  {selectedProducts.map((p, idx) => (
                    <div key={p.productId} className="flex items-center gap-2 p-2 rounded-xl border border-blue-100 bg-blue-50/50">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#1A56DB] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#162B4D] truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-500">{formatRupees(p.price)}{p.unit ? ` / ${p.unit}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg">
                        <button
                          onClick={() => setSelectedProducts((arr) => arr.map((x, i) => i === idx ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-[#1A56DB]"
                        >−</button>
                        <Input
                          type="number"
                          value={p.quantity}
                          onChange={(e) => setSelectedProducts((arr) => arr.map((x, i) => i === idx ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x))}
                          className="h-7 w-12 text-center text-sm border-0 px-0 focus-visible:ring-0"
                        />
                        <button
                          onClick={() => setSelectedProducts((arr) => arr.map((x, i) => i === idx ? { ...x, quantity: x.quantity + 1 } : x))}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-[#1A56DB]"
                        >+</button>
                      </div>
                      <span className="text-sm font-bold text-[#162B4D] w-16 text-right">{formatRupees(p.price * p.quantity)}</span>
                      <button
                        onClick={() => setSelectedProducts((arr) => arr.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom items */}
              {orderItems.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Custom items</p>
                  {orderItems.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <Input value={it.name} onChange={(e) => setOrderItems((arr) => arr.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} placeholder="Item name" className="h-9 text-sm col-span-5" />
                      <Input value={it.price} onChange={(e) => setOrderItems((arr) => arr.map((x, i) => i === idx ? { ...x, price: e.target.value } : x))} placeholder="Price" type="number" className="h-9 text-sm col-span-2" />
                      <Input value={it.quantity} onChange={(e) => setOrderItems((arr) => arr.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} placeholder="Qty" type="number" className="h-9 text-sm col-span-2" />
                      <Input value={it.unit} onChange={(e) => setOrderItems((arr) => arr.map((x, i) => i === idx ? { ...x, unit: e.target.value } : x))} placeholder="Unit" className="h-9 text-sm col-span-2" />
                      <button
                        onClick={() => setOrderItems((arr) => arr.filter((_, i) => i !== idx))}
                        className="col-span-1 h-9 flex items-center justify-center text-gray-400 hover:text-red-500"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 px-3 py-2 bg-[#162B4D]/5 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatRupees(itemsSubtotal)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-600">
                    <span className="inline-flex items-center gap-1">
                      <Ticket className="w-3 h-3" />
                      {appliedCoupons.length > 1
                        ? `Coupons (${appliedCoupons.length})`
                        : `Coupon ${appliedCoupons[0]?.code ?? ""}`}
                    </span>
                    <span>− {formatRupees(couponDiscount)}</span>
                  </div>
                )}
                {slotExtraCharge > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Slot charge</span>
                    <span>+ {formatRupees(slotExtraCharge)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-[#162B4D]/10">
                  <span className="text-xs font-semibold text-gray-600">Order Total</span>
                  <span className="font-bold text-[#162B4D] text-base">{formatRupees(newOrderTotal)}</span>
                </div>
                {paymentStatus !== "unpaid" && paidTotal > 0 && (
                  <>
                    <div className="flex items-center justify-between text-[11px] text-emerald-600">
                      <span>Paid</span>
                      <span>{formatRupees(paidTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-amber-600">
                      <span>Due</span>
                      <span>{formatRupees(dueAmount)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* COUPON — only after a product/item is added */}
            {totalItemCount > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coupons</p>

                {appliedCoupons.length > 0 && (
                  <div className="space-y-1.5">
                    {appliedCoupons.map((c) => {
                      const min = Number(c.minOrderAmount) || 0;
                      const v = Number(c.discountValue) || 0;
                      const eligible = itemsSubtotal >= min;
                      const saved = !eligible
                        ? 0
                        : c.type === "percentage"
                          ? Math.round((itemsSubtotal * v) / 100)
                          : v;
                      return (
                        <div
                          key={String(c._id)}
                          className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0">
                            <Ticket className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-emerald-800 truncate">
                              {c.code}{" "}
                              <span className="text-[11px] font-normal text-emerald-600">
                                {eligible ? `· saved ${formatRupees(saved)}` : `· min ₹${min} required`}
                              </span>
                            </p>
                            {c.title && <p className="text-[11px] text-emerald-700 truncate">{c.title}</p>}
                          </div>
                          <button
                            onClick={() => toggleCoupon(String(c._id))}
                            className="text-emerald-700 hover:text-red-500"
                            aria-label="Remove coupon"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                      placeholder="Enter coupon code"
                      className="pl-7 h-9 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={applyCouponByCode}
                    disabled={!couponCode.trim()}
                    className="h-9 text-sm"
                  >Apply</Button>
                </div>
                {couponError && <p className="text-[11px] text-red-500">{couponError}</p>}

                {activeCoupons.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Available coupons</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeCoupons.slice(0, 8).map((c) => {
                        const id = String(c._id);
                        const min = Number(c.minOrderAmount) || 0;
                        const eligible = itemsSubtotal >= min;
                        const isApplied = appliedCouponIds.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            disabled={!eligible && !isApplied}
                            onClick={() => toggleCoupon(id)}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors inline-flex items-center gap-1 ${
                              isApplied
                                ? "border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : eligible
                                  ? "border-blue-200 bg-blue-50 text-[#1A56DB] hover:bg-blue-100"
                                  : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                            }`}
                            title={c.title || c.description || ""}
                          >
                            <Ticket className="w-3 h-3" />
                            {c.code}
                            <span className="text-[10px] font-normal opacity-70">
                              {c.type === "percentage" ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
                              {min > 0 ? ` · min ₹${min}` : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedSubHubId && !loadingCoupons && activeCoupons.length === 0 && (
                  <p className="text-[11px] text-gray-400">No active coupons for this sub-hub.</p>
                )}
              </div>
            )}

            {/* PAYMENT */}
            {totalItemCount > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment</p>

                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: "unpaid", label: "Unpaid", color: "amber" },
                    { v: "partial", label: "Partial", color: "blue" },
                    { v: "paid", label: "Fully Paid", color: "emerald" },
                  ] as const).map((opt) => {
                    const active = paymentStatus === opt.v;
                    const colorMap: Record<string, string> = {
                      amber: active ? "border-amber-300 bg-amber-50 text-amber-800" : "border-gray-200 text-gray-500 hover:bg-gray-50",
                      blue: active ? "border-blue-300 bg-blue-50 text-[#1A56DB]" : "border-gray-200 text-gray-500 hover:bg-gray-50",
                      emerald: active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500 hover:bg-gray-50",
                    };
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setPaymentStatus(opt.v)}
                        className={`h-9 rounded-xl border text-xs font-semibold transition-colors ${colorMap[opt.color]}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {paymentStatus !== "unpaid" && (
                  <div className="space-y-2">
                    {paymentEntries.map((entry, idx) => {
                      const ModeIcon = (PAYMENT_MODES.find((m) => m.value === entry.mode)?.Icon) || Tag;
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl border border-gray-100 bg-gray-50/40"
                        >
                          <div className="col-span-5 relative">
                            <ModeIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            <select
                              value={entry.mode}
                              onChange={(e) =>
                                setPaymentEntries((arr) =>
                                  arr.map((p, i) => (i === idx ? { ...p, mode: e.target.value } : p))
                                )
                              }
                              className="w-full h-9 pl-8 pr-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                            >
                              {PAYMENT_MODES.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-4 relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              value={entry.amount}
                              onChange={(e) => {
                                const raw = Number(e.target.value);
                                const otherSum = paymentEntries.reduce(
                                  (s, p, i) => s + (i === idx ? 0 : Number(p.amount) || 0),
                                  0
                                );
                                const maxAllowed = Math.max(0, newOrderTotal - otherSum);
                                let next = e.target.value;
                                if (Number.isFinite(raw) && raw > maxAllowed) {
                                  next = String(maxAllowed);
                                }
                                setPaymentEntries((arr) =>
                                  arr.map((p, i) => (i === idx ? { ...p, amount: next } : p))
                                );
                              }}
                              placeholder="Amount"
                              className="pl-6 h-9 text-sm"
                            />
                          </div>
                          <Input
                            value={entry.reference}
                            onChange={(e) =>
                              setPaymentEntries((arr) =>
                                arr.map((p, i) => (i === idx ? { ...p, reference: e.target.value } : p))
                              )
                            }
                            placeholder="Ref / Txn (opt)"
                            className="col-span-2 h-9 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setPaymentEntries((arr) => arr.filter((_, i) => i !== idx))}
                            disabled={paymentEntries.length === 1}
                            className="col-span-1 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Remove payment"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setPaymentEntries((arr) => [
                            ...arr,
                            {
                              mode: "cash",
                              amount: dueAmount > 0 ? String(dueAmount) : "",
                              reference: "",
                            },
                          ])
                        }
                        className="h-8 text-xs gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add payment
                      </Button>
                      <div className="text-[11px] text-gray-500 flex items-center gap-3">
                        <span>Paid: <span className="font-semibold text-gray-700">{formatRupees(paidTotal)}</span></span>
                        <span>
                          Due:{" "}
                          <span className={`font-semibold ${dueAmount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                            {formatRupees(dueAmount)}
                          </span>
                        </span>
                      </div>
                    </div>

                    {paymentStatus === "paid" && paidTotal !== newOrderTotal && (
                      <p className="text-[11px] text-amber-600">
                        For "Fully Paid", total payments should equal {formatRupees(newOrderTotal)}.
                      </p>
                    )}
                    {paymentStatus === "partial" && (paidTotal <= 0 || paidTotal >= newOrderTotal) && (
                      <p className="text-[11px] text-amber-600">
                        For "Partial", paid amount must be greater than 0 and less than {formatRupees(newOrderTotal)}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SCHEDULE (delivery only — takeaway uses today's date and instant fulfillment) */}
            {orderDeliveryType === "delivery" && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delivery Schedule</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-500 inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" /> Delivery Date
                  </Label>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-500">Delivery Type</Label>
                  <div className="inline-flex w-full rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setOrderScheduleType("slot")}
                      className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-md inline-flex items-center justify-center gap-1 ${orderScheduleType === "slot" ? "bg-white text-[#1A56DB] shadow-sm" : "text-gray-500"}`}
                    ><Clock className="w-3 h-3" /> Time Slot</button>
                    <button
                      type="button"
                      onClick={() => { setOrderScheduleType("instant"); setSelectedTimeslotId(""); }}
                      className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-md inline-flex items-center justify-center gap-1 ${orderScheduleType === "instant" ? "bg-white text-amber-600 shadow-sm" : "text-gray-500"}`}
                    ><Zap className="w-3 h-3" /> Instant</button>
                  </div>
                </div>
              </div>
              {orderScheduleType === "slot" && (
                <div className="space-y-1">
                  {!selectedSubHubId ? (
                    <p className="text-[11px] text-gray-400">Select a sub-hub to see available time slots.</p>
                  ) : loadingTimeslots ? (
                    <p className="text-[11px] text-gray-400">Loading time slots...</p>
                  ) : activeTimeslots.length === 0 ? (
                    <p className="text-[11px] text-gray-400">No time slots configured for this sub-hub.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {activeTimeslots.map((t) => {
                        const id = String(t._id);
                        const isSelected = selectedTimeslotId === id;
                        const extra = Number(t.extraCharge) || 0;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSelectedTimeslotId(id)}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${isSelected ? "border-[#1A56DB] bg-blue-50" : "border-gray-100 bg-white hover:border-gray-200"}`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-[#1A56DB] text-white" : "bg-gray-100 text-gray-400"}`}>
                              {t.isInstant ? <Zap className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#162B4D] truncate">{t.label}</p>
                              <p className="text-[10px] text-gray-400">{t.startTime} – {t.endTime}{extra > 0 ? ` · +₹${extra}` : ""}</p>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#1A56DB] flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {orderScheduleType === "instant" && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <Zap className="w-3.5 h-3.5 text-amber-600 mt-0.5" />
                  <p className="text-[11px] text-amber-700">Order will be sent for delivery as soon as possible.</p>
                </div>
              )}
            </div>
            )}

            {/* NOTES */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500">Notes (optional)</Label>
              <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Any special instructions..." className="text-sm min-h-[60px]" />
            </div>
          </div>

        </div>

        <div className="bg-white border-t border-gray-200">
          <div className="px-4 sm:px-6 py-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setLocation("/orders"); resetCreateForm(); }} disabled={creatingSaving} className="h-9">Cancel</Button>
            <Button onClick={handleCreateOrder} disabled={creatingSaving} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9 text-white gap-1.5">
              {creatingSaving ? "Creating..." : (<><Plus className="w-3.5 h-3.5" /> Create Order</>)}
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => { if (!o) { setSelectedOrder(null); setShowAllPersons(false); } }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#162B4D] flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Order Details
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-1">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Customer</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-[#162B4D]">{selectedOrder.customerName}</span>
                  </div>
                  {selectedOrder.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {selectedOrder.phone}
                    </div>
                  )}
                  {selectedOrder.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span>{selectedOrder.address}</span>
                    </div>
                  )}
                  {selectedOrder.deliveryArea && (
                    <div className="text-xs text-gray-400 ml-6">{selectedOrder.deliveryArea}</div>
                  )}
                </div>

                {/* Order Items */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Items ({(selectedOrder.items ?? []).length})</p>
                  <div className="space-y-2">
                    {(selectedOrder.items ?? []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="w-3.5 h-3.5 text-[#1A56DB]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#162B4D] text-sm">{item.name}</p>
                            <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-bold text-[#162B4D]">{formatRupees(Number(item.price) * Number(item.quantity || 1))}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-2 px-3 py-2 bg-[#162B4D]/5 rounded-xl">
                    <span className="text-sm font-semibold text-gray-600">Order Total</span>
                    <span className="font-bold text-[#162B4D] text-base">{formatRupees(orderTotal(selectedOrder.items))}</span>
                  </div>
                  {selectedOrder.instantDeliveryCharge && (
                    <div className="flex justify-between items-center px-3 py-1.5 text-orange-600 text-sm">
                      <span>Instant Delivery Charge</span>
                      <span className="font-semibold">+{formatRupees(selectedOrder.instantDeliveryCharge)}</span>
                    </div>
                  )}
                </div>

                {/* Delivery Info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Delivery</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Type</p>
                      <p className="font-medium text-[#162B4D] capitalize">{selectedOrder.deliveryType ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Date</p>
                      <p className="font-medium text-[#162B4D]">{formatDate(selectedOrder.createdAt)}</p>
                    </div>
                    {selectedOrder.timeslotLabel && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400">Time Slot</p>
                        <p className="font-medium text-[#162B4D]">{selectedOrder.timeslotLabel}</p>
                      </div>
                    )}
                    {selectedOrder.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400">Notes</p>
                        <p className="text-sm text-gray-600 italic">"{selectedOrder.notes}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assign Delivery Partner */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assign Delivery Partner</p>
                    {modalFiltered && (
                      <button
                        onClick={() => setShowAllPersons((v) => !v)}
                        className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Building2 className="w-3 h-3" />
                        {showAllPersons ? "Show hub-only" : `Hub: ${modalFilteredCount} partner${modalFilteredCount !== 1 ? "s" : ""} · Show all`}
                      </button>
                    )}
                  </div>

                  {/* Hub filter notice */}
                  {modalFiltered && !showAllPersons && (
                    <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                      <Building2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-blue-600">
                        Showing <strong>{modalFilteredCount}</strong> delivery partner{modalFilteredCount !== 1 ? "s" : ""} assigned to this order's hub.
                        {modalFilteredCount === 0 && " No partners available for this hub."}
                      </p>
                    </div>
                  )}
                  {showAllPersons && (
                    <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700">
                        Showing all delivery partners. For best practice, assign only hub-specific partners.
                      </p>
                    </div>
                  )}

                  {/* Currently assigned */}
                  {selectedOrder.assignedDeliveryPersonName && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-50 border border-orange-100 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-orange-700">{selectedOrder.assignedDeliveryPersonName}</p>
                        <p className="text-[10px] text-orange-400 font-medium">Currently assigned</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDeliveryPersonId("__none__");
                          setTimeout(() => handleAssignDelivery(), 0);
                        }}
                        disabled={assigningDelivery}
                        className="text-[10px] font-semibold text-red-400 hover:text-red-600 border border-red-100 hover:border-red-200 bg-white px-2 py-1 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Select + Assign */}
                  <div className="flex gap-2">
                    <Select value={selectedDeliveryPersonId} onValueChange={setSelectedDeliveryPersonId}>
                      <SelectTrigger className="h-10 flex-1 text-sm">
                        <UserCheck className="w-3.5 h-3.5 text-gray-400 mr-1 flex-shrink-0" />
                        <SelectValue placeholder="Select delivery partner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {modalPersons.length === 0 && (
                          <div className="py-4 text-center text-xs text-gray-400">
                            No delivery partners {modalFiltered && !showAllPersons ? "for this hub" : "available"}
                          </div>
                        )}
                        {modalPersons.map((p) => {
                          const hubs = [
                            ...(p.superHubNames ?? (p.superHubName ? [p.superHubName] : [])),
                            ...(p.subHubNames ?? (p.subHubName ? [p.subHubName] : [])),
                          ].filter(Boolean);
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-[#162B4D]/10 flex items-center justify-center flex-shrink-0">
                                  <User className="w-3 h-3 text-[#162B4D]" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-[#162B4D]">{p.name}</span>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {p.phone && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{p.phone}</span>}
                                    {hubs.length > 0 && (
                                      <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                        <Building2 className="w-2.5 h-2.5" />{hubs.slice(0, 2).join(", ")}{hubs.length > 2 ? ` +${hubs.length - 2}` : ""}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAssignDelivery}
                      disabled={assigningDelivery || !selectedDeliveryPersonId}
                      className="bg-orange-500 hover:bg-orange-600 h-10 px-4 text-white font-semibold"
                    >
                      {assigningDelivery ? "Saving..." : "Assign"}
                    </Button>
                  </div>

                  {deliveryPersons.length === 0 && (
                    <p className="text-[11px] text-gray-400 italic">No delivery persons found. Add them via Admin Users.</p>
                  )}
                </div>

                {/* Status Update */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Update Status</p>
                  <div className="flex gap-2">
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="h-9 flex-1 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            <span className="flex items-center gap-2">{STATUS_CONFIG[s].label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleStatusUpdate}
                      disabled={savingStatus || editStatus === selectedOrder.status}
                      className="bg-[#1A56DB] hover:bg-[#1447B4] h-9 px-4"
                    >
                      {savingStatus ? "Saving..." : "Update"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Current:</span>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setSelectedOrder(null); setShowAllPersons(false); }} className="h-9">Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment-on-deliver dialog */}
      <Dialog open={deliverPayOpen} onOpenChange={(open) => { if (!savingStatus) setDeliverPayOpen(open); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Mark as Delivered
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (() => {
            const orderTotalValue = Number(selectedOrder.total) > 0
              ? Number(selectedOrder.total)
              : orderTotal(selectedOrder.items);
            const existingPaid = Number(selectedOrder.paidAmount) || 0;
            const remainingDue = Math.max(0, orderTotalValue - existingPaid);
            const newPaidTotal = existingPaid + (deliverPayStatus === "unpaid" ? 0 : deliverPayPaidTotal);
            const newDue = Math.max(0, orderTotalValue - newPaidTotal);

            return (
              <div className="space-y-4">
                <div className="px-3 py-2 bg-gray-50 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[12px] text-gray-500">
                    <span>Order Total</span>
                    <span className="font-semibold text-gray-700">{formatRupees(orderTotalValue)}</span>
                  </div>
                  {existingPaid > 0 && (
                    <div className="flex items-center justify-between text-[12px] text-emerald-600">
                      <span>Already Paid</span>
                      <span>{formatRupees(existingPaid)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[12px] text-amber-600">
                    <span>Outstanding</span>
                    <span className="font-semibold">{formatRupees(remainingDue)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Status</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: "unpaid", label: "Unpaid", color: "amber" },
                      { v: "partial", label: "Partial", color: "blue" },
                      { v: "paid", label: "Fully Paid", color: "emerald" },
                    ] as const).map((opt) => {
                      const active = deliverPayStatus === opt.v;
                      const colorMap: Record<string, string> = {
                        amber: active ? "border-amber-300 bg-amber-50 text-amber-800" : "border-gray-200 text-gray-500 hover:bg-gray-50",
                        blue: active ? "border-blue-300 bg-blue-50 text-[#1A56DB]" : "border-gray-200 text-gray-500 hover:bg-gray-50",
                        emerald: active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500 hover:bg-gray-50",
                      };
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => {
                            setDeliverPayStatus(opt.v);
                            if (opt.v === "unpaid") {
                              setDeliverPayEntries([]);
                            } else if (deliverPayEntries.length === 0) {
                              setDeliverPayEntries([
                                { mode: "cash", amount: opt.v === "paid" ? String(remainingDue) : "", reference: "" },
                              ]);
                            } else if (opt.v === "paid") {
                              setDeliverPayEntries((arr) =>
                                arr.length === 1 ? [{ ...arr[0], amount: String(remainingDue) }] : arr
                              );
                            }
                          }}
                          className={`h-9 rounded-xl border text-xs font-semibold transition-colors ${colorMap[opt.color]}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {deliverPayStatus !== "unpaid" && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Collected Payment</p>
                    {deliverPayEntries.map((entry, idx) => {
                      const ModeIcon = (PAYMENT_MODES.find((m) => m.value === entry.mode)?.Icon) || Tag;
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl border border-gray-100 bg-gray-50/40"
                        >
                          <div className="col-span-5 relative">
                            <ModeIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            <select
                              value={entry.mode}
                              onChange={(e) =>
                                setDeliverPayEntries((arr) =>
                                  arr.map((p, i) => (i === idx ? { ...p, mode: e.target.value } : p))
                                )
                              }
                              className="w-full h-9 pl-8 pr-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                            >
                              {PAYMENT_MODES.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-4 relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              value={entry.amount}
                              onChange={(e) => {
                                const raw = Number(e.target.value);
                                const otherSum = deliverPayEntries.reduce(
                                  (s, p, i) => s + (i === idx ? 0 : Number(p.amount) || 0),
                                  0
                                );
                                const maxAllowed = Math.max(0, remainingDue - otherSum);
                                let next = e.target.value;
                                if (Number.isFinite(raw) && raw > maxAllowed) {
                                  next = String(maxAllowed);
                                }
                                setDeliverPayEntries((arr) =>
                                  arr.map((p, i) => (i === idx ? { ...p, amount: next } : p))
                                );
                              }}
                              placeholder="Amount"
                              className="pl-6 h-9 text-sm"
                            />
                          </div>
                          <Input
                            value={entry.reference}
                            onChange={(e) =>
                              setDeliverPayEntries((arr) =>
                                arr.map((p, i) => (i === idx ? { ...p, reference: e.target.value } : p))
                              )
                            }
                            placeholder="Ref (opt)"
                            className="col-span-2 h-9 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setDeliverPayEntries((arr) => arr.filter((_, i) => i !== idx))}
                            disabled={deliverPayEntries.length === 1}
                            className="col-span-1 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Remove payment"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setDeliverPayEntries((arr) => [
                            ...arr,
                            {
                              mode: "cash",
                              amount: Math.max(0, remainingDue - deliverPayPaidTotal) > 0
                                ? String(remainingDue - deliverPayPaidTotal)
                                : "",
                              reference: "",
                            },
                          ])
                        }
                        className="h-8 text-xs gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add payment
                      </Button>
                      <div className="text-[11px] text-gray-500 flex items-center gap-3">
                        <span>Collecting: <span className="font-semibold text-gray-700">{formatRupees(deliverPayPaidTotal)}</span></span>
                        <span>
                          New due:{" "}
                          <span className={`font-semibold ${newDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                            {formatRupees(newDue)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverPayOpen(false)} disabled={savingStatus} className="h-9">
              Cancel
            </Button>
            <Button
              onClick={handleDeliverWithPayment}
              disabled={savingStatus}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
            >
              {savingStatus ? "Saving..." : "Mark as Delivered"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
