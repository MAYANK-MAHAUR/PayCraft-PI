import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ compact = false }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? <Moon size={14} /> : <Sun size={14} />}
      {!compact && <span>{isDark ? 'Dark' : 'Light'}</span>}
      <span className="knob" />
    </button>
  );
}
