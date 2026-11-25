import {
  CODE_LENGTH,
  generateSecret,
  hintExcludeDigit,
  hintRevealDigit,
  MAX_ATTEMPTS,
  scoreGuess,
  updateBest,
  validateGuess,
  type SaveData,
  type Score,
} from './game';
import { defaultSave, safeLoad, safePersist } from './storage';
import {
  banIcon,
  bearIcon,
  checkIcon,
  eyeIcon,
  hintIcon,
  keyboardIcon,
  lockIcon,
  shuffleIcon,
  targetIcon,
  trophyIcon,
} from './icons';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;

interface HistoryEntry {
  guess: string;
  score: Score;
}

interface GameState {
  secret: string;
  history: HistoryEntry[];
  over: boolean;
  won: boolean;
  hintsUsed: number;
  excludedDigits: Set<string>;
  revealedPositions: Map<number, string>;
  save: SaveData;
  message: string;
  messageKind: 'info' | 'error' | 'success';
}

let state: GameState;

function loadSave(): SaveData {
  try {
    return safeLoad(localStorage);
  } catch {
    return defaultSave();
  }
}

function persist(): void {
  try {
    safePersist(localStorage, state.save);
  } catch {
    // Storage failure should not interrupt play.
  }
}

function announce(text: string): void {
  const live = document.querySelector<HTMLElement>('#live');
  if (live) live.textContent = text;
}

function newGame(): void {
  state.secret = generateSecret();
  state.history = [];
  state.over = false;
  state.won = false;
  state.hintsUsed = 0;
  state.excludedDigits = new Set();
  state.revealedPositions = new Map();
  state.message = '输入 4 位不重复数字，按回车或点「猜」。';
  state.messageKind = 'info';
  render();
  document.querySelector<HTMLInputElement>('#guess-input')?.focus();
}

function attemptsLeft(): number {
  return MAX_ATTEMPTS - state.history.length;
}

function slotsMarkup(): string {
  const slots: string[] = [];
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    const revealed = state.revealedPositions.get(index);
    slots.push(
      `<span class="slot${revealed !== undefined ? ' revealed' : ''}" aria-label="第 ${index + 1} 位${revealed !== undefined ? `，已揭示为 ${revealed}` : '，未知'}">${revealed ?? '?'}</span>`,
    );
  }
  return `<div class="slots" role="group" aria-label="密码位">${slots.join('')}</div>`;
}

function keypadMarkup(): string {
  const rows = ['123456789', '0'];
  return rows
    .map(
      (row) =>
        `<div class="pad-row">${row
          .split('')
          .map(
            (digit) =>
              `<button type="button" class="pad-digit${state.excludedDigits.has(digit) ? ' excluded' : ''}" data-digit="${digit}" aria-label="数字 ${digit}${state.excludedDigits.has(digit) ? '，已排除' : ''}">${digit}</button>`,
          )
          .join('')}${row === '0' ? '<button type="button" class="pad-digit util" data-action="backspace" aria-label="退格">⌫</button><button type="button" class="pad-digit util" data-action="clear" aria-label="清空">清</button>' : ''}</div>`,
    )
    .join('');
}

function historyMarkup(): string {
  if (state.history.length === 0) {
    return '<p class="history-empty">还没有猜测记录，写下第一组数字试试。</p>';
  }
  return `<ol class="history" aria-label="猜测历史">${state.history
    .map((entry, index) => {
      const bulls = Array.from({ length: entry.score.bulls }, () => '<i class="bull"></i>').join('');
      const cows = Array.from({ length: entry.score.cows }, () => '<i class="cow"></i>').join('');
      return `<li class="history-item">
        <span class="history-index">${String(index + 1).padStart(2, '0')}</span>
        <span class="history-guess">${entry.guess}</span>
        <span class="history-score"><b>${entry.score.bulls}A</b><b>${entry.score.cows}B</b><span class="score-dots" aria-hidden="true">${bulls}${cows}</span></span>
      </li>`;
    })
    .join('')}</ol>`;
}

function statsMarkup(): string {
  const best = state.save.bestAttempts;
  return `
    <div class="stats">
      <div class="stat"><span class="stat-icon" aria-hidden="true">${targetIcon}</span><div><b>${attemptsLeft()}</b><span>剩余次数 / ${MAX_ATTEMPTS}</span></div></div>
      <div class="stat"><span class="stat-icon" aria-hidden="true">${trophyIcon}</span><div><b>${best === null ? '— —' : `${best} 次`}</b><span>最佳次数</span></div></div>
      <div class="stat"><span class="stat-icon" aria-hidden="true">${bearIcon}</span><div><b>${state.save.gamesWon}</b><span>累计猜中</span></div></div>
    </div>`;
}

