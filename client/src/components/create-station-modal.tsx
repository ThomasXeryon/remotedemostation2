import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const createStationSchema = z.object({
  name: z.string().min(1, 'Station name is required'),
  description: z.string().optional(),
  cameraCount: z.number().min(1).max(2),
  sessionTimeLimit: z.number().min(1).max(180), // 1-180 minutes
  requiresLogin: z.boolean().default(true),
});

type CreateStationFormData = z.infer<typeof createStationSchema>;

interface CreateStationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateStationModal({ isOpen, onClose }: CreateStationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateStationFormData>({
    resolver: zodResolver(createStationSchema),
    defaultValues: {
      name: '',
      description: '',
      cameraCount: 1,
      sessionTimeLimit: 30,
      requiresLogin: true,
    },
  });

  const createStationMutation = useMutation({
    mutationFn: async (data: CreateStationFormData) => {
      return apiRequest('/api/demo-stations', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          hardwareType: 'universal',
          configuration: {
            cameraCount: data.cameraCount,
            sessionTimeLimit: data.sessionTimeLimit,
            requiresLogin: data.requiresLogin,
          },
          safetyLimits: {
            maxSpeed: 100,
            emergencyStop: true,
          },
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/demo-stations'] });
      toast({ title: 'Demo station created successfully!' });
      form.reset();
      onClose();
    },
    onError: () => {
      toast({ 
        title: 'Failed to create demo station',
        variant: 'destructive'
      });
    },
  });

  const onSubmit = (data: CreateStationFormData) => {
    createStationMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Demo Station</DialogTitle>
          <DialogDescription>
            Set up a new remote demo station with basic configuration.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Station Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Robot Demo Station" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Interactive robotic arm demonstration..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cameraCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Cameras</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue="1">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select camera count" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 Camera</SelectItem>
                      <SelectItem value="2">2 Cameras</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose how many camera feeds to display
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sessionTimeLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Time Limit (minutes)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      max="180"
                      placeholder="30"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum time users can control the station
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requiresLogin"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Require User Login</FormLabel>
                    <FormDescription>
                      Users must be logged in to access this station
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createStationMutation.isPending}>
                {createStationMutation.isPending ? 'Creating...' : 'Create Station'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}