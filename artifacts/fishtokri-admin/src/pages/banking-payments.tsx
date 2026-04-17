import { useEffect, useState } from "react";
import { ArrowUpCircle, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Payment = {
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

function PaymentModal({ open, payment, accounts, onClose, onSaved }: {
  open: boolean;
  payment: Payment | null;
  accounts: BankAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (payment) {
      setForm({
        date: payment.date ? payment.date.slice(0, 10) : "",
        paymentMode: payment.paymentMode,
        depositAccountName: payment.depositAccountName,
        oppositeAccountName: payment.oppositeAccountName,
        amount: String(payment.amount),
        notes: payment.notes,
      });
    } else {
      setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    }
  }, [payment, open]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.date || !form.paymentMode || !form.depositAccountName || !form.oppositeAccountName || !form.amount) {
      toast({ title: "Validation", description: "Date, Payment Mode, Deposit Account, Opposite Account and Amount are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) || 0 };
      if (payment) {
        await apiFetch(`/api/banking/payments/${payment.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Updated", description: "Payment updated." });
      } else {
        await apiFetch("/api/banking/payments", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Added", description: "Payment added." });
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
          <DialogTitle>{payment ? "Edit Payment" : "Add Payment"}</DialogTitle>
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
            <Input value={form.oppositeAccountName} onChange={e => set("oppositeAccountName", e.target.value)} placeholder="e.g. Fresh Farms Chicken" />
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
            {saving ? "Saving..." : payment ? "Save Changes" : "Add Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BankingPayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([apiFetch("/api/banking/payments"), apiFetch("/api/banking/accounts")]);
      setPayments(p);
      setAccounts(a);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = payments.filter(p =>
    p.paymentMode.toLowerCase().includes(search.toLowerCase()) ||
    p.depositAccountName.toLowerCase().includes(search.toLowerCase()) ||
    p.oppositeAccountName.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = payments.reduce((s, p) => s + (p.amount ?? 0), 0);

  const handleDelete = async (pay: Payment) => {
    if (!window.confirm("Delete this payment? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/banking/payments/${pay.id}`, { method: "DELETE" });
      toast({ title: "Deleted", description: "Payment deleted." });
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
          <h1 className="text-2xl font-bold text-[#162B4D]">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">Track all outgoing payments and expenses.</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-2 bg-[#1A56DB] hover:bg-[#1447B4]">
          <Plus className="w-4 h-4" /> Add Payment
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Payments</p>
          <p className="text-3xl font-bold text-[#162B4D] mt-1">{payments.length}</p>
          <p className="text-xs text-gray-400 mt-1">All recorded payments</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Amount</p>
          <p className="text-3xl font-bold text-red-600 mt-1">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-1">Sum of all payments</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="font-bold text-[#162B4D]">Payments <span className="ml-1.5 text-gray-400 font-normal text-sm">{payments.length}</span></h2>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..." className="pl-9 w-56" />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading payments...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ArrowUpCircle className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-500 mt-3">{payments.length === 0 ? "No payments yet" : "No payments match your search"}</p>
            {payments.length === 0 && (
              <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="mt-4 gap-2 bg-[#1A56DB] hover:bg-[#1447B4]">
                <Plus className="w-4 h-4" /> Add Payment
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
                {filtered.map(pay => (
                  <tr key={pay.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{fmtDate(pay.date)}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{pay.paymentMode}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{pay.depositAccountName}</td>
                    <td className="px-5 py-3 text-gray-700 font-medium">{pay.oppositeAccountName}</td>
                    <td className="px-5 py-3 text-right font-semibold text-red-600">
                      ₹{pay.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(pay); setModalOpen(true); }} className="h-8 w-8 p-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(pay)} className="h-8 w-8 p-0 text-gray-400 hover:text-red-600">
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

      <PaymentModal open={modalOpen} payment={editing} accounts={accounts} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); setEditing(null); load(); }} />
    </div>
  );
}
