import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Building2, Users, Settings, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/auth';
import { useLocation } from 'wouter';

interface Organization {
  id: number;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  userCount?: number;
  stationCount?: number;
}

export default function Organizations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const [, setLocation] = useLocation();
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
      return await apiRequest(`/api/organizations/${orgId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/organizations'] });
      toast({
        title: "Organization deleted successfully!",
        description: "The organization and all its data have been permanently removed.",
      });
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

  const handleSwitchOrganization = async (org: Organization) => {
    try {
      const response = await fetch('/api/users/me/switch-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ organizationId: org.id }),
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
      setTimeout(() => {
        setLocation('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Organization switch error:', error);
      toast({
        title: "Failed to switch organization",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="px-6 py-3 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">Manage your organizations and create new ones</p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={newOrg.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewOrg(prev => ({ 
                      ...prev, 
                      name,
                      slug: prev.slug === generateSlug(prev.name) ? generateSlug(name) : prev.slug
                    }));
                  }}
                  placeholder="Acme Corporation"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="org-slug">URL Slug</Label>
                <Input
                  id="org-slug"
                  value={newOrg.slug}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="acme-corp"
                  pattern="[a-z0-9\-]+"
                  title="Only lowercase letters, numbers, and hyphens allowed"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This will be used in URLs: /org/{newOrg.slug || 'your-slug'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={newOrg.primaryColor}
                      onChange={(e) => setNewOrg(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-12 h-8 p-1 border rounded"
                    />
                    <Input
                      value={newOrg.primaryColor}
                      onChange={(e) => setNewOrg(prev => ({ ...prev, primaryColor: e.target.value }))}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={newOrg.secondaryColor}
                      onChange={(e) => setNewOrg(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-12 h-8 p-1 border rounded"
                    />
                    <Input
                      value={newOrg.secondaryColor}
                      onChange={(e) => setNewOrg(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      placeholder="#1e293b"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createOrgMutation.isPending}>
                  {createOrgMutation.isPending ? 'Creating...' : 'Create Organization'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {organizations.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Organizations Yet</h3>
            <p className="text-slate-600 mb-6">
              Create your first organization to get started with remote hardware control
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Organization
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org: Organization) => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: org.primaryColor }}
                    >
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <p className="text-sm text-slate-500">/{org.slug}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteOrg(org.id, org.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex space-x-4 text-sm text-slate-600">
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {org.userCount || 0} users
                    </span>
                    <span className="flex items-center">
                      <Building2 className="w-4 h-4 mr-1" />
                      {org.stationCount || 0} stations
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: org.primaryColor }}
                      title="Primary Color"
                    />
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: org.secondaryColor }}
                      title="Secondary Color"
                    />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSwitchOrganization(org)}
                  >
                    Switch To
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}