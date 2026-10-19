import { describe, expect, it, vi } from 'vitest';
import type { MatchState, MatchView, ServerMessage } from '../src/engine/index.ts';
import { localTransport } from '../src/web/transport.ts';

function stage(hp: number) {
  return (S: MatchState) => {
    S.turn = 0;
    S.awaitingClaim = false;
    S.p[0].gas = 2;
    S.p[0].maxGas = 2;
    S.p[0].hand = ['frontrunner'];
    S.p[0].board = [];
    S.p[1].hp = hp;
    S.p[1].armor = 0;
    S.p[1].board = [];
  };
}

function drive(hp: number) {
  const views: MatchView[] = [];
  const messages: ServerMessage[] = [];
  const t = localTransport('sovereign', 'salvage', {
    onView: v => views.push(v),
    onMessage: m => messages.push(m),
  }, undefined, false, stage(hp));
  t.send({ t: 'play', i: 0 });
  const uid = views.at(-1)!.you.board[0]!.uid;
  t.send({ t: 'attack', attacker: uid, target: { p: 1, kind: 'hero' } });
  return { views, messages, close: () => t.close() };
}

describe('solo transport', () => {
  it('revisits a beat already reached, and can come forward again', () => {
    vi.useFakeTimers();
    try {
      const views: MatchView[] = [];
      const t = localTransport('sovereign', 'salvage', {
        onView: v => views.push(v),
        onMessage: () => {},
      }, undefined, 'zeroconf');
      const last = () => views.at(-1)!;
      t.send({ t: 'claim', i: 0 });
      vi.advanceTimersByTime(1000);
      t.send({ t: 'play', i: 0 });
      vi.advanceTimersByTime(1000);
      expect(last().lesson).toBe('swing');
      t.seek!(0);
      expect(last().lesson).toBe('claim');
      expect(last().you.board).toHaveLength(0);
      expect(last().you.hand ?? []).not.toContain('frontrunner');
      t.seek!(2);
      expect(last().lesson).toBe('swing');
      expect(last().you.board[0]?.id).toBe('frontrunner');
      expect(last().you.board[0]?.canAttack).toBe(true);
      t.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it('publishes a hit that does not finish the match', () => {
    const { views, messages, close } = drive(10);
    close();
    expect(views.at(-1)!.them.hp).toBe(8);
    expect(views.at(-1)!.over).toBe(false);
    expect(messages.some(m => m.t === 'over')).toBe(false);
  });

  it('publishes the killing blow and ends the match', () => {
    const { views, messages, close } = drive(2);
    close();
    const last = views.at(-1)!;
    expect(last.them.hp).toBeLessThanOrEqual(0);
    expect(last.over).toBe(true);
    expect(last.winner).toBe(0);
    const done = messages.find(m => m.t === 'over');
    expect(done && done.t === 'over' && done.won).toBe(true);
  });
});
