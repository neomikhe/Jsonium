import type { Theme } from '../lib/use-theme';

const SUN_RAYS =
  'M8 1v2M8 13v2M1 8h2M13 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4';
const MOON = 'M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7Z';
const HALF = 'M8 2a6 6 0 0 0 0 12Z';

interface ThemeIconProps {
  theme: Theme;
}

export function ThemeIcon({ theme }: ThemeIconProps) {
  return (
    <svg className="prefs__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {theme === 'light' && <Sun />}
      {theme === 'dark' && <path d={MOON} fill="currentColor" />}
      {theme === 'system' && <System />}
    </svg>
  );
}

function Sun() {
  return (
    <>
      <circle cx="8" cy="8" r="3.2" fill="currentColor" />
      <path d={SUN_RAYS} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  );
}

function System() {
  return (
    <>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d={HALF} fill="currentColor" />
    </>
  );
}
