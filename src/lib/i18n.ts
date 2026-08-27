import { createContext, useContext } from 'react';
import type { JsonKind } from '../core/types';
import type { LossKind } from '../core/convert';
import type { PaneMode } from './pane-mode';
import type { Theme } from './use-theme';
import type { FailureCode } from '../core/failure';
import type { RepairKind } from '../core/repair';
import type { ShareFailure } from './share-url';

export type Locale = 'es' | 'en';

export interface Messages {
  locale: Locale;
  tagline: string;
  oversize: (limit: string) => string;

  documentActions: string;
  format: string;
  minify: string;
  sortKeys: string;
  shareLink: string;
  shareLinkHint: string;
  shortcut: (key: string) => string;

  dropFile: string;
  dropHint: string;
  openAnother: string;
  dropCompare: string;
  dropSchema: string;

  recentDocuments: string;
  forget: (name: string) => string;
  clearSaved: string;

  size: string;
  parse: string;
  nodes: string;
  depth: string;
  scan: string;
  computeStats: string;
  types: string;
  kind: Record<JsonKind, string>;

  documentView: string;
  mode: Record<PaneMode, string>;
  parsing: (name: string) => string;
  parseFailed: (name: string, error: string) => string;

  searchPlaceholder: string;
  searchLabel: string;
  searching: (query: string) => string;
  noMatchesFor: (query: string) => string;
  matches: (count: string) => string;
  searchResults: string;
  copyPathTitle: string;
  limitReached: string;
  inTime: (time: string) => string;

  treeLabel: string;
  expand: string;
  collapse: string;
  showInEditor: string;
  showInTree: string;
  hiddenSiblings: (count: string) => string;
  path: string;
  value: string;

  versus: (name: string) => string;
  matchArraysBy: string;
  byIndex: string;
  exportDiff: string;
  remove: string;
  comparing: string;
  documentsEqual: string;
  changesLabel: string;
  changeKind: Record<'added' | 'removed' | 'changed', string>;

  converting: string;
  copy: string;
  download: string;
  howMany: string;
  lossTitle: string;
  truncatedPreview: (chars: string) => string;
  loss: Record<LossKind, string>;

  queryPlaceholder: string;
  queryLabel: string;
  examples: string;
  querying: string;
  noMatches: string;
  queryResults: string;

  against: (name: string) => string;
  validating: string;
  documentValid: string;
  violations: (count: string) => string;
  violationsLabel: string;
  rule: Record<string, string>;

  failure: Record<FailureCode, string>;

  repair: string;
  repairApplied: string;
  repairKind: Record<RepairKind, string>;

  clipboardBlocked: string;
  storageUnavailable: string;
  pathCopied: string;
  valueCopied: string;
  conversionCopied: string;
  linkCopied: string;
  shareFailure: Record<ShareFailure, string>;
  language: string;
  switchLanguage: string;
  themeName: Record<Theme, string>;
  switchTheme: (next: string) => string;
  sharedName: string;
}

