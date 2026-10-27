import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../react/useEncryption";
import type { ChunkSearchStats, ChunkVectorCache, getAllFilesOp } from "../db/chat/operations";
import type {
  ChunkSearchResult,
  CreateConversationOptions,
  CreateMessageOptions,
  GetMessagesPageOptions,
  MessageSkeleton,
  StoredConversation,
  StoredConversationSummary,
  StoredFileWithContext,
  StoredMessage,
} from "../db/chat/types";
import type { ChatStorageAdapter } from "./ChatStorageAdapter";

export interface ChatChunkSearchOptions {
  limit?: number;
  minSimilarity?: number;
  conversationId?: string;
  excludeConversationId?: string;
  embeddingModel?: string;
  chunkCache?: ChunkVectorCache;
  onStats?: (stats: ChunkSearchStats) => void;
}

/** Everything `useChatStorage` reads and writes for chats, so a hook can run on local or server storage. */
export interface ChatBackend extends ChatStorageAdapter {
  createConversation(
    options?: CreateConversationOptions,
    defaultTitle?: string
  ): Promise<StoredConversation>;
  getAllFiles(options?: Parameters<typeof getAllFilesOp>[1]): Promise<StoredFileWithContext[]>;
  getMessagesPage(
    conversationId: string,
    options: GetMessagesPageOptions
  ): Promise<StoredMessage[]>;
  getMessageSkeletons(conversationId: string): Promise<MessageSkeleton[]>;
  getMessageCount(conversationId: string): Promise<number>;
  getToolCallEventIds(conversationId: string): Promise<Set<string>>;
  upsertMessage(options: CreateMessageOptions & { uniqueId: string }): Promise<StoredMessage>;
  searchChunks(
    queryVector: number[],
    options?: ChatChunkSearchOptions
  ): Promise<ChunkSearchResult[]>;
  getSummary(conversationId: string): Promise<StoredConversationSummary | null>;
  upsertSummary(
    conversationId: string,
    summary: string,
    summarizedUpTo: string,
    tokenCount: number
  ): Promise<StoredConversationSummary>;
  deleteSummary(conversationId: string): Promise<void>;
}

export interface ChatBackendSigner {
  walletAddress?: string;
  signMessage?: SignMessageFn;
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
}

/** Builds the chat backend for a signer; `useChatStorage` calls it for live writes and for queued writes replayed later. */
export type ChatBackendFactory = (signer: ChatBackendSigner) => ChatBackend;
