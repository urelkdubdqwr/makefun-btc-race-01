// btc-race-24h entry: a dip-buy mean reversion on CBBTC, long only, one position at a time,
// all of the cash each time. It buys after a 0.45% slide over ten minutes and closes the
// position at +0.8% or -0.4% against its cost, or after 40 bars, whichever comes first.
// Parameters: LOOKBACK 10, DIP -0.0045, TAKE 1.008, STOP 0.996, MAX_HOLD 40, slippage cap 100 bps.
import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const LOOKBACK = 10;
const DIP = -0.0045;
const TAKE = 1.008;
const STOP = 0.996;
const MAX_HOLD = 40;
const SLIP = 100;

const closes: number[] = [];
let held = 0;

function decide(state: BarsState): OrderInput[] {
  const c = state.close(SYMBOL);
  if (c === null) return [];
  closes.push(Number(c));

  const pos = state.positions.get(SYMBOL);
  if (pos !== undefined) {
    held += 1;
    const cost = Number(pos.cost);
    const worth = Number(state.value(SYMBOL, pos.qty));
    if (worth >= cost * TAKE || worth <= cost * STOP || held >= MAX_HOLD) {
      return [{ side: 'sell', symbol: SYMBOL, qty: pos.qty, max_slippage_bps: SLIP }];
    }
    return [];
  }

  held = 0;
  if (closes.length < LOOKBACK + 1) return [];
  const now = closes[closes.length - 1];
  const past = closes[closes.length - 1 - LOOKBACK];
  if (now / past - 1 > DIP) return [];
  if (state.cash <= 0n) return [];
  return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: SLIP }];
}

await runBars({
  onBatch(state) {
    return decide(state);
  },
});