const ES: Messages = {
  locale: 'es',
  tagline: 'Banco de trabajo JSON local. Cero red.',
  oversize: (limit) =>
    `El editor y el guardado automatico se desactivan por encima de ${limit}: mantener tanto texto en el hilo principal congelaria la interfaz. Navega el documento con el arbol.`,

  documentActions: 'Acciones del documento',
  format: 'Formatear',
  minify: 'Minificar',
  sortKeys: 'Ordenar claves',
  shareLink: 'Compartir enlace',
  shareLinkHint: 'El enlace lleva el documento en el fragmento, que nunca llega al servidor',
  shortcut: (key) => `Ctrl/Cmd + Shift + ${key}`,

  dropFile: 'Suelta un archivo JSON',
  dropHint: 'o pulsa para elegirlo. Nada sale de tu equipo.',
  openAnother: 'Abrir otro documento',
  dropCompare: 'Suelta el documento con el que comparar',
  dropSchema: 'Suelta un JSON Schema para validar',

  recentDocuments: 'Documentos recientes',
  forget: (name) => `Olvidar ${name}`,
  clearSaved: 'Borrar guardados',

  size: 'tamano',
  parse: 'parse',
  nodes: 'nodos',
  depth: 'profundidad',
  scan: 'scan',
  computeStats: 'Calcular estadisticas',
  types: 'Tipos',
  kind: {
    object: 'objetos',
    array: 'arrays',
    string: 'cadenas',
    number: 'numeros',
    boolean: 'booleanos',
    null: 'nulos',
  },

  documentView: 'Vista del documento',
  mode: {
    tree: 'Arbol',
    query: 'Consultar',
    diff: 'Diff',
    convert: 'Convertir',
    validate: 'Validar',
  },
  parsing: (name) => `Parseando ${name}...`,
  parseFailed: (name, error) => `No se pudo parsear ${name}: ${error}`,

  searchPlaceholder: 'Buscar por clave o valor',
  searchLabel: 'Buscar en el documento',
  searching: (query) => `Buscando ${query}...`,
  noMatchesFor: (query) => `Sin coincidencias para ${query}`,
  matches: (count) => `${count} coincidencias`,
  searchResults: 'Resultados de la busqueda',
  copyPathTitle: 'Copiar ruta',
  limitReached: 'limite alcanzado',
  inTime: (time) => `en ${time}`,

  treeLabel: 'Arbol del documento',
  expand: 'Expandir',
  collapse: 'Contraer',
  showInEditor: 'Mostrar en el editor',
  showInTree: 'Mostrar en el arbol',
  hiddenSiblings: (count) => `${count} mas`,
  path: 'ruta',
  value: 'valor',

  versus: (name) => `vs ${name}`,
  matchArraysBy: 'emparejar arrays por',
  byIndex: 'indice',
  exportDiff: 'Exportar',
  remove: 'Quitar',
  comparing: 'Comparando...',
  documentsEqual: 'Los dos documentos son iguales.',
  changesLabel: 'Cambios entre documentos',
  changeKind: { added: 'alta', removed: 'baja', changed: 'cambio' },

  converting: 'Convirtiendo...',
  copy: 'Copiar',
  download: 'Descargar',
  howMany: 'cuantos',
  lossTitle: 'Esta conversion pierde informacion',
  truncatedPreview: (chars) =>
    `Se muestran los primeros ${chars} caracteres. Copiar entrega el texto completo.`,
  loss: {
    tomlRootNotTable: 'TOML exige un objeto en la raiz',
    tomlNullDropped: 'TOML no tiene null: la clave se pierde',
    csvRootNotRowArray: 'CSV necesita un array de filas en la raiz',
    csvRowNotObject: 'Cada fila debe ser un objeto',
    csvNestedValue: 'Un valor anidado se guarda como texto JSON y vuelve como cadena',
    csvRaggedRows: 'Las filas no comparten claves: habra celdas vacias',
    csvTypesLost: 'CSV es texto: numeros y booleanos vuelven como cadenas',
    schemaTruncated: 'El documento es demasiado profundo o variado: el esquema esta recortado',
  },

  queryPlaceholder: 'Consulta JSONPath, por ejemplo $..price',
  queryLabel: 'Consulta JSONPath',
  examples: 'ejemplos',
  querying: 'Consultando...',
  noMatches: 'Sin coincidencias.',
  queryResults: 'Resultados de la consulta',

  against: (name) => `contra ${name}`,
  validating: 'Validando...',
  documentValid: 'El documento cumple el esquema.',
  violations: (count) => `${count} incumplimientos`,
  violationsLabel: 'Incumplimientos del esquema',
  rule: {
    schema: 'el esquema debe ser un objeto',
    type: 'tipo incorrecto',
    enum: 'el valor no esta entre los permitidos',
    const: 'el valor no coincide con const',
    required: 'falta la clave',
    additionalProperties: 'clave no permitida',
    minimum: 'menor que el minimo',
    maximum: 'mayor que el maximo',
    exclusiveMinimum: 'no supera el minimo exclusivo',
    exclusiveMaximum: 'no baja del maximo exclusivo',
    multipleOf: 'no es multiplo',
    minLength: 'mas corta que el minimo',
    maxLength: 'mas larga que el maximo',
    pattern: 'no cumple el patron',
    minItems: 'tiene menos elementos de los exigidos',
    maxItems: 'tiene mas elementos de los permitidos',
    uniqueItems: 'hay elementos repetidos',
    allOf: 'no cumple todas las ramas',
    anyOf: 'no cumple ninguna rama',
    oneOf: 'no cumple exactamente una rama',
  },

  failure: {
    'worker-crashed': 'El motor del documento fallo. Vuelve a abrir el archivo',
    'client-disposed': 'El documento se cerro mientras se trabajaba con el',
    'document-missing': 'No hay ningun documento cargado',
    'document-too-large': 'El documento es demasiado grande para volver al editor',
    'compare-missing': 'Falta el documento con el que comparar',
    'node-unknown': 'Nodo desconocido',
    'value-too-large': 'El valor supera el limite permitido para copiarlo',
    'toml-root': 'TOML exige un objeto en la raiz',
    'csv-root': 'CSV necesita un array de filas en la raiz',
    'circular-reference':
      'El documento tiene referencias circulares y JSON no puede representarlas',
    'query-empty': 'La consulta esta vacia',
    'query-root': 'La consulta debe empezar por $',
    'query-separator': 'Se esperaba . o [ en la posicion',
    'query-name-dot': 'Falta el nombre despues del punto',
    'query-name-descend': 'Falta el nombre despues de ..',
    'query-bracket': 'Falta el corchete de cierre',
    'query-index': 'Indice no valido',
    'query-bound': 'Limite no valido',
  },

  repair: 'Reparar',
  repairApplied: 'Correcciones aplicadas',
  repairKind: {
    trailingComma: 'comas finales',
    singleQuote: 'comillas simples',
    smartQuote: 'comillas tipograficas',
    unquotedKey: 'claves sin comillas',
    comment: 'comentarios',
    literal: 'literales no JSON',
  },

  clipboardBlocked: 'El navegador bloqueo el portapapeles',
  storageUnavailable:
    'El navegador no deja guardar documentos: las pestañas no sobreviviran a la recarga.',
  pathCopied: 'Ruta copiada al portapapeles',
  valueCopied: 'Valor copiado al portapapeles',
  conversionCopied: 'Conversion copiada al portapapeles',
  linkCopied: 'Enlace copiado. El fragmento nunca llega al servidor.',
  shareFailure: {
    empty: 'No hay nada que compartir',
    tooLarge: 'El documento es demasiado grande para caber en una URL',
  },
  language: 'ES',
  switchLanguage: 'Cambiar a ingles',
  themeName: { system: 'del sistema', light: 'claro', dark: 'oscuro' },
  switchTheme: (next) => `Cambiar al tema ${next}`,
  sharedName: 'compartido.json',
};

