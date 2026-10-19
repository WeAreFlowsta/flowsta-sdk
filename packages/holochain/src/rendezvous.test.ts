import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  keepRegistered,
  notesToFeed,
  notesToRegister,
  parseRendezvousNote,
  rendezvousIdCore,
  type AdminWebsocketForRendezvous,
  type RendezvousNote,
} from './index';

const NOW_US = 2_000_000_000_000_000;
const ageS = (s: number) => NOW_US - s * 1_000_000;

function note(space: string, agent: string, createdAt: number, tombstone = false): RendezvousNote {
  const inner = JSON.stringify({ agent, space, createdAt: String(createdAt), expiresAt: String(createdAt + 1_200_000_000), isTombstone: tombstone, url: 'http://relay/node', storageArc: null });
  const raw = JSON.stringify({ agentInfo: inner, signature: 'c2ln' });
  const parsed = parseRendezvousNote(raw);
  if (!parsed) throw new Error('a note we made parses');
  return parsed;
}

function holoHash(fill: number): Uint8Array {
  const h = new Uint8Array(39);
  h.set([0x84, 0x20, 0x24]);
  h.fill(fill, 3, 35);
  return h;
}

afterEach(() => vi.unstubAllGlobals());

describe('parseRendezvousNote', () => {
  it('reads the server form (createdAt as a string) and the numeric form', () => {
    const n = note('sp', 'ag', 123);
    expect([n.space, n.agent, n.createdAt, n.tombstone]).toEqual(['sp', 'ag', 123, false]);
    const numeric = JSON.stringify({ agentInfo: JSON.stringify({ agent: 'a', space: 's', createdAt: 5, isTombstone: true }), signature: 'x' });
    expect(parseRendezvousNote(numeric)).toMatchObject({ agent: 'a', space: 's', createdAt: 5, tombstone: true });
    expect(parseRendezvousNote('not json')).toBeNull();
    expect(parseRendezvousNote(JSON.stringify({ agentInfo: '{}', signature: 'x' }))).toBeNull();
  });
});

describe('rendezvousIdCore', () => {
  it('names the 32-byte core of a 39-byte holo hash, anything else as is', () => {
    expect(rendezvousIdCore(holoHash(7))).toBe(rendezvousIdCore(new Uint8Array(32).fill(7)));
    expect(rendezvousIdCore(holoHash(7))).not.toBe(rendezvousIdCore(holoHash(8)));
    expect(rendezvousIdCore(new Uint8Array([1, 2, 3]))).toBe('AQID');
  });
});

describe('notesToRegister', () => {
  it('keeps only what is fresh, unsent and missing from or stale on the server', () => {
    const own = [
      note('sp', 'too_new', ageS(10)),
      note('sp', 'due', ageS(60)),
      note('sp', 'listed_newer', ageS(60)),
      note('sp', 'listed_older', ageS(60)),
      note('sp', 'too_old', ageS(200)),
      note('sp', 'gone', ageS(60), true),
    ];
    const listed = [note('sp', 'listed_newer', ageS(30)), note('sp', 'listed_older', ageS(900))];
    expect(notesToRegister(own, listed, NOW_US).map((n) => n.agent)).toEqual(['due', 'listed_older']);
  });
});

describe('notesToFeed', () => {
  it('hands over other devices\' notes the conductor lacks or holds old, newest per agent', () => {
    const listed = [
      note('sp', 'me', 100),
      note('sp', 'unknown', 100),
      note('sp', 'unknown', 300),
      note('sp', 'known_same', 100),
      note('sp', 'known_newer_here', 100),
      note('sp', 'known_older_here', 100),
    ];
    const known = [note('sp', 'known_same', 100), note('sp', 'known_newer_here', 150), note('sp', 'known_older_here', 50)];
    const fed = notesToFeed(listed, new Set(['me']), known);
    expect(fed.map((n) => [n.agent, n.createdAt])).toEqual([['unknown', 300], ['known_older_here', 100]]);
  });
});

