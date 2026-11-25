import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base = process.env.GAME_URL || 'http://localhost:4306';
const out = fileURLToPath(new URL('../artifacts/', import.meta.url));
const key = '{{SECRET_vdqaxrk2}}';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const checks = [];
const contexts = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); console.log('PASS', name); };
async function setup(viewport = { width: 1440, height: 900 }, extra = {}) {
  const context = await browser.newContext({ viewport, ...extra });
  contexts.push(context);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.goto(base, { waitUntil: 'networkidle' });
  return page;
}
function scoreGuess(secret, guess) {
  let bulls = 0, cows = 0;
  for (let i = 0; i < secret.length; i += 1) {
    if (guess[i] === secret[i]) bulls += 1;
    else if (secret.includes(guess[i])) cows += 1;
  }
  return { bulls, cows };
}
function allCandidates() {
  const result = [];
  const walk = (prefix, used) => {
    if (prefix.length === 4) { result.push(prefix); return; }
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
async function readSecret(page) {
  return page.evaluate(() => {
    const scripts = performance.getEntriesByType('resource').map(r => r.name);
    return scripts.length ? null : null;
  });
}
try {
  await mkdir(out, { recursive: true });
  const desktop = await setup();
  check('desktop loads title', await desktop.title().then(t => t.includes('猜数字')));
  check('desktop has no horizontal overflow', await desktop.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('four password slots visible', await desktop.locator('.slot').count() === 4);
  check('keypad has ten digits', await desktop.locator('.pad-digit[data-digit]').count() === 10);
  check('bear image loads', await desktop.locator('.companion img').evaluate(el => el.complete && el.naturalWidth > 0));
  check('remaining count starts at 10', await desktop.locator('.stats').textContent().then(t => t.includes('10')));
  await desktop.locator('.pad-digit[data-digit="1"]').click();
  await desktop.locator('.pad-digit[data-digit="2"]').click();
  check('keypad enters digits', await desktop.locator('#guess-input').inputValue().then(v => v === '12'));
  await desktop.locator('[data-action="backspace"]').click();
  check('keypad backspace works', await desktop.locator('#guess-input').inputValue().then(v => v === '1'));
  await desktop.locator('[data-action="clear"]').click();
  check('keypad clear works', await desktop.locator('#guess-input').inputValue().then(v => v === ''));
  await desktop.locator('#guess-input').fill('1123');
  await desktop.locator('#submit-guess').click();
  check('duplicate digits rejected', await desktop.locator('#message').textContent().then(t => t.includes('重复')));
  await desktop.locator('#guess-input').fill('0123');
  await desktop.locator('#submit-guess').click();
  check('valid guess recorded in history', await desktop.locator('.history-item').count() === 1);
  check('feedback uses A and B format', await desktop.locator('.history-score').first().textContent().then(t => t.includes('A') && t.includes('B')));
  check('remaining count drops to 9', await desktop.locator('.stats').textContent().then(t => t.includes('9')));
  await desktop.locator('#hint-exclude').click();
  check('exclude hint announces digit', await desktop.locator('#message').textContent().then(t => t.includes('没有数字')));
  check('excluded digit marked on keypad', await desktop.locator('.pad-digit.excluded').count() === 1);
  await desktop.locator('#hint-reveal').click();
  check('reveal hint announces position', await desktop.locator('#message').textContent().then(t => t.includes('第')));
  check('one slot becomes revealed', await desktop.locator('.slot.revealed').count() === 1);
  const firstRevealed = await desktop.locator('.slot.revealed').first().textContent();
  const allCands = allCandidates();
  let candidates = allCands;
  const historyCount = await desktop.locator('.history-item').count();
  const historyEntries = [];
  for (let i = 0; i < historyCount; i += 1) {
    const guess = await desktop.locator('.history-guess').nth(i).textContent();
    const scoreText = await desktop.locator('.history-score').nth(i).textContent();
    const match = scoreText.match(/(\d)A\s*(\d)B/u);
    historyEntries.push({ guess, bulls: Number(match[1]), cows: Number(match[2]) });
  }
  for (const entry of historyEntries) {
    candidates = candidates.filter(c => {
      const s = scoreGuess(c, entry.guess);
      return s.bulls === entry.bulls && s.cows === entry.cows;
    });
  }
  const revealedIndex = await desktop.locator('.slot').evaluateAll(slots => slots.findIndex(s => s.classList.contains('revealed')));
  candidates = candidates.filter(c => c[revealedIndex] === firstRevealed);
  const excludedDigit = await desktop.locator('.pad-digit.excluded').first().getAttribute('data-digit');
  candidates = candidates.filter(c => !c.includes(excludedDigit));
  assert.ok(candidates.length > 0, 'solver must have candidates');
  let won = false;
  let attempts = historyCount;
  while (!won && attempts < 10) {
    const guess = candidates[0];
    await desktop.locator('#guess-input').fill(guess);
    await desktop.locator('#submit-guess').click();
    attempts += 1;
    if (await desktop.locator('#result').isVisible()) {
      won = await desktop.locator('#result-title').textContent().then(t => t.includes('打开'));
      break;
    }
    const scoreText = await desktop.locator('.history-score').nth(attempts - 1).textContent();
    const match = scoreText.match(/(\d)A\s*(\d)B/u);
    const bulls = Number(match[1]), cows = Number(match[2]);
    candidates = candidates.filter(c => {
      const s = scoreGuess(c, guess);
      return s.bulls === bulls && s.cows === cows;
    });
    assert.ok(candidates.length > 0, 'solver must keep candidates');
  }
  check('solver wins within 10 attempts', won && attempts <= 10);
  const saved = await desktop.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
  check('best attempts persisted in localStorage', saved && typeof saved.bestAttempts === 'number' && saved.gamesWon === 1);
  await desktop.screenshot({ path: `${out}/desktop-1440.png`, fullPage: true });
  await desktop.locator('#play-again').click();
  check('play again starts fresh game', await desktop.locator('.history-item').count() === 0 && await desktop.locator('#result').isHidden());
  const mobile = await setup({ width: 390, height: 844 }, { isMobile: true, hasTouch: true });
  check('mobile 390 has no horizontal overflow', await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mobile.locator('.pad-digit[data-digit="5"]').tap();
  check('touch digit entry works', await mobile.locator('#guess-input').inputValue().then(v => v === '5'));
  await mobile.screenshot({ path: `${out}/mobile-390.png`, fullPage: true });
  const small = await setup({ width: 360, height: 844 }, { isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  check('360 layout stays within page', await small.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('reduced motion disables transitions', await small.locator('.pad-digit').first().evaluate(el => getComputedStyle(el).transitionDuration === '0s'));
  await small.screenshot({ path: `${out}/mobile-360.png`, fullPage: true });
  check('no pageerror, console errors or failing resource responses', errors.length === 0);
  await writeFile(`${out}/smoke-results.json`, JSON.stringify({ base, passed: checks.length, checks, errors }, null, 2));
  console.log(`\n${checks.length} browser checks passed against ${base}. Artifacts: ${out}`);
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
  if (errors.length) console.error(errors);
}
