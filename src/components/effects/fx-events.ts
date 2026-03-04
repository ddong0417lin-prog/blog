export type FxEventDetail = {
  x: number;
  y: number;
};

function dispatchFxEvent(name: 'fx:flower' | 'fx:firework', detail: FxEventDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function dispatchFlowerBurst(detail: FxEventDetail) {
  dispatchFxEvent('fx:flower', detail);
}

export function dispatchFireworkBurst(detail: FxEventDetail) {
  dispatchFxEvent('fx:firework', detail);
}

