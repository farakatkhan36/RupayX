import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-slate-900/50 border ${error ? 'border-red-500' : 'border-slate-700'} focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl ${icon ? 'pl-11 pr-4' : 'px-4'} py-3 text-white placeholder-slate-500 transition-colors outline-none ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
};