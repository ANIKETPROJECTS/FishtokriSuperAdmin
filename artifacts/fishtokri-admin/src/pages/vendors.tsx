import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Plus, LayoutGrid, List, SlidersHorizontal, ArrowUpDown,
  Building2, Phone, Mail, MapPin, Trash2, Edit2, Eye, Package,
  ShoppingCart, X, ChevronLeft, ChevronRight, RefreshCw, Tag,
  IndianRupee, TrendingUp, Calendar, FileText, ChevronDown, Check,
  Boxes, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/image-upload";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getToken() { return localStorage.getItem("fishtokri_token") || ""; }
function getBase() { return import.meta.env.BASE_URL?.replace(/\/$/, "") || ""; }

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

function formatRupees(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function formatDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const CATEGORIES = ["General", "Fish", "Seafood", "Dry Fish", "Prawns", "Crabs", "Lobster", "Squid"];
const CATEGORY_OTHER = "Other";
const UNITS = ["kg", "g", "pieces", "dozen", "box", "bag", "liter"];

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Vendor {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  status: "active" | "inactive";
  notes: string;
  totalPurchases: number;
  totalSpent: number;
  createdAt: string;
  profileImageUrl?: string;
}

interface PurchaseItem {
  id?: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  expiryDate: string;
}

interface Purchase {
  id: string;
  vendorId: string;
  vendorName: string;
  invoiceNumber: string;
  purchaseDate: string;
  items: PurchaseItem[];
  totalAmount: number;
  notes: string;
  createdAt: string;
}

// ─── EMPTY FORMS ──────────────────────────────────────────────────────────────

const emptyVendor = (): { name: string; phone: string; email: string; address: string; category: string; status: "active" | "inactive"; notes: string } => ({
  name: "", phone: "", email: "", address: "", category: "", status: "active", notes: "",
});

// Split a comma-separated category string into an array of trimmed parts
function parseCats(cat: string): string[] {
  return cat ? cat.split(",").map(s => s.trim()).filter(Boolean) : [];
}

const emptyItem = (): PurchaseItem => ({
  productName: "", quantity: 1, unit: "kg", pricePerUnit: 0, totalPrice: 0, expiryDate: "",
});

const emptyPurchase = () => ({
  invoiceNumber: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  items: [emptyItem()],
  notes: "",
});

// ─── BADGE COMPONENTS ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
      status === "active"
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-gray-100 border-gray-200 text-gray-500"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const cats = parseCats(category);
  if (cats.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {cats.map(c => (
        <span key={c} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
          <Tag className="w-2.5 h-2.5" />
          {c}
        </span>
      ))}
    </span>
  );
}

// ─── VENDOR CARD (GRID) ───────────────────────────────────────────────────────

