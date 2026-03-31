import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("fishtokri_token");
    if (token) {
      setLocation("/");
    }
  }, [setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          localStorage.setItem("fishtokri_token", data.token);
          localStorage.setItem("fishtokri_admin", JSON.stringify(data.admin));
          setLocation("/");
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
          src="https://image.pollinations.ai/prompt/cinematic%20deep%20blue%20ocean%20seafood%20market%20background%20dramatic%20lighting%20ultra%20realistic" 
          alt="Ocean Background" 
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-[#1E3A5F]/30 mix-blend-multiply" />
      </div>

      <div className="z-10 w-full max-w-md p-8 md:p-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <img 
            src="https://image.pollinations.ai/prompt/3D%20glossy%20fish%20icon%20vibrant%20blue%20isolated%20transparent%20background" 
            alt="FishTokri Icon" 
            className="w-24 h-24 mb-4 drop-shadow-xl"
          />
          <h1 className="text-2xl font-bold text-white tracking-tight relative pb-2 drop-shadow-md" data-testid="login-heading">
            <span className="text-[#1E3A5F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">FishTokri Super Admin</span>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#E02424] rounded-full shadow-sm" />
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[#1E3A5F] font-bold text-sm drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">Email Address</Label>
            <Input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white border-0 text-gray-900 focus-visible:ring-2 focus-visible:ring-[#1A56DB] focus-visible:ring-offset-0 h-12 shadow-inner"
              data-testid="input-email"
              placeholder="admin@fishtokri.com"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#1E3A5F] font-bold text-sm drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">Password</Label>
            <Input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white border-0 text-gray-900 focus-visible:ring-2 focus-visible:ring-[#1A56DB] focus-visible:ring-offset-0 h-12 shadow-inner"
              data-testid="input-password"
              placeholder="••••••••"
            />
          </div>
          
          {error && (
            <p className="text-[#E02424] text-sm font-medium bg-white/95 border border-red-200 p-3 rounded-lg text-center shadow-sm" data-testid="text-error">
              {error}
            </p>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 mt-2 bg-[#1A56DB] hover:bg-[#1447B4] text-white font-semibold text-lg transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
            disabled={loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? "Authenticating..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
