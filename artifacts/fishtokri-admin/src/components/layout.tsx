import { Link, useLocation } from "wouter";
import { LayoutDashboard, Warehouse, Users, LogOut, Building2, Store, Truck, UserCircle, ShoppingBasket, ClipboardList, Handshake, ChevronLeft, ChevronRight, Boxes, ChevronDown, FolderOpen, Landmark, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";

const masterAdminNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hubs", label: "Hubs", icon: Warehouse },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  {
    href: "/vendor-management",
    label: "Vendor Management",
    icon: Handshake,
    children: [
      { href: "/vendors", label: "Vendor", icon: Handshake },
      { href: "/vendor-invoices", label: "Invoices", icon: FileText },
      { href: "/retail-invoices", label: "Retail Invoices", icon: Receipt },
      { href: "/vendor-categories", label: "Categories", icon: FolderOpen },
      { href: "/vendor-items", label: "Items", icon: Boxes },
      { href: "/stock-adjustment", label: "Stock Adjustment", icon: SlidersHorizontal },
    ],
  },
  {
    href: "/banking",
    label: "Banking",
    icon: Landmark,
    children: [
      { href: "/banking/accounts", label: "Accounts", icon: Building2 },
      { href: "/banking/receipts", label: "Receipts", icon: ArrowDownCircle },
      { href: "/banking/payments", label: "Payments", icon: ArrowUpCircle },
    ],
  },
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

function ExpandableNavItem({ href, label, icon: Icon, isActive, childActive, subItems, location, sidebarOpen }: any) {
  const [hovered, setHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = hovered || childActive;

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHovered(true);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setHovered(false), 100);
  };

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Link href={href}>
        <div
          title={!sidebarOpen ? label : undefined}
          className={`flex items-center cursor-pointer transition-all text-sm font-medium border-l-2 ${
            sidebarOpen ? "gap-3 px-5 py-2.5" : "justify-center px-0 py-3"
          } ${
            isActive || childActive
              ? "bg-white/10 text-white border-amber-400"
              : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
          }`}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && (
            <>
              <span className="truncate flex-1">{label}</span>
              <ChevronDown
                className={`w-3 h-3 transition-all duration-200 ${open ? "rotate-180 opacity-100" : "opacity-50"}`}
              />
            </>
          )}
        </div>
      </Link>
      {/* Inline sub-menu */}
      <div
        style={{
          maxHeight: open ? "300px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.2s ease",
        }}
      >
        {subItems.map((child: any) => {
          const ChildIcon = child.icon;
          const isChildActive = location === child.href || location.startsWith(child.href);
          return (
            <Link key={child.href} href={child.href}>
              <div
                title={!sidebarOpen ? child.label : undefined}
                className={`flex items-center cursor-pointer transition-all text-sm font-medium border-l-2 ${
                  sidebarOpen ? "gap-3 pl-10 pr-5 py-2" : "justify-center px-0 py-2.5"
                } ${
                  isChildActive
                    ? "bg-white/10 text-white border-amber-400"
                    : "text-white/50 hover:text-white hover:bg-white/5 border-transparent"
                }`}
              >
                <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{child.label}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const admin = getAdminData();
  const role = admin?.role || "master_admin";
  const adminName = admin?.name || (role === "master_admin" ? "Master Admin" : "Super Hub");

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const stored = localStorage.getItem("fishtokri_sidebar_open");
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    localStorage.setItem("fishtokri_sidebar_open", String(sidebarOpen));
  }, [sidebarOpen]);

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

  const sidebarW = sidebarOpen ? "260px" : "56px";

  return (
    <div className="flex min-h-screen bg-[#F4F6FA]">
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 bg-[#162B4D] text-white flex flex-col z-20 transition-all duration-300 ease-in-out overflow-hidden"
        style={{ width: sidebarW }}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-white/10 transition-all duration-300 ${sidebarOpen ? "justify-center px-4 py-4" : "justify-center px-2 py-3"}`}>
          {sidebarOpen ? (
            <div className="w-[180px] h-[64px] rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <img src="/logo.png" alt="FishTokri" className="w-[164px] h-[56px] object-contain" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <img src="/logo.png" alt="FishTokri" className="w-7 h-7 object-contain" />
            </div>
          )}
        </div>

        {/* Role Label */}
        {sidebarOpen && (
          <div className="px-5 pt-5 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{roleLabel}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 pb-4 pt-2">
          {navItems.map((item: any) => {
            const { href, label, icon: Icon, matchPrefix, children } = item;
            const isActive =
              location === href ||
              (matchPrefix && location.startsWith(matchPrefix)) ||
              (!matchPrefix && href === "/hubs" && location.startsWith("/hubs"));
            const childActive = children?.some((c: any) => location === c.href || location.startsWith(c.href));

            if (children && children.length > 0) {
              return (
                <ExpandableNavItem
                  key={href}
                  href={href}
                  label={label}
                  icon={Icon}
                  isActive={isActive}
                  childActive={childActive}
                  subItems={children}
                  location={location}
                  sidebarOpen={sidebarOpen}
                />
              );
            }

            return (
              <Link key={href} href={href}>
                <div
                  title={!sidebarOpen ? label : undefined}
                  className={`flex items-center cursor-pointer transition-all text-sm font-medium border-l-2 ${
                    sidebarOpen ? "gap-3 px-5 py-2.5" : "justify-center px-0 py-3"
                  } ${
                    isActive
                      ? "bg-white/10 text-white border-amber-400"
                      : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">{label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="px-5 py-3 border-t border-white/10">
            <p className="text-[10px] text-white/30 text-center">FishTokri Admin System</p>
          </div>
        )}

        {/* Toggle button at the bottom */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="flex items-center justify-center py-3 border-t border-white/10 hover:bg-white/10 transition-colors text-white/50 hover:text-white w-full"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Content */}
      <main
        className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarW }}
      >
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
