import { useCallback, useState } from 'react';
import { ACCEPTED_FILES } from '../core/file-format';
import type { ChangeEvent, DragEvent } from 'react';

interface DropZoneProps {
  onFile: (file: File) => void;
  isCompact?: boolean;
  label?: string;
}

export function DropZone({ onFile, isCompact = false, label }: DropZoneProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setIsOver(false);
      const file = event.dataTransfer.files.item(0);
      if (file !== null) onFile(file);
    },
    [onFile],
  );

  const handleSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.item(0) ?? null;
      if (file !== null) onFile(file);
    },
    [onFile],
  );

  return (
    <label
      className={dropzoneClass(isCompact, isOver)}
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => {
        setIsOver(false);
      }}
      onDrop={handleDrop}
    >
      <span className="dropzone__title">
        {label ?? (isCompact ? 'Abrir otro documento' : 'Suelta un archivo JSON')}
      </span>
      {!isCompact && (
        <span className="dropzone__hint">o pulsa para elegirlo. Nada sale de tu equipo.</span>
      )}
      <input type="file" accept={ACCEPTED_FILES} onChange={handleSelect} />
    </label>
  );
}

function dropzoneClass(isCompact: boolean, isOver: boolean): string {
  const base = isCompact ? 'dropzone dropzone--compact' : 'dropzone';
  return isOver ? `${base} dropzone--over` : base;
}
