
import React from 'react';
import { Button } from '@/components/ui/button';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  };
  className?: string;
}

export function PageLayout({ 
  children, 
  title, 
  subtitle, 
  action,
  className = '' 
}: PageLayoutProps) {
  return (
    <div className={`page-content ${className}`}>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
          {action && (
            <Button 
              onClick={action.onClick}
              variant={action.variant || 'default'}
            >
              {action.label}
            </Button>
          )}
        </div>
      </div>
      <div className="section-spacing">
        {children}
      </div>
    </div>
  );
}
