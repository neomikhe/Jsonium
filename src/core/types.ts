export type JsonKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export type NodeId = number;

export interface NodeSummary {
  id: NodeId;
  key: string | null;
  index: number | null;
  kind: JsonKind;
  preview: string;
  childCount: number;
}

export interface ParseResult {
  root: NodeSummary;
  parseMs: number;
  bytes: number;
}

export interface DocumentStats {
  nodes: number;
  maxDepth: number;
  kinds: Record<JsonKind, number>;
  scanMs: number;
}
