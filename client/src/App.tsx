import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Accounting from "./pages/Accounting";
import Campaigns from "./pages/Campaigns";
import Orders from "./pages/Orders";
import Shipping from "./pages/Shipping";
import Team from "./pages/Team";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import DashboardLayout from "./components/DashboardLayout";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        <AuthenticatedLayout><Dashboard /></AuthenticatedLayout>
      </Route>
      <Route path="/products">
        <AuthenticatedLayout><Products /></AuthenticatedLayout>
      </Route>
      <Route path="/accounting">
        <AuthenticatedLayout><Accounting /></AuthenticatedLayout>
      </Route>
      <Route path="/campaigns">
        <AuthenticatedLayout><Campaigns /></AuthenticatedLayout>
      </Route>
      <Route path="/orders">
        <AuthenticatedLayout><Orders /></AuthenticatedLayout>
      </Route>
      <Route path="/shipping">
        <AuthenticatedLayout><Shipping /></AuthenticatedLayout>
      </Route>
      <Route path="/team">
        <AuthenticatedLayout><Team /></AuthenticatedLayout>
      </Route>
      <Route path="/customers">
        <AuthenticatedLayout><Customers /></AuthenticatedLayout>
      </Route>
      <Route path="/settings">
        <AuthenticatedLayout><Settings /></AuthenticatedLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
