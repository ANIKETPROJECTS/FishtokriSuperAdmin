import { Link, useLocation } from "wouter";
import { LayoutDashboard, Warehouse, Users, LogOut, Building2, Store, Truck, UserCircle, ShoppingBasket, ClipboardList, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";

const masterAdminNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hubs", label: "Hubs", icon: Warehouse },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/vendors", label: "Vendors", icon: Handshake },
  { href: "/admin-users", label: "Admin Users", icon: Users },
  { href: "/customers", label: "Customers", icon: ShoppingBasket },
];

function getAdminData() {
  try {
    const raw = localStorage.getItem("fishtokri_admin");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const admin = getAdminData();
  const role = admin?.role || "master_admin";
  const adminName = admin?.name || (role === "master_admin" ? "Master Admin" : "Super Hub");

  const handleLogout = () => {
    localStorage.removeItem("fishtokri_token");
    localStorage.removeItem("fishtokri_admin");
    setLocation("/");
  };

  const isSuperHub = role === "super_hub";
  const isSubHub = role === "sub_hub";
  const isDelivery = role === "delivery_person";

  const superHubIds: string[] = admin?.superHubIds?.length > 0
    ? admin.superHubIds
    : admin?.superHubId ? [admin.superHubId] : [];
  const myHubHref = superHubIds.length === 1
    ? `/my-hub/${superHubIds[0]}`
    : "/my-hubs";

  const superHubNavItems = [
    { href: "/super-hub-dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      href: myHubHref,
      label: "Super Hub",
      icon: Building2,
      matchPrefix: "/my-hub",
    },
  ];

  const subHubNavItems = [
    { href: "/sub-hub-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/my-sub-hubs", label: "My Sub Hubs", icon: Store },
  ];

  const deliveryNavItems = [
    { href: "/delivery-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/my-deliveries", label: "My Hubs", icon: Truck },
  ];

  const navItems = isSuperHub ? superHubNavItems : isSubHub ? subHubNavItems : isDelivery ? deliveryNavItems : masterAdminNavItems;
  const roleLabel = isSuperHub ? "Super Hub" : isSubHub ? "Sub Hub" : isDelivery ? "Delivery" : "Master Admin";

  return (
    <div className="flex min-h-screen bg-[#F4F6FA]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-[165px] bg-[#162B4D] text-white flex flex-col z-20">
        {/* Logo */}
        <div className="flex items-center justify-center px-4 py-4 border-b border-white/10">
          <div className="w-[148px] h-[72px] rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <img src="/logo.png" alt="FishTokri" className="w-[136px] h-[64px] object-contain" />
          </div>
        </div>

        {/* Role Label */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{roleLabel}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 pb-4">
          {navItems.map(({ href, label, icon: Icon, matchPrefix }: any) => {
            const isActive =
              location === href ||
              (matchPrefix && location.startsWith(matchPrefix)) ||
              (!matchPrefix && href === "/hubs" && location.startsWith("/hubs"));
            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-3 px-5 py-2.5 cursor-pointer transition-all text-sm font-medium ${
                    isActive
                      ? "bg-white/10 text-white border-l-2 border-amber-400"
                      : "text-white/60 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[10px] text-white/30 text-center">FishTokri Admin System</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[165px] flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white h-14 border-b border-gray-100 flex items-center justify-end px-8 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-[#162B4D]">{adminName}</span>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-4" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 px-3"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </header>

        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
