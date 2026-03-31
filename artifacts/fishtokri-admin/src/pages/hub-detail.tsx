import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, Plus, Edit2, Trash2, LayoutDashboard, X, Layers,
} from "lucide-react";
import {
  useGetSuperHubs,
  getGetSuperHubsQueryKey,
  useGetSubHubsBySuperHub,
  getGetSubHubsBySuperHubQueryKey,
  useCreateSubHub,
  useUpdateSubHub,
  useDeleteSubHub,
  useToggleSubHubStatus,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

export default function HubDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const superHubId = params.id;

  const { data: superHubsData } = useGetSuperHubs(undefined, {
    query: { queryKey: getGetSuperHubsQueryKey() },
  });
  const superHub = superHubsData?.superHubs.find((h) => h.id === superHubId);

  const { data, isLoading } = useGetSubHubsBySuperHub(superHubId, {
    query: { queryKey: getGetSubHubsBySuperHubQueryKey(superHubId) },
  });

  const subHubs = data?.subHubs || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubHub, setEditingSubHub] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const stats = {
    total: subHubs.length,
    active: subHubs.filter((s) => s.status === "Active").length,
    totalPins: subHubs.reduce((acc, s) => acc + ((s as any).pincodes?.length ?? 0), 0),
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setLocation("/hubs")}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#162B4D] transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          {superHub ? (
            <>
              <h2 className="text-2xl font-bold text-[#162B4D] flex items-center gap-2">
                {superHub.name}
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${superHub.status === "Active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {superHub.status}
                </span>
              </h2>
              <p className="text-gray-500 text-sm flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {superHub.location || "Location not set"}
              </p>
            </>
          ) : (
            <Skeleton className="h-8 w-48" />
          )}
        </div>
        <Button
          onClick={() => { setEditingSubHub(null); setIsModalOpen(true); }}
          className="bg-[#1A56DB] hover:bg-[#1447B4] text-white h-9 px-4 text-sm font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Sub Hub
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Sub Hubs", value: stats.total, color: "text-[#162B4D]" },
          { label: "Active", value: stats.active, color: "text-green-600" },
          { label: "Total Pincodes", value: stats.totalPins, color: "text-[#1A56DB]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white px-5 py-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Sub Hub Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : subHubs.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No sub hubs yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Sub Hub" to create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subHubs.map((sub) => (
            <SubHubCard
              key={sub.id}
              sub={sub as any}
              onEdit={() => { setEditingSubHub(sub); setIsModalOpen(true); }}
              onDelete={() => setDeleteId(sub.id)}
            />
          ))}
        </div>
      )}

      <SubHubModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        subHub={editingSubHub}
        superHubId={superHubId}
      />
      <DeleteSubDialog subId={deleteId} superHubId={superHubId} onClose={() => setDeleteId(null)} />
    </div>
  );
}

