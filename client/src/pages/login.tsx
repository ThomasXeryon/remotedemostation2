import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { authStorage } from "@/lib/auth";
import { FcGoogle } from "react-icons/fc";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Check for Google auth token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (token) {
      console.log('Setting token from URL:', token.substring(0, 20) + '...');
      authStorage.setToken(token);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      // Clear URL and redirect to dashboard
      window.history.replaceState({}, document.title, '/dashboard');
      setLocation('/dashboard');
    } else if (error) {
      let errorMessage = "Authentication failed";
      if (error === 'no-organization') {
        errorMessage = "No organization found for your account";
      } else if (error === 'auth-failed') {
        errorMessage = "Google authentication failed";
      }
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
      // Clear URL parameters
      window.history.replaceState({}, document.title, '/login');
    }
  }, [setLocation, toast]);

  // Check if user has a valid token and redirect to dashboard
  useEffect(() => {
    const token = authStorage.getToken();
    const urlParams = new URLSearchParams(window.location.search);
    const forceLogout = urlParams.get('force_logout');

    if (token && !forceLogout) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        // If token is valid and not expired, redirect to dashboard
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          setLocation('/dashboard');
          return;
        }
      } catch (e) {
        // Invalid token, clear it
        authStorage.clearAll();
      }
    }

    // Clear any force_logout parameter from URL
    if (forceLogout) {
      window.history.replaceState({}, document.title, '/login');
    }
  }, [setLocation]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: (data) => {
      console.log('Manual login successful, storing token');
      authStorage.setToken(data.token);
      if (data.user) {
        authStorage.setUser(data.user);
      }
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    // Clear all cached authentication data before OAuth
    localStorage.clear();
    sessionStorage.clear();
    console.log('Cleared auth cache, initiating Google OAuth');
    window.location.href = '/auth/google';
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            Access your Remote Demo Station platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            type="button"
          >
            <FcGoogle className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter your email"
                        disabled={loginMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          disabled={loginMutation.isPending}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={() => setLocation('/signup')}
            >
              Sign up
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}