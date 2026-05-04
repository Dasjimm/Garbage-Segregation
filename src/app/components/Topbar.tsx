'use client';

import { useSupabaseAuth } from '@/app/context/SupabaseAuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  LogOut,
  Settings,
  ChevronDown,
  AlertCircle,
  Calendar,
  FileText,
  Wrench,
  CheckCircle,
  Eye,
  EyeOff,
  Menu,
  X,
  LogIn,
  Shield,
  Clock,
  Zap
} from 'lucide-react';
import Image from 'next/image';
import AuthModal from '@/app/components/AuthModal';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'detection' | 'pickup' | 'report' | 'update' | 'delete' | 'record' | 'disposal';
  link?: string;
  action?: string;
}

export default function Topbar() {
  const { user, logout, isAuthenticated } = useSupabaseAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hardwareOnline] = useState(true);
  const [showLiveIndicator, setShowLiveIndicator] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const handleAddNotification = (event: CustomEvent<Notification>) => {
      const newNotification = {
        ...event.detail,
        id: Date.now(),
        time: 'just now',
        read: false
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      
      setShowLiveIndicator(true);
      setTimeout(() => setShowLiveIndicator(false), 3000);
    };

    const handleRecordAdded = (event: CustomEvent) => {
      const { date, type, weight } = event.detail;
      addNotification({
        title: 'Record Added',
        message: `Added ${type} record: ${weight}kg on ${date}`,
        type: 'record',
        link: '/reports'
      });
    };

    const handleRecordUpdated = (event: CustomEvent) => {
      const { date, type, weight } = event.detail;
      addNotification({
        title: 'Record Updated',
        message: `Updated ${type} record: ${weight}kg on ${date}`,
        type: 'record',
        link: '/reports'
      });
    };

    const handleRecordDeleted = (event: CustomEvent) => {
      const { date, type } = event.detail;
      addNotification({
        title: 'Record Deleted',
        message: `Deleted ${type} record from ${date}`,
        type: 'delete',
        link: '/reports'
      });
    };

    const handleDisposalAdded = (event: CustomEvent) => {
      const { type, weight, location } = event.detail;
      addNotification({
        title: 'Disposal Completed',
        message: `${weight}kg of ${type} disposed at ${location || 'Zone A'}`,
        type: 'disposal',
        link: '/recycling'
      });
    };

    const handlePickupScheduled = (event: CustomEvent) => {
      const { day, type, time } = event.detail;
      addNotification({
        title: 'Pickup Scheduled',
        message: `${type} pickup scheduled for ${day} at ${time}`,
        type: 'pickup',
        link: '/dashboard?tab=pickups'
      });
    };

    window.addEventListener('add-notification', handleAddNotification as EventListener);
    window.addEventListener('record-added', handleRecordAdded as EventListener);
    window.addEventListener('record-updated', handleRecordUpdated as EventListener);
    window.addEventListener('record-deleted', handleRecordDeleted as EventListener);
    window.addEventListener('disposal-added', handleDisposalAdded as EventListener);
    window.addEventListener('pickup-scheduled', handlePickupScheduled as EventListener);

    return () => {
      window.removeEventListener('add-notification', handleAddNotification as EventListener);
      window.removeEventListener('record-added', handleRecordAdded as EventListener);
      window.removeEventListener('record-updated', handleRecordUpdated as EventListener);
      window.removeEventListener('record-deleted', handleRecordDeleted as EventListener);
      window.removeEventListener('disposal-added', handleDisposalAdded as EventListener);
      window.removeEventListener('pickup-scheduled', handlePickupScheduled as EventListener);
    };
  }, []);

  const addNotification = (notification: Partial<Notification>) => {
    const newNotification: Notification = {
      id: Date.now(),
      title: notification.title || 'Notification',
      message: notification.message || '',
      time: 'just now',
      read: false,
      type: notification.type || 'update',
      link: notification.link
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setShowLiveIndicator(true);
    setTimeout(() => setShowLiveIndicator(false), 3000);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const handleOpenAuthModal = (event: any) => {
      const mode = event.detail?.mode || 'login';
      setAuthModalMode(mode);
      setIsAuthModalOpen(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('open-auth-modal', handleOpenAuthModal);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-auth-modal', handleOpenAuthModal);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoggingOut) return; 
    
    setIsLoggingOut(true);
    
    try {
      setShowUserMenu(false);
      
      const currentPath = window.location.pathname;
      console.log('Logout initiated from:', currentPath);
      
      const originalPush = router.push;
      const originalReplace = router.replace;
      
      router.push = (path: string) => {
        console.log('🚫 BLOCKED router.push to:', path);
        return;
      };
      
      router.replace = (path: string) => {
        console.log('🚫 BLOCKED router.replace to:', path);
        return;
      };
      
      await logout();
      console.log('Logout completed');
      
      sessionStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('redirectAfterLogin');
      
      setTimeout(() => {
        router.push = originalPush;
        router.replace = originalReplace;
        
        setIsLoggingOut(false);
        
        if (window.location.pathname !== currentPath) {
          console.log('⚠️ Navigation detected, forcing back to:', currentPath);
          window.history.pushState(null, '', currentPath);
        }
      }, 500);
      
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const handleLoginClick = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleAuthSuccess = () => {
    console.log('Auth successful');
    setIsAuthModalOpen(false);
    window.location.reload();
  };

  const navigateTo = (path: string) => {
    router.push(path);
    setShowUserMenu(false);
    setMobileMenuOpen(false);
  };

  const handleNotificationClick = (notification: Notification) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id ? { ...n, read: true } : n
      )
    );
    
    if (notification.link) {
      router.push(notification.link);
    }
    
    setShowNotifications(false);
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('notifications');
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getAdminName = () => {
    if (!user?.email) return 'Admin';
    const name = user.email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'detection':
        return <Wrench size={isMobile ? 14 : 18} className="text-blue-500" />;
      case 'pickup':
        return <Calendar size={isMobile ? 14 : 18} className="text-green-500" />;
      case 'report':
        return <FileText size={isMobile ? 14 : 18} className="text-purple-500" />;
      case 'update':
        return <AlertCircle size={isMobile ? 14 : 18} className="text-yellow-500" />;
      case 'delete':
        return <AlertCircle size={isMobile ? 14 : 18} className="text-red-500" />;
      case 'record':
        return <FileText size={isMobile ? 14 : 18} className="text-blue-500" />;
      case 'disposal':
        return <Wrench size={isMobile ? 14 : 18} className="text-orange-500" />;
      default:
        return <Bell size={isMobile ? 14 : 18} className="text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const getLeftPosition = () => {
    if (isMobile) return 'left-0';
    if (isTablet) return 'left-0';
    return 'left-64'; 
  };

  return (
    <>
      <header className={`fixed top-0 right-0 h-16 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white shadow-md z-20 transition-all duration-300 ${getLeftPosition()}`}>
        <div className="flex items-center justify-between h-full px-3 sm:px-4 md:px-5 lg:px-6">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            {(isMobile || isTablet) && (
              <button
                onClick={toggleMobileMenu}
                className="p-2 hover:bg-white/10 rounded-lg transition mr-1"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
              </button>
            )}
            
            {(isMobile || isTablet) && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 relative flex-shrink-0 bg-white/20 rounded-lg overflow-hidden">
                  <Image
                    src="/wastelogo.png"
                    alt="EcoWaste Logo"
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                </div>
                <span className="font-bold text-white text-sm">EcoWaste</span>
              </div>
            )}
            
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm text-white/90">{getGreeting()},</h2>
                <p className="text-sm font-semibold text-white">
                  {getAdminName()}!
                </p>
                <div className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                  <Shield size={10} className="text-white" />
                  <span className="text-white font-medium">Admin</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-2 border-l border-white/20 pl-3">
                <div className="flex items-center gap-1 text-xs text-white/90">
                  <Calendar size={12} className="text-white" />
                  <span>{currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-white/90">
                  <Clock size={12} className="text-white" />
                  <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-2">
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  <div className={`w-1.5 h-1.5 rounded-full ${hardwareOnline ? 'bg-green-300 animate-pulse' : 'bg-red-300'}`} />
                  <span className="text-xs text-white font-medium">Online</span>
                </div>
                {showLiveIndicator && (
                  <div className="flex items-center gap-1 bg-yellow-500/20 backdrop-blur-sm px-2 py-0.5 rounded-full animate-pulse">
                    <Zap size={10} className="text-yellow-300" />
                    <span className="text-xs text-yellow-100 font-medium">Live</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-lg transition"
                aria-label="Notifications"
              >
                <Bell size={isMobile ? 18 : 20} />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-ping"></span>
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></span>
                  </>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-[100] max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 sticky top-0 bg-white">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <Bell size={12} />
                        {unreadCount} new
                      </span>
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded-full hover:bg-red-50 transition"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`px-4 py-3 hover:bg-gray-50 transition cursor-pointer ${
                            !notification.read ? 'bg-teal-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                              notification.type === 'detection' ? 'bg-blue-100' :
                              notification.type === 'pickup' ? 'bg-green-100' :
                              notification.type === 'report' ? 'bg-purple-100' :
                              notification.type === 'delete' ? 'bg-red-100' :
                              notification.type === 'record' ? 'bg-blue-100' :
                              notification.type === 'disposal' ? 'bg-orange-100' :
                              'bg-yellow-100'
                            }`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                                {!notification.read && (
                                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-teal-600 rounded-full flex-shrink-0"></div>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs text-gray-400">{notification.time}</span>
                                {notification.read ? (
                                  <EyeOff size={10} className="text-gray-300" />
                                ) : (
                                  <Eye size={10} className="text-teal-400" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No notifications</p>
                      </div>
                    )}
                  </div>
                  {unreadCount > 0 && notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-200 sticky bottom-0 bg-white">
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-teal-600 hover:text-teal-800 w-full text-center flex items-center justify-center gap-1"
                      >
                        <CheckCircle size={14} />
                        Mark all as read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1 sm:gap-2 hover:bg-white/10 p-1.5 sm:p-2 rounded-lg transition"
                  disabled={isLoggingOut}
                >
                  <div className="hidden sm:block text-left">
                    <p className="text-xs sm:text-sm font-medium text-white truncate max-w-[100px]">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-white/80 truncate max-w-[100px]">
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </div>
                  <ChevronDown size={14} className="text-white/80 hidden sm:block" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-[100]">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email || 'user@example.com'}</p>
                      </div>
                    </div>

                    <div className="py-2">
                      <button
                        onClick={() => {
                          router.push('/settings?tab=profile');
                          setShowUserMenu(false);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                        disabled={isLoggingOut}
                      >
                        Profile
                      </button>

                      <button
                        onClick={() => {
                          router.push('/settings');
                          setShowUserMenu(false);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                        disabled={isLoggingOut}
                      >
                        Settings
                      </button>
                    </div>

                    <div className="border-t border-gray-200 my-2"></div>

                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingOut ? (
                        <>
                          <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          Signing out...
                        </>
                      ) : (
                        <>
                          <LogOut size={16} />
                          Sign Out
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-2 px-3 py-2 bg-white text-teal-600 rounded-lg text-sm font-medium hover:bg-teal-50 transition"
              >
                <LogIn size={16} />
                <span className="hidden sm:inline">Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={handleCloseModal}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />
    </>
  );
}