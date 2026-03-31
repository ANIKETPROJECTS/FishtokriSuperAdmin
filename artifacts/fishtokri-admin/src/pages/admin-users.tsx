import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { 
  useGetUsers, 
  getGetUsersQueryKey,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useToggleUserStatus,
  useGetSuperHubs,
  getGetSuperHubsQueryKey,
  useGetSubHubsBySuperHub,
  getGetSubHubsBySuperHubQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminUsers() {
  const { data: usersData, isLoading } = useGetUsers(undefined, {
    query: { queryKey: getGetUsersQueryKey() }
  });
  
  const users = usersData?.users || [];
  
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.role.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const toggleStatus = useToggleUserStatus();

  const handleToggleStatus = (id: string, currentStatus: string) => {
    toggleStatus.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Status updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#1E3A5F]">Admin & Staff Users</h2>
          <p className="text-gray-500 text-sm mt-1">Manage system access and roles across all hubs.</p>
        </div>
        <Button onClick={openAddModal} className="bg-[#1A56DB] hover:bg-[#1447B4] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search users by name, email or role..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">User Details</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Hub</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => (
                  <TableRow key={user.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-gray-100">
                          <AvatarFallback className="bg-blue-50 text-[#1A56DB] font-semibold">
                            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-[#1E3A5F]">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <p className="text-xs text-gray-400">{user.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      {user.role === 'super_admin' ? (
                        <span className="text-gray-400 text-sm">— All Access —</span>
                      ) : (
                        <div className="flex flex-col">
                          {user.superHubName && <span className="font-medium text-sm text-[#1E3A5F]">{user.superHubName}</span>}
                          {user.subHubName && <span className="text-xs text-gray-500">Sub: {user.subHubName}</span>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={user.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch 
                          checked={user.status === 'Active'} 
                          onCheckedChange={() => handleToggleStatus(user.id, user.status)}
                          className="data-[state=checked]:bg-[#1A56DB] mr-2"
                        />
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(user)} className="text-[#1A56DB] hover:bg-blue-50">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteUserId(user.id)} className="text-[#E02424] hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <UserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        user={editingUser} 
      />

      <DeleteUserDialog 
        userId={deleteUserId} 
        onClose={() => setDeleteUserId(null)} 
      />
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'super_admin') return <Badge className="bg-[#1E3A5F] hover:bg-[#1E3A5F]">Super Admin</Badge>;
  if (role === 'super_hub') return <Badge className="bg-[#1A56DB] hover:bg-[#1A56DB]">Super Hub</Badge>;
  return <Badge className="bg-teal-600 hover:bg-teal-600">Sub Hub</Badge>;
}

function UserModal({ isOpen, onClose, user }: { isOpen: boolean, onClose: () => void, user: any }) {
  const isEditing = !!user;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const { data: superHubsData } = useGetSuperHubs(undefined, {
    query: { queryKey: getGetSuperHubsQueryKey() }
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"super_admin" | "super_hub" | "sub_hub">("super_hub");
  const [superHubId, setSuperHubId] = useState("");
  const [subHubId, setSubHubId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: subHubsData } = useGetSubHubsBySuperHub(superHubId, {
    query: { 
      queryKey: getGetSubHubsBySuperHubQueryKey(superHubId),
      enabled: !!superHubId && role === 'sub_hub'
    }
  });

  useState(() => {
    if (isOpen) {
      if (user) {
        setName(user.name);
        setEmail(user.email);
        setPhone(user.phone || "");
        setRole(user.role as any);
        setSuperHubId(user.superHubId || "");
        setSubHubId(user.subHubId || "");
        setIsActive(user.status === 'Active');
      } else {
        setName("");
        setEmail("");
        setPhone("");
        setRole("super_hub");
        setSuperHubId("");
        setSubHubId("");
        setIsActive(true);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name, email, phone, role,
      superHubId: role !== 'super_admin' ? superHubId : undefined,
      subHubId: role === 'sub_hub' ? subHubId : undefined,
      status: isActive ? "Active" : "Inactive" as const
    };

    if (isEditing) {
      updateMutation.mutate({ id: user.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "User updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          onClose();
        }
      });
    } else {
      createMutation.mutate({ data: payload as any }, {
        onSuccess: () => {
          toast({ title: "User created successfully" });
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          onClose();
        }
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input required value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="super_hub">Super Hub Admin</SelectItem>
                  <SelectItem value="sub_hub">Sub Hub Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {role !== 'super_admin' && (
            <div className="space-y-2">
              <Label>Assigned Super Hub</Label>
              <Select value={superHubId} onValueChange={setSuperHubId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select super hub" />
                </SelectTrigger>
                <SelectContent>
                  {superHubsData?.superHubs.map(hub => (
                    <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {role === 'sub_hub' && (
            <div className="space-y-2">
              <Label>Assigned Sub Hub</Label>
              <Select value={subHubId} onValueChange={setSubHubId} disabled={!superHubId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sub hub" />
                </SelectTrigger>
                <SelectContent>
                  {subHubsData?.subHubs.map(hub => (
                    <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mt-2">
            <Label>Active Status</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#1A56DB] hover:bg-[#1447B4]">
              {isEditing ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ userId, onClose }: { userId: string | null, onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteUser();

  const handleDelete = () => {
    if (!userId) return;
    deleteMutation.mutate({ id: userId }, {
      onSuccess: () => {
        toast({ title: "User deleted" });
        queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
        onClose();
      }
    });
  };

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this user? They will lose all access to the system immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleDelete} className="bg-[#E02424] hover:bg-red-700" disabled={deleteMutation.isPending}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
