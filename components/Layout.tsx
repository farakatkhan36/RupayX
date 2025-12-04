import React from 'react';
import { View } from '../types';
import { ChevronLeft, Wallet, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  balance: number;
  currentView: View;
  onBack?: () => void;
  onLogout?: () => void;
  isAuthenticated: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title, 
  balance, 
  currentView, 
  onBack,
  onLogout,
  isAuthenticated
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex justify-center">
      <div className="w-full max-w-md bg-slate-950 min-h-screen flex flex-col shadow-2xl relative">
        {/* Header */}
        {isAuthenticated && (
          <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentView !== View.HOME && onBack && (
                <button 
                  onClick={onBack}
                  className="p-2 rounded-full hover:bg-slate-800 text-slate-300 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                {title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                <Wallet size={16} className="text-emerald-400" />
                <span className="font-mono font-medium">₹{balance.toLocaleString('en-IN')}</span>
              </div>
              {onLogout && (
                <button 
                  onClick={onLogout}
                  className="p-2 rounded-full hover:bg-slate-800 text-red-400 transition-colors ml-1"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              )}
            </div>
          </header>
        )}
        
        {/* Main Content */}
        <main className="flex-1 p-5 animate-fadeIn">
          {children}
        </main>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
};