function render(): void {
  app.innerHTML = `
    <a class="skip-link" href="#guess-input">跳到猜测输入</a>
    <header class="topbar">
      <div class="brand"><span class="brand-icon" aria-hidden="true">${bearIcon}</span><div><strong>猜数字</strong><span>小熊的密码箱</span></div></div>
      <div class="top-actions"><span class="locked-count" aria-hidden="true">${lockIcon}</span><span class="top-note">4 位密码 · 数字不重复</span></div>
    </header>
    <main class="layout">
      <section class="play" aria-labelledby="play-heading">
        <p class="eyebrow"><span aria-hidden="true">${lockIcon}</span> 10 次机会，几A几B 推理出密码</p>
        <h1 id="play-heading">密码箱里是哪四位？</h1>
        ${slotsMarkup()}
        ${statsMarkup()}
        <form class="guess-form" id="guess-form">
          <label class="guess-label" for="guess-input">输入你的猜测</label>
          <div class="guess-row">
            <input id="guess-input" name="guess" type="text" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="例如 1234" aria-label="猜测输入框，4 位不重复数字" ${state.over ? 'disabled' : ''} />
            <button type="submit" class="primary" id="submit-guess" ${state.over ? 'disabled' : ''}><span aria-hidden="true">${checkIcon}</span>猜</button>
          </div>
          <div class="keypad" role="group" aria-label="数字键盘">${keypadMarkup()}</div>
        </form>
        <p class="message ${state.messageKind}" id="message" role="status">${state.message}</p>
        <div class="actions">
          <button type="button" class="tool" id="hint-exclude" ${state.over ? 'disabled' : ''}><span aria-hidden="true">${banIcon}</span>排除一位</button>
          <button type="button" class="tool" id="hint-reveal" ${state.over ? 'disabled' : ''}><span aria-hidden="true">${eyeIcon}</span>揭示一位</button>
          <button type="button" class="tool" id="new-game"><span aria-hidden="true">${shuffleIcon}</span>新一局</button>
        </div>
        <div class="result" id="result" hidden>
          <div class="result-card">
            <span class="result-icon" aria-hidden="true">${state.won ? trophyIcon : lockIcon}</span>
            <h3 id="result-title"></h3>
            <p id="result-copy"></p>
            <button type="button" id="play-again">再来一局</button>
          </div>
        </div>
      </section>
      <aside class="side">
        <div class="panel history-panel">
          <div class="panel-head"><h2>猜测记录</h2><span class="panel-note">${state.history.length}/${MAX_ATTEMPTS}</span></div>
          ${historyMarkup()}
        </div>
        <div class="panel companion">
          <img src="./characters/classic.webp" alt="自嘲熊" width="110" height="110" />
          <div>
            <p class="companion-title">小熊推理小抄</p>
            <p class="companion-copy">先用 0123、4567 各探一次，把数字池收窄；A 是位置对，B 是有这个数字但位置不对。</p>
            <p class="kbd-note"><span aria-hidden="true">${keyboardIcon}</span> 全键盘可玩，回车提交</p>
          </div>
        </div>
      </aside>
    </main>
    <div class="live sr-only" id="live" aria-live="polite" aria-atomic="true"></div>`;
  bindEvents();
}

function setMessage(text: string, kind: 'info' | 'error' | 'success'): void {
  state.message = text;
  state.messageKind = kind;
  const el = document.querySelector<HTMLElement>('#message');
  if (el) {
    el.textContent = text;
    el.className = `message ${kind}`;
  }
  announce(text);
}

function insertDigit(digit: string): void {
  const input = document.querySelector<HTMLInputElement>('#guess-input');
  if (!input || input.disabled) return;
  if (input.value.length >= CODE_LENGTH) return;
  input.value += digit;
  input.focus();
}

function submitGuess(): void {
  if (state.over) return;
  const input = document.querySelector<HTMLInputElement>('#guess-input');
  if (!input) return;
  const validation = validateGuess(input.value);
  if (!validation.ok) {
    setMessage(validation.error ?? '输入有问题', 'error');
    return;
  }
  const guess = validation.normalized!;
  const score = scoreGuess(state.secret, guess);
  state.history.push({ guess, score });
  input.value = '';
  if (score.bulls === CODE_LENGTH) {
    state.over = true;
    state.won = true;
    state.save = updateBest(state.save, state.history.length);
    persist();
    render();
    showResult(true);
    return;
  }
  if (state.history.length >= MAX_ATTEMPTS) {
    state.over = true;
    state.won = false;
    render();
    showResult(false);
    return;
  }
  const used = state.history.length;
  setMessage(`${guess}：${score.bulls}A ${score.cows}B。还剩 ${MAX_ATTEMPTS - used} 次。`, 'info');
  refreshPanels();
  input.focus();
}

