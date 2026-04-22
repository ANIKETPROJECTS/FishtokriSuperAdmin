import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldCheck, Warehouse, Store, Truck, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const role = params.get("role");

  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const roleLabel = isMasterAdmin ? "Master Admin" : isSubHub ? "Sub Hub" : isDelivery ? "Delivery Partner" : "Super Hub";
  const RoleIcon = isMasterAdmin ? ShieldCheck : isSubHub ? Store : isDelivery ? Truck : Warehouse;

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
    <div className="min-h-screen w-full flex bg-[#F4F6FA]">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] relative overflow-hidden bg-[#0D1F3C]">
        <div className="absolute inset-0">
          <img src="/bg.jpg" alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0D1F3C] via-[#0D1F3C]/95 to-[#162B4D]/90" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 w-full text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
              <img src="/logo.png" alt="FishTokri" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-lg font-semibold tracking-tight">FishTokri</span>
          </div>

          <div className="space-y-4 max-w-md">
            <h2 className="text-3xl xl:text-4xl font-semibold leading-tight">
              Welcome back.
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Sign in to manage hubs, vendors, inventory, orders and
              deliveries from a single operations console.
            </p>
          </div>

          <div className="text-xs text-white/40">
            © {new Date().getFullYear()} FishTokri. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/login-bg.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px]" />
        </div>
        <div className="relative z-10 w-full flex items-center justify-center">
        <div className="w-full max-w-sm">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-gray-500 hover:text-[#0D1F3C] text-xs mb-8 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to role selection
          </button>

          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#0D1F3C] flex items-center justify-center">
              <img src="/logo.png" alt="FishTokri" className="w-7 h-7 object-contain" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-[#0D1F3C]">FishTokri</span>
          </div>

          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-400 mb-2">
              Sign in
            </p>
            <h1 className="text-2xl font-semibold text-[#0D1F3C] tracking-tight" data-testid="login-heading">
              Sign in to your account
            </h1>
            <div className="mt-3 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1">
              <RoleIcon className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">{roleLabel}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-700 font-medium text-xs">Email address</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border-gray-200 text-gray-900 focus-visible:ring-2 focus-visible:ring-[#0D1F3C]/20 focus-visible:border-[#0D1F3C] h-10 placeholder:text-gray-400"
                data-testid="input-email"
                placeholder="you@fishtokri.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700 font-medium text-xs">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border-gray-200 text-gray-900 focus-visible:ring-2 focus-visible:ring-[#0D1F3C]/20 focus-visible:border-[#0D1F3C] h-10 placeholder:text-gray-400 pr-10"
                  data-testid="input-password"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-xs font-medium bg-red-50 border border-red-200 px-3 py-2 rounded-md" data-testid="text-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-10 mt-2 bg-[#0D1F3C] hover:bg-[#162B4D] text-white font-medium text-sm transition-all rounded-md"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-xs text-gray-400">
            Need help signing in? Contact your system administrator.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
