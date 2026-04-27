import { Link, useLocation } from "wouter";
import { LayoutDashboard, Warehouse, Users, LogOut, Building2, Store, Truck, UserCircle, ShoppingBasket, ClipboardList, Handshake, ChevronLeft, ChevronRight, Boxes, ChevronDown, FolderOpen, Landmark, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, FileText, Receipt, Package, History } from "lucide-react";
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
      { href: "/vendor-invoices", label: "Vendor Invoices", icon: FileText },
      { href: "/vendor-categories", label: "Categories", icon: FolderOpen },
      { href: "/vendor-items", label: "Items", icon: Boxes },
      { href: "/stock-adjustment", label: "Stock Adjustment", icon: SlidersHorizontal },
    ],
  },
  {
    href: "/inventory",
    label: "Inventory Management",
    icon: Boxes,
    children: [
      { href: "/inventory/products", label: "Inventory", icon: Package },
      { href: "/inventory/history", label: "History", icon: History },
      { href: "/inventory/adjustment", label: "Stock Adjustment", icon: SlidersHorizontal },
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

function ExpandableNavItem({ href, label, icon: Icon, isActive, childActive, subItems, location, sidebarOpen, sidebarWidth }: any) {
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number } | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = hovered;

  const updateCoords = () => {
    if (rowRef.current) {
      const r = rowRef.current.getBoundingClientRect();
      setCoords({ top: r.top });
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    updateCoords();
    setHovered(true);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setHovered(false), 120);
  };

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative">
      <Link href={href}>
        <div
          ref={rowRef}
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
                className={`w-3 h-3 transition-all duration-200 ${open ? "-rotate-90 opacity-100" : "-rotate-90 opacity-50"}`}
              />
            </>
          )}
        </div>
      </Link>

      {/* Flyout submenu (renders to right of sidebar) */}
      {open && coords && (
        <div
          className="fixed z-50"
          style={{ top: coords.top, left: sidebarWidth }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* small bridge so cursor can travel without losing hover */}
          <div className="absolute -left-2 top-0 h-full w-2" />
          <div className="ml-1 min-w-[200px] rounded-lg bg-[#162B4D] border border-white/10 shadow-2xl py-1.5 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
            </div>
            {subItems.map((child: any) => {
              const ChildIcon = child.icon;
              const isChildActive = location === child.href || location.startsWith(child.href);
              return (
                <Link key={child.href} href={child.href}>
                  <div
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-[13px] font-medium transition-colors ${
                      isChildActive
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{child.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
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
    sessionStorage.removeItem("fishtokri_token");
    sessionStorage.removeItem("fishtokri_admin");
    setLocation("/");
  };

  // Pending password reset count (master admin only) — polled every 60s.
  const [pendingResets, setPendingResets] = useState(0);
  useEffect(() => {
    if (admin?.role !== "master_admin") return;
    let cancelled = false;
    const fetchPending = async () => {
      try {
        const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
        const token = localStorage.getItem("fishtokri_token") || "";
        const res = await fetch(`${base}/api/auth/password-reset-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setPendingResets((data.requests || []).filter((r: any) => r.status === "pending").length);
      } catch {}
    };
    fetchPending();
    const id = setInterval(fetchPending, 60000);
    const onFocus = () => fetchPending();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [admin?.role, location]);

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
    { href: "/my-deliveries", label: "Orders", icon: Truck },
    { href: "/my-deliveries-hubs", label: "My Hubs", icon: Building2 },
  ];

  const navItems = isSuperHub ? superHubNavItems : isSubHub ? subHubNavItems : isDelivery ? deliveryNavItems : masterAdminNavItems;
  const roleLabel = isSuperHub ? "Super Hub" : isSubHub ? "Sub Hub" : isDelivery ? "Delivery" : "Master Admin";

  const sidebarW = sidebarOpen ? "220px" : "56px";

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
                  sidebarWidth={sidebarOpen ? 220 : 56}
                />
              );
            }

            const badgeCount = href === "/admin-users" ? pendingResets : 0;

            return (
              <Link key={href} href={href}>
                <div
                  title={!sidebarOpen ? (badgeCount > 0 ? `${label} (${badgeCount} pending)` : label) : undefined}
                  className={`flex items-center cursor-pointer transition-all text-sm font-medium border-l-2 relative ${
                    sidebarOpen ? "gap-3 px-5 py-2.5" : "justify-center px-0 py-3"
                  } ${
                    isActive
                      ? "bg-white/10 text-white border-amber-400"
                      : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Icon className="w-4 h-4" />
                    {!sidebarOpen && badgeCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#162B4D]" />
                    )}
                  </div>
                  {sidebarOpen && (
                    <>
                      <span className="truncate flex-1">{label}</span>
                      {badgeCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold rounded-full bg-amber-400 text-[#162B4D]">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </>
                  )}
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
