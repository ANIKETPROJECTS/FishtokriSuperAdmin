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
          setLocation("/dashboard");
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
          src="https://image.pollinations.ai/prompt/cinematic%20deep%20blue%20ocean%20underwater%20light%20rays%20realistic" 
          alt="Ocean Background" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-[#1E3A5F]/40 mix-blend-multiply" />
      </div>

      <div className="z-10 w-full max-w-md p-8 md:p-10 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <img 
            src="https://image.pollinations.ai/prompt/FishTokri%20fish%20logo%203D%20glossy%20blue%20orange%20seafood" 
            alt="FishTokri Logo" 
            className="w-20 h-20 mb-4 drop-shadow-xl rounded-xl"
          />
          <h1 className="text-2xl font-bold text-white tracking-tight relative pb-2 drop-shadow-md text-center" data-testid="login-heading">
            FishTokri Admin
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#1A56DB] rounded-full shadow-sm" />
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-white font-medium text-sm drop-shadow-sm">Email Address</Label>
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
            <Label className="text-white font-medium text-sm drop-shadow-sm">Password</Label>
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
