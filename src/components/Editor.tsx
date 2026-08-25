import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import {
  HighlightStyle,
  bracketMatching,
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { Annotation, EditorState } from '@codemirror/state';
import { EditorView, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { useEffect, useRef } from 'react';

const Programmatic = Annotation.define<boolean>();

const jsonHighlight = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--text)', fontWeight: '600' },
  { tag: tags.string, color: 'var(--kind-string)' },
  { tag: tags.number, color: 'var(--kind-number)' },
  { tag: tags.bool, color: 'var(--kind-boolean)' },
  { tag: tags.null, color: 'var(--kind-null)' },
  { tag: tags.punctuation, color: 'var(--kind-container)' },
]);

interface ChangeRef {
  current: (text: string) => void;
}

interface EditorProps {
  text: string;
  isEditable: boolean;
  onChange: (text: string) => void;
}

export function Editor({ text, isEditable, onChange }: EditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const changeRef = useRef(onChange);
  const textRef = useRef(text);

  useEffect(() => {
    changeRef.current = onChange;
    textRef.current = text;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return undefined;
    const view = new EditorView({
      parent: host,
      state: createState(textRef.current, changeRef, isEditable),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [isEditable]);

  useEffect(() => {
    const view = viewRef.current;
    if (view === null || view.state.doc.toString() === text) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      annotations: Programmatic.of(true),
    });
  }, [text]);

  return <div className="editor" ref={hostRef} />;
}

function createState(doc: string, changeRef: ChangeRef, isEditable: boolean): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      foldGutter(),
      history(),
      indentOnInput(),
      bracketMatching(),
      syntaxHighlighting(jsonHighlight, { fallback: true }),
      json(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorState.readOnly.of(!isEditable),
      EditorView.editable.of(isEditable),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        if (update.transactions.some((tr) => tr.annotation(Programmatic) === true)) return;
        changeRef.current(update.state.doc.toString());
      }),
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.5' },
      }),
    ],
  });
}
