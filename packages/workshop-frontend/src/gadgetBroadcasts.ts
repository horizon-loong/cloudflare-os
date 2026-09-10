// Routing hub for gadget UI broadcasts (WatchableGadget.broadcast() in a gadget's
// server.js). The Overseer fans broadcasts out over the chat subscription
// (AiChatSubscriber.gadgetUpdate); ChatInterface feeds them into this hub, and each
// open GadgetUI subscribes for its gadgetId and forwards into its iframe. A module
// singleton is correct here: one workspace page per document.
//
// Broadcasts are not replayed on resubscribe, so ChatInterface also signals resync
// (on streamGeneration) and GadgetUI forwards it; the iframe-side shim answers by
// refetching the gadget's state.

export type GadgetBroadcastEvent =
    | { kind: "update", seq: number, state: unknown }
    | { kind: "resync" };

type Listener = (event: GadgetBroadcastEvent) => void;

const listenersByGadget = new Map<number, Set<Listener>>();

export function subscribeGadgetBroadcasts(gadgetId: number, listener: Listener): () => void {
  let listeners = listenersByGadget.get(gadgetId);
  if (!listeners) {
    listeners = new Set();
    listenersByGadget.set(gadgetId, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners!.delete(listener);
    if (listeners!.size === 0) listenersByGadget.delete(gadgetId);
  };
}

export function emitGadgetBroadcast(gadgetId: number, seq: number, state: unknown): void {
  // Debug aid: inspect from the page console to see whether/what the hub delivered.
  (globalThis as any).__gadgetBroadcasts ??= [];
  (globalThis as any).__gadgetBroadcasts.push({gadgetId, seq, at: Date.now()});
  const listeners = listenersByGadget.get(gadgetId);
  if (!listeners) return;
  for (const listener of [...listeners]) {
    try {
      listener({ kind: "update", seq, state });
    } catch {
      // A broken UI subscriber must not break the chat subscription delivering it.
    }
  }
}

/** Tell every open gadget UI its push stream restarted (chat resubscription), so each
 *  refetches its state instead of waiting for the next change. */
export function signalGadgetBroadcastResync(): void {
  for (const listeners of listenersByGadget.values()) {
    for (const listener of [...listeners]) {
      try {
        listener({ kind: "resync" });
      } catch {
        // ignore
      }
    }
  }
}
