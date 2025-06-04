import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { isAuthenticated, authStorage } from "@/lib/auth";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import { Dashboard } from "@/pages/dashboard-new";
import Organizations from "@/pages/organizations";
import Settings from "@/pages/settings";
import Analytics from "@/pages/analytics";
import TeamMembers from "@/pages/team-members";
import NotFound from "@/pages/not-found";
import Stations from "./pages/stations";
import StationEditor from "./pages/station-editor";
import StationControl from "./pages/station-control-simple";
import { CustomerLogin } from "./pages/customer-login";
import { useEffect } from "react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Redirect to="/login" />;
  }
  return <Layout>{children}</Layout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/organizations">
        <ProtectedRoute>
          <Organizations />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/stations">
        <ProtectedRoute>
          <Stations />
        </ProtectedRoute>
      </Route>
      <Route path="/stations/:id/edit">
        <ProtectedRoute>
          <StationEditor />
        </ProtectedRoute>
      </Route>
      <Route path="/stations/:id/control">
        <ProtectedRoute>
          <StationControl />
        </ProtectedRoute>
      </Route>
      <Route path="/stations/:id/customer-login" component={({ params }) => (
        <CustomerLogin 
          stationId={params.id} 
          organizationName="Demo Organization" 
          stationName="Demo Station" 
        />
      )} />
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      </Route>
      <Route path="/team-members">
        <ProtectedRoute>
          <TeamMembers />
        </ProtectedRoute>
      </Route>
      <Route path="/">
        {isAuthenticated() ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Handle OAuth token from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // Store the token in localStorage
      authStorage.setToken(token);
      
      // Remove token from URL without triggering a page reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Force a page refresh to trigger authentication state update
      window.location.reload();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;