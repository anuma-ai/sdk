'use client';

import { useCallback, useState } from 'react';

import type { AnumaNode } from '../tools/slides/jsx';

export type UseDeckHistoryReturn = {
  deck: AnumaNode;
  setDeck: (updater: AnumaNode | ((d: AnumaNode) => AnumaNode)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
};

/**
 * Drop-in replacement for `useState<AnumaNode>` that records every
 * commit on an undo stack. Gesture handlers don't change — they still
 * call `setDeck(d => commitX(d, ...))`. The hook intercepts each
 * commit to push the new tree onto a history array.
 *
 * Forking on a commit truncates the redo branch — standard editor
 * convention. If the updater returns the same reference it received
 * (no-op commit), no snapshot is recorded.
 *
 * Limitations (V0):
 *   - Each commit is its own undo step. Holding shift+arrow nudges
 *     creates one entry per keypress; coalescing into a single drag
 *     entry is future polish.
 *   - History is per-mount. No persistence across page reloads.
 */
export function useDeckHistory(initial: AnumaNode): UseDeckHistoryReturn {
  const [history, setHistory] = useState<{ snapshots: AnumaNode[]; index: number }>(() => ({
    snapshots: [initial],
    index: 0,
  }));
  const deck = history.snapshots[history.index] ?? initial;

  const setDeck = useCallback(
    (updater: AnumaNode | ((d: AnumaNode) => AnumaNode)) => {
      setHistory(prev => {
        const current = prev.snapshots[prev.index] ?? initial;
        const next = typeof updater === 'function' ? updater(current) : updater;
        if (next === current) return prev;
        const snapshots = prev.snapshots.slice(0, prev.index + 1);
        snapshots.push(next);
        return { snapshots, index: prev.index + 1 };
      });
    },
    [initial]
  );

  const undo = useCallback(() => {
    setHistory(prev => (prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev));
  }, []);

  const redo = useCallback(() => {
    setHistory(prev =>
      prev.index < prev.snapshots.length - 1 ? { ...prev, index: prev.index + 1 } : prev
    );
  }, []);

  return {
    deck,
    setDeck,
    undo,
    redo,
    canUndo: history.index > 0,
    canRedo: history.index < history.snapshots.length - 1,
    undoCount: history.index,
    redoCount: history.snapshots.length - 1 - history.index,
  };
}
