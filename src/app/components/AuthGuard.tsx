'use client';

import { useSupabaseAuth } from '@/app/context/SupabaseAuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const protectedRoutes = ['/dashboard', '/recycling', '/reports', '/tools', '/reservation', '/settings', '/profile'];
  
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isProtectedRoute) {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center bg-white p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-100">
        <div className="mb-6 flex justify-center">
          <div className="bg-teal-50 p-4 rounded-full">
            <Lock size={48} className="text-teal-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Locked</h1>
        <p className="text-sm text-gray-500 mb-6">Please use the login button in the topbar to access this page</p>
        
        <p className="text-xs text-gray-400 mt-4">
          Demo: admin@example.com / admin123
        </p>
      </div>
    </div>
  );
}