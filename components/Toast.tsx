'use client';

import React, { useEffect, useState } from 'react';
import { ToastType } from '@/types/game';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const ToastItem: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getBgClass = () => {
    switch (type) {
      case 'error':
        return 'bg-red-900/90 border-red-500';
      case 'success':
        return 'bg-emerald-900/90 border-emerald-500';
      default:
        return 'bg-blue-900/90 border-blue-500';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return 'fa-triangle-exclamation';
      case 'success':
        return 'fa-circle-check';
      default:
        return 'fa-circle-info';
    }
  };

  return (
    <div
      className={`${getBgClass()} text-white px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
        isVisible ? 'translate-x-0' : 'translate-x-full'
      } flex items-center gap-3 pointer-events-auto border-l-4 backdrop-blur-sm w-72`}
    >
      <i className={`fas ${getIcon()} text-lg`}></i>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

let toastId = 0;

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleToast = ((event: CustomEvent) => {
      const { message, type } = event.detail;
      const id = (toastId++).toString();
      setToasts(prev => [...prev, { id, message, type }]);
    }) as EventListener;

    window.addEventListener('showToast', handleToast);
    return () => window.removeEventListener('showToast', handleToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export const showToast = (message: string, type: ToastType = 'info') => {
  window.dispatchEvent(new CustomEvent('showToast', {
    detail: { message, type }
  }));
};

export default ToastContainer;