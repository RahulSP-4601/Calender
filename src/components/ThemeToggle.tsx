'use client';
import * as React from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = React.useState(true);

  React.useEffect(() => {
    const saved = localStorage.getItem('theme');
    const shouldDark = saved ? saved === 'dark' : true;
    setIsDark(shouldDark);
    document.documentElement.classList.toggle('dark', shouldDark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
      title="Toggle theme"
    >
      <span className="inline-block h-4 w-4 rounded-full bg-gradient-to-br from-brand-500 to-brand-900" />
      {isDark ? 'Dark' : 'Light'}
    </button>
  );
}
