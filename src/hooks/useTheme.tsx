import { useState, useEffect, createContext, useContext } from 'react';

// Define theme types
type Theme = 'light' | 'dark' | 'system';

// Define context type
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

// Create context with undefined default value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component (logic only - no JSX)
export function ThemeProviderLogic() {
  // Initialize theme state with localStorage or default to 'system'
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          return stored;
        }
      }
    } catch (error) {
      // Silently handle localStorage errors (non-breaking)
    }
    return 'system';
  });

  // Initialize resolved theme state
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;

    const updateTheme = () => {
      try {
        let resolved: 'light' | 'dark' = 'dark';

        // Determine the resolved theme based on current theme setting
        if (theme === 'system') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
          resolved = theme;
        }

        // Update state and apply theme classes
        setResolvedTheme(resolved);
        root.classList.remove('light', 'dark');
        root.classList.add(resolved);

        // Save theme to localStorage
        localStorage.setItem('theme', theme);
      } catch (error) {
        // Silently handle theme update errors (non-breaking)
      }
    };

    // Initial theme update
    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return { theme, setTheme, resolvedTheme };
}

// Custom hook for using theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export context for provider implementation elsewhere
export { ThemeContext };