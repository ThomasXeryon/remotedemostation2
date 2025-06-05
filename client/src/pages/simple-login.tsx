import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SimpleLoginProps {
  onLogin: () => void;
}

export function SimpleLogin({ onLogin }: SimpleLoginProps) {
  const [email, setEmail] = useState('your_email+clerk_test@example.com');
  const [password, setPassword] = useState('424242');

  const handleLogin = () => {
    // Simple validation for demo purposes
    if (email && password) {
      onLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">
            Remote Demo Station
          </CardTitle>
          <p className="text-gray-600 mt-2">Sign in to access your dashboard</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <Button onClick={handleLogin} className="w-full">
            Sign In
          </Button>
          <div className="text-sm text-gray-500 mt-4 p-3 bg-gray-50 rounded">
            <p className="font-medium">Test Credentials:</p>
            <p>Email: your_email+clerk_test@example.com</p>
            <p>Password: 424242</p>
            <p>Phone: +15555550100</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}