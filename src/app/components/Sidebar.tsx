'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Trash2, FileText, Settings as SettingsIcon, Menu } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

interface SidebarProps {
  activeMenu?: string;
}

export default function Sidebar({ activeMenu }: SidebarProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/', color: 'text-teal-600' },
    { id: 'recycling', label: 'Recycling Segregation', icon: Trash2, href: '/recycling', color: 'text-blue-600' },
    { id: 'reports', label: 'Reports', icon: FileText, href: '/reports', color: 'text-purple-600' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, href: '/settings', color: 'text-gray-600' },
  ];

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      
      if (width < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (!isMobile && !isTablet) return;
    if (!isSidebarOpen) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > 50;
      
      if (isLeftSwipe) {
        setIsSidebarOpen(false);
      }
      
      setTouchStart(null);
      setTouchEnd(null);
    };

    const sidebar = sidebarRef.current;
    if (sidebar) {
      sidebar.addEventListener('touchstart', handleTouchStart);
      sidebar.addEventListener('touchmove', handleTouchMove);
      sidebar.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (sidebar) {
        sidebar.removeEventListener('touchstart', handleTouchStart);
        sidebar.removeEventListener('touchmove', handleTouchMove);
        sidebar.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [touchStart, touchEnd, isSidebarOpen, isMobile, isTablet]);

  useEffect(() => {
    if (!isMobile && !isTablet) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen, isMobile, isTablet]);

  const isActive = (item: typeof menuItems[0]) => {
    if (activeMenu && activeMenu === item.id) {
      return true;
    }
    
    if (item.href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(item.href);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const MenuButton = () => (
    <button
      onClick={toggleSidebar}
      className="fixed top-4 left-4 z-50 p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-lg"
      aria-label="Toggle menu"
    >
      <Menu size={20} />
    </button>
  );

  if (isMobile && !isSidebarOpen) {
    return <MenuButton />;
  }

  if (isMobile && isSidebarOpen) {
    return (
      <>
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm animate-fade-in"
          onClick={closeSidebar}
        />
        
        <aside 
          ref={sidebarRef}
          className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 animate-slide-in"
        >
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 relative flex-shrink-0 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl overflow-hidden">
                <Image
                  src="/wastelogo.png"
                  alt="EcoWaste Logo"
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-teal-600 leading-tight">EcoWaste</h1>
                <p className="text-xs text-gray-500 leading-tight">Recycling</p>
              </div>
            </div>
          </div>
          
          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={closeSidebar}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                        active
                          ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-500' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={20} className={active ? 'text-teal-600' : item.color} />
                      <span className={`text-sm font-medium ${active ? 'text-teal-700' : 'text-gray-700'}`}>{item.label}</span>
                      {active && (
                        <span className="ml-auto w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center">Version 2.0.0</p>
          </div>
        </aside>
      </>
    );
  }

  if (isTablet) {
    return (
      <>
        {isSidebarOpen ? (
          <>
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm animate-fade-in"
              onClick={closeSidebar}
            />
            
            <aside 
              ref={sidebarRef}
              className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 animate-slide-in"
            >
              <div className="p-5 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 relative flex-shrink-0 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl overflow-hidden">
                    <Image
                      src="/wastelogo.png"
                      alt="EcoWaste Logo"
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                      priority
                    />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-teal-600 leading-tight">EcoWaste</h1>
                    <p className="text-xs text-gray-500 leading-tight">Recycling</p>
                  </div>
                </div>
              </div>
              
              <nav className="p-4">
                <ul className="space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);
                    
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={closeSidebar}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                            active
                              ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-500' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <Icon size={20} className={active ? 'text-teal-600' : item.color} />
                          <span className={`text-sm font-medium ${active ? 'text-teal-700' : 'text-gray-700'}`}>{item.label}</span>
                          {active && (
                            <span className="ml-auto w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
                <p className="text-xs text-gray-400 text-center">Version 2.0.0</p>
              </div>
            </aside>
          </>
        ) : (
          <button
            onClick={toggleSidebar}
            className="fixed top-4 left-4 z-50 p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-lg"
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
        )}
      </>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-10">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 relative flex-shrink-0 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl overflow-hidden">
            <Image
              src="/wastelogo.png"
              alt="EcoWaste Logo"
              width={48}
              height={48}
              className="object-cover w-full h-full"
              priority
            />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-teal-600 leading-tight">EcoWaste</h1>
            <p className="text-xs text-gray-500 leading-tight">Recycling Management</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    active
                      ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-500' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} className={active ? 'text-teal-600' : item.color} />
                  <span className={`text-sm font-medium ${active ? 'text-teal-700' : 'text-gray-700'}`}>{item.label}</span>
                  {active && (
                    <span className="ml-auto w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">Version 2.0.0</p>
      </div>
    </aside>
  );
}