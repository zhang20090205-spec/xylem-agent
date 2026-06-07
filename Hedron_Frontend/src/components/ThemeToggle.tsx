import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface ThemeToggleProps {
  variant?: 'full' | 'compact';
  className?: string;
}

export default function ThemeToggle({ variant = 'full', className = '' }: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme } = useTheme();

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95
          bg-white/10 hover:bg-white/20 backdrop-blur-sm
          dark:bg-gray-800/50 dark:hover:bg-gray-700/50
          border border-gray-200/20 dark:border-gray-700/30
          shadow-sm hover:shadow-md
          ${className}
        `}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <Moon size={16} className="text-gray-700 dark:text-gray-300" />
        ) : (
          <Sun size={16} className="text-gray-700 dark:text-gray-300" />
        )}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-1 border border-gray-200/20 dark:border-gray-700/30 shadow-md">
        {[
          { value: 'light' as const, label: 'Light', icon: Sun },
          { value: 'dark' as const, label: 'Dark', icon: Moon },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`
              relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
              transition-all duration-200 hover:scale-105 active:scale-95
              ${theme === value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
              }
            `}
            aria-label={`Switch to ${label.toLowerCase()} mode`}
            aria-pressed={theme === value}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
            
            {/* Active indicator */}
            {theme === value && (
              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-400/10 dark:to-purple-400/10" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}