import { useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

function getInitialTheme(storageKey: string): Theme {
  const saved = localStorage.getItem(storageKey) || localStorage.getItem('mouseforge:theme');

  if (saved === 'light' || saved === 'dark') {
    return saved;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme(userKey?: string) {
  const storageKey = useMemo(() => (userKey ? `mouseforge:theme:${userKey}` : 'mouseforge:theme'), [userKey]);
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme(storageKey));

  useEffect(() => {
    setTheme(getInitialTheme(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem(storageKey, theme);
    localStorage.setItem('mouseforge:theme', theme);
  }, [storageKey, theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return { theme, toggleTheme };
}
