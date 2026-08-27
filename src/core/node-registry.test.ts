import { describe, expect, it } from 'vitest';
import { NodeRegistry } from './node-registry';

function rootOf(registry: NodeRegistry, value: unknown): number {
  return registry.register({ value, parentId: null, key: null, index: null });
}

describe('NodeRegistry: ids estables', () => {
  it('el mismo hijo pedido dos veces conserva su id', () => {
    const registry = new NodeRegistry();
    const root = rootOf(registry, { a: 1 });

    const first = registry.register({ value: 1, parentId: root, key: 'a', index: null });
    const second = registry.register({ value: 1, parentId: root, key: 'a', index: null });

    expect(second).toBe(first);
  });

  it('el mismo indice pedido dos veces conserva su id', () => {
    const registry = new NodeRegistry();
    const root = rootOf(registry, [10, 20]);

    const first = registry.register({ value: 20, parentId: root, key: null, index: 1 });
    const second = registry.register({ value: 20, parentId: root, key: null, index: 1 });

    expect(second).toBe(first);
  });

  it('hermanos distintos reciben ids distintos', () => {
    const registry = new NodeRegistry();
    const root = rootOf(registry, { a: 1, b: 2 });

    const a = registry.register({ value: 1, parentId: root, key: 'a', index: null });
    const b = registry.register({ value: 2, parentId: root, key: 'b', index: null });

    expect(a).not.toBe(b);
  });

  it('la misma clave bajo padres distintos no se confunde', () => {
    const registry = new NodeRegistry();
    const root = rootOf(registry, {});
    const left = registry.register({ value: {}, parentId: root, key: 'left', index: null });
    const right = registry.register({ value: {}, parentId: root, key: 'right', index: null });

    const underLeft = registry.register({ value: 1, parentId: left, key: 'id', index: null });
    const underRight = registry.register({ value: 2, parentId: right, key: 'id', index: null });

    expect(underLeft).not.toBe(underRight);
  });

  it('una clave y un indice que se escriben igual no colisionan', () => {
    const registry = new NodeRegistry();
    const root = rootOf(registry, {});

    const asKey = registry.register({ value: 'k', parentId: root, key: '0', index: null });
    const asIndex = registry.register({ value: 'i', parentId: root, key: null, index: 0 });

    expect(asKey).not.toBe(asIndex);
    expect(registry.read(asKey)).toBe('k');
    expect(registry.read(asIndex)).toBe('i');
  });

  it('cada raiz nueva recibe su propio id', () => {
    const registry = new NodeRegistry();
    expect(rootOf(registry, { a: 1 })).not.toBe(rootOf(registry, { b: 2 }));
  });

  it('reutilizar ids evita que el registro crezca al repetir paginas', () => {
    const registry = new NodeRegistry();
    const root = rootOf(registry, { a: 1 });
    const ids = new Set<number>();

    for (let round = 0; round < 500; round += 1) {
      ids.add(registry.register({ value: 1, parentId: root, key: 'a', index: null }));
    }

    expect(ids.size).toBe(1);
  });

  it('clear olvida tambien el indice de ranuras', () => {
    const registry = new NodeRegistry();
    const root = rootOf(registry, { a: 1 });
    const before = registry.register({ value: 1, parentId: root, key: 'a', index: null });

    registry.clear();
    const freshRoot = rootOf(registry, { a: 2 });
    const after = registry.register({ value: 2, parentId: freshRoot, key: 'a', index: null });

    expect(after).toBe(before);
    expect(registry.read(after)).toBe(2);
  });

  it('la ruta sigue saliendo bien con ids reutilizados', () => {
    const registry = new NodeRegistry();
    const root = rootOf(registry, {});
    const users = registry.register({ value: [], parentId: root, key: 'users', index: null });
    const first = registry.register({ value: {}, parentId: users, key: null, index: 0 });
    registry.register({ value: {}, parentId: users, key: null, index: 0 });

    expect(registry.pathOf(first)).toBe('$.users[0]');
  });
});
