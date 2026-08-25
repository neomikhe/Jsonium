interface ToolbarProps {
  isDisabled: boolean;
  onFormat: () => void;
  onMinify: () => void;
  onSortKeys: () => void;
}

export function Toolbar({ isDisabled, onFormat, onMinify, onSortKeys }: ToolbarProps) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Acciones del documento">
      <button type="button" onClick={onFormat} disabled={isDisabled}>
        Formatear
      </button>
      <button type="button" onClick={onMinify} disabled={isDisabled}>
        Minificar
      </button>
      <button type="button" onClick={onSortKeys} disabled={isDisabled}>
        Ordenar claves
      </button>
    </div>
  );
}
