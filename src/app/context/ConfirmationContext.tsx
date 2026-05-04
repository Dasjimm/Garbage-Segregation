'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => void;
  closeConfirmation: () => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions>({
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'info',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = (confirmOptions: ConfirmationOptions) => {
    setOptions({
      title: confirmOptions.title,
      message: confirmOptions.message,
      confirmText: confirmOptions.confirmText || 'Confirm',
      cancelText: confirmOptions.cancelText || 'Cancel',
      type: confirmOptions.type || 'info',
      onConfirm: confirmOptions.onConfirm,
      onCancel: confirmOptions.onCancel || (() => {}),
    });
    setIsOpen(true);
  };

  const closeConfirmation = () => {
    setIsOpen(false);
  };

  const handleConfirm = () => {
    options.onConfirm();
    closeConfirmation();
  };

  const handleCancel = () => {
    if (options.onCancel) {
      options.onCancel();
    }
    closeConfirmation();
  };

  const getTypeStyles = () => {
    switch (options.type) {
      case 'warning':
        return {
          icon: <AlertCircle size={48} className="text-red-500" />,
          bg: 'bg-yellow-100',
          button: 'bg-red-600 hover:bg-red-700',
          border: 'border-red-200'
        };
      case 'error':
        return {
          icon: <AlertCircle size={48} className="text-red-500" />,
          bg: 'bg-red-100',
          button: 'bg-red-600 hover:bg-red-700',
          border: 'border-red-200'
        };
      case 'success':
        return {
          icon: <CheckCircle size={48} className="text-green-500" />,
          bg: 'bg-green-100',
          button: 'bg-green-600 hover:bg-green-700',
          border: 'border-green-200'
        };
      default:
        return {
          icon: <AlertCircle size={48} className="text-blue-500" />,
          bg: 'bg-blue-100',
          button: 'bg-blue-600 hover:bg-blue-700',
          border: 'border-blue-200'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <ConfirmationContext.Provider value={{ confirm, closeConfirmation }}>
      {children}
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all animate-pop-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{options.title}</h2>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700 transition-all hover:rotate-90 hover:scale-110"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex flex-col items-center text-center mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className={`${styles.bg} p-4 rounded-full mb-4 animate-bounce-soft`} style={{ animationDelay: '0.2s' }}>
                {styles.icon}
              </div>
              <p className="text-gray-600 text-lg">{options.message}</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all hover:scale-105 active:scale-95"
              >
                {options.cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-3 ${styles.button} text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all transform hover:scale-105 active:scale-95`}
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within ConfirmationProvider');
  }
  return context;
}