function showResult(won: boolean): void {
  const result = document.querySelector<HTMLElement>('#result');
  const title = document.querySelector<HTMLElement>('#result-title');
  const copy = document.querySelector<HTMLElement>('#result-copy');
  if (won) {
    const attempts = state.history.length;
    if (title) title.textContent = '密码箱打开了';
    if (copy) copy.textContent = `答案是 ${state.secret}，用了 ${attempts} 次。最佳纪录 ${state.save.bestAttempts} 次。`;
    setMessage(`猜中了！${attempts} 次解开密码。`, 'success');
  } else {
    if (title) title.textContent = '机会用完了';
    if (copy) copy.textContent = `答案是 ${state.secret}。新一局再来，推理会更顺。`;
    setMessage(`机会用完，答案是 ${state.secret}。`, 'error');
  }
  if (result) {
    result.hidden = false;
    result.querySelector<HTMLButtonElement>('#play-again')?.focus();
  }
}

function refreshPanels(): void {
  const stats = document.querySelector<HTMLElement>('.stats');
  if (stats) stats.outerHTML = statsMarkup();
  const panel = document.querySelector<HTMLElement>('.history-panel');
  if (panel) {
    panel.innerHTML = `<div class="panel-head"><h2>猜测记录</h2><span class="panel-note">${state.history.length}/${MAX_ATTEMPTS}</span></div>${historyMarkup()}`;
  }
  const keypad = document.querySelector<HTMLElement>('.keypad');
  if (keypad) {
    keypad.innerHTML = keypadMarkup();
    bindKeypad();
  }
  const slots = document.querySelector<HTMLElement>('.slots');
  if (slots) slots.outerHTML = slotsMarkup();
}

function hintExclude(): void {
  if (state.over) return;
  const hint = hintExcludeDigit(state.secret, state.excludedDigits);
  if (!hint) {
    setMessage('没有更多可以排除的数字了。', 'info');
    return;
  }
  state.excludedDigits.add(hint.digit!);
  state.hintsUsed += 1;
  setMessage(hint.message, 'info');
  refreshPanels();
}

function hintReveal(): void {
  if (state.over) return;
  const hint = hintRevealDigit(state.secret, new Set(state.revealedPositions.keys()));
  if (!hint) {
    setMessage('所有位置都已经揭示过了。', 'info');
    return;
  }
  state.revealedPositions.set(hint.position!, hint.digit!);
  state.hintsUsed += 1;
  setMessage(hint.message, 'info');
  refreshPanels();
}

function bindKeypad(): void {
  document.querySelectorAll<HTMLButtonElement>('.pad-digit').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.digit) {
        insertDigit(button.dataset.digit);
      } else if (button.dataset.action === 'backspace') {
        const input = document.querySelector<HTMLInputElement>('#guess-input');
        if (input && !input.disabled) {
          input.value = input.value.slice(0, -1);
          input.focus();
        }
      } else if (button.dataset.action === 'clear') {
        const input = document.querySelector<HTMLInputElement>('#guess-input');
        if (input && !input.disabled) {
          input.value = '';
          input.focus();
        }
      }
    });
  });
}

function bindEvents(): void {
  document.querySelector<HTMLFormElement>('#guess-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    submitGuess();
  });
  document.querySelector<HTMLButtonElement>('#hint-exclude')?.addEventListener('click', hintExclude);
  document.querySelector<HTMLButtonElement>('#hint-reveal')?.addEventListener('click', hintReveal);
  document.querySelector<HTMLButtonElement>('#new-game')?.addEventListener('click', newGame);
  document.querySelector<HTMLButtonElement>('#play-again')?.addEventListener('click', newGame);
  bindKeypad();
}

function boot(): void {
  state = {
    secret: generateSecret(),
    history: [],
    over: false,
    won: false,
    hintsUsed: 0,
    excludedDigits: new Set(),
    revealedPositions: new Map(),
    save: loadSave(),
    message: '输入 4 位不重复数字，按回车或点「猜」。',
    messageKind: 'info',
  };
  render();
  document.querySelector<HTMLInputElement>('#guess-input')?.focus();
}

boot();
