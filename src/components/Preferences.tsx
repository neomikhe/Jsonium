import { useMessages } from '../lib/i18n';
import type { Theme } from '../lib/use-theme';
import { ThemeIcon } from './ThemeIcon';

interface PreferencesProps {
  theme: Theme;
  nextTheme: Theme;
  onCycleTheme: () => void;
  onSwitchLanguage: () => void;
}

export function Preferences(props: PreferencesProps) {
  const { theme, nextTheme, onCycleTheme, onSwitchLanguage } = props;
  const messages = useMessages();

  return (
    <div className="prefs">
      <button
        type="button"
        className="prefs__button"
        aria-label={messages.switchTheme(messages.themeName[nextTheme])}
        title={messages.switchTheme(messages.themeName[nextTheme])}
        onClick={onCycleTheme}
      >
        <ThemeIcon theme={theme} />
      </button>
      <button
        type="button"
        className="prefs__button"
        aria-label={messages.switchLanguage}
        title={messages.switchLanguage}
        onClick={onSwitchLanguage}
      >
        {messages.language}
      </button>
    </div>
  );
}
