import { useGetSuperHubs, getGetSuperHubsQueryKey, useGetSubHubsBySuperHub, getGetSubHubsBySuperHubQueryKey } from "@workspace/api-client-react";
import { Layers, MapPin, CheckCircle2, AlertCircle, Warehouse } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const ACTIVE_COLOR = "#10B981";
const INACTIVE_COLOR = "#F87171";

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

function getAdminData() {
  try {
    const raw = localStorage.getItem("fishtokri_admin");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function SuperHubDashboard() {
  const admin = getAdminData();
  const superHubId = admin?.superHubId || "";

  const { data: superHubsData, isLoading: hubsLoading } = useGetSuperHubs(undefined, {
    query: { queryKey: getGetSuperHubsQueryKey() },
  });

  const { data: subHubsData, isLoading: subHubsLoading } = useGetSubHubsBySuperHub(superHubId, {
    query: { queryKey: getGetSubHubsBySuperHubQueryKey(superHubId), enabled: !!superHubId },
  });

  const isLoading = hubsLoading || subHubsLoading;
  const superHub = superHubsData?.superHubs.find((h) => h.id === superHubId);
  const subHubs = subHubsData?.subHubs || [];

  const activeSubHubs = subHubs.filter((s) => s.status === "Active").length;
  const inactiveSubHubs = subHubs.length - activeSubHubs;
  const totalPincodes = subHubs.reduce((acc, s) => acc + (s.pincodes?.length || 0), 0);

  const subHubStatusData = [
    { name: "Active", value: activeSubHubs },
    { name: "Inactive", value: inactiveSubHubs },
  ].filter((d) => d.value > 0);

  const pincodeBarData = subHubs.map((s) => ({
    name: s.name,
    Pincodes: s.pincodes?.length || 0,
  }));

  const statCards = [
    {
      title: "Total Sub Hubs",
      value: subHubs.length,
      sub: `${activeSubHubs} active`,
      icon: Layers,
      iconColor: "text-[#1A56DB]",
      iconBg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      title: "Active Sub Hubs",
      value: activeSubHubs,
      sub: `of ${subHubs.length} total`,
      icon: CheckCircle2,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
      border: "border-green-100",
    },
    {
      title: "Inactive Sub Hubs",
      value: inactiveSubHubs,
      sub: "need attention",
      icon: AlertCircle,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      title: "Total Pincodes",
      value: totalPincodes,
      sub: "service areas",
      icon: MapPin,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      border: "border-purple-100",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        {superHub?.imageUrl && (
          <img
            src={superHub.imageUrl}
            alt={superHub.name}
            className="w-16 h-16 rounded-xl object-cover shadow-md flex-shrink-0"
          />
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-[#162B4D]">
              {hubsLoading ? "Loading..." : superHub?.name || "Your Hub"}
            </h2>
            {superHub && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${superHub.status === "Active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                {superHub.status}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {superHub?.location || "—"}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ title, value, sub, icon: Icon, iconColor, iconBg, border }) => (
            <div key={title} className={`bg-white p-5 rounded-xl border ${border} shadow-sm`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#162B4D]">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{title}</p>
              <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pincodes per Sub Hub */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <MapPin className="w-4 h-4 text-[#1A56DB]" />
            <h3 className="text-sm font-bold text-[#162B4D]">Pincodes per Sub Hub</h3>
          </div>
          {subHubsLoading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : pincodeBarData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No sub hubs yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pincodeBarData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Pincodes" fill="#1A56DB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sub Hub Status */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-bold text-[#162B4D]">Sub Hub Status</h3>
          </div>
          {subHubsLoading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : subHubStatusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
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

      {/* Sub Hubs Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Warehouse className="w-4 h-4 text-[#1A56DB]" />
          <h3 className="text-sm font-bold text-[#162B4D]">Sub Hubs Overview</h3>
        </div>
        {subHubsLoading ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : subHubs.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-8">No sub hubs assigned to this hub yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">Sub Hub</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">Pincodes</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subHubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 pr-4 font-semibold text-[#162B4D]">{sub.name}</td>
                    <td className="py-3 pr-4">
                      <span className="bg-purple-50 text-purple-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {sub.pincodes?.length || 0} pincodes
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sub.status === "Active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sub.status === "Active" ? "bg-green-500" : "bg-red-400"}`} />
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
