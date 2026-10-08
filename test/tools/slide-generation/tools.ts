import { normalizePath, type AppFileStorage } from "../../../src/tools/appGeneration.js";
import { createSlideTools } from "../../../src/tools/slides/index.js";
import type { FileStore } from "./setup.js";

function createMapStorage(store: FileStore): Pick<AppFileStorage, "getFile" | "putFile"> {
  return {
    getFile: async (_cid: string, p: string) => {
      const content = store.get(normalizePath(p));
      return content !== undefined ? { path: normalizePath(p), content } : null;
    },
    putFile: async (_cid: string, p: string, content: string) => {
      store.set(normalizePath(p), content);
    },
  };
}

const TEST_CONVERSATION_ID = "test-conversation";

export function createTestSlideTools(store: FileStore) {
  const storage = createMapStorage(store);
  const getConversationId = () => TEST_CONVERSATION_ID;

  return createSlideTools({
    getConversationId,
    storage,
    displaySlides: async (args: Record<string, unknown>) => ({
      title: args.title ?? "Slides",
      interaction_id: `slides_test_${Date.now()}`,
      displayType: "slides",
    }),
  });
}
