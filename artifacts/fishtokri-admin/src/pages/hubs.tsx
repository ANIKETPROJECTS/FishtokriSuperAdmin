import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, MapPin, ChevronDown, ChevronUp, Warehouse } from "lucide-react";
import { 
  useGetSuperHubs, 
  getGetSuperHubsQueryKey,
  useCreateSuperHub,
  useUpdateSuperHub,
  useDeleteSuperHub,
  useToggleSuperHubStatus,
  useGetSubHubsBySuperHub,
  getGetSubHubsBySuperHubQueryKey,
  useCreateSubHub,
  useUpdateSubHub,
  useDeleteSubHub,
  useToggleSubHubStatus
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function Hubs() {
  const { data: superHubsData, isLoading } = useGetSuperHubs(undefined, {
    query: { queryKey: getGetSuperHubsQueryKey() }
  });
  
  const superHubs = superHubsData?.superHubs || [];
  
  const [isSuperModalOpen, setIsSuperModalOpen] = useState(false);
  const [editingSuperHub, setEditingSuperHub] = useState<any>(null);
  const [deleteSuperHubId, setDeleteSuperHubId] = useState<string | null>(null);

  const stats = {
    total: superHubs.length,
    active: superHubs.filter(h => h.status === 'Active').length,
    subHubs: superHubs.reduce((acc, h) => acc + h.subHubCount, 0)
  };

  const openSuperModal = (hub: any = null) => {
    setEditingSuperHub(hub);
    setIsSuperModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#1E3A5F]">Super Hubs</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your distribution network</p>
        </div>
        <Button onClick={() => openSuperModal()} className="bg-[#1A56DB] hover:bg-[#1447B4] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Super Hub
        </Button>
      </div>

      <div className="flex gap-6 mb-6">
        <div className="bg-white px-5 py-3 rounded-lg border border-gray-100 shadow-sm flex-1">
          <p className="text-sm text-gray-500 font-medium">Total Super Hubs</p>
          <p className="text-2xl font-bold text-[#1E3A5F]">{stats.total}</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-lg border border-gray-100 shadow-sm flex-1">
          <p className="text-sm text-gray-500 font-medium">Active Super Hubs</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-lg border border-gray-100 shadow-sm flex-1">
          <p className="text-sm text-gray-500 font-medium">Total Sub Hubs</p>
          <p className="text-2xl font-bold text-[#1A56DB]">{stats.subHubs}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {superHubs.map(hub => (
            <SuperHubCard 
              key={hub.id} 
              hub={hub} 
              onEdit={() => openSuperModal(hub)}
              onDelete={() => setDeleteSuperHubId(hub.id)}
            />
          ))}
        </div>
      )}

      <SuperHubModal 
        isOpen={isSuperModalOpen} 
        onClose={() => setIsSuperModalOpen(false)} 
        hub={editingSuperHub} 
      />

      <DeleteSuperDialog 
        hubId={deleteSuperHubId} 
        onClose={() => setDeleteSuperHubId(null)} 
      />
    </div>
  );
}

