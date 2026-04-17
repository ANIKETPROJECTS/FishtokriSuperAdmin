import { useEffect, useState } from "react";
import { Building2, Plus, Pencil, Trash2, Search, Landmark, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type BankAccount = {
  id: string;
  accountName: string;
  bankName: string;
  accountNo: string;
  ifscCode: string;
  balance: number;
  createdAt?: string;
};

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

const emptyForm = { accountName: "", bankName: "", accountNo: "", ifscCode: "", balance: "" };

function AccountModal({ open, account, onClose, onSaved }: {
  open: boolean;
  account: BankAccount | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setForm({
        accountName: account.accountName,
        bankName: account.bankName,
        accountNo: account.accountNo,
        ifscCode: account.ifscCode,
        balance: String(account.balance),
      });
    } else {
      setForm(emptyForm);
    }
  }, [account, open]);

  const handleSave = async () => {
    if (!form.accountName.trim() || !form.bankName.trim()) {
      toast({ title: "Validation", description: "Account Name and Bank Name are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, balance: parseFloat(form.balance) || 0 };
      if (account) {
        await apiFetch(`/api/banking/accounts/${account.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Updated", description: "Account updated successfully." });
      } else {
        await apiFetch("/api/banking/accounts", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Added", description: "Account added successfully." });
      }
      onSaved();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Edit Account" : "Add Account"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Account Name <span className="text-red-500">*</span></Label>
              <Input value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))} placeholder="e.g. IndusInd Bank" />
            </div>
            <div className="space-y-1.5">
              <Label>Bank Name <span className="text-red-500">*</span></Label>
              <Input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="e.g. IndusInd Bank" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Account No.</Label>
              <Input value={form.accountNo} onChange={e => setForm(f => ({ ...f, accountNo: e.target.value }))} placeholder="e.g. 123456789" />
            </div>
            <div className="space-y-1.5">
              <Label>IFSC Code</Label>
              <Input value={form.ifscCode} onChange={e => setForm(f => ({ ...f, ifscCode: e.target.value }))} placeholder="e.g. INDB0001234" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Opening Balance (₹)</Label>
            <Input type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} placeholder="0.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#1A56DB] hover:bg-[#1447B4]">
            {saving ? "Saving..." : account ? "Save Changes" : "Add Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BankingAccounts() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/banking/accounts");
      setAccounts(data);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = accounts.filter(a =>
    a.accountName.toLowerCase().includes(search.toLowerCase()) ||
    a.bankName.toLowerCase().includes(search.toLowerCase()) ||
    a.accountNo.includes(search) ||
    a.ifscCode.toLowerCase().includes(search.toLowerCase())
  );

  const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);

  const handleDelete = async (acc: BankAccount) => {
    if (!window.confirm(`Delete "${acc.accountName}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/banking/accounts/${acc.id}`, { method: "DELETE" });
      toast({ title: "Deleted", description: `"${acc.accountName}" deleted.` });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#162B4D]">Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">Manage bank accounts and petty cash.</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-2 bg-[#1A56DB] hover:bg-[#1447B4]">
          <Plus className="w-4 h-4" /> Add Account
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Accounts</p>
          <p className="text-3xl font-bold text-[#162B4D] mt-1">{accounts.length}</p>
          <p className="text-xs text-gray-400 mt-1">All registered accounts</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Balance</p>
          <p className="text-3xl font-bold text-[#162B4D] mt-1">₹{totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-1">Combined balance across accounts</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="font-bold text-[#162B4D]">All Accounts</h2>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {accounts.length} accounts</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..." className="pl-9 w-56" />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading accounts...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Landmark className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-500 mt-3">{accounts.length === 0 ? "No accounts yet" : "No accounts match your search"}</p>
            {accounts.length === 0 && (
              <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="mt-4 gap-2 bg-[#1A56DB] hover:bg-[#1447B4]">
                <Plus className="w-4 h-4" /> Add Account
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account No.</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IFSC Code</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Balance</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <p className="font-semibold text-[#162B4D]">{acc.accountName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{acc.bankName || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3 font-mono text-gray-600">{acc.accountNo || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3 font-mono text-gray-600">{acc.ifscCode || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-semibold text-[#162B4D]">₹{(acc.balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(acc); setModalOpen(true); }} className="h-8 w-8 p-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(acc)} className="h-8 w-8 p-0 text-gray-400 hover:text-red-600">
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

      <AccountModal open={modalOpen} account={editing} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); setEditing(null); load(); }} />
    </div>
  );
}
