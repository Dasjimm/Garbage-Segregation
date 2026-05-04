'use client';

import { useSupabaseAuth } from '@/app/context/SupabaseAuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useEffect, useState } from 'react';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  activeMenu: string;
}

export default function ProtectedLayout({ children, activeMenu }: ProtectedLayoutProps) {
  const { isAuthenticated, loading } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);


  
  const getMainMargin = () => {
    if (isMobile) return 'ml-0'; 
    return 'ml-64'; 
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen bg-gray-100 overflow-x-hidden">
        <Sidebar activeMenu={activeMenu} />
        
        <main className={`flex-1 transition-all duration-300 ${getMainMargin()}`}>
          <Topbar />
          
          <div className="relative min-h-[calc(100vh-64px)] mt-16">
            <div className="blur-sm pointer-events-none select-none">
              <div className="p-3 sm:p-4 md:p-5 lg:p-6">
                {children}
              </div>
            </div>
            
            <div className="absolute inset-0 bg-black/10"></div>
            
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center bg-white p-6 sm:p-8 md:p-10 lg:p-12 rounded-xl sm:rounded-2xl shadow-2xl max-w-[90%] sm:max-w-md mx-auto border border-gray-100">
                <div className="mb-6 sm:mb-8 flex justify-center">
                  <div className="bg-teal-50 p-4 sm:p-5 md:p-6 rounded-full">
                    <Lock size={40} className="sm:w-16 sm:h-16 md:w-20 md:h-20 text-teal-600" />
                  </div>
                </div>
                
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Dashboard Locked</h1>
                <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">Please login to access this page</p>
                                
                <p className="text-xs sm:text-sm text-gray-400 mt-4">
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-x-hidden">
      <Sidebar activeMenu={activeMenu} />
      <main className={`flex-1 transition-all duration-300 ${getMainMargin()}`}>
        <Topbar />
        <div className="mt-16 p-3 sm:p-4 md:p-5 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}