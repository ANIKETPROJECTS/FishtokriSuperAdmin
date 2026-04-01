import { useLocation } from "wouter";
import { ShieldCheck, Warehouse } from "lucide-react";
import { useEffect } from "react";

export default function RoleSelect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("fishtokri_token");
    if (token) {
      setLocation("/dashboard");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#1E3A5F]">
      <div className="absolute inset-0 z-0">
        <img
          src="/bg.jpg"
          alt="FishTokri Background"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="z-10 w-full max-w-lg mx-4">
        <div className="rounded-3xl bg-sky-300/30 backdrop-blur-xl border border-sky-200/40 shadow-2xl px-8 py-10">
          <div className="flex flex-col items-center mb-8">
            <img
              src="/logo.png"
              alt="FishTokri Logo"
              className="w-32 h-32 mb-4 drop-shadow-xl object-contain"
            />
            <h1 className="text-3xl font-bold text-white tracking-tight text-center">
              FishTokri Admin
            </h1>
            <p className="mt-2 text-white/60 text-sm text-center">
              Select your role to continue
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <button
              onClick={() => setLocation("/login?role=master_admin")}
              className="group flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 hover:border-amber-400/60 transition-all duration-200 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-xl bg-[#162B4D] flex items-center justify-center shadow-lg group-hover:bg-amber-400/20 transition-colors duration-200">
                <ShieldCheck className="w-7 h-7 text-amber-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-base leading-tight">Master Admin</p>
                <p className="text-white/50 text-xs mt-1">Full system access</p>
              </div>
            </button>

            <button
              onClick={() => setLocation("/login?role=super_hub")}
              className="group flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 hover:border-[#1A56DB]/60 transition-all duration-200 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-xl bg-[#162B4D] flex items-center justify-center shadow-lg group-hover:bg-[#1A56DB]/20 transition-colors duration-200">
                <Warehouse className="w-7 h-7 text-[#4B9EFF]" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-base leading-tight">Super Hub</p>
                <p className="text-white/50 text-xs mt-1">Hub management access</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