function VendorCard({ vendor, onEdit, onDelete, onView, onAddPurchase }: {
  vendor: Vendor;
  onEdit: (v: Vendor) => void;
  onDelete: (v: Vendor) => void;
  onView: (v: Vendor) => void;
  onAddPurchase: (v: Vendor) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#162B4D]/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
            {vendor.profileImageUrl
              ? <img src={vendor.profileImageUrl} alt={vendor.name} className="w-full h-full object-cover" />
              : <Building2 className="w-5 h-5 text-[#162B4D]" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#162B4D] text-sm truncate">{vendor.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CategoryBadge category={vendor.category} />
            </div>
          </div>
        </div>
        <StatusBadge status={vendor.status} />
      </div>

      <div className="space-y-1.5 text-xs text-gray-500">
        {vendor.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span>{vendor.phone}</span>
          </div>
        )}
        {vendor.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{vendor.email}</span>
          </div>
        )}
        {vendor.address && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{vendor.address}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-gray-50">
        <div className="text-center">
          <p className="text-[11px] text-gray-400">Purchases</p>
          <p className="font-bold text-[#162B4D] text-sm">{vendor.totalPurchases}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-gray-400">Total Spent</p>
          <p className="font-bold text-[#162B4D] text-sm">{formatRupees(vendor.totalSpent)}</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => onView(vendor)}>
          <Eye className="w-3 h-3 mr-1" /> View
        </Button>
        <Button size="sm" className="flex-1 h-7 text-xs bg-[#162B4D] hover:bg-[#1e3a6e] text-white" onClick={() => onAddPurchase(vendor)}>
          <ShoppingCart className="w-3 h-3 mr-1" /> Buy
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600" onClick={() => onEdit(vendor)}>
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" onClick={() => onDelete(vendor)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── VENDOR ROW (LIST) ────────────────────────────────────────────────────────

function VendorRow({ vendor, onEdit, onDelete, onView, onAddPurchase }: {
  vendor: Vendor;
  onEdit: (v: Vendor) => void;
  onDelete: (v: Vendor) => void;
  onView: (v: Vendor) => void;
  onAddPurchase: (v: Vendor) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-shadow">
      <div className="w-9 h-9 rounded-full bg-[#162B4D]/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
        {vendor.profileImageUrl
          ? <img src={vendor.profileImageUrl} alt={vendor.name} className="w-full h-full object-cover" />
          : <Building2 className="w-4 h-4 text-[#162B4D]" />}
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-[#162B4D] text-sm truncate">{vendor.name}</p>
          <p className="text-[11px] text-gray-400 truncate">{vendor.phone || vendor.email || "No contact"}</p>
        </div>
        <CategoryBadge category={vendor.category} />
        <StatusBadge status={vendor.status} />
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-400">Purchases</p>
          <p className="font-bold text-[#162B4D] text-sm">{vendor.totalPurchases}</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-400">Total Spent</p>
          <p className="font-bold text-[#162B4D] text-sm">{formatRupees(vendor.totalSpent)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => onView(vendor)}>
            <Eye className="w-3 h-3 mr-1" /> View
          </Button>
          <Button size="sm" className="h-7 text-xs px-2 bg-[#162B4D] hover:bg-[#1e3a6e] text-white" onClick={() => onAddPurchase(vendor)}>
            <ShoppingCart className="w-3 h-3 mr-1" /> Buy
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600" onClick={() => onEdit(vendor)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" onClick={() => onDelete(vendor)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── MULTI CATEGORY PICKER ────────────────────────────────────────────────────

function MultiCategoryPicker({ selected, otherText, onToggle, onOtherText }: {
  selected: string[];
  otherText: string;
  onToggle: (cat: string) => void;
  onOtherText: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const otherChecked = selected.includes(CATEGORY_OTHER);

  return (
    <div className="mt-1 space-y-2">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border border-input bg-background rounded-md px-3 py-2 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
      >
        <span className={selected.length === 0 ? "text-muted-foreground" : "text-foreground"}>
          {selected.length === 0 ? "Select categories..." : `${selected.length} categor${selected.length === 1 ? "y" : "ies"} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-md p-2 space-y-1">
          {CATEGORIES.map(cat => (
            <label key={cat} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selected.includes(cat)}
                onChange={() => onToggle(cat)}
                className="accent-[#162B4D] w-3.5 h-3.5 rounded"
              />
              <span className="text-sm">{cat}</span>
            </label>
          ))}
          {/* Other option */}
          <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={otherChecked}
              onChange={() => onToggle(CATEGORY_OTHER)}
              className="accent-[#162B4D] w-3.5 h-3.5 rounded"
            />
            <span className="text-sm">Other</span>
          </label>
          {otherChecked && (
            <div className="px-2 pb-1">
              <input
                type="text"
                value={otherText}
                onChange={e => onOtherText(e.target.value)}
                placeholder="Type category name..."
                className="w-full border border-input rounded-md px-2.5 py-1.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((cat) => {
            const label = cat === CATEGORY_OTHER && otherText.trim() ? otherText.trim() : cat;
            return (
              <span key={cat} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                {label}
                <button type="button" onClick={() => onToggle(cat)} className="ml-0.5 hover:text-red-500 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── VENDOR FORM MODAL ────────────────────────────────────────────────────────

function validatePhone(phone: string) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return "Phone must be exactly 10 digits";
  if (!/^\d{10}$/.test(digits)) return "Phone must contain digits only";
  return "";
}

function validateEmail(email: string) {
  if (!email) return "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Enter a valid email address (e.g. name@example.com)";
  return "";
}

function VendorFormModal({ open, onClose, onSave, initial }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initial?: Vendor | null;
}) {
  const [form, setForm] = useState(emptyVendor());
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // Multi-category state
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  // Profile image
  const [profileImageUrl, setProfileImageUrl] = useState("");

  useEffect(() => {
    if (open) {
      setTouched({});
      setProfileImageUrl(initial?.profileImageUrl || "");
      const base = initial ? {
        name: initial.name, phone: initial.phone, email: initial.email,
        address: initial.address, category: initial.category, status: initial.status, notes: initial.notes,
      } : emptyVendor();
      setForm(base);
      // Parse existing category into multi-select state
      if (initial?.category) {
        const parts = parseCats(initial.category);
        const knownCats = [...CATEGORIES, CATEGORY_OTHER];
        const known = parts.filter(p => knownCats.includes(p));
        const unknown = parts.filter(p => !knownCats.includes(p));
        if (unknown.length > 0) {
          setSelectedCats([...known, CATEGORY_OTHER]);
          setOtherText(unknown.join(", "));
        } else {
          setSelectedCats(known);
          setOtherText("");
        }
      } else {
        setSelectedCats([]);
        setOtherText("");
      }
    }
  }, [open, initial]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const touch = (k: string) => setTouched(t => ({ ...t, [k]: true }));

  const toggleCat = (cat: string) => {
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
    if (cat === CATEGORY_OTHER) setOtherText("");
  };

  const phoneError = touched.phone ? validatePhone(form.phone) : "";
  const emailError = touched.email ? validateEmail(form.email) : "";
  const hasErrors = !!validatePhone(form.phone) || !!validateEmail(form.email);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    set("phone", digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ phone: true, email: true });
    if (!form.name.trim() || hasErrors) return;
    // Build final category string
    const finalCats = selectedCats.map(c => {
      if (c === CATEGORY_OTHER) return otherText.trim() || CATEGORY_OTHER;
      return c;
    });
    const payload = { ...form, category: finalCats.join(", "), profileImageUrl };
    setSaving(true);
    try { await onSave(payload); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUpload
            value={profileImageUrl}
            onChange={setProfileImageUrl}
            folder="fishtokri/vendors"
            label="Profile Image"
            previewClassName="w-12 h-12 rounded-full"
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Vendor Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Mumbai Fish Market" required className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={handlePhoneChange}
                onBlur={() => touch("phone")}
                placeholder="10-digit number"
                inputMode="numeric"
                maxLength={10}
                className={`mt-1 ${phoneError ? "border-red-400 focus-visible:ring-red-300" : ""}`}
              />
              {phoneError && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold leading-none">!</span>
                  {phoneError}
                </p>
              )}
              {!phoneError && touched.phone && form.phone.length === 10 && (
                <p className="text-[11px] text-green-600 mt-1">✓ Valid phone number</p>
              )}
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={e => set("email", e.target.value)}
                onBlur={() => touch("email")}
                placeholder="vendor@example.com"
                type="text"
                className={`mt-1 ${emailError ? "border-red-400 focus-visible:ring-red-300" : ""}`}
              />
              {emailError && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold leading-none">!</span>
                  {emailError}
                </p>
              )}
              {!emailError && touched.email && form.email && (
                <p className="text-[11px] text-green-600 mt-1">✓ Valid email address</p>
              )}
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Shop no, Street, City" className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Categories</Label>
              <MultiCategoryPicker
                selected={selectedCats}
                otherText={otherText}
                onToggle={toggleCat}
                onOtherText={setOtherText}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any notes about this vendor..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#162B4D] hover:bg-[#1e3a6e] text-white">
              {saving ? "Saving..." : initial ? "Update Vendor" : "Add Vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── ADD PURCHASE MODAL ───────────────────────────────────────────────────────

function AddPurchaseModal({ open, onClose, vendor, onSaved }: {
  open: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(emptyPurchase());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) setForm(emptyPurchase());
  }, [open]);

  const setField = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const setItem = (idx: number, k: keyof PurchaseItem, v: any) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [k]: v };
      if (k === "quantity" || k === "pricePerUnit") {
        const qty = k === "quantity" ? Number(v) : Number(items[idx].quantity);
        const price = k === "pricePerUnit" ? Number(v) : Number(items[idx].pricePerUnit);
        items[idx].totalPrice = qty * price;
      }
      return { ...f, items };
    });
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const totalAmount = useMemo(() =>
    form.items.reduce((s, i) => s + (Number(i.quantity) * Number(i.pricePerUnit)), 0),
    [form.items]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    const validItems = form.items.filter(i => i.productName.trim() && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/vendors/${vendor.id}/purchases`, {
        method: "POST",
        body: JSON.stringify({ ...form, items: validItems }),
      });
      toast({ title: "Purchase saved!", description: `${validItems.length} item(s) added to inventory.` });
      onSaved();
      onClose();
    } catch (err: any) {
      toast({ title: "Failed to save purchase", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#162B4D]" />
            Add Purchase — {vendor?.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Invoice / Bill No.</Label>
              <Input
                value={form.invoiceNumber}
                onChange={e => setField("invoiceNumber", e.target.value)}
                placeholder="INV-001 (optional)"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={e => setField("purchaseDate", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Items Purchased</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">Item #{idx + 1}</span>
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Input
                        value={item.productName}
                        onChange={e => setItem(idx, "productName", e.target.value)}
                        placeholder="Product name (e.g. Rohu Fish)"
                        className="h-8 text-sm"
                        required
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.quantity}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                          setItem(idx, "quantity", v);
                        }}
                        placeholder="Qty"
                        className="h-8 text-sm w-24"
                      />
                      <Select value={item.unit} onValueChange={v => setItem(idx, "unit", v)}>
                        <SelectTrigger className="h-8 text-sm flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-400">₹</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.pricePerUnit}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                          setItem(idx, "pricePerUnit", v);
                        }}
                        placeholder="Price/unit"
                        className="h-8 text-sm flex-1"
                      />
                      <span className="text-xs text-gray-400 whitespace-nowrap">/{item.unit}</span>
                    </div>
                    <div>
                      <Input
                        type="date"
                        value={item.expiryDate}
                        onChange={e => setItem(idx, "expiryDate", e.target.value)}
                        className="h-8 text-sm"
                        title="Expiry date (optional)"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 bg-white rounded border border-gray-100 px-2 h-8">
                      <IndianRupee className="w-3 h-3" />
                      <span className="font-semibold text-[#162B4D]">
                        {(Number(item.quantity) * Number(item.pricePerUnit)).toLocaleString("en-IN")}
                      </span>
                      <span className="text-gray-400">total</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-[#162B4D] text-white rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Total Amount</span>
            <span className="text-xl font-bold">{formatRupees(totalAmount)}</span>
          </div>

          <div>
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={e => setField("notes", e.target.value)}
              placeholder="Any notes for this purchase..."
              className="mt-1"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#162B4D] hover:bg-[#1e3a6e] text-white">
              {saving ? "Saving..." : "Save Purchase & Update Inventory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── VENDOR DETAIL MODAL ──────────────────────────────────────────────────────

function VendorDetailModal({ open, onClose, vendor, onAddPurchase }: {
  open: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onAddPurchase: () => void;
}) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "purchases">("overview");
  const LIMIT = 10;

  const loadPurchases = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/vendors/${vendor.id}/purchases?page=${page}&limit=${LIMIT}`);
      setPurchases(data.purchases);
      setTotal(data.total);
    } catch {
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, [vendor, page]);

  useEffect(() => {
    if (open && vendor) { setPage(1); setActiveTab("overview"); loadPurchases(); }
  }, [open, vendor]);

  useEffect(() => { if (open) loadPurchases(); }, [page]);

  if (!vendor) return null;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#162B4D]/10 flex items-center justify-center overflow-hidden border border-gray-100">
                {vendor.profileImageUrl
                  ? <img src={vendor.profileImageUrl} alt={vendor.name} className="w-full h-full object-cover" />
                  : <Building2 className="w-5 h-5 text-[#162B4D]" />}
              </div>
              <div>
                <DialogTitle className="text-left">{vendor.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <CategoryBadge category={vendor.category} />
                  <StatusBadge status={vendor.status} />
                </div>
              </div>
            </div>
            <Button size="sm" className="bg-[#162B4D] hover:bg-[#1e3a6e] text-white gap-1.5" onClick={onAddPurchase}>
              <ShoppingCart className="w-3.5 h-3.5" /> Add Purchase
            </Button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 -mx-6 px-6">
          {(["overview", "purchases"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-[#162B4D] text-[#162B4D]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab === "purchases" ? `Purchases (${total})` : "Overview"}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#162B4D]/5 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Total Purchases</p>
                <p className="text-2xl font-bold text-[#162B4D]">{vendor.totalPurchases}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Total Spent</p>
                <p className="text-2xl font-bold text-amber-600">{formatRupees(vendor.totalSpent)}</p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact Details</p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                {vendor.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{vendor.email}</span>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{vendor.address}</span>
                  </div>
                )}
                {!vendor.phone && !vendor.email && !vendor.address && (
                  <p className="text-sm text-gray-400">No contact information</p>
                )}
              </div>
            </div>

            {vendor.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{vendor.notes}</p>
              </div>
            )}

            <div className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Added on {formatDate(vendor.createdAt)}
            </div>
          </div>
        )}

        {activeTab === "purchases" && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No purchases yet</p>
                <Button size="sm" className="mt-3 bg-[#162B4D] hover:bg-[#1e3a6e] text-white" onClick={onAddPurchase}>
                  Add First Purchase
                </Button>
              </div>
            ) : (
              <>
                {purchases.map(p => (
                  <div key={p.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50 hover:bg-white transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-semibold text-[#162B4D]">
                          {p.invoiceNumber || "No Invoice"}
                        </span>
                        <span className="text-[11px] text-gray-400">•</span>
                        <span className="text-[11px] text-gray-400">{formatDate(p.purchaseDate)}</span>
                      </div>
                      <span className="text-sm font-bold text-amber-600">{formatRupees(p.totalAmount)}</span>
                    </div>
                    <div className="space-y-1">
                      {p.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Package className="w-3 h-3 text-gray-300" />
                            <span>{item.productName}</span>
                            <span className="text-gray-400">({item.quantity} {item.unit})</span>
                          </div>
                          <span className="font-medium">{formatRupees(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                    {p.notes && (
                      <p className="text-[11px] text-gray-400 mt-1 italic">{p.notes}</p>
                    )}
                  </div>
                ))}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-7">
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                    <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                    <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7">
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────────────────────

function DeleteModal({ open, onClose, vendor, onConfirm }: {
  open: boolean; onClose: () => void; vendor: Vendor | null; onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Vendor</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">
          Are you sure you want to delete <strong>{vendor?.name}</strong>? This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Vendors() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 12;
  const totalPages = Math.ceil(total / LIMIT);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("createdAt_desc");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [viewVendor, setViewVendor] = useState<Vendor | null>(null);
  const [purchaseVendor, setPurchaseVendor] = useState<Vendor | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        sort,
        ...(search ? { search } : {}),
        ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      const data = await apiFetch(`/api/vendors?${params}`);
      setVendors(data.vendors);
      setTotal(data.total);
    } catch (err: any) {
      toast({ title: "Failed to load vendors", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, sort, search, categoryFilter, statusFilter]);

  useEffect(() => { loadVendors(); }, [loadVendors]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleSaveVendor = async (data: any) => {
    if (editVendor) {
      await apiFetch(`/api/vendors/${editVendor.id}`, { method: "PUT", body: JSON.stringify(data) });
      toast({ title: "Vendor updated!" });
    } else {
      await apiFetch(`/api/vendors`, { method: "POST", body: JSON.stringify(data) });
      toast({ title: "Vendor added!" });
    }
    loadVendors();
    setEditVendor(null);
  };

  const handleDelete = async () => {
    if (!deleteVendor) return;
    await apiFetch(`/api/vendors/${deleteVendor.id}`, { method: "DELETE" });
    toast({ title: "Vendor deleted" });
    setDeleteVendor(null);
    loadVendors();
  };

  const handlePurchaseSaved = () => {
    loadVendors();
    if (viewVendor) setViewVendor(vendors.find(v => v.id === viewVendor.id) || viewVendor);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#162B4D]">Vendors</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your suppliers and track purchases</p>
        </div>
        <Button className="bg-[#162B4D] hover:bg-[#1e3a6e] text-white gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Add Vendor
        </Button>
      </div>

      {/* Stats Bar */}
      {!loading && total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Vendors</p>
              <p className="text-lg font-bold text-[#162B4D]">{total}</p>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Active</p>
              <p className="text-lg font-bold text-[#162B4D]">{vendors.filter(v => v.status === "active").length}</p>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Spent</p>
              <p className="text-lg font-bold text-[#162B4D]">{formatRupees(vendors.reduce((s, v) => s + v.totalSpent, 0))}</p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-wrap items-center gap-2 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search vendors..."
            className="pl-9 h-8 text-sm"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(""); setSearch(""); }} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 text-sm w-[130px] gap-1">
            <Tag className="w-3 h-3 text-gray-400" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 text-sm w-[110px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sort} onValueChange={v => { setSort(v); setPage(1); }}>
          <SelectTrigger className="h-8 text-sm w-[150px] gap-1">
            <ArrowUpDown className="w-3 h-3 text-gray-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt_desc">Newest First</SelectItem>
            <SelectItem value="createdAt_asc">Oldest First</SelectItem>
            <SelectItem value="name_asc">Name A-Z</SelectItem>
            <SelectItem value="name_desc">Name Z-A</SelectItem>
            <SelectItem value="totalSpent_desc">Highest Spent</SelectItem>
            <SelectItem value="totalPurchases_desc">Most Purchases</SelectItem>
          </SelectContent>
        </Select>

        {/* Refresh */}
        <Button size="sm" variant="ghost" onClick={loadVendors} className="h-8 w-8 p-0">
          <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </Button>

        {/* Layout Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setLayout("grid")}
            className={`p-1.5 rounded-md transition-colors ${layout === "grid" ? "bg-white shadow-sm text-[#162B4D]" : "text-gray-400 hover:text-gray-600"}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLayout("list")}
            className={`p-1.5 rounded-md transition-colors ${layout === "list" ? "bg-white shadow-sm text-[#162B4D]" : "text-gray-400 hover:text-gray-600"}`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Results Info */}
      {!loading && (
        <div className="flex items-center justify-between text-xs text-gray-400 -mt-2">
          <span>{total} vendor{total !== 1 ? "s" : ""} found</span>
          {(search || categoryFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => { setSearchInput(""); setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); setPage(1); }}
              className="text-[#162B4D] font-medium hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className={layout === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-48 animate-pulse" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No vendors found</p>
          <p className="text-gray-400 text-sm mt-1">
            {search || categoryFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Add your first vendor to get started"}
          </p>
          {!search && categoryFilter === "all" && statusFilter === "all" && (
            <Button className="mt-4 bg-[#162B4D] hover:bg-[#1e3a6e] text-white gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add Vendor
            </Button>
          )}
        </div>
      ) : layout === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map(v => (
            <VendorCard
              key={v.id}
              vendor={v}
              onEdit={setEditVendor}
              onDelete={setDeleteVendor}
              onView={setViewVendor}
              onAddPurchase={vendor => { setPurchaseVendor(vendor); }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {vendors.map(v => (
            <VendorRow
              key={v.id}
              vendor={v}
              onEdit={setEditVendor}
              onDelete={setDeleteVendor}
              onView={setViewVendor}
              onAddPurchase={vendor => { setPurchaseVendor(vendor); }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "...")[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="text-gray-400 text-sm px-1">...</span>
              ) : (
                <Button
                  key={p}
                  variant={page === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p as number)}
                  className={`h-8 w-8 p-0 ${page === p ? "bg-[#162B4D] text-white" : ""}`}
                >
                  {p}
                </Button>
              )
            )}
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Modals */}
      <VendorFormModal
        open={addOpen || !!editVendor}
        onClose={() => { setAddOpen(false); setEditVendor(null); }}
        onSave={handleSaveVendor}
        initial={editVendor}
      />

      <VendorDetailModal
        open={!!viewVendor}
        onClose={() => setViewVendor(null)}
        vendor={viewVendor}
        onAddPurchase={() => { setPurchaseVendor(viewVendor); setViewVendor(null); }}
      />

      <AddPurchaseModal
        open={!!purchaseVendor}
        onClose={() => setPurchaseVendor(null)}
        vendor={purchaseVendor}
        onSaved={handlePurchaseSaved}
      />

      <DeleteModal
        open={!!deleteVendor}
        onClose={() => setDeleteVendor(null)}
        vendor={deleteVendor}
        onConfirm={handleDelete}
      />
    </div>
  );
}
