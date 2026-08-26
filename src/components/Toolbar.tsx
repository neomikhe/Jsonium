import { useMessages } from '../lib/i18n';

interface ToolbarProps {
  isDisabled: boolean;
  onFormat: () => void;
  onMinify: () => void;
  onSortKeys: () => void;
  onShare: () => void;
}

export function Toolbar({ isDisabled, onFormat, onMinify, onSortKeys, onShare }: ToolbarProps) {
  const messages = useMessages();

  return (
    <div className="toolbar" role="toolbar" aria-label={messages.documentActions}>
      <button type="button" onClick={onFormat} disabled={isDisabled} title={messages.shortcut('F')}>
        {messages.format}
      </button>
      <button type="button" onClick={onMinify} disabled={isDisabled} title={messages.shortcut('M')}>
        {messages.minify}
      </button>
      <button
        type="button"
        onClick={onSortKeys}
        disabled={isDisabled}
        title={messages.shortcut('O')}
      >
        {messages.sortKeys}
      </button>
      <button type="button" onClick={onShare} disabled={isDisabled} title={messages.shareLinkHint}>
        {messages.shareLink}
      </button>
    </div>
  );
}
