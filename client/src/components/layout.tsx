import { getCurrentUser } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';
import { useQuery } from '@tanstack/react-query';
import type { DemoStation } from '@shared/schema';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const currentUser = getCurrentUser();

  const { data: demoStations = [] } = useQuery<DemoStation[]>({
    queryKey: ['/api/demo-stations'],
    enabled: !!currentUser,
  });

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        user={currentUser}
        demoStations={demoStations}
        onLogout={() => {
          // This will be handled by the sidebar's logout button
        }}
        onStationSelect={() => {
          // Station selection is handled by dashboard
        }}
        onCreateStation={() => {
          // Station creation is handled by stations page
        }}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}