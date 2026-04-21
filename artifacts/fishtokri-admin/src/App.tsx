import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import RoleSelect from "@/pages/role-select";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import SuperHubDashboard from "@/pages/super-hub-dashboard";
import SubHubDashboard from "@/pages/sub-hub-dashboard";
import MySubHubs from "@/pages/my-sub-hubs";
import MySubHubDetail from "@/pages/my-sub-hub-detail";
import DeliveryDashboard from "@/pages/delivery-dashboard";
import MyDeliveries from "@/pages/my-deliveries";
import Hubs from "@/pages/hubs";
import HubDetail from "@/pages/hub-detail";
import AdminUsers from "@/pages/admin-users";
import Customers from "@/pages/customers";
import Orders from "@/pages/orders";
import ComingSoon from "@/pages/coming-soon";
import MyHubs from "@/pages/my-hubs";
import SubHubMenuAdmin from "@/pages/sub-hub-menu-admin";
import Vendors from "@/pages/vendors";
import VendorInvoices from "@/pages/vendor-invoices";
import VendorManagementOverview from "@/pages/vendor-management-overview";
import VendorItems from "@/pages/vendor-items";
import VendorCategories from "@/pages/vendor-categories";
import StockAdjustmentPage from "@/pages/stock-adjustment";
import BankingOverview from "@/pages/banking-overview";
import BankingAccounts from "@/pages/banking-accounts";
import BankingReceipts from "@/pages/banking-receipts";
import BankingPayments from "@/pages/banking-payments";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function getStoredAdmin() {
  try {
    const raw = localStorage.getItem("fishtokri_admin");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function ProtectedRoute({ component: Component, requiredRole }: { component: React.ComponentType; requiredRole?: string }) {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("fishtokri_token");
  const admin = getStoredAdmin();

  useEffect(() => {
    if (!token) {
      setLocation("/");
      return;
    }
    if (requiredRole && admin?.role !== requiredRole) {
      if (admin?.role === "super_hub") {
        setLocation("/super-hub-dashboard");
      } else if (admin?.role === "sub_hub") {
        setLocation("/sub-hub-dashboard");
      } else if (admin?.role === "delivery_person") {
        setLocation("/delivery-dashboard");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [token, admin?.role, requiredRole, setLocation]);

  if (!token) return null;
  if (requiredRole && admin?.role !== requiredRole) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function MyHubRedirect() {
  const [, setLocation] = useLocation();
  const admin = getStoredAdmin();
  useEffect(() => {
    if (admin?.superHubId) {
      setLocation(`/my-hub/${admin.superHubId}`);
    }
  }, [admin?.superHubId, setLocation]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/" component={RoleSelect} />
            <Route path="/login" component={Login} />

            {/* Master Admin routes */}
            <Route path="/dashboard">
              <ProtectedRoute component={Dashboard} requiredRole="master_admin" />
            </Route>
            <Route path="/hubs">
              <ProtectedRoute component={Hubs} requiredRole="master_admin" />
            </Route>
            <Route path="/hubs/:id">
              <ProtectedRoute component={HubDetail} requiredRole="master_admin" />
            </Route>
            <Route path="/admin-users">
              <ProtectedRoute component={AdminUsers} requiredRole="master_admin" />
            </Route>
            <Route path="/pincodes">
              <ProtectedRoute component={ComingSoon} requiredRole="master_admin" />
            </Route>
            <Route path="/customers">
              <ProtectedRoute component={Customers} requiredRole="master_admin" />
            </Route>
            <Route path="/orders">
              <ProtectedRoute component={Orders} requiredRole="master_admin" />
            </Route>
            <Route path="/vendor-management">
              <ProtectedRoute component={VendorManagementOverview} requiredRole="master_admin" />
            </Route>
            <Route path="/vendors">
              <ProtectedRoute component={Vendors} requiredRole="master_admin" />
            </Route>
            <Route path="/vendor-invoices">
              <ProtectedRoute component={VendorInvoices} requiredRole="master_admin" />
            </Route>
            <Route path="/vendor-items">
              <ProtectedRoute component={VendorItems} requiredRole="master_admin" />
            </Route>
            <Route path="/vendor-categories">
              <ProtectedRoute component={VendorCategories} requiredRole="master_admin" />
            </Route>
            <Route path="/stock-adjustment">
              <ProtectedRoute component={StockAdjustmentPage} requiredRole="master_admin" />
            </Route>
            <Route path="/banking">
              <ProtectedRoute component={BankingOverview} requiredRole="master_admin" />
            </Route>
            <Route path="/banking/accounts">
              <ProtectedRoute component={BankingAccounts} requiredRole="master_admin" />
            </Route>
            <Route path="/banking/receipts">
              <ProtectedRoute component={BankingReceipts} requiredRole="master_admin" />
            </Route>
            <Route path="/banking/payments">
              <ProtectedRoute component={BankingPayments} requiredRole="master_admin" />
            </Route>
            <Route path="/coupons">
              <ProtectedRoute component={ComingSoon} requiredRole="master_admin" />
            </Route>

            {/* Sub Hub Menu Admin (accessible to master_admin and super_hub) */}
            <Route path="/sub-hub-menu/:id">
              <ProtectedRoute component={SubHubMenuAdmin} />
            </Route>

            {/* Super Hub routes */}
            <Route path="/super-hub-dashboard">
              <ProtectedRoute component={SuperHubDashboard} requiredRole="super_hub" />
            </Route>
            <Route path="/my-hubs">
              <ProtectedRoute component={MyHubs} requiredRole="super_hub" />
            </Route>
            <Route path="/my-hub">
              <ProtectedRoute component={MyHubRedirect} requiredRole="super_hub" />
            </Route>
            <Route path="/my-hub/:id">
              <ProtectedRoute component={HubDetail} requiredRole="super_hub" />
            </Route>

            {/* Sub Hub routes */}
            <Route path="/sub-hub-dashboard">
              <ProtectedRoute component={SubHubDashboard} requiredRole="sub_hub" />
            </Route>
            <Route path="/my-sub-hubs">
              <ProtectedRoute component={MySubHubs} requiredRole="sub_hub" />
            </Route>
            <Route path="/my-sub-hub/:id">
              <ProtectedRoute component={MySubHubDetail} requiredRole="sub_hub" />
            </Route>

            {/* Delivery Person routes */}
            <Route path="/delivery-dashboard">
              <ProtectedRoute component={DeliveryDashboard} requiredRole="delivery_person" />
            </Route>
            <Route path="/my-deliveries">
              <ProtectedRoute component={MyDeliveries} requiredRole="delivery_person" />
            </Route>

            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
