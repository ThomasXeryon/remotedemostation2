import { Switch, Route } from "wouter";
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
import StationControl from "./pages/station-control-simple";
import { CustomerLogin } from "./pages/customer-login";
import { Component, ErrorInfo, ReactNode, useState } from "react";

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 className="text-3xl font-bold text-center mb-6">Remote Demo Station</h1>
            <p className="text-gray-600 text-center mb-6">
              Sign in to access your hardware control dashboard
            </p>
            <div className="space-y-4">
              <SignInButton mode="modal">
                <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors">
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </SignedOut>
      
      <SignedIn>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
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
                stationId={params?.stationId || ''} 
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
  const clerkPublishableKey = "pk_live_Y2xlcmsuYXBwLnJlbW90ZWRlbW9zdGF0aW9uLmNvbSQ";

  return (
    <ClerkProvider 
      publishableKey={clerkPublishableKey}
      options={{
        allowedRedirectOrigins: [
          'https://c075f664-03aa-4ecd-9607-fdde8813a49d-00-b16uo3ou0fs7.spock.replit.dev',
          'https://app.remotedemostation.com'
        ]
      }}
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