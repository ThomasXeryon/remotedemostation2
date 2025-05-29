import { getCurrentUser, logout } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import type { DemoStation } from '@/types';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const currentUser = getCurrentUser();
  const [, setLocation] = useLocation();

  const { data: demoStations = [] } = useQuery<DemoStation[]>({
    queryKey: ['/api/demo-stations'],
    enabled: !!currentUser,
  });

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="app-container flex h-screen">
      <Sidebar
        user={currentUser}
        demoStations={demoStations}
        onLogout={handleLogout}
        onStationSelect={() => {
          // Station selection is handled by dashboard
        }}
        onCreateStation={() => {
          // Station creation is handled by stations page
        }}
      />
      <main className="page-container">
        {children}
      </main>
    </div>
  );
}