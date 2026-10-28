import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { onClearAllEncryptionState } from "../../react/useEncryption";
import type { NerDetector } from "./ner";
import { PiiRedactor } from "./redactor";

interface RedactorScope {
  active: boolean;
  users: number;
  subscribers: Set<() => void>;
  redactors: Map<string | null, { redactor: PiiRedactor; detector?: NerDetector }>;
}

const REDACTOR_LIMIT = 50;
let registry = new WeakMap<object, WeakMap<object, Map<string | undefined, RedactorScope>>>();
const scopes = new Set<RedactorScope>();
const retiredRedactor = new PiiRedactor();
retiredRedactor.dispose();

function retireScope(scope: RedactorScope): void {
  if (!scope.active) return;
  scope.active = false;
  for (const { redactor } of scope.redactors.values()) redactor.dispose();
  scope.redactors.clear();
  scopes.delete(scope);
  for (const notify of scope.subscribers) notify();
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
    scope = { active: true, users: 0, subscribers: new Set(), redactors: new Map() };
    accounts.set(account, scope);
    scopes.add(scope);
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
  storage: object
) {
  const scope = getScope(database, storage, account);
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
  const previousScope = useRef(scope);

  useEffect(() => {
    if (previousScope.current !== scope) {
      retireScope(previousScope.current);
      previousScope.current = scope;
    }
  }, [scope]);

  useEffect(() => {
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
      cached?.redactor.dispose();
      const redactor = new PiiRedactor({ nerDetector });
      scope.redactors.set(conversationId, { redactor, detector: nerDetector });
      if (scope.redactors.size > REDACTOR_LIMIT) {
        const oldest = scope.redactors.entries().next().value;
        if (oldest) {
          oldest[1].redactor.dispose();
          scope.redactors.delete(oldest[0]);
        }
      }
      return redactor;
    },
    [scope]
  );
}
