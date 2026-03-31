import { Link, useLocation } from "wouter";
import { Warehouse, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  
  const handleLogout = () => {
    localStorage.removeItem("fishtokri_token");
    localStorage.removeItem("fishtokri_admin");
    setLocation("/login");
  };

  const adminDataStr = localStorage.getItem("fishtokri_admin");
  const adminName = adminDataStr ? JSON.parse(adminDataStr).name : "Super Admin";

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-[#1E3A5F] text-white flex flex-col z-20 shadow-xl">
        <div className="flex items-center gap-3 p-6 border-b border-white/10">
          <img 
            src="https://image.pollinations.ai/prompt/3D%20glossy%20fish%20seafood%20crate%20icon%20blue%20white%20render" 
            alt="FishTokri Logo" 
            className="w-10 h-10 rounded-lg object-cover shadow-md"
          />
          <span className="font-bold text-xl tracking-tight">FishTokri</span>
        </div>
        <nav className="flex-1 py-6">
          <Link href="/" className="block">
            <div className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors ${location === '/' ? 'bg-[#1A56DB] border-l-4 border-white' : 'hover:bg-white/5 border-l-4 border-transparent'}`} data-testid="nav-hubs">
              <Warehouse className="w-5 h-5" />
              <span className="font-medium">Hubs</span>
            </div>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="bg-white h-16 shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex items-center justify-between px-8 z-10 sticky top-0">
          <h1 className="text-[#1E3A5F] font-semibold text-lg tracking-tight" data-testid="header-title">Hub Management</h1>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-[#1E3A5F]" data-testid="text-admin-name">{adminName}</span>
              <span className="text-xs font-medium text-gray-500">Super Admin</span>
            </div>
            <div className="w-px h-8 bg-gray-200 mx-2"></div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-[#E02424] hover:bg-red-50 font-medium" data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>
        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
