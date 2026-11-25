export const CODE_LENGTH = 4;
export const MAX_ATTEMPTS = 10;
export const STORAGE_KEY = '{{SECRET_vdqaxrk2}}';

export interface Score {
  bulls: number;
  cows: number;
}

export interface SaveData {
  version: 1;
  bestAttempts: number | null;
  gamesWon: number;
}

export function defaultSave(): SaveData {
  return { version: 1, bestAttempts: null, gamesWon: 0 };
}

export function parseSave(raw: string | null): SaveData {
  if (!raw) return defaultSave();
  try {
    const data = JSON.parse(raw) as Partial<SaveData> | null;
    if (!data || data.version !== 1 || typeof data !== 'object') return defaultSave();
    const bestAttempts =
      typeof data.bestAttempts === 'number' && Number.isFinite(data.bestAttempts) && data.bestAttempts >= 1
        ? Math.floor(data.bestAttempts)
        : null;
    const gamesWon =
      typeof data.gamesWon === 'number' && Number.isFinite(data.gamesWon) && data.gamesWon >= 0
        ? Math.floor(data.gamesWon)
        : 0;
    return { version: 1, bestAttempts, gamesWon };
  } catch {
    return defaultSave();
  }
}

export function generateSecret(random: () => number = Math.random): string {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const picked: string[] = [];
  while (picked.length < CODE_LENGTH) {
    const index = Math.floor(random() * digits.length);
    picked.push(digits.splice(index, 1)[0]);
  }
  return picked.join('');
}

export function scoreGuess(secret: string, guess: string): Score {
  let bulls = 0;
  let cows = 0;
  for (let index = 0; index < secret.length; index += 1) {
    if (guess[index] === secret[index]) {
      bulls += 1;
    } else if (secret.includes(guess[index])) {
      cows += 1;
    }
  }
  return { bulls, cows };
}

export interface GuessValidation {
  ok: boolean;
  error?: string;
  normalized?: string;
}

export function validateGuess(input: string): GuessValidation {
  const text = input.replace(/\s+/gu, '');
  if (!text) return { ok: false, error: '先输入 4 位数字' };
  if (!/^\d+$/u.test(text)) return { ok: false, error: '只能输入数字' };
  if (text.length !== CODE_LENGTH) return { ok: false, error: `需要正好 ${CODE_LENGTH} 位` };
  if (new Set(text).size !== CODE_LENGTH) return { ok: false, error: '4 位数字不能重复' };
  return { ok: true, normalized: text };
}

export function allCandidates(): string[] {
  const result: string[] = [];
  const walk = (prefix: string, used: Set<string>): void => {
    if (prefix.length === CODE_LENGTH) {
      result.push(prefix);
      return;
    }
    for (const digit of '0123456789') {
      if (!used.has(digit)) {
        used.add(digit);
        walk(prefix + digit, used);
        used.delete(digit);
      }
    }
  };
  walk('', new Set());
  return result;
}

export function filterCandidates(candidates: readonly string[], guess: string, score: Score): string[] {
  return candidates.filter((candidate) => {
    const actual = scoreGuess(candidate, guess);
    return actual.bulls === score.bulls && actual.cows === score.cows;
  });
}

export function updateBest(save: SaveData, attempts: number): SaveData {
  const value = Math.max(1, Math.floor(attempts));
  const bestAttempts = save.bestAttempts === null ? value : Math.min(save.bestAttempts, value);
  return { ...save, bestAttempts, gamesWon: save.gamesWon + 1 };
}

export interface HintResult {
  kind: 'exclude' | 'reveal';
  digit?: string;
  position?: number;
  message: string;
}

export function hintExcludeDigit(secret: string, asked: ReadonlySet<string>): HintResult | null {
  const absent = '0123456789'.split('').filter((digit) => !secret.includes(digit) && !asked.has(digit));
  if (absent.length === 0) return null;
  const digit = absent[0];
  return {
    kind: 'exclude',
    digit,
    message: `密码里没有数字 ${digit}，可以放心排除。`,
  };
}

export function hintRevealDigit(secret: string, askedPositions: ReadonlySet<number>): HintResult | null {
  const hidden: number[] = [];
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    if (!askedPositions.has(index)) hidden.push(index);
  }
  if (hidden.length === 0) return null;
  const position = hidden[0];
  return {
    kind: 'reveal',
    position,
    digit: secret[position],
    message: `第 ${position + 1} 位是 ${secret[position]}。`,
  };
}
