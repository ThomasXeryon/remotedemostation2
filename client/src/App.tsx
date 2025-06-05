import { Switch, Route } from "wouter";
import { useRef, useEffect, Component, type ReactNode, type ErrorInfo } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Alert, Snackbar } from "@mui/material";
import { materialTheme } from "./theme/material-theme";
import { DndProvider } from 'react-dnd';
import { MultiBackend, HTML5toTouch } from './lib/dnd-backend';
import { Layout } from "@/components/layout";
// import { ClerkProvider, useAuth, SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { AuthProvider, useAuth, SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from "@/components/standalone-auth";
import { Dashboard } from "@/pages/dashboard-new";
import Organizations from "@/pages/organizations";
import Settings from "@/pages/settings";
import Analytics from "@/pages/analytics";
import TeamMembers from "@/pages/team-members";
import NotFound from "@/pages/not-found";
import Stations from "./pages/stations";
import StationEditor from "./pages/station-editor";
import StationControl from "./pages/station-control";
import { CustomerLogin } from "./pages/customer-login";
import ControlsDemo from "./pages/controls-demo";
import ShadcnControlsDemo from "./pages/shadcn-controls-demo";
import MaterialUIDemo from "./pages/material-ui-demo";
import ReactDndDemo from "./pages/react-dnd-demo";

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
        <ThemeProvider theme={materialTheme}>
          <CssBaseline />
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
            <div style={{ maxWidth: '400px', width: '100%', backgroundColor: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'rgba(0, 0, 0, 0.87)', marginBottom: '16px' }}>Something went wrong</h1>
                <p style={{ color: 'rgba(0, 0, 0, 0.6)', marginBottom: '24px' }}>
                  We encountered an unexpected error. Please refresh the page to try again.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  style={{ 
                    backgroundColor: '#1976d2', 
                    color: '#ffffff', 
                    fontWeight: 500, 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </ThemeProvider>
      );
    }

    return this.props.children;
  }
}

function AutoLogin() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Automatically trigger the sign-in modal when component mounts
    const timer = setTimeout(() => {
      if (buttonRef.current) {
        buttonRef.current.click();
      }
    }, 500); // Small delay to ensure Clerk is loaded

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-6">Remote Demo Station</h1>
        <p className="text-gray-600 mb-6">
          Redirecting to authentication...
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <SignInButton mode="modal">
          <button ref={buttonRef} style={{ display: 'none' }}>
            Sign In
          </button>
        </SignInButton>
      </div>
    </div>
  );
}

function AuthWrapper() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <AutoLogin />
      </SignedOut>
      
      <SignedIn>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/organizations" component={Organizations} />
            <Route path="/settings" component={Settings} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/team-members" component={TeamMembers} />
            <Route path="/stations" component={Stations} />
            <Route path="/stations/new" component={StationEditor} />
            <Route path="/stations/:id/edit" component={StationEditor} />
            <Route path="/stations/:id/control" component={StationControl} />
            <Route path="/shadcn-controls-demo" component={ShadcnControlsDemo} />
            <Route path="/material-ui-demo" component={MaterialUIDemo} />
            <Route path="/react-dnd-demo" component={ReactDndDemo} />
            <Route path="/customer-login/:stationId" component={({ params }) => (
              <CustomerLogin 
                stationId={params!.stationId} 
                organizationName="Demo Organization" 
                stationName="Demo Station" 
              />
            )} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </SignedIn>
    </>
  );
}

function App() {

  if (!clerkPublishableKey) {
    throw new Error("Missing Clerk Publishable Key");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={materialTheme}>
        <CssBaseline />
        <DndProvider backend={MultiBackend} options={HTML5toTouch}>
          <ErrorBoundary>
            <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
              <Switch>
                <Route path="/demo" component={ControlsDemo} />
                <Route>
                  <ClerkProvider 
                    publishableKey={clerkPublishableKey}
                    signInUrl="/sign-in"
                    signUpUrl="/sign-up"
                    afterSignInUrl="/"
                    afterSignUpUrl="/"
                  >
                    <AuthWrapper />
                  </ClerkProvider>
                </Route>
              </Switch>
            </div>
          </ErrorBoundary>
        </DndProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;