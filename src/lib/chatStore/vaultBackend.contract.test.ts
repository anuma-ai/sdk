import { runChatBackendContract } from "../storage/chatBackendContract";
import { createChatStoreHarness } from "../../../test/chat/vaultHarness";
import { createVaultChatBackend } from "./vaultBackend";

runChatBackendContract("VaultChatBackend", async () =>
  createVaultChatBackend({
    store: (await createChatStoreHarness()).store,
    pollIntervalMs: 0,
    activity: { isActive: () => true, subscribe: () => () => {} },
  })
);
