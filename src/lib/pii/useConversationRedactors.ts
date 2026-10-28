import { useCallback, useEffect, useSyncExternalStore } from "react";

import { onClearAllEncryptionState } from "../../react/useEncryption";
import type { NerDetector } from "./ner";
import { PiiRedactor } from "./redactor";

interface RedactorScope {
  active: boolean;
  users: number;
  subscribers: Set<() => void>;
  redactors: Map<string | null, { redactor: PiiRedactor; detector?: NerDetector }>;
  evicted: PiiRedactor[];
}

const REDACTOR_LIMIT = 50;
let registry = new WeakMap<object, WeakMap<object, Map<string | undefined, RedactorScope>>>();
const compositeKeys = new WeakMap<object, WeakMap<object, object>>();
const scopes = new Set<RedactorScope>();
const retiredRedactor = new PiiRedactor();
retiredRedactor.dispose();

function retireScope(scope: RedactorScope): void {
  scopes.delete(scope);
  if (!scope.active) return;
  scope.active = false;
  for (const { redactor } of scope.redactors.values()) redactor.dispose();
  scope.redactors.clear();
  for (const redactor of scope.evicted) redactor.dispose();
  scope.evicted = [];
  for (const notify of scope.subscribers) notify();
}

function storageKey(storage: object, secondaryStorage?: object): object {
  if (!secondaryStorage) return storage;
  let inner = compositeKeys.get(storage);
  if (!inner) {
    inner = new WeakMap();
    compositeKeys.set(storage, inner);
  }
  let key = inner.get(secondaryStorage);
  if (!key) {
    key = {};
    inner.set(secondaryStorage, key);
  }
  return key;
}

function getScope(database: object, storage: object, account: string | undefined): RedactorScope {
  let stores = registry.get(database);
  if (!stores) {
    stores = new WeakMap();
    registry.set(database, stores);
  }
  let accounts = stores.get(storage);
  if (!accounts) {
    accounts = new Map();
    stores.set(storage, accounts);
  }
  let scope = accounts.get(account);
  if (!scope?.active) {
    scope = { active: true, users: 0, subscribers: new Set(), redactors: new Map(), evicted: [] };
    accounts.set(account, scope);
  }
  return scope;
}

onClearAllEncryptionState(() => {
  registry = new WeakMap();
  for (const scope of [...scopes]) retireScope(scope);
});

export function useConversationRedactors(
  database: object,
  account: string | undefined,
  storage: object,
  secondaryStorage?: object
) {
  const scope = getScope(database, storageKey(storage, secondaryStorage), account);
  const subscribe = useCallback(
    (callback: () => void) => {
      scope.subscribers.add(callback);
      return () => {
        scope.subscribers.delete(callback);
      };
    },
    [scope]
  );
  const getSnapshot = useCallback(() => (scope.active ? scope : null), [scope]);
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (scope.active) scopes.add(scope);
    scope.users++;
    return () => {
      scope.users--;
      if (scope.users === 0) retireScope(scope);
    };
  }, [scope]);

  return useCallback(
    (conversationId: string | null, nerDetector?: NerDetector): PiiRedactor => {
      if (!scope.active) return retiredRedactor;
      const cached = scope.redactors.get(conversationId);
      if (cached && cached.detector === nerDetector) {
        scope.redactors.delete(conversationId);
        scope.redactors.set(conversationId, cached);
        return cached.redactor;
      }
      if (cached) scope.evicted.push(cached.redactor);
      const redactor = new PiiRedactor({ nerDetector });
      scope.redactors.set(conversationId, { redactor, detector: nerDetector });
      if (scope.redactors.size > REDACTOR_LIMIT) {
        const oldest = scope.redactors.entries().next().value;
        if (oldest) {
          scope.evicted.push(oldest[1].redactor);
          scope.redactors.delete(oldest[0]);
        }
      }
      return redactor;
    },
    [scope]
  );
}
