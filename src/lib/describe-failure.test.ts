import { describe, expect, it } from 'vitest';
import { CATALOGUE } from './i18n';
import { describeFailure } from './describe-failure';
import { DocumentFailure, readFailure } from '../core/failure';

describe('describeFailure', () => {
  it('traduce un codigo conocido a la lengua activa', () => {
    expect(describeFailure(CATALOGUE.es, 'query-empty')).toBe('La consulta esta vacia');
    expect(describeFailure(CATALOGUE.en, 'query-empty')).toBe('The query is empty');
  });

  it('anade el detalle detras del mensaje', () => {
    expect(describeFailure(CATALOGUE.en, 'query-index:abc')).toBe('Invalid index: abc');
    expect(describeFailure(CATALOGUE.es, 'node-unknown:42')).toBe('Nodo desconocido: 42');
  });

  it('deja pasar intacto lo que no es un codigo', () => {
    const raw = 'Unexpected token } in JSON at position 12';
    expect(describeFailure(CATALOGUE.en, raw)).toBe(raw);
  });

  it('un detalle con dos puntos conserva el resto', () => {
    expect(describeFailure(CATALOGUE.en, 'query-bound:1:2')).toBe('Invalid bound: 1:2');
  });

  it('el mensaje que cruza el worker es el codigo mas el detalle', () => {
    expect(new DocumentFailure('query-index', 'abc').message).toBe('query-index:abc');
    expect(new DocumentFailure('query-empty').message).toBe('query-empty');
  });

  it('readFailure rechaza codigos inventados', () => {
    expect(readFailure('no-existe')).toBeNull();
    expect(readFailure('no-existe:detalle')).toBeNull();
  });

  it('la causa original sobrevive al fallo', () => {
    const cause = new RangeError('boom');
    expect(new DocumentFailure('circular-reference', '', { cause }).cause).toBe(cause);
  });
});
