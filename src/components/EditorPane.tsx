import { Suspense, lazy } from 'react';
import type { Span } from '../core/locate';
import type { RepairFix } from '../core/repair';
import { useMessages } from '../lib/i18n';
import { describeFailure } from '../lib/describe-failure';
import { RepairSummary } from './RepairSummary';

// CodeMirror pesa ~100 kB gzip: se carga aparte para no retrasar el arranque
const Editor = lazy(() => import('./Editor').then((module) => ({ default: module.Editor })));

interface EditorPaneProps {
  text: string;
  error: string | null;
  fixes: readonly RepairFix[];
  canRepair: boolean;
  reveal: Span | null;
  onChange: (text: string) => void;
  onRepair: () => void;
}

export function EditorPane(props: EditorPaneProps) {
  const { text, error, fixes, canRepair, reveal, onChange, onRepair } = props;
  const messages = useMessages();
  return (
    <section className="pane">
      <Suspense fallback={<div className="editor editor--loading" />}>
        <Editor text={text} isEditable reveal={reveal} onChange={onChange} />
      </Suspense>

      {error !== null && (
        <div className="notice notice--error problem">
          <span className="problem__text">{describeFailure(messages, error)}</span>
          {canRepair && (
            <button type="button" className="problem__action" onClick={onRepair}>
              {messages.repair}
            </button>
          )}
        </div>
      )}

      <RepairSummary fixes={fixes} />
    </section>
  );
}
