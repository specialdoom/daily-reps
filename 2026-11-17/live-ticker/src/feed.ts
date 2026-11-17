export type Tick = { epoch: string; seq: number; symbol: string; price: number };

export type FeedState = {
  epoch: string | null;
  lastSeq: number; // highest seq applied in the current epoch (0 = none)
  missed: number; // total number of seqs skipped (gaps) in the current epoch
  items: readonly Tick[]; // newest first
};

export const MAX_ITEMS = 20;

export const initialState: FeedState = { epoch: null, lastSeq: 0, missed: 0, items: [] };

// TODO: make this idempotent and epoch-aware (see README).
export function applyTick(state: FeedState, tick: Tick): FeedState {
  return {
    ...state,
    epoch: tick.epoch,
    lastSeq: tick.seq,
    items: [tick, ...state.items],
  };
}
