import { useEffect } from 'react';
import { authStorage } from '@/lib/auth';

export default function ForceLogout() {
  useEffect(() => {
    console.log('Force logout - clearing all authentication data');
    
    // Clear all authentication data
    authStorage.clearAll();
    
    // Clear any remaining storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to login after clearing
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Clearing authentication data...</h2>
        <p className="text-gray-600">You will be redirected to login shortly.</p>
      </div>
    </div>
  );
}