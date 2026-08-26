export const PANE_MODES = ['tree', 'query', 'diff', 'convert', 'validate'] as const;

export type PaneMode = (typeof PANE_MODES)[number];
