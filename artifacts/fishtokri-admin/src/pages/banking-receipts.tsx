import { useEffect, useState } from "react";
import { ArrowDownCircle, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Receipt = {
  id: string;
  date: string;
  paymentMode: string;
  depositAccountName: string;
  oppositeAccountName: string;
  amount: number;
  notes: string;
  createdAt?: string;
};

type BankAccount = { id: string; accountName: string };

const PAYMENT_MODES = ["CASH", "CHEQUE", "NEFT", "RTGS", "IMPS", "GPAY", "GPAY B", "PAYTM", "PHONEPE", "CREDIT CARD", "DEBIT CARD", "UPI", "OTHER"];

function getToken() {
  return localStorage.getItem("fishtokri_token") ?? "";
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data;
}

const emptyForm = { date: "", paymentMode: "", depositAccountName: "", oppositeAccountName: "", amount: "", notes: "" };

function ReceiptModal({ open, receipt, accounts, onClose, onSaved }: {
  open: boolean;
  receipt: Receipt | null;
  accounts: BankAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (receipt) {
      setForm({
        date: receipt.date ? receipt.date.slice(0, 10) : "",
        paymentMode: receipt.paymentMode,
        depositAccountName: receipt.depositAccountName,
        oppositeAccountName: receipt.oppositeAccountName,
        amount: String(receipt.amount),
        notes: receipt.notes,
      });
    } else {
      setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    }
  }, [receipt, open]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.date || !form.paymentMode || !form.depositAccountName || !form.oppositeAccountName || !form.amount) {
      toast({ title: "Validation", description: "Date, Payment Mode, Deposit Account, Opposite Account and Amount are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) || 0 };
      if (receipt) {
        await apiFetch(`/api/banking/receipts/${receipt.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Updated", description: "Receipt updated." });
      } else {
        await apiFetch("/api/banking/receipts", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Added", description: "Receipt added." });
      }
      onSaved();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{receipt ? "Edit Receipt" : "Add Receipt"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Mode <span className="text-red-500">*</span></Label>
              <Select value={form.paymentMode} onValueChange={v => set("paymentMode", v)}>
                <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Deposit Account Name <span className="text-red-500">*</span></Label>
            {accounts.length > 0 ? (
              <Select value={form.depositAccountName} onValueChange={v => set("depositAccountName", v)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.accountName}>{a.accountName}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.depositAccountName} onChange={e => set("depositAccountName", e.target.value)} placeholder="e.g. IndusInd Bank" />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Opposite Account Name <span className="text-red-500">*</span></Label>
            <Input value={form.oppositeAccountName} onChange={e => set("oppositeAccountName", e.target.value)} placeholder="e.g. Rajani Nair" />
          </div>
          <div className="space-y-1.5">
            <Label>Amount (₹) <span className="text-red-500">*</span></Label>
            <Input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4]">
            {saving ? "Saving..." : receipt ? "Save Changes" : "Add Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BankingReceipts() {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Receipt | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([apiFetch("/api/banking/receipts"), apiFetch("/api/banking/accounts")]);
      setReceipts(r);
      setAccounts(a);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = receipts.filter(r =>
    r.paymentMode.toLowerCase().includes(search.toLowerCase()) ||
    r.depositAccountName.toLowerCase().includes(search.toLowerCase()) ||
    r.oppositeAccountName.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = receipts.reduce((s, r) => s + (r.amount ?? 0), 0);

  const handleDelete = async (rec: Receipt) => {
    if (!window.confirm("Delete this receipt? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/banking/receipts/${rec.id}`, { method: "DELETE" });
      toast({ title: "Deleted", description: "Receipt deleted." });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-") : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#162B4D]">Receipts</h1>
          <p className="text-sm text-gray-500 mt-1">Track all incoming payments and receipts.</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-2 bg-[#1A56DB] hover:bg-[#1447B4]">
          <Plus className="w-4 h-4" /> Add Receipt
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Receipts</p>
          <p className="text-3xl font-bold text-[#162B4D] mt-1">{receipts.length}</p>
          <p className="text-xs text-gray-400 mt-1">All recorded receipts</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Amount</p>
          <p className="text-3xl font-bold text-green-600 mt-1">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-1">Sum of all receipts</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="font-bold text-[#162B4D]">Receipts <span className="ml-1.5 text-gray-400 font-normal text-sm">{receipts.length}</span></h2>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search receipts..." className="pl-9 w-56" />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading receipts...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ArrowDownCircle className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-500 mt-3">{receipts.length === 0 ? "No receipts yet" : "No receipts match your search"}</p>
            {receipts.length === 0 && (
              <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="mt-4 gap-2 bg-[#1A56DB] hover:bg-[#1447B4]">
                <Plus className="w-4 h-4" /> Add Receipt
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Mode</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deposit Account Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Opposite Account Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(rec => (
                  <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{fmtDate(rec.date)}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{rec.paymentMode}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{rec.depositAccountName}</td>
                    <td className="px-5 py-3 text-gray-700 font-medium">{rec.oppositeAccountName}</td>
                    <td className="px-5 py-3 text-right font-semibold text-green-700">
                      ₹{rec.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(rec); setModalOpen(true); }} className="h-8 w-8 p-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(rec)} className="h-8 w-8 p-0 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReceiptModal open={modalOpen} receipt={editing} accounts={accounts} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); setEditing(null); load(); }} />
    </div>
  );
}
