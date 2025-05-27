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
  getToken: () => localStorage.getItem('auth_token'),
  setToken: (token: string) => localStorage.setItem('auth_token', token),
  removeToken: () => localStorage.removeItem('auth_token'),
  getUser: () => {
    const user = localStorage.getItem('auth_user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (user: any) => localStorage.setItem('auth_user', JSON.stringify(user)),
  removeUser: () => localStorage.removeItem('auth_user'),
};

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiRequest('POST', '/api/auth/login', credentials);
  const data = await response.json();
  
  authStorage.setToken(data.token);
  authStorage.setUser(data.user);
  
  return data;
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
