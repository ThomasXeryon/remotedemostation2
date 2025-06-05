import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function useUser() {
  const { user, isLoaded } = useAuth();
  return { user, isLoaded };
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading and auto-login for demo purposes
    const timer = setTimeout(() => {
      setUser({
        id: 'demo-user-1',
        email: 'demo@remotedemostation.com',
        firstName: 'Demo',
        lastName: 'User'
      });
      setIsLoaded(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const signIn = async (email: string, password: string) => {
    // Simulate sign in
    setUser({
      id: 'demo-user-1',
      email,
      firstName: 'Demo',
      lastName: 'User'
    });
  };

  const signOut = () => {
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoaded,
    isSignedIn: !!user,
    signIn,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Mock components for compatibility
export function SignedIn({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <>{children}</> : null;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  return !isSignedIn ? <>{children}</> : null;
}

export function UserButton() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  
  return (
    <button onClick={signOut} style={{ padding: '8px 16px', borderRadius: '4px' }}>
      {user.firstName} {user.lastName}
    </button>
  );
}

export function SignInButton({ children }: { children?: ReactNode }) {
  const { signIn } = useAuth();
  
  return (
    <button 
      onClick={() => signIn('demo@remotedemostation.com', 'password')}
      style={{ padding: '8px 16px', borderRadius: '4px' }}
    >
      {children || 'Sign In'}
    </button>
  );
}

export function SignUpButton({ children }: { children?: ReactNode }) {
  return (
    <button style={{ padding: '8px 16px', borderRadius: '4px' }}>
      {children || 'Sign Up'}
    </button>
  );
}