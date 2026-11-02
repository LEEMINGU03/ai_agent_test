#!/usr/bin/env node
'use strict';

// Usage: node tip.js <amount> <percent>
// All arithmetic uses BigInt on scaled integers to avoid floating-point error.

const USAGE = 'usage: node tip.js <금액> <퍼센트>';

// "100", "0.10", ".5", "5." -> { value: BigInt, scale: number } (value / 10^scale)
// Returns null for anything that is not a plain non-negative decimal.
function parseDecimal(text) {
  if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) return null;
  const [intPart, fracPart = ''] = text.split('.');
  return { value: BigInt((intPart || '0') + fracPart), scale: fracPart.length };
}

// Divide n by 10^scale, rounding half-up (ties away from zero; inputs are non-negative).
function divRoundHalfUp(n, scale) {
  const den = 10n ** BigInt(scale);
  return (2n * n + den) / (2n * den);
}

// Tip and total are computed in integer cents.
function computeCents(amount, percent) {
  const amountCents = divRoundHalfUp(amount.value * 100n, amount.scale);
  const tipCents = divRoundHalfUp(amount.value * percent.value, amount.scale + percent.scale);
  return { tipCents, totalCents: amountCents + tipCents };
}

function formatCents(cents) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

// Returns { ok: true, lines } or { ok: false, error }.
function run(args) {
  if (args.length !== 2) {
    return { ok: false, error: USAGE };
  }
  const [amountText, percentText] = args;

  if (/^-/.test(amountText) || /^-/.test(percentText)) {
    return { ok: false, error: '오류: 음수는 입력할 수 없습니다.' };
  }
  const amount = parseDecimal(amountText);
  if (!amount) {
    return { ok: false, error: `오류: 금액이 숫자가 아닙니다: ${amountText}` };
  }
  const percent = parseDecimal(percentText);
  if (!percent) {
    return { ok: false, error: `오류: 퍼센트가 숫자가 아닙니다: ${percentText}` };
  }

  const { tipCents, totalCents } = computeCents(amount, percent);
  return {
    ok: true,
    lines: [`팁: ${formatCents(tipCents)}`, `합계: ${formatCents(totalCents)}`],
  };
}

function main(argv) {
  const result = run(argv);
  if (!result.ok) {
    process.stderr.write(result.error + '\n');
    return 1;
  }
  process.stdout.write(result.lines.join('\n') + '\n');
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { parseDecimal, divRoundHalfUp, computeCents, formatCents, run, main };
