'use client';

import { useSupabaseAuth } from '@/app/context/SupabaseAuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
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
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Generate QR code using QR Code API
  useEffect(() => {
    const websiteUrl = 'https://garbage-segregation-two.vercel.app';
    // Using a free QR code API
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(websiteUrl)}`);
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
                {/* EcoWaste Title */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-teal-600 mb-6">EcoWaste</h1>
                
                {/* Logos Section */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  {/* Web Logo */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative">
                    <Image
                      src="/wastelogo.png"
                      alt="EcoWaste Logo"
                      width={100}
                      height={100}
                      className="object-cover w-full h-full rounded-full"
                    />
                  </div>
                  
                  {/* Barangay Banicain Logo */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative">
                    <Image
                      src="/banicainlogo.jpg"
                      alt="Barangay Banicain Logo"
                      width={100}
                      height={100}
                      className="object-cover w-full h-full rounded-full"
                    />
                  </div>
                </div>
                
                {/* Description Text */}
                <div className="space-y-4 mt-4">
                  <p className="text-base sm:text-lg font-bold text-gray-800 leading-relaxed">
                    Transforming Waste Management in Barangay Banicain Through Smart IoT Automation.
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-gray-600 leading-relaxed">
                    Please use the login button in the topbar to access the dashboard and manage waste records.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        {/* QR Code - Bottom Left Corner */}
        <div className="fixed bottom-4 left-4 z-50 bg-white rounded-xl shadow-lg p-2 border border-gray-200">
          <div className="flex flex-col items-center gap-1">
            {qrCodeUrl && (
              <img 
                src={qrCodeUrl} 
                alt="QR Code to access EcoWaste" 
                width={80} 
                height={80}
                className="rounded-lg"
              />
            )}
            <p className="text-[8px] text-gray-500 text-center max-w-[80px]">Scan to visit EcoWaste</p>
          </div>
        </div>
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
      
      {/* QR Code - Bottom Left Corner (when logged in as well) */}
      <div className="fixed bottom-4 left-4 z-50 bg-white rounded-xl shadow-lg p-2 border border-gray-200">
        <div className="flex flex-col items-center gap-1">
          {qrCodeUrl && (
            <img 
              src={qrCodeUrl} 
              alt="QR Code to access EcoWaste" 
              width={80} 
              height={80}
              className="rounded-lg"
            />
          )}
          <p className="text-[8px] text-gray-500 text-center max-w-[80px]">Scan to visit EcoWaste</p>
        </div>
      </div>
    </div>
  );
}