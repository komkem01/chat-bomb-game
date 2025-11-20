'use client';

import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col items-center justify-center transition-opacity">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-blue-400 text-sm tracking-widest font-medium">
        INITIALIZING
      </p>
    </div>
  );
};

export default LoadingScreen;