function SuperHubCard({ hub, onEdit, onDelete }: { hub: any, onEdit: () => void, onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const toggleStatus = useToggleSuperHubStatus();

  const handleToggle = () => {
    toggleStatus.mutate({ id: hub.id }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: getGetSuperHubsQueryKey() });
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group transition-all hover:shadow-md">
      <div className="h-40 w-full relative bg-gray-100">
        {hub.imageUrl ? (
          <img src={hub.imageUrl} alt={hub.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Warehouse className="w-12 h-12 text-gray-300" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className={`font-semibold bg-white/95 border-none shadow-sm ${hub.status === 'Active' ? 'text-green-600' : 'text-red-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${hub.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {hub.status}
          </Badge>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-[#1E3A5F]">{hub.name}</h3>
          <Badge variant="secondary" className="bg-blue-50 text-[#1A56DB]">{hub.subHubCount} Sub Hubs</Badge>
        </div>
        
        <div className="flex items-center text-gray-500 text-sm mb-4">
          <MapPin className="w-4 h-4 mr-1 text-gray-400" />
          {hub.location || "No location set"}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit} className="text-[#1A56DB] border-[#1A56DB]/20 hover:bg-blue-50 h-8 px-3">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="text-[#E02424] border-[#E02424]/20 hover:bg-red-50 h-8 px-3">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={hub.status === 'Active'} onCheckedChange={handleToggle} className="data-[state=checked]:bg-[#1A56DB]" />
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="text-gray-500 p-0 h-8 w-8">
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4">
          <SubHubsList superHubId={hub.id} superHubName={hub.name} />
        </div>
      )}
    </div>
  );
}

function SubHubsList({ superHubId, superHubName }: { superHubId: string, superHubName: string }) {
  const { data, isLoading } = useGetSubHubsBySuperHub(superHubId, {
    query: { queryKey: getGetSubHubsBySuperHubQueryKey(superHubId) }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubHub, setEditingSubHub] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openModal = (subHub: any = null) => {
    setEditingSubHub(subHub);
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="text-sm text-gray-500 py-2 text-center">Loading sub hubs...</div>;

  const subHubs = data?.subHubs || [];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold text-[#1E3A5F]">Sub Hubs Directory</h4>
        <Button variant="outline" size="sm" onClick={() => openModal()} className="h-7 text-xs bg-white border-dashed border-gray-300">
          <Plus className="w-3 h-3 mr-1" /> Add Sub Hub
        </Button>
      </div>

      {subHubs.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3 italic">No sub hubs configured</p>
      ) : (
        <div className="space-y-2">
          {subHubs.map(sub => (
            <SubHubRow key={sub.id} sub={sub} onEdit={() => openModal(sub)} onDelete={() => setDeleteId(sub.id)} />
          ))}
        </div>
      )}

      <SubHubModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} subHub={editingSubHub} superHubId={superHubId} />
      <DeleteSubDialog subId={deleteId} onClose={() => setDeleteId(null)} superHubId={superHubId} />
    </div>
  );
}

function SubHubRow({ sub, onEdit, onDelete }: { sub: any, onEdit: () => void, onDelete: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toggleStatus = useToggleSubHubStatus();

  const handleToggle = () => {
    toggleStatus.mutate({ id: sub.id }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: getGetSubHubsBySuperHubQueryKey(sub.superHubId) });
      }
    });
  };

  return (
    <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-[#1E3A5F]">{sub.name}</p>
        <p className="text-xs text-gray-500 line-clamp-1 max-w-[150px]">{sub.location}</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {sub.pincodes?.slice(0, 2).map((p: string) => (
            <span key={p} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p}</span>
          ))}
          {sub.pincodes?.length > 2 && (
            <span className="text-[10px] text-gray-400 px-1 py-0.5">+{sub.pincodes.length - 2} more</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Switch checked={sub.status === 'Active'} onCheckedChange={handleToggle} className="scale-75 origin-right" />
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-6 w-6 text-gray-500 hover:text-[#1A56DB]"><Edit2 className="w-3 h-3" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-6 w-6 text-gray-500 hover:text-red-500"><Trash2 className="w-3 h-3" /></Button>
        </div>
      </div>
    </div>
  );
}

// ---- Modals ----

function SuperHubModal({ isOpen, onClose, hub }: { isOpen: boolean, onClose: () => void, hub: any }) {
  const isEditing = !!hub;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateSuperHub();
  const updateMutation = useUpdateSuperHub();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (hub) {
        setName(hub.name);
        setLocation(hub.location || "");
        setImageUrl(hub.imageUrl || "");
        setIsActive(hub.status === 'Active');
      } else {
        setName("");
        setLocation("");
        setImageUrl("");
        setIsActive(true);
      }
    }
  }, [isOpen, hub]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, location, imageUrl, status: isActive ? "Active" : "Inactive" as const };
    
    if (isEditing) {
      updateMutation.mutate({ id: hub.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "Super Hub updated" });
          queryClient.invalidateQueries({ queryKey: getGetSuperHubsQueryKey() });
          onClose();
        }
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Super Hub created" });
          queryClient.invalidateQueries({ queryKey: getGetSuperHubsQueryKey() });
          onClose();
        }
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEditing ? "Edit Super Hub" : "Add Super Hub"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Hub Name *</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Image URL — use pollinations.ai or any image URL</Label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://image.pollinations.ai/prompt/..." />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <Label>Active Status</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#1A56DB] text-white" disabled={createMutation.isPending || updateMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubHubModal({ isOpen, onClose, subHub, superHubId }: { isOpen: boolean, onClose: () => void, subHub: any, superHubId: string }) {
  const isEditing = !!subHub;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateSubHub();
  const updateMutation = useUpdateSubHub();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [pincodes, setPincodes] = useState<string[]>([]);
  const [pinInput, setPinInput] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (subHub) {
        setName(subHub.name);
        setLocation(subHub.location || "");
        setPincodes(subHub.pincodes || []);
        setIsActive(subHub.status === 'Active');
      } else {
        setName("");
        setLocation("");
        setPincodes([]);
        setIsActive(true);
      }
      setPinInput("");
    }
  }, [isOpen, subHub]);

  const handleAddPin = () => {
    const val = pinInput.trim();
    if (val && !pincodes.includes(val)) {
      setPincodes([...pincodes, val]);
      setPinInput("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, location, pincodes, status: isActive ? "Active" : "Inactive" as const };
    
    if (isEditing) {
      updateMutation.mutate({ id: subHub.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "Sub Hub updated" });
          queryClient.invalidateQueries({ queryKey: getGetSubHubsBySuperHubQueryKey(superHubId) });
          onClose();
        }
      });
    } else {
      createMutation.mutate({ id: superHubId, data: payload as any }, {
        onSuccess: () => {
          toast({ title: "Sub Hub created" });
          queryClient.invalidateQueries({ queryKey: getGetSubHubsBySuperHubQueryKey(superHubId) });
          queryClient.invalidateQueries({ queryKey: getGetSuperHubsQueryKey() }); // to update count
          onClose();
        }
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEditing ? "Edit Sub Hub" : "Add Sub Hub"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Sub Hub Name *</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Pincodes</Label>
            <div className="flex gap-2">
              <Input 
                value={pinInput} 
                onChange={e => setPinInput(e.target.value)} 
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPin(); } }}
                placeholder="Type pincode & enter" 
              />
              <Button type="button" variant="secondary" onClick={handleAddPin}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {pincodes.map(p => (
                <Badge key={p} variant="secondary" className="cursor-pointer hover:bg-red-50 hover:text-red-500 hover:line-through" onClick={() => setPincodes(pincodes.filter(x => x !== p))}>
                  {p}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <Label>Active Status</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#1A56DB] text-white" disabled={createMutation.isPending || updateMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSuperDialog({ hubId, onClose }: { hubId: string | null, onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteSuperHub();

  const handleDelete = () => {
    if (!hubId) return;
    deleteMutation.mutate({ id: hubId }, {
      onSuccess: () => {
        toast({ title: "Super Hub deleted" });
        queryClient.invalidateQueries({ queryKey: getGetSuperHubsQueryKey() });
        onClose();
      }
    });
  };

  return (
    <Dialog open={!!hubId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Delete Super Hub</DialogTitle><DialogDescription>This action cannot be undone. All sub hubs inside will also be removed.</DialogDescription></DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white" disabled={deleteMutation.isPending}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSubDialog({ subId, superHubId, onClose }: { subId: string | null, superHubId: string, onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteSubHub();

  const handleDelete = () => {
    if (!subId) return;
    deleteMutation.mutate({ id: subId }, {
      onSuccess: () => {
        toast({ title: "Sub Hub deleted" });
        queryClient.invalidateQueries({ queryKey: getGetSubHubsBySuperHubQueryKey(superHubId) });
        queryClient.invalidateQueries({ queryKey: getGetSuperHubsQueryKey() }); // update count
        onClose();
      }
    });
  };

  return (
    <Dialog open={!!subId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Delete Sub Hub</DialogTitle><DialogDescription>This action cannot be undone.</DialogDescription></DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white" disabled={deleteMutation.isPending}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
