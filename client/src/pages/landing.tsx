import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Shield, Zap, Globe } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Monitor className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Remote Demo Station</h1>
            </div>
            <div className="flex items-center space-x-4">
              <SignInButton mode="modal">
                <Button variant="outline">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button>Get Started</Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Control Hardware
            <span className="text-blue-600"> Remotely</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A SaaS-ready platform for intelligent and secure remote hardware management, 
            enabling distributed systems control through advanced authentication and flexible configuration.
          </p>
          <div className="flex justify-center space-x-4">
            <SignUpButton mode="modal">
              <Button size="lg" className="px-8 py-4 text-lg">
                Start Free Trial
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
                Sign In
              </Button>
            </SignInButton>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Remote Demo Station?
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Secure Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Advanced authentication with role-based access control ensures your hardware is protected.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Real-time Control</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  WebSocket-powered real-time communication for instant hardware control and telemetry.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Monitor className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Custom Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Dynamic control builder with buttons, sliders, joysticks, and toggles for any hardware.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Globe className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Multi-tenant</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  B2B2C architecture supporting organizations, members, and end customers seamlessly.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 text-center">
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-xl text-gray-600 mb-8">
              Join thousands of companies using Remote Demo Station to showcase their hardware remotely.
            </p>
            <SignUpButton mode="modal">
              <Button size="lg" className="px-12 py-4 text-lg">
                Create Your Account
              </Button>
            </SignUpButton>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Monitor className="h-6 w-6 text-blue-400 mr-2" />
            <span className="text-xl font-bold">Remote Demo Station</span>
          </div>
          <p className="text-gray-400">
            Secure, scalable, and reliable remote hardware control platform.
          </p>
        </div>
      </footer>
    </div>
  );
}