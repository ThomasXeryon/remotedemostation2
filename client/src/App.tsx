import { Switch, Route } from "wouter";
import { useRef, useEffect, Component, type ReactNode, type ErrorInfo } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ClerkProvider, useAuth, SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from "@clerk/clerk-react";
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
  // Use development keys for local development, production keys for deployment
  const clerkPublishableKey = window.location.hostname.includes('replit.dev') 
    ? "pk_test_cHJvdmVuLWh1bXBiYWNrLTE4LmNsZXJrLmFjY291bnRzLmRldiQ"
    : import.meta.env.VITE_NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkPublishableKey) {
    throw new Error("Missing Clerk Publishable Key");
  }

  return (
    <ClerkProvider 
      publishableKey={clerkPublishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary>
            <div className="min-h-screen bg-background">
              <AuthWrapper />
              <Toaster />
            </div>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;