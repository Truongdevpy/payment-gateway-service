import React from 'react';
import { useTheme } from '../hooks/useTheme';

type ThemeToggleProps = {
  className?: string;
  compact?: boolean;
};

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', compact = false }) => {
  const { theme, toggleTheme } = useTheme();

  const isLight = theme === 'light';

  return (
    <button
      aria-label={isLight ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
      className={`theme-toggle ${compact ? 'theme-toggle--compact' : ''} ${className}`.trim()}
      onClick={toggleTheme}
      type="button"
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {isLight ? (
          <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
            <path
              d="M12 3V5M12 19V21M5.64 5.64L7.05 7.05M16.95 16.95L18.36 18.36M3 12H5M19 12H21M5.64 18.36L7.05 16.95M16.95 7.05L18.36 5.64M16 12A4 4 0 1 1 8 12A4 4 0 0 1 16 12Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        ) : (
          <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3C11.34 3 11.47 3.01 11.6 3.02A7 7 0 0 0 21 12.79Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        )}
      </span>
      {!compact ? <span className="theme-toggle__label">{isLight ? 'Sáng' : 'Tối'}</span> : null}
      <span className="theme-toggle__state">{isLight ? 'Đổi sang tối' : 'Đổi sang sáng'}</span>
    </button>
  );
};

export default ThemeToggle;
