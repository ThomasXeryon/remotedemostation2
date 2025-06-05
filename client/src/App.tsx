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
import ForceLogout from "./pages/force-logout";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { refreshUserData } from "@/lib/auth";
import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
              <p className="text-gray-600 mb-6">
                We encountered an unexpected error. Please refresh the page to try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const [, setLocation] = useLocation();
  
  // Handle OAuth token from URL parameter and force logout if needed
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const forceLogout = urlParams.get('force_logout');
    const currentPath = window.location.pathname;
    
    console.log('App useEffect - Current URL:', window.location.href);
    console.log('App useEffect - Token from URL:', token);
    console.log('App useEffect - Force logout:', forceLogout);
    console.log('App useEffect - Current auth token:', authStorage.getToken());
    console.log('App useEffect - isAuthenticated:', isAuthenticated());
    
    // Check for invalid token format only
    const currentToken = authStorage.getToken();
    if (currentToken) {
      try {
        const payload = JSON.parse(atob(currentToken.split('.')[1]));
        // Only clear if token is malformed or expired
        if (!payload.id || !payload.organizationId || (payload.exp && payload.exp * 1000 < Date.now())) {
          console.log('Invalid or expired token detected, clearing authentication');
          authStorage.clearAll();
          if (currentPath === '/dashboard') {
            window.location.href = '/login';
            return;
          }
        }
      } catch (e) {
        console.log('Malformed token detected, clearing authentication');
        authStorage.clearAll();
        if (currentPath === '/dashboard') {
          window.location.href = '/login';
          return;
        }
      }
    }
    
    // Handle forced logout to clear old tokens
    if (forceLogout === '1') {
      console.log('Force logout detected - clearing all authentication data');
      authStorage.clearAll();
      window.history.replaceState({}, document.title, '/login');
      window.location.href = '/login';
      return;
    }
    
    // Process any token from URL
    if (token) {
      console.log('Processing OAuth token from URL:', token.substring(0, 20) + '...');
      
      // Store the new token
      authStorage.setToken(token);
      
      console.log('New OAuth token stored successfully');
      
      // Clear the URL parameters and redirect to dashboard
      window.history.replaceState({}, document.title, '/dashboard');
      setLocation('/dashboard');
      return;
    }
  }, [setLocation]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;