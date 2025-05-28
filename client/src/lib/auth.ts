import { apiRequest } from "./queryClient";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organization: {
      id: number;
      name: string;
      slug: string;
      primaryColor: string;
      secondaryColor: string;
    };
  };
}

export const authStorage = {
  getToken: () => localStorage.getItem('auth_token') || localStorage.getItem('token'),
  setToken: (token: string) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token); // Keep both for compatibility
  },
  removeToken: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
  },
  getUser: () => {
    const user = localStorage.getItem('auth_user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (user: any) => localStorage.setItem('auth_user', JSON.stringify(user)),
  removeUser: () => localStorage.removeItem('auth_user'),
};

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  authStorage.setToken(response.token);
  authStorage.setUser(response.user);
  
  return response;
}

export async function logout(): Promise<void> {
  authStorage.removeToken();
  authStorage.removeUser();
}

export function isAuthenticated(): boolean {
  return !!authStorage.getToken();
}

export function getCurrentUser() {
  return authStorage.getUser();
}

export async function refreshUserData() {
  try {
    const response = await apiRequest('/api/users/me');
    const userData = response;
    authStorage.setUser(userData);
    return userData;
  } catch (error) {
    console.error('Failed to refresh user data:', error);
    return null;
  }
}
