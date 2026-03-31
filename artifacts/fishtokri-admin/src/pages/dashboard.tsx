import {
  useGetStatsSummary,
  getGetStatsSummaryQueryKey,
  useGetSuperHubs,
  getGetSuperHubsQueryKey,
} from "@workspace/api-client-react";
import { Building2, MapPin, Users, Layers, TrendingUp, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, CartesianGrid,
} from "recharts";

const COLORS = ["#1A56DB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
const ACTIVE_COLOR = "#10B981";
const INACTIVE_COLOR = "#F87171";

const monthlyGrowth = [
  { month: "Oct", superHubs: 1, subHubs: 3, pincodes: 8 },
  { month: "Nov", superHubs: 1, subHubs: 5, pincodes: 13 },
  { month: "Dec", superHubs: 2, subHubs: 7, pincodes: 18 },
  { month: "Jan", superHubs: 2, subHubs: 9, pincodes: 22 },
  { month: "Feb", superHubs: 3, subHubs: 11, pincodes: 29 },
  { month: "Mar", superHubs: 3, subHubs: 12, pincodes: 32 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-lg rounded-lg px-3 py-2 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="font-medium">
            {p.name}: <span className="text-gray-800">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary(undefined, {
    query: { queryKey: getGetStatsSummaryQueryKey() },
  });
  const { data: superHubsData, isLoading: hubsLoading } = useGetSuperHubs(undefined, {
    query: { queryKey: getGetSuperHubsQueryKey() },
  });

  const isLoading = statsLoading || hubsLoading;
  const superHubs = superHubsData?.superHubs || [];

  const statCards = [
    {
      title: "Total Super Hubs",
      value: stats?.totalSuperHubs ?? 0,
      sub: `${stats?.activeSuperHubs ?? 0} active`,
      icon: Building2,
      iconColor: "text-[#1A56DB]",
      iconBg: "bg-blue-50",
      border: "border-blue-100",
      trend: "+0% this month",
      trendUp: true,
    },
    {
      title: "Active Sub Hubs",
      value: stats?.activeSubHubs ?? 0,
      sub: `of ${stats?.totalSubHubs ?? 0} total`,
      icon: Layers,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
      border: "border-green-100",
      trend: `${stats?.totalSubHubs ? Math.round((stats.activeSubHubs / stats.totalSubHubs) * 100) : 0}% active`,
      trendUp: true,
    },
    {
      title: "Total Pincodes",
      value: stats?.totalPincodes ?? 0,
      sub: "service areas",
      icon: MapPin,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      border: "border-purple-100",
      trend: "across all hubs",
      trendUp: true,
    },
    {
      title: "Admin Users",
      value: stats?.totalUsers ?? 0,
      sub: `${stats?.activeUsers ?? 0} active`,
      icon: Users,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      border: "border-amber-100",
      trend: `${stats?.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% active`,
      trendUp: true,
    },
  ];

  const subHubsBarData = superHubs.map((h) => ({
    name: h.name,
    "Sub Hubs": h.subHubCount,
  }));

  const hubStatusData = [
    { name: "Active", value: stats?.activeSuperHubs ?? 0 },
    { name: "Inactive", value: (stats?.totalSuperHubs ?? 0) - (stats?.activeSuperHubs ?? 0) },
  ].filter((d) => d.value > 0);

  const subHubStatusData = [
    { name: "Active", value: stats?.activeSubHubs ?? 0 },
    { name: "Inactive", value: (stats?.totalSubHubs ?? 0) - (stats?.activeSubHubs ?? 0) },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#162B4D]">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Overview of your distribution network</p>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ title, value, sub, icon: Icon, iconColor, iconBg, border, trend, trendUp }) => (
            <div key={title} className={`bg-white p-5 rounded-xl border ${border} shadow-sm`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${trendUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                  {trend}
                </span>
              </div>
              <p className="text-2xl font-bold text-[#162B4D]">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{title}</p>
              <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sub Hubs per Super Hub */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-[#1A56DB]" />
            <h3 className="text-sm font-bold text-[#162B4D]">Sub Hubs per Super Hub</h3>
          </div>
          {hubsLoading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subHubsBarData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Sub Hubs" fill="#1A56DB" radius={[6, 6, 0, 0]}>
                  {subHubsBarData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Hub Status Donut */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-bold text-[#162B4D]">Super Hub Status</h3>
          </div>
          {statsLoading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={hubStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {hubStatusData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? ACTIVE_COLOR : INACTIVE_COLOR} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                {hubStatusData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: i === 0 ? ACTIVE_COLOR : INACTIVE_COLOR }} />
                    <span className="text-xs text-gray-500">{d.name}: <strong className="text-gray-700">{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Growth Line */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-bold text-[#162B4D]">Network Growth</h3>
            <span className="ml-auto text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyGrowth}>
              <defs>
                <linearGradient id="colorSubHubs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A56DB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1A56DB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPincodes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="subHubs" name="Sub Hubs" stroke="#1A56DB" strokeWidth={2} fill="url(#colorSubHubs)" dot={{ r: 3, fill: "#1A56DB" }} />
              <Area type="monotone" dataKey="pincodes" name="Pincodes" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorPincodes)" dot={{ r: 3, fill: "#8B5CF6" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sub Hub Status Donut */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-[#162B4D]">Sub Hub Status</h3>
          </div>
          {statsLoading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={subHubStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {subHubStatusData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? ACTIVE_COLOR : INACTIVE_COLOR} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                {subHubStatusData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: i === 0 ? ACTIVE_COLOR : INACTIVE_COLOR }} />
                    <span className="text-xs text-gray-500">{d.name}: <strong className="text-gray-700">{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hub Performance Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-[#1A56DB]" />
          <h3 className="text-sm font-bold text-[#162B4D]">Hub Performance Overview</h3>
        </div>
        {hubsLoading ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">Super Hub</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">Location</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">Sub Hubs</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">Coverage</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {superHubs.map((hub) => {
                  const pct = stats?.totalSubHubs ? Math.round((hub.subHubCount / stats.totalSubHubs) * 100) : 0;
                  return (
                    <tr key={hub.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          {hub.imageUrl && (
                            <img src={hub.imageUrl} alt={hub.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                          )}
                          <span className="font-semibold text-[#162B4D]">{hub.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{hub.location || "—"}</td>
                      <td className="py-3 pr-4">
                        <span className="bg-blue-50 text-[#1A56DB] text-xs font-semibold px-2 py-0.5 rounded-full">
                          {hub.subHubCount}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-20">
                            <div className="h-full bg-[#1A56DB] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${hub.status === "Active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${hub.status === "Active" ? "bg-green-500" : "bg-red-400"}`} />
                          {hub.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
