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
  const authenticated = isAuthenticated();
  console.log('ProtectedRoute - isAuthenticated:', authenticated);
  console.log('ProtectedRoute - token:', authStorage.getToken());
  
  if (!authenticated) {
    console.log('ProtectedRoute - Redirecting to login');
    return <Redirect to="/login" />;
  }
  
  console.log('ProtectedRoute - Rendering protected content');
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
        {(() => {
          const authenticated = isAuthenticated();
          console.log('Root route - isAuthenticated:', authenticated);
          return authenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />;
        })()}
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
    
    console.log('App useEffect - Current URL:', window.location.href);
    console.log('App useEffect - Token from URL:', token);
    console.log('App useEffect - Current auth token:', authStorage.getToken());
    console.log('App useEffect - isAuthenticated:', isAuthenticated());
    
    if (token) {
      console.log('Processing OAuth token from URL:', token.substring(0, 20) + '...');
      // Store the token in localStorage
      authStorage.setToken(token);
      console.log('Token stored, new auth state:', isAuthenticated());
      
      // Remove token from URL and stay on the current page
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Don't redirect, just let the router handle it naturally
      console.log('Token processed, letting router handle navigation');
      return;
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