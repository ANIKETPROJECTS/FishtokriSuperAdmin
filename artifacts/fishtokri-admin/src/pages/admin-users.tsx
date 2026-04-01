import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, Mail, Phone, Eye, EyeOff } from "lucide-react";
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
  getGetSubHubsBySuperHubQueryKey,
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
  DialogDescription,
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

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
  if (role === "super_admin")
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#162B4D] text-white">Master Admin</span>;
  if (role === "super_hub")
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#1A56DB] text-white">Super Hub</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-teal-600 text-white">Sub Hub</span>;
}

export default function AdminUsers() {
  const { data: usersData, isLoading } = useGetUsers(undefined, {
    query: { queryKey: getGetUsersQueryKey() },
  });

  const users = usersData?.users || [];
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const toggleStatus = useToggleUserStatus();

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleStatus = (id: string) => {
    toggleStatus.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#162B4D]">Admin & Staff Users</h2>
          <p className="text-gray-500 text-sm mt-1">Manage system access and roles across all hubs.</p>
        </div>
        <Button
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="bg-[#1A56DB] hover:bg-[#1447B4] text-white h-9 px-4 text-sm font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users by name, email or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200 h-9 text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">User Details</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Role</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Assigned Hub</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50/40 border-gray-100">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarFallback className={`text-sm font-bold ${getAvatarColor(user.name)}`}>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-[#162B4D] text-sm">{user.name}</p>
                          <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="py-4">
                      {user.role === "super_admin" ? (
                        <span className="text-gray-400 text-sm italic">All Hubs</span>
                      ) : user.role === "super_hub" ? (
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray((user as any).superHubNames) && (user as any).superHubNames.length > 0 ? (
                            (user as any).superHubNames.map((n: string) => (
                              <span key={n} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                {n}
                              </span>
                            ))
                          ) : user.superHubName ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                              {user.superHubName}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-sm">—</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm">
                          {user.superHubName && (
                            <p className="font-medium text-[#162B4D]">{user.superHubName}</p>
                          )}
                          {user.subHubName && (
                            <p className="text-xs text-gray-500">Sub Hub – {user.subHubName}</p>
                          )}
                          {!user.superHubName && !user.subHubName && (
                            <span className="text-gray-400 italic">—</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${
                          user.status === "Active"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditingUser(user); setIsModalOpen(true); }}
                          className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:text-[#1A56DB] hover:border-blue-200 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteUserId(user.id)}
                          className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <UserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={editingUser} />
      <DeleteUserDialog userId={deleteUserId} onClose={() => setDeleteUserId(null)} />
    </div>
  );
}

function UserModal({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: any }) {
  const isEditing = !!user;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const { data: superHubsData } = useGetSuperHubs(undefined, {
    query: { queryKey: getGetSuperHubsQueryKey() },
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"super_admin" | "super_hub" | "sub_hub">("super_hub");
  const [superHubIds, setSuperHubIds] = useState<string[]>([]);
  const [superHubId, setSuperHubId] = useState("");
  const [subHubId, setSubHubId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: subHubsData } = useGetSubHubsBySuperHub(superHubId, {
    query: {
      queryKey: getGetSubHubsBySuperHubQueryKey(superHubId),
      enabled: !!superHubId && role === "sub_hub",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setName(user.name);
        setEmail(user.email);
        setPhone(user.phone || "");
        setPassword("");
        setRole(user.role as any);
        const ids: string[] = Array.isArray(user.superHubIds) && user.superHubIds.length > 0
          ? user.superHubIds
          : user.superHubId ? [user.superHubId] : [];
        setSuperHubIds(ids);
        setSuperHubId(ids[0] || "");
        setSubHubId(user.subHubId || "");
        setIsActive(user.status === "Active");
      } else {
        setName(""); setEmail(""); setPhone(""); setPassword(""); setRole("super_hub");
        setSuperHubIds([]); setSuperHubId(""); setSubHubId(""); setIsActive(true);
      }
    }
  }, [isOpen, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name, email, phone, role,
      superHubIds: role === "super_hub" ? superHubIds : undefined,
      superHubId: role === "sub_hub" ? superHubId || undefined : undefined,
      subHubId: role === "sub_hub" ? subHubId || undefined : undefined,
      status: isActive ? "Active" : ("Inactive" as const),
    };
    if (!isEditing) payload.password = password;
    else if (password.trim()) payload.password = password;
    if (isEditing) {
      updateMutation.mutate({ id: user.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "User updated" });
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          onClose();
        },
      });
    } else {
      createMutation.mutate({ data: payload as any }, {
        onSuccess: () => {
          toast({ title: "User created" });
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          onClose();
        },
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[#162B4D]">{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Name *</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9" placeholder="9876543210" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Email *</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">
              {isEditing ? "New Password" : "Password *"}
              {isEditing && <span className="text-gray-400 font-normal ml-1">(leave blank to keep current)</span>}
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required={!isEditing}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 pr-9"
                placeholder={isEditing ? "Enter new password to change" : "Min. 6 characters"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Role</Label>
            <Select value={role} onValueChange={(v: any) => { setRole(v); setSuperHubId(""); setSubHubId(""); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Master Admin</SelectItem>
                <SelectItem value="super_hub">Super Hub Admin</SelectItem>
                <SelectItem value="sub_hub">Sub Hub Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "super_hub" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Assigned Super Hubs</Label>
              <div className="border border-gray-200 rounded-lg p-2 max-h-40 overflow-y-auto bg-white space-y-1">
                {!superHubsData?.superHubs?.length ? (
                  <p className="text-xs text-gray-400 px-2 py-1">No super hubs available</p>
                ) : (
                  superHubsData.superHubs.map((hub) => {
                    const checked = superHubIds.includes(hub.id);
                    return (
                      <label key={hub.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSuperHubIds(checked
                              ? superHubIds.filter((id) => id !== hub.id)
                              : [...superHubIds, hub.id]
                            );
                          }}
                          className="w-3.5 h-3.5 accent-[#1A56DB]"
                        />
                        <span className="text-sm text-gray-700">{hub.name}</span>
                        {hub.status !== "Active" && (
                          <span className="text-[10px] text-red-500 ml-auto">Inactive</span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
              {superHubIds.length > 0 && (
                <p className="text-[11px] text-[#1A56DB]">{superHubIds.length} hub{superHubIds.length > 1 ? "s" : ""} selected</p>
              )}
            </div>
          )}
          {role === "sub_hub" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Assigned Super Hub</Label>
              <Select value={superHubId} onValueChange={(v) => { setSuperHubId(v); setSubHubId(""); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select super hub" /></SelectTrigger>
                <SelectContent>
                  {superHubsData?.superHubs.map((hub) => (
                    <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {role === "sub_hub" && superHubId && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Assigned Sub Hub</Label>
              <Select value={subHubId} onValueChange={setSubHubId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select sub hub" /></SelectTrigger>
                <SelectContent>
                  {subHubsData?.subHubs.map((hub) => (
                    <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <Label className="text-sm text-gray-700">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-[#1A56DB]" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#1A56DB] hover:bg-[#1447B4] h-9">
              {isEditing ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
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
      },
    });
  };

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>This user will lose all access immediately. This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white" disabled={deleteMutation.isPending}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
