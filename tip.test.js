'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { divRoundHalfUp, run } = require('./tip.js');

const TIP_JS = path.join(__dirname, 'tip.js');

function cli(...args) {
  const r = spawnSync(process.execPath, [TIP_JS, ...args], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// AC-001-1: node tip.js 100 15 -> '팁: 15.00', '합계: 115.00', exit 0
test('AC-001-1: 100 15 prints tip and total and exits 0', () => {
  const r = cli('100', '15');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '팁: 15.00\n합계: 115.00\n');
  assert.equal(r.stderr, '');
});

// AC-001-2: node tip.js 0.10 25 -> half-up rounding: tip 0.025 -> 0.03, total 0.13
test('AC-001-2: 0.10 25 rounds half-up to 0.03 / 0.13', () => {
  const r = cli('0.10', '25');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '팁: 0.03\n합계: 0.13\n');
});

test('AC-001-2: exact tie rounds up (not banker\'s rounding)', () => {
  // 0.025 -> 0.03 (half-up), 0.035 -> 0.04, 0.045 -> 0.05
  assert.deepEqual(run(['0.10', '25']).lines, ['팁: 0.03', '합계: 0.13']);
  assert.deepEqual(run(['0.10', '35']).lines, ['팁: 0.04', '합계: 0.14']);
  assert.deepEqual(run(['0.10', '45']).lines, ['팁: 0.05', '합계: 0.15']);
});

test('AC-001-2: floating-point-sensitive inputs are exact', () => {
  // 1.15 * 0.1 is 0.115 -> 0.12 half-up; float math would give 0.11 or 0.12 unpredictably
  assert.deepEqual(run(['1.15', '10']).lines, ['팁: 0.12', '합계: 1.27']);
  // 0.07 * 100 = 7.000000000000001 in float; must still be 7.00
  assert.deepEqual(run(['0.07', '100']).lines, ['팁: 0.07', '합계: 0.14']);
});

test('half-up helper: rounds .5 up and leaves below-.5 down', () => {
  assert.equal(divRoundHalfUp(5n, 1), 1n); // 0.5 -> 1
  assert.equal(divRoundHalfUp(4n, 1), 0n); // 0.4 -> 0
  assert.equal(divRoundHalfUp(15n, 1), 2n); // 1.5 -> 2
  assert.equal(divRoundHalfUp(0n, 3), 0n);
});

test('zero amount and zero percent are valid', () => {
  assert.deepEqual(run(['0', '15']).lines, ['팁: 0.00', '합계: 0.00']);
  assert.deepEqual(run(['50', '0']).lines, ['팁: 0.00', '합계: 50.00']);
});

test('decimal percent is supported', () => {
  assert.deepEqual(run(['200', '12.5']).lines, ['팁: 25.00', '합계: 225.00']);
});

// AC-001-3: invalid input -> stderr message, exit 1
test('AC-001-3: non-numeric amount exits 1 with stderr message', () => {
  const r = cli('abc', '15');
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /금액이 숫자가 아닙니다/);
});

test('AC-001-3: non-numeric percent exits 1 with stderr message', () => {
  const r = cli('100', 'xyz');
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /퍼센트가 숫자가 아닙니다/);
});

test('AC-001-3: scientific notation and malformed decimals are rejected', () => {
  for (const bad of ['1e3', '1.2.3', '', ' 5', '5 ', '+5', '0x10']) {
    const r = cli(bad, '10');
    assert.equal(r.status, 1, `expected exit 1 for ${JSON.stringify(bad)}`);
    assert.match(r.stderr, /숫자가 아닙니다/);
  }
});

test('AC-001-3: negative amount exits 1 with stderr message', () => {
  const r = cli('-100', '15');
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /음수는 입력할 수 없습니다/);
});

test('AC-001-3: negative percent exits 1 with stderr message', () => {
  const r = cli('100', '-5');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /음수는 입력할 수 없습니다/);
});

test('AC-001-3: wrong argument count exits 1 with usage on stderr', () => {
  for (const args of [[], ['100'], ['100', '15', '3']]) {
    const r = cli(...args);
    assert.equal(r.status, 1, `expected exit 1 for ${JSON.stringify(args)}`);
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /usage: node tip\.js/);
  }
});

test('AC-001-3: run() reports errors without throwing', () => {
  assert.equal(run(['abc', '1']).ok, false);
  assert.equal(run(['1']).ok, false);
});
