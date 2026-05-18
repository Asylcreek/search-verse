import { getTestament } from './testament.helper';

describe('getTestament', () => {
  it('maps known OT book IDs to OT', () => {
    expect(getTestament('GEN')).toBe('OT');
    expect(getTestament('EXO')).toBe('OT');
    expect(getTestament('PSA')).toBe('OT');
    expect(getTestament('ISA')).toBe('OT');
    expect(getTestament('MAL')).toBe('OT');
  });

  it('maps known NT book IDs to NT', () => {
    expect(getTestament('MAT')).toBe('NT');
    expect(getTestament('MRK')).toBe('NT');
    expect(getTestament('JHN')).toBe('NT');
    expect(getTestament('ROM')).toBe('NT');
    expect(getTestament('REV')).toBe('NT');
  });

  it('throws for unknown book IDs', () => {
    expect(() => getTestament('TOB')).toThrow('Unsupported Bible book ID: TOB');
  });

  it('throws for deuterocanonical book IDs', () => {
    expect(() => getTestament('JDT')).toThrow('Unsupported Bible book ID: JDT');
    expect(() => getTestament('WIS')).toThrow('Unsupported Bible book ID: WIS');
  });
});
