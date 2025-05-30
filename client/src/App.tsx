import { Router, Route, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

// Import pages
import HomePage from "@/pages/home";
import ForCreators from "@/pages/for-creators";
import StartCreating from "@/pages/start-creating";
import CreatorResources from "@/pages/creator-resources";
import SuccessStories from "@/pages/success-stories";
import CreatorGuidelines from "@/pages/creator-guidelines";
import BrowseCreators from "@/pages/browse-creators";
import HowItWorks from "@/pages/how-it-works";
import GiftMemberships from "@/pages/gift-memberships";
import MobileApp from "@/pages/mobile-app";
import HelpCenter from "@/pages/help-center";
import ContactUs from "@/pages/contact-us";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";

// Navigation component
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="lovecreator-theme">
        <Router>
          <div className="min-h-screen bg-background">
            <Navigation />
            <main>
              <Route path="/" component={HomePage} />
              <Route path="/for-creators" component={ForCreators} />
              <Route path="/start-creating" component={StartCreating} />
              <Route path="/creator-resources" component={CreatorResources} />
              <Route path="/success-stories" component={SuccessStories} />
              <Route path="/creator-guidelines" component={CreatorGuidelines} />
              <Route path="/browse-creators" component={BrowseCreators} />
              <Route path="/how-it-works" component={HowItWorks} />
              <Route path="/gift-memberships" component={GiftMemberships} />
              <Route path="/mobile-app" component={MobileApp} />
              <Route path="/help-center" component={HelpCenter} />
              <Route path="/contact-us" component={ContactUs} />
              <Route path="/privacy-policy" component={PrivacyPolicy} />
              <Route path="/terms-of-service" component={TermsOfService} />
            </main>
            <Footer />
          </div>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;