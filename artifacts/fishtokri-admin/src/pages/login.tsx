import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldCheck, Warehouse, Store, Truck } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const role = params.get("role");

  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const isMasterAdmin = role === "master_admin" || !role;
  const isSubHub = role === "sub_hub";
  const isDelivery = role === "delivery_person";

  const roleLabel = isMasterAdmin ? "Master Admin" : isSubHub ? "Sub Hub" : isDelivery ? "Delivery Person" : "Super Hub";
  const RoleIcon = isMasterAdmin ? ShieldCheck : isSubHub ? Store : isDelivery ? Truck : Warehouse;
  const iconColor = isMasterAdmin ? "text-amber-400" : isSubHub ? "text-teal-400" : isDelivery ? "text-orange-400" : "text-[#4B9EFF]";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate(
      { data: { email, password, loginRole: (role || "master_admin") as any } },
      {
        onSuccess: (data) => {
          localStorage.setItem("fishtokri_token", data.token);
          localStorage.setItem("fishtokri_admin", JSON.stringify(data.admin));
          if ((data.admin as any).role === "super_hub") {
            setLocation("/super-hub-dashboard");
          } else if ((data.admin as any).role === "sub_hub") {
            setLocation("/sub-hub-dashboard");
          } else if ((data.admin as any).role === "delivery_person") {
            setLocation("/delivery-dashboard");
          } else {
            setLocation("/dashboard");
          }
        },
        onError: (err: any) => {
          setError(err?.response?.data?.message || "Invalid credentials. Please check your email and password.");
        }
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#1E3A5F]">
      <div className="absolute inset-0 z-0">
        <img
          src="/bg.jpg"
          alt="FishTokri Background"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="z-10 w-full max-w-md p-8 md:p-10 rounded-3xl bg-sky-200/90 border border-sky-300/60 shadow-2xl">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-slate-500 hover:text-[#162B4D] text-xs mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to role selection
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/logo.png"
              alt="FishTokri Logo"
              className="w-36 h-36 drop-shadow-xl object-contain"
            />
          </div>

          <div className="flex items-center gap-2 bg-white/60 border border-sky-300/50 rounded-full px-4 py-1.5 mb-3">
            <RoleIcon className={`w-4 h-4 ${iconColor}`} />
            <span className="text-[#162B4D] text-xs font-semibold">{roleLabel}</span>
          </div>

          <h1 className="text-2xl font-bold text-[#162B4D] tracking-tight relative pb-2 text-center" data-testid="login-heading">
            Sign in to FishTokri
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#1A56DB] rounded-full shadow-sm" />
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-[#162B4D] font-medium text-sm">Email Address</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/90 border-0 text-gray-900 focus-visible:ring-2 focus-visible:ring-[#1A56DB] focus-visible:ring-offset-0 h-11 placeholder:text-gray-400"
              data-testid="input-email"
              placeholder="admin@fishtokri.com"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#162B4D] font-medium text-sm">Password</Label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/90 border-0 text-gray-900 focus-visible:ring-2 focus-visible:ring-[#1A56DB] focus-visible:ring-offset-0 h-11 placeholder:text-gray-400"
              data-testid="input-password"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-[#E02424] text-sm font-medium bg-red-50/95 border border-red-200 p-3 rounded-lg text-center shadow-sm" data-testid="text-error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-12 mt-4 bg-[#1A56DB] hover:bg-[#1447B4] text-white font-semibold text-lg transition-all shadow-lg hover:shadow-xl active:scale-[0.98] rounded-lg"
            disabled={loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? "Authenticating..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
