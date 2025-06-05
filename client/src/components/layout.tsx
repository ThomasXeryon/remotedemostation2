import { Sidebar } from '@/components/sidebar';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useUser, useClerk } from '@clerk/clerk-react';
import type { DemoStation } from '@/types';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const { data: demoStations = [] } = useQuery<DemoStation[]>({
    queryKey: ['/api/demo-stations'],
    enabled: !!user,
  });

  const handleLogout = async () => {
    await signOut();
    setLocation('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="app-container flex h-screen">
      <Sidebar
        user={user}
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