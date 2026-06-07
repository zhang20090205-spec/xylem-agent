import React from 'react';
import { Moon, Sun } from 'lucide-react';
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
        className={`ether-button flex h-10 w-10 items-center justify-center ${className}`}
        aria-label={`切换到${theme === 'light' ? '深色' : '浅色'}模式`}
      >
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>
    );
  }

  return (
    <div className={`border border-white/15 bg-white/5 p-1 backdrop-blur-md ${className}`}>
      {[
        { value: 'light' as const, label: 'NORMAL', icon: Sun },
        { value: 'dark' as const, label: 'NIGHT', icon: Moon },
      ].map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`
            ether-micro relative inline-flex items-center gap-2 px-3 py-1.5 transition-colors
            ${theme === value
              ? 'bg-white/12 text-white'
              : 'text-white/56 hover:bg-white/8 hover:text-white/86'}
          `}
          aria-label={`切换到${value === 'light' ? '浅色' : '深色'}模式`}
          aria-pressed={theme === value}
        >
          <Icon size={14} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
