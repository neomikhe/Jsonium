import { Suspense, lazy } from 'react';
import type { RepairFix } from '../core/repair';
import { RepairSummary } from './RepairSummary';

// CodeMirror pesa ~100 kB gzip: se carga aparte para no retrasar el arranque
const Editor = lazy(() => import('./Editor').then((module) => ({ default: module.Editor })));

interface EditorPaneProps {
  text: string;
  error: string | null;
  fixes: readonly RepairFix[];
  canRepair: boolean;
  onChange: (text: string) => void;
  onRepair: () => void;
}

export function EditorPane({ text, error, fixes, canRepair, onChange, onRepair }: EditorPaneProps) {
  return (
    <section className="pane">
      <Suspense fallback={<div className="editor editor--loading" />}>
        <Editor text={text} isEditable onChange={onChange} />
      </Suspense>

      {error !== null && (
        <div className="notice notice--error problem">
          <span className="problem__text">{error}</span>
          {canRepair && (
            <button type="button" className="problem__action" onClick={onRepair}>
              Reparar
            </button>
          )}
        </div>
      )}

      <RepairSummary fixes={fixes} />
    </section>
  );
}