const EN: Messages = {
  locale: 'en',
  tagline: 'A local JSON workbench. Zero network.',
  oversize: (limit) =>
    `The editor and autosave switch off above ${limit}: holding that much text on the main thread would freeze the tab. Use the tree to navigate the document.`,

  documentActions: 'Document actions',
  format: 'Format',
  minify: 'Minify',
  sortKeys: 'Sort keys',
  shareLink: 'Share link',
  shareLinkHint: 'The link carries the document in the fragment, which never reaches a server',
  shortcut: (key) => `Ctrl/Cmd + Shift + ${key}`,

  dropFile: 'Drop a JSON file',
  dropHint: 'or click to pick one. Nothing leaves your machine.',
  openAnother: 'Open another document',
  dropCompare: 'Drop the document to compare against',
  dropSchema: 'Drop a JSON Schema to validate against',

  recentDocuments: 'Recent documents',
  forget: (name) => `Forget ${name}`,
  clearSaved: 'Clear saved',

  size: 'size',
  parse: 'parse',
  nodes: 'nodes',
  depth: 'depth',
  scan: 'scan',
  computeStats: 'Compute statistics',
  types: 'Types',
  kind: {
    object: 'objects',
    array: 'arrays',
    string: 'strings',
    number: 'numbers',
    boolean: 'booleans',
    null: 'nulls',
  },

  documentView: 'Document view',
  mode: {
    tree: 'Tree',
    query: 'Query',
    diff: 'Diff',
    convert: 'Convert',
    validate: 'Validate',
  },
  parsing: (name) => `Parsing ${name}...`,
  parseFailed: (name, error) => `Could not parse ${name}: ${error}`,

  searchPlaceholder: 'Search by key or value',
  searchLabel: 'Search the document',
  searching: (query) => `Searching ${query}...`,
  noMatchesFor: (query) => `No matches for ${query}`,
  matches: (count) => `${count} matches`,
  searchResults: 'Search results',
  copyPathTitle: 'Copy path',
  limitReached: 'limit reached',
  inTime: (time) => `in ${time}`,

  treeLabel: 'Document tree',
  expand: 'Expand',
  collapse: 'Collapse',
  showInEditor: 'Show in the editor',
  showInTree: 'Show in the tree',
  hiddenSiblings: (count) => `${count} more`,
  path: 'path',
  value: 'value',

  versus: (name) => `vs ${name}`,
  matchArraysBy: 'match arrays by',
  byIndex: 'index',
  exportDiff: 'Export',
  remove: 'Remove',
  comparing: 'Comparing...',
  documentsEqual: 'The two documents are identical.',
  changesLabel: 'Changes between documents',
  changeKind: { added: 'added', removed: 'removed', changed: 'changed' },

  converting: 'Converting...',
  copy: 'Copy',
  download: 'Download',
  howMany: 'how many',
  lossTitle: 'This conversion loses information',
  truncatedPreview: (chars) =>
    `Showing the first ${chars} characters. Copy gives you the whole text.`,
  loss: {
    tomlRootNotTable: 'TOML requires an object at the root',
    tomlNullDropped: 'TOML has no null: the key disappears',
    csvRootNotRowArray: 'CSV needs an array of rows at the root',
    csvRowNotObject: 'Every row must be an object',
    csvNestedValue: 'A nested value is stored as JSON text and comes back as a string',
    csvRaggedRows: 'Rows do not share keys: some cells will be empty',
    csvTypesLost: 'CSV is text: numbers and booleans come back as strings',
    schemaTruncated: 'The document is too deep or too varied: the schema is truncated',
  },

  queryPlaceholder: 'JSONPath query, for example $..price',
  queryLabel: 'JSONPath query',
  examples: 'examples',
  querying: 'Querying...',
  noMatches: 'No matches.',
  queryResults: 'Query results',

  against: (name) => `against ${name}`,
  validating: 'Validating...',
  documentValid: 'The document satisfies the schema.',
  violations: (count) => `${count} violations`,
  violationsLabel: 'Schema violations',
  rule: {
    schema: 'the schema must be an object',
    type: 'wrong type',
    enum: 'value is not one of the allowed ones',
    const: 'value does not match const',
    required: 'missing key',
    additionalProperties: 'key not allowed',
    minimum: 'below the minimum',
    maximum: 'above the maximum',
    exclusiveMinimum: 'does not exceed the exclusive minimum',
    exclusiveMaximum: 'does not fall below the exclusive maximum',
    multipleOf: 'not a multiple',
    minLength: 'shorter than the minimum',
    maxLength: 'longer than the maximum',
    pattern: 'does not match the pattern',
    minItems: 'fewer items than required',
    maxItems: 'more items than allowed',
    uniqueItems: 'contains repeated items',
    allOf: 'does not satisfy every branch',
    anyOf: 'does not satisfy any branch',
    oneOf: 'does not satisfy exactly one branch',
  },

  failure: {
    'worker-crashed': 'The document engine failed. Open the file again',
    'client-disposed': 'The document was closed while it was still working',
    'document-missing': 'No document is loaded',
    'document-too-large': 'The document is too large to bring back into the editor',
    'compare-missing': 'The document to compare against is missing',
    'node-unknown': 'Unknown node',
    'value-too-large': 'The value is past the limit allowed for copying',
    'toml-root': 'TOML requires an object at the root',
    'csv-root': 'CSV needs an array of rows at the root',
    'circular-reference': 'The document has circular references and JSON cannot represent them',
    'query-empty': 'The query is empty',
    'query-root': 'The query must start with $',
    'query-separator': 'Expected . or [ at position',
    'query-name-dot': 'A name is missing after the dot',
    'query-name-descend': 'A name is missing after ..',
    'query-bracket': 'The closing bracket is missing',
    'query-index': 'Invalid index',
    'query-bound': 'Invalid bound',
  },

  repair: 'Repair',
  repairApplied: 'Fixes applied',
  repairKind: {
    trailingComma: 'trailing commas',
    singleQuote: 'single quotes',
    smartQuote: 'smart quotes',
    unquotedKey: 'unquoted keys',
    comment: 'comments',
    literal: 'non-JSON literals',
  },

  clipboardBlocked: 'The browser blocked the clipboard',
  storageUnavailable: 'The browser refuses to store documents: tabs will not survive a reload.',
  pathCopied: 'Path copied to the clipboard',
  valueCopied: 'Value copied to the clipboard',
  conversionCopied: 'Conversion copied to the clipboard',
  linkCopied: 'Link copied. The fragment never reaches a server.',
  shareFailure: {
    empty: 'There is nothing to share',
    tooLarge: 'The document is too large to fit in a URL',
  },
  language: 'EN',
  switchLanguage: 'Switch to Spanish',
  themeName: { system: 'system', light: 'light', dark: 'dark' },
  switchTheme: (next) => `Switch to the ${next} theme`,
  sharedName: 'shared.json',
};

export const CATALOGUE: Record<Locale, Messages> = { es: ES, en: EN };

export function detectLocale(): Locale {
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export const MessagesContext = createContext<Messages>(ES);

export function useMessages(): Messages {
  return useContext(MessagesContext);
}
