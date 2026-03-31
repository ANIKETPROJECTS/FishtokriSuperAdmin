import { useGetStatsSummary, getGetStatsSummaryQueryKey } from "@workspace/api-client-react";
import { Building2, MapPin, Users, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStatsSummary(undefined, {
    query: { queryKey: getGetStatsSummaryQueryKey() },
  });

  const cards = [
    {
      title: "Total Super Hubs",
      value: stats?.totalSuperHubs ?? 0,
      icon: Building2,
      iconColor: "text-[#1A56DB]",
      iconBg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      title: "Active Sub Hubs",
      value: stats?.activeSubHubs ?? 0,
      icon: Layers,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
      border: "border-green-100",
    },
    {
      title: "Total Pincodes",
      value: stats?.totalPincodes ?? 0,
      icon: MapPin,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      border: "border-purple-100",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      border: "border-amber-100",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-[#162B4D]">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Overview of your distribution network</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ title, value, icon: Icon, iconColor, iconBg, border }) => (
            <div key={title} className={`bg-white p-5 rounded-xl border ${border} shadow-sm flex items-center gap-4`}>
              <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
                <p className="text-2xl font-bold text-[#162B4D]">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-lg font-bold text-[#162B4D] mb-2">Welcome to FishTokri Admin</h3>
        <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">
          Manage your super hubs, sub hubs, and personnel from the left navigation menu.
          This system provides real-time oversight of the entire logistics and distribution network.
        </p>
        <div className="mt-6 flex gap-3">
          <div className="h-1.5 w-14 bg-[#1A56DB] rounded-full" />
          <div className="h-1.5 w-14 bg-gray-200 rounded-full" />
          <div className="h-1.5 w-14 bg-gray-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}
