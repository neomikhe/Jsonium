interface ToolbarProps {
  isDisabled: boolean;
  onFormat: () => void;
  onMinify: () => void;
  onSortKeys: () => void;
  onShare: () => void;
}

export function Toolbar({ isDisabled, onFormat, onMinify, onSortKeys, onShare }: ToolbarProps) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Acciones del documento">
      <button type="button" onClick={onFormat} disabled={isDisabled} title="Ctrl/Cmd + Shift + F">
        Formatear
      </button>
      <button type="button" onClick={onMinify} disabled={isDisabled} title="Ctrl/Cmd + Shift + M">
        Minificar
      </button>
      <button type="button" onClick={onSortKeys} disabled={isDisabled} title="Ctrl/Cmd + Shift + O">
        Ordenar claves
      </button>
      <button
        type="button"
        onClick={onShare}
        disabled={isDisabled}
        title="El enlace lleva el documento en el fragmento, que nunca llega al servidor"
      >
        Compartir enlace
      </button>
    </div>
  );
}
