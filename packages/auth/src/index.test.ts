import { describe, expect, it } from 'vitest';
import { agentKeysMatch } from './index';

// Build a plausible 39-byte agent key (0x84 0x20 0x24 prefix + 32-byte key +
// 4-byte DHT location) and render it in both encodings agent keys actually
// travel in: uhCAk + base64url (Vault /status) and uhCAk + base58 (/auth/me).
function keyBytes(fill: number): Uint8Array {
  const b = new Uint8Array(39);
  b[0] = 0x84;
  b[1] = 0x20;
  b[2] = 0x24;
  for (let i = 3; i < 39; i++) b[i] = (fill + i) % 256;
  return b;
}

function base64urlForm(bytes: Uint8Array): string {
  const bin = String.fromCharCode(...bytes);
  return (
    'u' +
    btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  );
}

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Form(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) + BigInt(b);
  let out = '';
  while (n > 0n) {
    out = BASE58_ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b === 0) out = '1' + out;
    else break;
  }
  return 'u' + out;
}

describe('agentKeysMatch', () => {
  it('matches a key against itself in either encoding', () => {
    const k = keyBytes(7);
    expect(agentKeysMatch(base64urlForm(k), base64urlForm(k))).toBe(true);
    expect(agentKeysMatch(base58Form(k), base58Form(k))).toBe(true);
  });

  it('matches the SAME key across base64url and base58 - the false-mismatch this exists to prevent', () => {
    const k = keyBytes(7);
    expect(agentKeysMatch(base64urlForm(k), base58Form(k))).toBe(true);
    expect(agentKeysMatch(base58Form(k), base64urlForm(k))).toBe(true);
  });

  it('reports a definite mismatch for different keys, cross-encoding included', () => {
    const a = keyBytes(7);
    const b = keyBytes(99);
    expect(agentKeysMatch(base64urlForm(a), base64urlForm(b))).toBe(false);
    expect(agentKeysMatch(base64urlForm(a), base58Form(b))).toBe(false);
  });

  it('abstains (null) when either side cannot be decoded - refusal requires certainty', () => {
    const good = base64urlForm(keyBytes(7));
    expect(agentKeysMatch(good, 'not-a-key')).toBeNull();
    expect(agentKeysMatch('', good)).toBeNull();
    // Missing multibase prefix
    expect(agentKeysMatch(good.slice(1), good)).toBeNull();
    // Wrong prefix bytes (not an agent key)
    const notAgent = new Uint8Array(39).fill(1);
    expect(agentKeysMatch(base64urlForm(notAgent), good)).toBeNull();
    // Wrong length
    expect(agentKeysMatch('u' + 'AAAA', good)).toBeNull();
  });

  it('identical strings short-circuit to true even when undecodable', () => {
    expect(agentKeysMatch('uWEIRD', 'uWEIRD')).toBe(true);
  });
});