describe('keepRegistered', () => {
  const dna = holoHash(1);
  const keyA = holoHash(2);
  const keyB = holoHash(3);
  const space = rendezvousIdCore(dna);
  const agentA = rendezvousIdCore(keyA);
  const agentB = rendezvousIdCore(keyB);
  const peer = note(space, rendezvousIdCore(holoHash(9)), ageS(100));

  function admin(ownNotes: RendezvousNote[], knownNotes: RendezvousNote[] = []) {
    const added: string[][] = [];
    const ws: AdminWebsocketForRendezvous = {
      async listApps() {
        return [{ cell_info: { role: [{ type: 'provisioned', value: { cell_id: [dna, keyA] } }, { type: 'provisioned', value: { cell_id: [dna, keyB] } }] } }];
      },
      async agentInfo() {
        return [...ownNotes, ...knownNotes].map((n) => n.raw);
      },
      async addAgentInfo({ agent_infos }) {
        added.push(agent_infos);
      },
    };
    return { ws, added };
  }

  it('registers the stranded conductor\'s fresh notes, signing in first, and feeds listed peers in', async () => {
    const own = [note(space, agentA, ageS(60)), note(space, agentB, ageS(60))];
    const { ws, added } = admin(own);
    const calls: Array<{ url: string; method?: string; auth?: string; body?: unknown }> = [];
    const serverHas = new Map<string, RendezvousNote>([[peer.agent, peer]]);
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calls.push({ url: u, method: init?.method, auth: headers.Authorization, body: init?.body });
      if (u.endsWith('/authenticate')) return new Response(JSON.stringify({ authToken: 'tok-1' }), { status: 200 });
      if (!headers.Authorization) return new Response('Unauthorized', { status: 401 });
      if (init?.method === 'GET') return new Response(JSON.stringify([...serverHas.values()].map((n) => JSON.parse(n.raw))), { status: 200 });
      if (init?.method === 'PUT') {
        const parsed = parseRendezvousNote(String(init.body));
        if (parsed) serverHas.set(parsed.agent, parsed);
        return new Response('', { status: 200 });
      }
      return new Response('', { status: 404 });
    });
    const lines: string[] = [];
    const keeper = keepRegistered({
      adminWebsocket: ws,
      servers: [{ url: 'https://boot.example/', authMaterialBase64: btoa('material') }],
      intervalMs: 0,
      fetch: fetchMock as unknown as typeof fetch,
      nowUs: () => NOW_US,
      log: (l) => lines.push(l),
    });

    const first = await keeper.runOnce();
    expect(first).toEqual({ registered: 2, registeredBlind: 0, fed: 1, reached: 1, conductorRegistered: 0 });
    const auth = calls.find((c) => c.url.endsWith('/authenticate'));
    expect(auth?.method).toBe('PUT');
    expect(new TextDecoder().decode(auth?.body as Uint8Array)).toBe('material');
    const puts = calls.filter((c) => c.method === 'PUT' && !c.url.endsWith('/authenticate'));
    expect(puts.map((c) => c.url).sort()).toEqual([`https://boot.example/bootstrap/${space}/${agentA}`, `https://boot.example/bootstrap/${space}/${agentB}`].sort());
    expect(puts.every((c) => c.auth === 'Bearer tok-1' && c.body === own.find((n) => c.url.endsWith(n.agent))?.raw)).toBe(true);
    expect(added).toEqual([[peer.raw]]);
    expect(lines[0]).toMatch(/registered 2 agent note\(s\) on https:\/\/boot.example ourselves/);
    expect(lines[1]).toMatch(/handed the conductor 1 note/);

    // Listed now, and the peer is known: a quiet round.
    const { ws: ws2 } = admin(own, [peer]);
    const quiet = keepRegistered({ adminWebsocket: ws2, servers: [{ url: 'https://boot.example', authMaterialBase64: btoa('material') }], intervalMs: 0, fetch: fetchMock as unknown as typeof fetch, nowUs: () => NOW_US });
    expect(await quiet.runOnce()).toEqual({ registered: 0, registeredBlind: 0, fed: 0, reached: 1, conductorRegistered: 2 });
    keeper.stop();
  });

  it('says once when no server answers, and once when one is back', async () => {
    const { ws } = admin([note(space, agentA, ageS(60))]);
    let dark = true;
    const fetchMock = vi.fn(async () => {
      if (dark) throw new TypeError('fetch failed');
      return new Response('[]', { status: 200 });
    });
    const lines: string[] = [];
    const keeper = keepRegistered({ adminWebsocket: ws, servers: [{ url: 'https://open.example' }], intervalMs: 0, fetch: fetchMock as unknown as typeof fetch, nowUs: () => NOW_US, log: (l) => lines.push(l) });
    expect((await keeper.runOnce()).reached).toBe(0);
    expect((await keeper.runOnce()).reached).toBe(0);
    expect(lines).toEqual(['[rendezvous] no rendezvous answered (1 tried) - the other devices cannot find this one until one does']);
    dark = false;
    const back = await keeper.runOnce();
    expect(back.reached).toBe(1);
    expect(back.registered).toBe(1);
    expect(lines[1]).toBe('[rendezvous] a rendezvous answers again');
  });

  it('registers each note once, and treats a full listing as no sign of a stall', async () => {
    const own = [note(space, agentA, ageS(60))];
    const { ws } = admin(own);
    let puts = 0;
    const lines: string[] = [];
    // A server that never lists us (as a crowded network would after evicting our note), 32 others listed.
    const crowd = Array.from({ length: 32 }, (_, i) => JSON.parse(note(space, rendezvousIdCore(holoHash(100 + i)), ageS(100)).raw));
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (init?.method === 'PUT') { puts++; return new Response('', { status: 200 }); }
      return new Response(JSON.stringify(crowd), { status: 200 });
    });
    const keeper = keepRegistered({ adminWebsocket: ws, servers: [{ url: 'https://open.example' }], intervalMs: 0, fetch: fetchMock as unknown as typeof fetch, nowUs: () => NOW_US, log: (l) => lines.push(l) });
    const first = await keeper.runOnce();
    expect(first.registeredBlind).toBe(1);
    expect(first.registered).toBe(0);
    expect(puts).toBe(1);
    await keeper.runOnce();
    await keeper.runOnce();
    expect(puts).toBe(1);
    expect(lines.some((l) => /ourselves/.test(l))).toBe(false);
  });

  it('does nothing without a timer and stops cleanly', () => {
    const { ws } = admin([]);
    const keeper = keepRegistered({ adminWebsocket: ws, servers: [], intervalMs: 0 });
    keeper.stop();
    const timed = keepRegistered({ adminWebsocket: ws, servers: [], firstDelayMs: 60_000 });
    timed.stop();
  });
});
