import { describe, expect, it } from 'vitest';
import { parseHandoffFragment } from './handoff.js';

describe('parseHandoffFragment', () => {
  const v = 'A'.repeat(43);
  const s = 'B'.repeat(32);
  it('reads the verifier and state from the fragment', () => {
    expect(parseHandoffFragment(`#v=${v}&s=${s}`)).toEqual({ verifier: v, state: s });
    expect(parseHandoffFragment(`v=${v}&s=${s}`)).toEqual({ verifier: v, state: s });
    const key = 'uhCAk75qJ5oobyfm3Lh-akZIQSe2zpSTtG1Pcxs23qTFoQwY_GDWY';
    expect(parseHandoffFragment(`#v=${v}&s=${s}&a=${key}`)).toEqual({ verifier: v, state: s, agentPubKey: key });
    expect(parseHandoffFragment(`#v=${v}&s=${s}&a=notakey`)).toEqual({ verifier: v, state: s });
  });
  it('is null for anything else', () => {
    expect(parseHandoffFragment('')).toBeNull();
    expect(parseHandoffFragment('#section-2')).toBeNull();
    expect(parseHandoffFragment(`#v=${v}`)).toBeNull();
    expect(parseHandoffFragment(`#v=short&s=${s}`)).toBeNull();
    expect(parseHandoffFragment(`#v=${v}%20x&s=${s}`)).toBeNull();
  });
});
