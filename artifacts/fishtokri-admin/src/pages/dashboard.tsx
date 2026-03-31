import { useGetStatsSummary, getGetStatsSummaryQueryKey } from "@workspace/api-client-react";
import { Building2, MapPin, Users, Warehouse } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStatsSummary(undefined, {
    query: { queryKey: getGetStatsSummaryQueryKey() }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#1E3A5F]">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Overview of your distribution network</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Super Hubs" 
            value={stats?.totalSuperHubs || 0} 
            icon={<Building2 className="w-6 h-6 text-[#1A56DB]" />} 
            color="bg-blue-50"
          />
          <StatCard 
            title="Active Sub Hubs" 
            value={stats?.activeSubHubs || 0} 
            icon={<Warehouse className="w-6 h-6 text-green-600" />} 
            color="bg-green-50"
          />
          <StatCard 
            title="Total Pincodes" 
            value={stats?.totalPincodes || 0} 
            icon={<MapPin className="w-6 h-6 text-purple-600" />} 
            color="bg-purple-50"
          />
          <StatCard 
            title="Total Users" 
            value={stats?.totalUsers || 0} 
            icon={<Users className="w-6 h-6 text-orange-600" />} 
            color="bg-orange-50"
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mt-8">
        <h3 className="text-lg font-bold text-[#1E3A5F] mb-3">Welcome to FishTokri Admin</h3>
        <p className="text-gray-600 max-w-3xl leading-relaxed">
          Manage your super hubs, sub hubs, and personnel from the left navigation menu.
          This system provides real-time oversight of the entire logistics and distribution network.
        </p>
        <div className="mt-6 flex gap-4">
          <div className="h-1.5 w-12 bg-[#1A56DB] rounded-full"></div>
          <div className="h-1.5 w-12 bg-gray-200 rounded-full"></div>
          <div className="h-1.5 w-12 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-[#1E3A5F]">{value}</p>
      </div>
    </div>
  );
}
