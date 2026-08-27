import { describe, expect, it } from 'vitest';
import { buildTrail } from './trail';
import type { TrailContext } from './trail';
import { NodeRegistry } from './node-registry';
import { summarize } from './summary';

const PAGE = 200;

function contextFor(root: unknown, registry: NodeRegistry, pageSize = PAGE): TrailContext {
  const rootId = registry.register({ value: root, parentId: null, key: null, index: null });
  return {
    rootId,
    pageSize,
    registerChild: (parentId, entry) =>
      summarize(
        entry,
        registry.register({ value: entry.value, parentId, key: entry.key, index: entry.index }),
      ),
  };
}

function trailOf(root: unknown, path: string, pageSize = PAGE) {
  const registry = new NodeRegistry();
  return buildTrail(root, path, contextFor(root, registry, pageSize));
}

const DOC = {
  meta: { version: 3 },
  departments: [
    { name: 'sales', people: [{ id: 1 }, { id: 2 }] },
    { name: 'eng', people: [{ id: 3, 'full name': 'Ada' }] },
  ],
};

describe('buildTrail', () => {
  it('la raiz sola no necesita pasos', () => {
    expect(trailOf(DOC, '$')).toEqual([]);
  });

  it('un camino corto devuelve un paso por nivel', () => {
    const trail = trailOf(DOC, '$.meta.version');
    expect(trail).toHaveLength(2);
    expect(trail?.[0]?.offset).toBe(0);
  });

  it('cada paso trae la pagina entera de ese nivel', () => {
    const trail = trailOf(DOC, '$.departments[1].name');
    expect(trail?.[0]?.children.map((c) => c.key)).toEqual(['meta', 'departments']);
    expect(trail?.[1]?.children).toHaveLength(2);
  });

  it('los padres encadenan: el hijo elegido es el padre del paso siguiente', () => {
    const trail = trailOf(DOC, '$.departments[0].people[1].id');
    for (let at = 1; at < (trail?.length ?? 0); at += 1) {
      const parent = trail?.[at]?.parentId;
      const previous = trail?.[at - 1]?.children.map((c) => c.id) ?? [];
      expect(previous).toContain(parent);
    }
  });

  it('una clave rara con corchete se recorre igual', () => {
    const doc = { a: { 'weird]key': { deep: 1 } } };
    const trail = trailOf(doc, '$.a["weird]key"].deep');
    expect(trail).toHaveLength(3);
  });
});

describe('buildTrail: paginacion', () => {
  const wide = { records: Array.from({ length: 40_000 }, (_, at) => ({ id: at })) };

  it('salta a la pagina que contiene el indice pedido', () => {
    const trail = trailOf(wide, '$.records[39999].id', PAGE);
    expect(trail?.[1]?.offset).toBe(39_800);
    expect(trail?.[1]?.children).toHaveLength(PAGE);
    expect(trail?.[1]?.children.at(-1)?.index).toBe(39_999);
  });

  it('el primer elemento sigue cayendo en la pagina cero', () => {
    expect(trailOf(wide, '$.records[0].id', PAGE)?.[1]?.offset).toBe(0);
  });

  it('el limite exacto de pagina cae en la siguiente', () => {
    expect(trailOf(wide, '$.records[200].id', PAGE)?.[1]?.offset).toBe(200);
    expect(trailOf(wide, '$.records[199].id', PAGE)?.[1]?.offset).toBe(0);
  });

  it('una clave lejana de un objeto ancho tambien salta de pagina', () => {
    const record: Record<string, number> = {};
    for (let at = 0; at < 1000; at += 1) record[`k${at.toString()}`] = at;
    const trail = trailOf({ record }, '$.record.k950', PAGE);
    expect(trail?.[1]?.offset).toBe(800);
    expect(trail?.[1]?.children.some((c) => c.key === 'k950')).toBe(true);
  });
});

describe('buildTrail: lo que rechaza', () => {
  it('una ruta que no se puede descomponer', () => {
    expect(trailOf(DOC, 'departments')).toBeNull();
    expect(trailOf(DOC, '$.users[id=2]')).toBeNull();
  });

  it('una clave que no existe', () => {
    expect(trailOf(DOC, '$.meta.ausente')).toBeNull();
  });

  it('un indice fuera del array', () => {
    expect(trailOf(DOC, '$.departments[9].name')).toBeNull();
  });

  it('bajar por dentro de un escalar', () => {
    expect(trailOf(DOC, '$.meta.version.mas')).toBeNull();
  });

  it('no desborda la pila con un documento muy anidado', () => {
    let deep: unknown = { fin: 1 };
    const parts: string[] = [];
    for (let level = 0; level < 5000; level += 1) {
      deep = { next: deep };
      parts.push('.next');
    }
    const trail = trailOf(deep, `$${parts.join('')}.fin`);
    expect(trail).toHaveLength(5001);
  });
});

describe('buildTrail: el objetivo', () => {
  it('el ultimo paso nombra el nodo buscado', () => {
    const trail = trailOf(DOC, '$.departments[1].name');
    const last = trail?.at(-1);
    expect(last?.children.some((child) => child.id === last.targetId)).toBe(true);
    expect(last?.children.find((child) => child.id === last.targetId)?.key).toBe('name');
  });

  it('el objetivo de un paso es el padre del siguiente', () => {
    const trail = trailOf(DOC, '$.departments[0].people[1].id') ?? [];
    for (let at = 1; at < trail.length; at += 1) {
      expect(trail[at]?.parentId).toBe(trail[at - 1]?.targetId);
    }
  });

  it('el objetivo lejano cae dentro de la pagina que trae su paso', () => {
    const wide = { records: Array.from({ length: 40_000 }, (_, at) => ({ id: at })) };
    const last = trailOf(wide, '$.records[39999].id', PAGE)?.at(-1);
    expect(last?.children.some((child) => child.id === last.targetId)).toBe(true);
  });
});

describe('buildTrail: rutas emparejadas por clave del diff', () => {
  const doc = {
    users: [
      { id: 7, name: 'Ada' },
      { id: 42, name: 'Grace' },
      { name: 'sin id' },
    ],
  };

  it('resuelve el token al indice real del elemento', () => {
    const trail = trailOf(doc, '$.users[id=42].name');
    const last = trail?.at(-1);
    expect(last?.children.find((child) => child.id === last.targetId)?.key).toBe('name');
  });

  it('el elemento emparejado no tiene por que ser el primero', () => {
    const trail = trailOf(doc, '$.users[id=42]');
    const last = trail?.at(-1);
    expect(last?.children.find((child) => child.id === last.targetId)?.index).toBe(1);
  });

  it('el respaldo por indice del diff tambien resuelve', () => {
    const trail = trailOf(doc, '$.users[id=#2].name');
    const last = trail?.at(-1);
    expect(last?.children.find((child) => child.id === last.targetId)?.key).toBe('name');
  });

  it('una identidad que no existe no inventa un nodo', () => {
    expect(trailOf(doc, '$.users[id=999]')).toBeNull();
  });

  it('emparejar contra algo que no es un array no resuelve', () => {
    expect(trailOf({ users: { id: 7 } }, '$.users[id=7]')).toBeNull();
  });

  it('el token resuelto respeta la paginacion', () => {
    const wide = { rows: Array.from({ length: 40_000 }, (_, at) => ({ ref: `r${at.toString()}` })) };
    const trail = trailOf(wide, '$.rows[ref=r39999]', PAGE);
    expect(trail?.[1]?.offset).toBe(39_800);
  });
});