function SubHubCard({ sub, onEdit, onDelete }: { sub: any; onEdit: () => void; onDelete: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toggleStatus = useToggleSubHubStatus();

  const handleToggle = () => {
    toggleStatus.mutate({ id: sub.id }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: getGetSubHubsBySuperHubQueryKey(sub.superHubId) });
      },
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="h-40 w-full relative bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden flex-shrink-0">
        {sub.imageUrl ? (
          <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="w-10 h-10 text-blue-200" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-3 left-4">
          <h3 className="text-white text-base font-bold drop-shadow">{sub.name}</h3>
        </div>
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/90 shadow-sm ${sub.status === "Active" ? "text-green-600" : "text-red-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sub.status === "Active" ? "bg-green-500" : "bg-red-500"}`} />
            {sub.status}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Location */}
        <div className="flex items-center text-gray-500 text-xs mb-3">
          <MapPin className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" />
          <span className="truncate">{sub.location || "Location not set"}</span>
        </div>

        {/* Pincodes */}
        {sub.pincodes?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {sub.pincodes.slice(0, 4).map((p: string) => (
              <span key={p} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                {p}
              </span>
            ))}
            {sub.pincodes.length > 4 && (
              <span className="text-[10px] text-gray-400 px-1 py-0.5">+{sub.pincodes.length - 4} more</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-3 border-t border-gray-100 space-y-2">
          {/* Dashboard button */}
          <Button
            className="w-full h-8 text-xs font-semibold bg-[#162B4D] hover:bg-[#1E3A5F] text-white gap-2"
            size="sm"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </Button>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <Switch
              checked={sub.status === "Active"}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-[#1A56DB] scale-90"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SubHubModal({ isOpen, onClose, subHub, superHubId }: { isOpen: boolean; onClose: () => void; subHub: any; superHubId: string }) {
  const isEditing = !!subHub;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateSubHub();
  const updateMutation = useUpdateSubHub();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pincodes, setPincodes] = useState<string[]>([]);
  const [pinInput, setPinInput] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (subHub) {
        setName(subHub.name); setLocation(subHub.location || "");
        setImageUrl((subHub as any).imageUrl || "");
        setPincodes(subHub.pincodes || []); setIsActive(subHub.status === "Active");
      } else {
        setName(""); setLocation(""); setImageUrl(""); setPincodes([]); setIsActive(true);
      }
      setPinInput("");
    }
  }, [isOpen, subHub]);

  const addPin = () => {
    const val = pinInput.trim();
    if (val && !pincodes.includes(val)) { setPincodes([...pincodes, val]); setPinInput(""); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, location, imageUrl, pincodes, status: isActive ? "Active" : ("Inactive" as const) };
    if (isEditing) {
      updateMutation.mutate({ id: subHub.id, data: payload as any }, {
        onSuccess: () => {
          toast({ title: "Sub Hub updated" });
          queryClient.invalidateQueries({ queryKey: getGetSubHubsBySuperHubQueryKey(superHubId) });
          onClose();
        },
      });
    } else {
      createMutation.mutate({ id: superHubId, data: payload as any }, {
        onSuccess: () => {
          toast({ title: "Sub Hub created" });
          queryClient.invalidateQueries({ queryKey: getGetSubHubsBySuperHubQueryKey(superHubId) });
          queryClient.invalidateQueries({ queryKey: getGetSuperHubsQueryKey() });
          onClose();
        },
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-[#162B4D]">{isEditing ? "Edit Sub Hub" : "Add Sub Hub"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Sub Hub Name *</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Thane" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Thane, Mumbai" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://image.pollinations.ai/prompt/..." className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Service Areas (Pincodes)</Label>
            <div className="flex gap-2">
              <Input value={pinInput} onChange={(e) => setPinInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPin(); } }} placeholder="Type pincode & press Enter" className="h-9" />
              <Button type="button" variant="secondary" onClick={addPin} className="h-9 px-3 text-sm">Add</Button>
            </div>
            {pincodes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-gray-50 rounded-lg">
                {pincodes.map((p) => (
                  <span key={p} onClick={() => setPincodes(pincodes.filter((x) => x !== p))}
                    className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors font-medium">
                    {p} <X className="w-2.5 h-2.5" />
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <Label className="text-sm">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">
              {isEditing ? "Save Changes" : "Create Sub Hub"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSubDialog({ subId, superHubId, onClose }: { subId: string | null; superHubId: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteSubHub();
  return (
    <Dialog open={!!subId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Sub Hub</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { if (!subId) return; deleteMutation.mutate({ id: subId }, { onSuccess: () => { toast({ title: "Deleted" }); queryClient.invalidateQueries({ queryKey: getGetSubHubsBySuperHubQueryKey(superHubId) }); queryClient.invalidateQueries({ queryKey: getGetSuperHubsQueryKey() }); onClose(); } }); }} className="bg-red-600 hover:bg-red-700 text-white" disabled={deleteMutation.isPending}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
