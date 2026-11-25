import { describe, expect, it } from 'vitest';
import {
  allCandidates,
  CODE_LENGTH,
  defaultSave,
  filterCandidates,
  generateSecret,
  hintExcludeDigit,
  hintRevealDigit,
  MAX_ATTEMPTS,
  parseSave,
  scoreGuess,
  updateBest,
  validateGuess,
} from './game';

describe('密码生成', () => {
  it('生成 4 位不重复数字', () => {
    for (let round = 0; round < 50; round += 1) {
      const secret = generateSecret();
      expect(secret).toHaveLength(CODE_LENGTH);
      expect(new Set(secret).size).toBe(CODE_LENGTH);
      expect(/^\d{4}$/u.test(secret)).toBe(true);
    }
  });

  it('确定性随机源可复现', () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const first = generateSecret(random);
    seed = 42;
    const again = generateSecret(random);
    expect(first).toBe(again);
  });
});

describe('几A几B 判定', () => {
  it('全中 4A0B', () => {
    expect(scoreGuess('1234', '1234')).toEqual({ bulls: 4, cows: 0 });
  });

  it('位置不同计 B', () => {
    expect(scoreGuess('1234', '4321')).toEqual({ bulls: 0, cows: 4 });
    expect(scoreGuess('1234', '1243')).toEqual({ bulls: 2, cows: 2 });
  });

  it('部分命中混合', () => {
    expect(scoreGuess('1234', '1567')).toEqual({ bulls: 1, cows: 0 });
    expect(scoreGuess('1234', '5152')).toEqual({ bulls: 0, cows: 2 });
    expect(scoreGuess('1234', '5567')).toEqual({ bulls: 0, cows: 0 });
    expect(scoreGuess('9012', '0921')).toEqual({ bulls: 0, cows: 4 });
  });

  it('边界：完全不同的数字', () => {
    expect(scoreGuess('1234', '5678')).toEqual({ bulls: 0, cows: 0 });
  });
});

describe('输入校验', () => {
  it('合法输入通过', () => {
    const result = validateGuess('1234');
    expect(result.ok).toBe(true);
    expect(result.normalized).toBe('1234');
  });

  it('拒绝重复、缺位与非数字', () => {
    expect(validateGuess('1123').ok).toBe(false);
    expect(validateGuess('123').ok).toBe(false);
    expect(validateGuess('12345').ok).toBe(false);
    expect(validateGuess('12a4').ok).toBe(false);
    expect(validateGuess('').ok).toBe(false);
  });
});

describe('候选过滤', () => {
  it('全量候选共 5040 个', () => {
    expect(allCandidates()).toHaveLength(5040);
  });

  it('按反馈过滤后仍含真实密码', () => {
    const secret = '3098';
    const guess = '0123';
    const score = scoreGuess(secret, guess);
    const filtered = filterCandidates(allCandidates(), guess, score);
    expect(filtered).toContain(secret);
    expect(filtered.length).toBeLessThan(5040);
  });
});

describe('计分与提示', () => {
  it('最佳次数只降不升并累计胜场', () => {
    let save = defaultSave();
    save = updateBest(save, 6);
    expect(save.bestAttempts).toBe(6);
    expect(save.gamesWon).toBe(1);
    save = updateBest(save, 8);
    expect(save.bestAttempts).toBe(6);
    save = updateBest(save, 4);
    expect(save.bestAttempts).toBe(4);
    expect(save.gamesWon).toBe(3);
  });

  it('排除提示给出不在密码中的数字', () => {
    const hint = hintExcludeDigit('1234', new Set());
    expect(hint).not.toBeNull();
    expect('1234'.includes(hint!.digit!)).toBe(false);
    expect(hintExcludeDigit('1234', new Set('056789'))).toBeNull();
  });

  it('揭示提示给出正确位置的数字', () => {
    const hint = hintRevealDigit('1234', new Set());
    expect(hint).not.toBeNull();
    expect(hint!.digit).toBe('1');
    expect(hint!.position).toBe(0);
    expect(hintRevealDigit('1234', new Set([0, 1, 2, 3]))).toBeNull();
  });
});

describe('存档', () => {
  it('空与损坏存档安全回退', () => {
    expect(parseSave(null)).toEqual(defaultSave());
    expect(parseSave('{oops')).toEqual(defaultSave());
    expect(parseSave(JSON.stringify({ version: 5 }))).toEqual(defaultSave());
  });

  it('合法字段保留', () => {
    const raw = JSON.stringify({ version: 1, bestAttempts: 5, gamesWon: 12 });
    expect(parseSave(raw)).toEqual({ version: 1, bestAttempts: 5, gamesWon: 12 });
  });

  it('次数上限为 10', () => {
    expect(MAX_ATTEMPTS).toBe(10);
  });
});
