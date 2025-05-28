import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Users, Cpu, Trash2, Settings, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/auth';
import { PageLayout } from '@/components/page-layout';
import type { Organization } from '@shared/schema';

export default function Organizations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: '',
    slug: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e293b'
  });

  // Fetch user's organizations
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ['/api/users/me/organizations'],
    enabled: !!user,
  });

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async (orgData: typeof newOrg) => {
      return await apiRequest('/api/organizations', {
        method: 'POST',
        body: JSON.stringify(orgData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/organizations'] });
      setIsCreateModalOpen(false);
      setNewOrg({ name: '', slug: '', primaryColor: '#3b82f6', secondaryColor: '#1e293b' });
      toast({
        title: "Organization created successfully!",
        description: "Your new organization has been created and you've been added as an admin.",
      });
    },
    onError: (error: any) => {
      console.error('Organization creation error:', error);
      toast({
        title: "Failed to create organization",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: async (orgId: number) => {
      return await apiRequest(`/api/organizations/${orgId}/delete`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Organization deleted successfully!",
        description: "The organization and all its data have been permanently removed.",
      });

      // Clear all organization-related queries and force refetch
      queryClient.removeQueries({ queryKey: ['/api/users/me/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/organizations'] });
      queryClient.refetchQueries({ queryKey: ['/api/users/me/organizations'] });

      // Also clear user data to ensure organization context is updated
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete organization",
        description: error.message || "There was an error deleting the organization.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteOrg = (orgId: number, orgName: string) => {
    if (window.confirm(`Are you sure you want to delete "${orgName}"? This action cannot be undone and will permanently remove all data associated with this organization.`)) {
      deleteOrgMutation.mutate(orgId);
    }
  };

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-generate slug from name if not provided
    const slug = newOrg.slug || newOrg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    createOrgMutation.mutate({
      ...newOrg,
      slug
    });
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleSwitchOrganization = async (orgId: number) => {
    try {
      const response = await fetch('/api/users/me/switch-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Save the new JWT token if provided
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      // Clear all queries and refetch with new token
      queryClient.clear();

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('organizationChanged'));

      toast({
        title: "Organization switched successfully!",
        description: `You are now working in ${org.name}. Redirecting to dashboard...`,
      });

      // Navigate to dashboard to see the organization's demo stations
      // setLocation('/dashboard');
    } catch (error) {
      console.error('Organization switch error:', error);
      toast({
        title: "Failed to switch organization",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEditOrganization = async (org: Organization) => {
    // Placeholder for edit organization logic
    console.log("Edit organization:", org);
    toast({
      title: "Edit Organization",
      description: "This feature is under development.",
    });
  };

  const handleDeleteOrganization = async (orgId: number) => {
    if (window.confirm("Are you sure you want to delete this organization?")) {
      try {
        await deleteOrgMutation.mutateAsync(orgId);
        toast({
          title: "Organization Deleted",
          description: "The organization has been successfully deleted.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete the organization.",
          variant: "destructive",
        });
      }
    }
  };

  const currentUser = getCurrentUser();

  return (
    <PageLayout
      title="Organizations"
      subtitle="Manage your organizations and switch between them"
      action={{
        label: "Create Organization",
        onClick: () => setIsCreateModalOpen(true)
      }}
    >
      {organizations.length === 0 ? (
        <div className="content-card">
          <div className="empty-state">
            <Building2 className="empty-state-icon" />
            <h3 className="empty-state-title">No organizations found</h3>
            <p className="empty-state-description mb-6">Create your first organization to get started</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Organization
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid-3-cols">
          {organizations.map((org) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-lg font-medium">{org.name}</CardTitle>
                  {org.id === currentUser?.organizationId && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditOrganization(org)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  {org.id !== currentUser?.organizationId && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteOrganization(org.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {org.description && (
                  <p className="text-sm text-gray-600 mb-4">{org.description}</p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {org.userCount || 0} users
                  </div>
                  <div className="flex items-center">
                    <Cpu className="w-4 h-4 mr-1" />
                    {org.stationCount || 0} stations
                  </div>
                </div>
                <div className="flex space-x-2">
                  {org.id === currentUser?.organizationId ? (
                    <Badge variant="default" className="flex-1 justify-center">
                      Current Organization
                    </Badge>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleSwitchOrganization(org.id)}
                    >
                      Switch to this org
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}