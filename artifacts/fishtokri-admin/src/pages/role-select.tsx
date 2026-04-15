import { useLocation } from "wouter";
import { ShieldCheck, Warehouse, Store, Truck } from "lucide-react";
import { useEffect } from "react";

const roles = [
  {
    key: "master_admin",
    label: "Master Admin",
    desc: "Full system access",
    icon: ShieldCheck,
    route: "/login?role=master_admin",
    accent: "text-amber-400",
    hover: "hover:border-amber-400 hover:shadow-amber-100",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
  },
  {
    key: "super_hub",
    label: "Super Hub",
    desc: "Hub management access",
    icon: Warehouse,
    route: "/login?role=super_hub",
    accent: "text-blue-500",
    hover: "hover:border-blue-400 hover:shadow-blue-100",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    key: "sub_hub",
    label: "Sub Hub",
    desc: "Local hub access",
    icon: Store,
    route: "/login?role=sub_hub",
    accent: "text-teal-500",
    hover: "hover:border-teal-400 hover:shadow-teal-100",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-500",
  },
  {
    key: "delivery_person",
    label: "Delivery",
    desc: "Delivery access",
    icon: Truck,
    route: "/login?role=delivery_person",
    accent: "text-orange-500",
    hover: "hover:border-orange-400 hover:shadow-orange-100",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
  },
];

export default function RoleSelect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("fishtokri_token");
    if (token) {
      const admin = (() => {
        try { return JSON.parse(localStorage.getItem("fishtokri_admin") || "{}"); } catch { return {}; }
      })();
      if (admin?.role === "super_hub") setLocation("/super-hub-dashboard");
      else if (admin?.role === "sub_hub") setLocation("/sub-hub-dashboard");
      else if (admin?.role === "delivery_person") setLocation("/delivery-dashboard");
      else setLocation("/dashboard");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src="/bg.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#0D1F3C]/80" />
      </div>

      <div className="z-10 w-full max-w-lg mx-4">
        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
          <div className="bg-[#162B4D] px-8 py-8 flex flex-col items-center">
            <div className="w-28 h-28 rounded-2xl bg-white flex items-center justify-center shadow-lg mb-5">
              <img src="/logo.png" alt="FishTokri Logo" className="w-24 h-24 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight text-center">FishTokri Admin</h1>
            <p className="mt-1.5 text-white/50 text-sm text-center">Select your role to continue</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-3">
              {roles.map(({ key, label, desc, icon: Icon, route, hover, iconBg, iconColor }) => (
                <button
                  key={key}
                  onClick={() => setLocation(route)}
                  className={`group flex flex-col items-center gap-3 p-5 rounded-xl bg-white border-2 border-gray-300 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md ${hover}`}
                >
                  <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-[#162B4D] font-bold text-sm leading-tight">{label}</p>
                    <p className="text-gray-400 text-xs mt-1">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 pb-5 text-center">
            <p className="text-xs text-gray-300">FishTokri Admin System</p>
          </div>
        </div>
      </div>
    </div>
  );
}
