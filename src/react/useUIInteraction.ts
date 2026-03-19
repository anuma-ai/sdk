import {
  createContext,
  createElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Extensible interaction type - includes built-in types and allows custom strings
 */
export type InteractionType = "choice" | "form" | "display" | (string & {});

/**
 * Represents a pending user interaction that needs to be resolved
 */
export type PendingInteraction<TData = any, TResult = any> = {
  id: string;
  type: InteractionType;
  data: TData;
  resolve: (result: TResult) => void;
  reject: (error: Error) => void;
  createdAt: number;
  resolved?: boolean;
  result?: TResult;
  /** Version of the display tool that produced this interaction (for migration on restore) */
  toolVersion?: number;
  /** If set, this interaction replaces a previous one (e.g. an updated app) */
  replacesInteractionId?: string;
};

/**
 * Context value for UI interactions
 */
export type UIInteractionContextValue = {
  pendingInteractions: Map<string, PendingInteraction>;
  createInteraction: (id: string, type: InteractionType, data: any) => Promise<any>;
  createDisplayInteraction: (
    id: string,
    displayType: string,
    data: any,
    result: any,
    toolVersion?: number,
    replacesInteractionId?: string
  ) => void;
  resolveInteraction: (id: string, result: any) => void;
  cancelInteraction: (id: string) => void;
  clearInteractions: () => void;
  getInteraction: (id: string) => PendingInteraction | undefined;
};

const UIInteractionContext = createContext<UIInteractionContextValue | null>(null);

/**
 * Hook to access UI interaction context
 */
export function useUIInteraction() {
  const context = useContext(UIInteractionContext);
  if (!context) {
    throw new Error("useUIInteraction must be used within UIInteractionProvider");
  }
  return context;
}

export type UIInteractionProviderProps = {
  children: ReactNode;
  /** Timeout in ms for pending interactions. Default: 300000 (5 minutes) */
  timeout?: number;
};

/**
 * Provider for managing UI interactions between LLM tools and user.
 *
 * This provider manages pending interactions that are created when the LLM
 * calls a UI interaction tool (like prompt_user_choice). The interactions
 * are rendered inline in the chat, and when the user responds, the provider
 * resolves the promise to send the result back to the LLM.
 */
export function UIInteractionProvider({
  children,
  timeout = 5 * 60 * 1000,
}: UIInteractionProviderProps): ReactElement {
  const [pendingInteractions, setPendingInteractions] = useState<Map<string, PendingInteraction>>(
    new Map()
  );

  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /**
   * Create a new pending interaction and return a promise that resolves
   * when the user responds
   */
  const createInteraction = useCallback(
    (id: string, type: InteractionType, data: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        const interaction: PendingInteraction = {
          id,
          type,
          data,
          resolve,
          reject,
          createdAt: Date.now(),
        };

        setPendingInteractions((prev) => {
          const next = new Map(prev);
          next.set(id, interaction);
          return next;
        });

        if (cleanupTimerRef.current) {
          clearTimeout(cleanupTimerRef.current);
        }

        cleanupTimerRef.current = setTimeout(() => {
          setPendingInteractions((prev) => {
            const now = Date.now();
            const next = new Map(prev);
            let hasChanges = false;

            for (const [key, value] of next.entries()) {
              if (now - value.createdAt > timeout) {
                value.reject(new Error("Interaction timeout"));
                next.delete(key);
                hasChanges = true;
              }
            }

            return hasChanges ? next : prev;
          });
        }, timeout);
      });
    },
    [timeout]
  );

  /**
   * Create a display-only interaction that is already resolved.
   * Used for rendering rich components (e.g. weather cards) without blocking the tool call.
   */
  const createDisplayInteraction = useCallback(
    (
      id: string,
      displayType: string,
      data: any,
      result: any,
      toolVersion?: number,
      replacesInteractionId?: string
    ) => {
      setPendingInteractions((prev) => {
        const next = new Map(prev);
        if (!replacesInteractionId || !next.has(replacesInteractionId)) {
          for (const [key, value] of next.entries()) {
            if (value.type === "display" && value.data?.displayType === displayType) {
              next.delete(key);
            }
          }
        } else {
          next.delete(replacesInteractionId);
        }
        next.set(id, {
          id,
          type: "display",
          data: { ...data, displayType },
          resolve: () => {},
          reject: () => {},
          createdAt: Date.now(),
          resolved: true,
          result,
          toolVersion,
          replacesInteractionId,
        });
        return next;
      });
    },
    []
  );

  /**
   * Resolve a pending interaction with a result
   */
  const resolveInteraction = useCallback((id: string, result: any) => {
    setPendingInteractions((prev) => {
      const interaction = prev.get(id);
      if (!interaction) {
        return prev;
      }

      interaction.resolve(result);

      const next = new Map(prev);
      next.set(id, { ...interaction, resolved: true, result });

      return next;
    });
  }, []);

  /**
   * Clear all interactions (e.g. on conversation switch)
   */
  const clearInteractions = useCallback(() => {
    setPendingInteractions(new Map());
  }, []);

  /**
   * Cancel a pending interaction
   */
  const cancelInteraction = useCallback((id: string) => {
    setPendingInteractions((prev) => {
      const interaction = prev.get(id);
      if (!interaction) {
        return prev;
      }

      interaction.reject(new Error("Interaction cancelled by user"));

      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  /**
   * Get a specific interaction by ID
   */
  const getInteraction = useCallback(
    (id: string) => {
      return pendingInteractions.get(id);
    },
    [pendingInteractions]
  );

  const contextValue = useMemo<UIInteractionContextValue>(
    () => ({
      pendingInteractions,
      createInteraction,
      createDisplayInteraction,
      resolveInteraction,
      cancelInteraction,
      clearInteractions,
      getInteraction,
    }),
    [
      pendingInteractions,
      createInteraction,
      createDisplayInteraction,
      resolveInteraction,
      cancelInteraction,
      clearInteractions,
      getInteraction,
    ]
  );

  return createElement(UIInteractionContext.Provider, { value: contextValue }, children);
}
