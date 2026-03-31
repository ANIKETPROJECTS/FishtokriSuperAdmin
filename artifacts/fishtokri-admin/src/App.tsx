import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Hubs from "@/pages/hubs";
import HubDetail from "@/pages/hub-detail";
import AdminUsers from "@/pages/admin-users";
import ComingSoon from "@/pages/coming-soon";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location, setLocation] = useLocation();
  const token = localStorage.getItem("fishtokri_token");

  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  if (!token) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/hubs">
        <ProtectedRoute component={Hubs} />
      </Route>
      <Route path="/hubs/:id">
        <ProtectedRoute component={HubDetail} />
      </Route>
      <Route path="/pincodes">
        <ProtectedRoute component={ComingSoon} />
      </Route>
      <Route path="/admin-users">
        <ProtectedRoute component={AdminUsers} />
      </Route>
      <Route path="/customers">
        <ProtectedRoute component={ComingSoon} />
      </Route>
      <Route path="/coupons">
        <ProtectedRoute component={ComingSoon} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
