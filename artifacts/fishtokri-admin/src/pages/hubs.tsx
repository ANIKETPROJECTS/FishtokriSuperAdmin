import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, MapPin, X, AlertTriangle, Warehouse, Activity, CheckCircle2, XCircle } from "lucide-react";
import { 
  useGetHubs, 
  getGetHubsQueryKey, 
  useCreateHub, 
  useUpdateHub, 
  useDeleteHub, 
  useToggleHubStatus,
  useGetHubStats,
  useHealthCheck
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  const { data: hubsData, isLoading: isHubsLoading } = useGetHubs();
  const { data: statsData } = useGetHubStats();
  const { data: healthData } = useHealthCheck();
  
  const hubs = hubsData?.hubs || [];
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHub, setEditingHub] = useState<any>(null);
  const [deleteHubId, setDeleteHubId] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingHub(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (hub: any) => {
    setEditingHub(hub);
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-[#1E3A5F] tracking-tight">Distribution Hubs</h2>
            {healthData && (
              <span className="flex items-center text-xs font-medium bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200 shadow-sm" title="System Health" data-testid="badge-health">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                System {healthData.status}
              </span>
            )}
          </div>
          <p className="text-[#6B7280] text-sm font-medium">Manage your active locations and service areas.</p>
        </div>
        <Button onClick={openAddModal} className="bg-[#1A56DB] hover:bg-[#1447B4] text-white shadow-md transition-all active:scale-95 h-10 px-5" data-testid="button-add-hub">
          <Plus className="w-4 h-4 mr-2" />
          Add Hub
        </Button>
      </div>

      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-container">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Warehouse className="w-6 h-6 text-[#1A56DB]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Total Hubs</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">{statsData.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Active</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">{statsData.active}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-6 h-6 text-[#E02424]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Inactive</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">{statsData.inactive}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Service Areas</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">{statsData.totalServiceAreas}</p>
            </div>
          </div>
        </div>
      )}

      {isHubsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[360px] rounded-2xl" />
          ))}
        </div>
      ) : hubs.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-5 border border-gray-100">
            <Warehouse className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-[#1E3A5F]">No hubs found</h3>
          <p className="text-gray-500 mt-2 mb-8 max-w-sm">You haven't added any distribution hubs yet. Create your first hub to start managing deliveries.</p>
          <Button onClick={openAddModal} className="bg-[#1E3A5F] hover:bg-[#152943] text-white shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Create First Hub
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hubs.map(hub => (
            <HubCard 
              key={hub.id} 
              hub={hub} 
              onEdit={() => openEditModal(hub)}
              onDelete={() => setDeleteHubId(hub.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <HubModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        hub={editingHub} 
      />

      {/* Delete Dialog */}
      <DeleteDialog 
        hubId={deleteHubId} 
        onClose={() => setDeleteHubId(null)} 
      />
    </div>
  );
}

function HubCard({ hub, onEdit, onDelete }: { hub: any, onEdit: () => void, onDelete: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toggleStatus = useToggleHubStatus();

  const handleToggle = () => {
    toggleStatus.mutate({ id: hub.id }, {
      onSuccess: () => {
        toast({
          title: "Status updated",
          description: `${hub.name} is now ${hub.status === 'Active' ? 'Inactive' : 'Active'}.`,
        });
        queryClient.invalidateQueries({ queryKey: getGetHubsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ['/api/hubs/stats/summary'] });
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col group hover:-translate-y-1" data-testid={`card-hub-${hub.id}`}>
      <div className="h-44 w-full relative bg-gray-50 overflow-hidden border-b border-gray-50">
        <img 
          src="https://image.pollinations.ai/prompt/3D%20modern%20warehouse%20building%20illustration%20blue%20white%20isometric%20style%20glossy%20render" 
          alt="Warehouse" 
          className="w-full h-full object-cover mix-blend-multiply opacity-95 group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-md flex items-center gap-1.5 ${hub.status === 'Active' ? 'bg-green-100/95 text-green-700 border border-green-200/50' : 'bg-red-100/95 text-[#E02424] border border-red-200/50'}`} data-testid={`badge-status-${hub.id}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hub.status === 'Active' ? 'bg-green-500' : 'bg-[#E02424]'}`}></span>
            {hub.status}
          </span>
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-[#1E3A5F] tracking-tight line-clamp-1">{hub.name}</h3>
        <div className="flex items-center text-[#6B7280] mt-2 mb-5 text-sm font-medium">
          <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0 text-gray-400" />
          <span className="line-clamp-1">{hub.location}</span>
        </div>
        
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Service Areas</h4>
          <div className="flex flex-wrap gap-2">
            {hub.serviceAreas.slice(0, 4).map((area: string) => (
              <span key={area} className="px-2.5 py-1 bg-[#EFF6FF] text-[#1A56DB] text-xs rounded-md font-semibold border border-blue-50/50 shadow-sm">
                {area}
              </span>
            ))}
            {hub.serviceAreas.length > 4 && (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-semibold shadow-sm">
                +{hub.serviceAreas.length - 4} more
              </span>
            )}
            {hub.serviceAreas.length === 0 && (
              <span className="text-gray-400 text-xs italic font-medium">No service areas defined</span>
            )}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={onEdit} className="border-[#1A56DB]/30 text-[#1A56DB] hover:bg-[#EFF6FF] hover:border-[#1A56DB] h-9 px-3.5 font-semibold transition-colors bg-white shadow-sm" data-testid={`button-edit-${hub.id}`}>
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="border-[#E02424]/30 text-[#E02424] hover:bg-red-50 hover:border-[#E02424] h-9 px-3.5 font-semibold transition-colors bg-white shadow-sm" data-testid={`button-delete-${hub.id}`}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
          <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100 shadow-sm" title="Toggle Status">
            <Switch 
              checked={hub.status === 'Active'} 
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-[#1A56DB]"
              data-testid={`switch-status-${hub.id}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function HubModal({ isOpen, onClose, hub }: { isOpen: boolean, onClose: () => void, hub: any | null }) {
  const isEditing = !!hub;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMutation = useCreateHub();
  const updateMutation = useUpdateHub();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (hub) {
        setName(hub.name);
        setLocation(hub.location || "");
        setServiceAreas(hub.serviceAreas ? [...hub.serviceAreas] : []);
        setIsActive(hub.status === 'Active');
      } else {
        setName("");
        setLocation("");
        setServiceAreas([]);
        setIsActive(true);
      }
      setTagInput("");
    }
  }, [isOpen, hub]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !serviceAreas.includes(val)) {
        setServiceAreas([...serviceAreas, val]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tag: string) => {
    setServiceAreas(serviceAreas.filter(t => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const payload = {
      name,
      location,
      serviceAreas,
      status: isActive ? "Active" : "Inactive" as const
    };

    if (isEditing) {
      updateMutation.mutate({ id: hub.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "Hub updated successfully", className: "bg-green-50 text-green-800 border-green-200" });
          queryClient.invalidateQueries({ queryKey: getGetHubsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ['/api/hubs/stats/summary'] });
          onClose();
        },
        onError: () => toast({ title: "Failed to update hub", variant: "destructive" })
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Hub created successfully", className: "bg-green-50 text-green-800 border-green-200" });
          queryClient.invalidateQueries({ queryKey: getGetHubsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ['/api/hubs/stats/summary'] });
          onClose();
        },
        onError: () => toast({ title: "Failed to create hub", variant: "destructive" })
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white border border-gray-100 shadow-2xl rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <DialogTitle className="text-xl font-bold text-[#1E3A5F]">
            {isEditing ? "Edit Hub" : "Add New Hub"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="space-y-2">
            <Label className="text-[#1E3A5F] font-bold text-sm">Hub Name *</Label>
            <Input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required
              className="border-gray-200 focus-visible:ring-2 focus-visible:ring-[#1A56DB] h-11 shadow-sm"
              data-testid="input-hub-name"
              placeholder="e.g. Downtown Central"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-[#1E3A5F] font-bold text-sm">Location</Label>
            <Input 
              value={location} 
              onChange={e => setLocation(e.target.value)}
              className="border-gray-200 focus-visible:ring-2 focus-visible:ring-[#1A56DB] h-11 shadow-sm"
              data-testid="input-hub-location"
              placeholder="e.g. 123 Harbor St, Cityville"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#1E3A5F] font-bold text-sm">Service Areas</Label>
            <div className="flex gap-2">
              <Input 
                value={tagInput} 
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type and press Enter to add"
                className="border-gray-200 focus-visible:ring-2 focus-visible:ring-[#1A56DB] h-11 shadow-sm"
                data-testid="input-hub-areas"
              />
              <Button 
                type="button" 
                onClick={(e) => handleAddTag({ key: 'Enter', preventDefault: () => {} } as any)}
                className="h-11 bg-gray-100 hover:bg-gray-200 text-[#1E3A5F] px-5 font-semibold shadow-sm"
              >
                Add
              </Button>
            </div>
            
            {serviceAreas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100 min-h-[56px]">
                {serviceAreas.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#1A56DB] rounded-md text-sm font-semibold shadow-sm border border-blue-100/50">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:bg-blue-100 rounded-full p-0.5 transition-colors text-[#1A56DB]" data-testid={`button-remove-tag-${tag}`}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100 mt-2 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-[#1E3A5F] font-bold text-sm cursor-pointer" htmlFor="status-toggle">
                Active Status
              </Label>
              <p className="text-xs text-gray-500 font-medium">Inactive hubs will not receive new deliveries</p>
            </div>
            <Switch 
              id="status-toggle"
              checked={isActive} 
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-[#1A56DB] scale-110 mr-1"
              data-testid="switch-modal-status"
            />
          </div>

          <DialogFooter className="pt-6 mt-6 border-t border-gray-100 sm:justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 font-semibold h-11 px-6 shadow-sm hover:bg-gray-50" data-testid="button-cancel-modal">
              Cancel
            </Button>
            <Button type="submit" className="bg-[#1A56DB] hover:bg-[#1447B4] text-white font-semibold h-11 px-8 shadow-md" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-modal">
              {isEditing ? "Save Hub" : "Create Hub"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ hubId, onClose }: { hubId: string | null, onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteHub();

  const handleDelete = () => {
    if (!hubId) return;
    deleteMutation.mutate({ id: hubId }, {
      onSuccess: () => {
        toast({ title: "Hub deleted", className: "bg-red-50 text-red-800 border-red-200" });
        queryClient.invalidateQueries({ queryKey: getGetHubsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ['/api/hubs/stats/summary'] });
        onClose();
      },
      onError: () => {
        toast({ title: "Failed to delete hub", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={!!hubId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] bg-white border border-red-100 shadow-2xl rounded-2xl p-6">
        <div className="flex flex-col items-center pt-2 pb-2 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-5 border border-red-100 shadow-sm relative">
            <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-20"></div>
            <AlertTriangle className="w-7 h-7 text-[#E02424]" />
          </div>
          <DialogTitle className="text-xl font-bold text-[#1E3A5F] mb-2">Delete Hub</DialogTitle>
          <DialogDescription className="text-gray-500 font-medium">
            Are you sure you want to delete this hub? All data associated with it will be permanently removed. This action cannot be undone.
          </DialogDescription>
        </div>
        <DialogFooter className="sm:justify-center gap-3 mt-8">
          <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 font-semibold flex-1 h-11 shadow-sm hover:bg-gray-50" data-testid="button-cancel-delete">
            Cancel
          </Button>
          <Button onClick={handleDelete} className="bg-[#E02424] hover:bg-[#c81e1e] text-white font-semibold flex-1 h-11 shadow-md" disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
            {deleteMutation.isPending ? "Deleting..." : "Delete Hub"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
