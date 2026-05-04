'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface NotificationOptions {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

interface NotificationContextType {
  showNotification: (options: NotificationOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notification, setNotification] = useState<NotificationOptions>({
    message: '',
    type: 'info',
    duration: 3000 
  });

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setIsOpen(false);
    }, notification.duration || 3000);

    return () => clearTimeout(timer);
  }, [isOpen, notification.duration]);

  const showNotification = (options: NotificationOptions) => {
    setIsOpen(false);
    
    setTimeout(() => {
      setNotification({
        message: options.message,
        type: options.type || 'info',
        duration: options.duration || 3000 
      });
      setIsOpen(true);
    }, 50);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return {
          icon: <CheckCircle size={24} className="text-green-500" />,
          bg: 'bg-green-100',
          border: 'border-green-200',
          text: 'text-green-800',
          progressBar: 'bg-green-500'
        };
      case 'warning':
        return {
          icon: <AlertCircle size={24} className="text-yellow-500" />,
          bg: 'bg-yellow-100',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          progressBar: 'bg-yellow-500'
        };
      case 'error':
        return {
          icon: <AlertCircle size={24} className="text-red-500" />,
          bg: 'bg-red-100',
          border: 'border-red-200',
          text: 'text-red-800',
          progressBar: 'bg-red-500'
        };
      default:
        return {
          icon: <AlertCircle size={24} className="text-blue-500" />,
          bg: 'bg-blue-100',
          border: 'border-blue-200',
          text: 'text-blue-800',
          progressBar: 'bg-blue-500'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none">
          <div className={`${styles.bg} ${styles.border} border rounded-2xl shadow-2xl p-6 max-w-md mx-4 transform transition-all animate-pop-in pointer-events-auto relative overflow-hidden`}>
            <div 
              className={`absolute bottom-0 left-0 h-1 ${styles.progressBar} animate-shrink`}
              style={{ 
                animationDuration: `${notification.duration || 3000}ms`,
                width: '100%'
              }}
            />
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 animate-bounce-soft">
                {styles.icon}
              </div>
              <div className="flex-1">
                <p className={`text-base font-medium ${styles.text}`}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-all hover:rotate-90 hover:scale-110 active:scale-95"
                aria-label="Close notification"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}