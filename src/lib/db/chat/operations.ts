import { Q } from "@nozbe/watermelondb";
import type { Database, Collection } from "@nozbe/watermelondb";
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";

import { Message, Conversation } from "./models";
import {
  type StoredMessage,
  type StoredMessageWithSimilarity,
  type StoredConversation,
  type CreateMessageOptions,
  type CreateConversationOptions,
  type UpdateMessageOptions,
  generateConversationId,
} from "./types";
import {
  encryptMessageFields,
  decryptMessageFields,
  encryptConversationFields,
  decryptConversationFields,
  encryptJsonString,
  decryptJsonString,
  isEncrypted,
} from "./encryption";

export async function messageToStored(
  message: Message,
  ctx?: StorageOperationsContext
): Promise<StoredMessage> {
  // Handle encrypted JSON fields - @json decorator may return string if parsing fails
  let files = message.files;
  let thoughtProcess = message.thoughtProcess;
  
  // If files/thoughtProcess are strings, they're likely encrypted JSON strings that failed to parse
  if (ctx?.walletAddress && ctx.signMessage) {
    if (typeof files === 'string' && isEncrypted(files)) {
      const decrypted = await decryptJsonString<typeof message.files>(files, ctx.walletAddress);
      if (decrypted) files = decrypted;
    }
    if (typeof thoughtProcess === 'string' && isEncrypted(thoughtProcess)) {
      const decrypted = await decryptJsonString<typeof message.thoughtProcess>(thoughtProcess, ctx.walletAddress);
      if (decrypted) thoughtProcess = decrypted;
    }
  }

  const baseMessage: StoredMessage = {
    uniqueId: message.id,
    messageId: message.messageId,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    model: message.model,
    files: files ?? message.files,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    vector: message.vector,
    embeddingModel: message.embeddingModel,
    usage: message.usage,
    sources: message.sources,
    responseDuration: message.responseDuration,
    wasStopped: message.wasStopped,
    error: message.error,
    thoughtProcess: thoughtProcess ?? message.thoughtProcess,
    thinking: message.thinking,
  };

  // Decrypt string fields if encryption context is provided
  if (ctx?.walletAddress && ctx.signMessage) {
    return await decryptMessageFields(
      baseMessage,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
  }

  return baseMessage;
}

export async function conversationToStored(
  conversation: Conversation,
  ctx?: StorageOperationsContext
): Promise<StoredConversation> {
  const baseConversation: StoredConversation = {
    uniqueId: conversation.id,
    conversationId: conversation.conversationId,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    isDeleted: conversation.isDeleted,
  };

  // Decrypt title if encryption context is provided
  if (ctx?.walletAddress && ctx.signMessage) {
    return await decryptConversationFields(
      baseConversation,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
  }

  return baseConversation;
}

export interface StorageOperationsContext {
  database: Database;
  messagesCollection: Collection<Message>;
  conversationsCollection: Collection<Conversation>;
  walletAddress?: string;
  signMessage?: SignMessageFn;
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
}

export async function createConversationOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  opts?: CreateConversationOptions,
  defaultTitle: string = "New Conversation"
): Promise<StoredConversation> {
  const convId = opts?.conversationId || generateConversationId();
  let title = opts?.title || defaultTitle;

  // Encrypt title if encryption is available
  if (ctx.walletAddress && ctx.signMessage) {
    const encrypted = await encryptConversationFields(
      { conversationId: convId, title },
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
    title = encrypted.title ?? title;
  }

  const created = await ctx.database.write(async () => {
    return await ctx.conversationsCollection.create((conv) => {
      conv._setRaw("wallet_address", walletAddress);
      conv._setRaw("conversation_id", convId);
      conv._setRaw("title", title);
      conv._setRaw("is_deleted", false);
    });
  });

  return conversationToStored(created, ctx);
}

export async function getConversationOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  id: string
): Promise<StoredConversation | null> {
  const results = await ctx.conversationsCollection
    .query(
      Q.where("wallet_address", walletAddress),
      Q.where("conversation_id", id),
      Q.where("is_deleted", false)
    )
    .fetch();

  return results.length > 0 ? conversationToStored(results[0], ctx) : null;
}

export async function getConversationsOp(
  ctx: StorageOperationsContext,
  walletAddress: string
): Promise<StoredConversation[]> {
  const results = await ctx.conversationsCollection
    .query(
      Q.where("wallet_address", walletAddress),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.desc)
    )
    .fetch();

  return Promise.all(results.map(conv => conversationToStored(conv, ctx)));
}

export async function updateConversationTitleOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  id: string,
  title: string
): Promise<boolean> {
  const results = await ctx.conversationsCollection
    .query(
      Q.where("wallet_address", walletAddress),
      Q.where("conversation_id", id),
      Q.where("is_deleted", false)
    )
    .fetch();

  if (results.length > 0) {
    // Encrypt title if encryption is available
    let encryptedTitle = title;
    if (ctx.walletAddress && ctx.signMessage) {
      const encrypted = await encryptConversationFields(
        { conversationId: id, title },
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
      encryptedTitle = encrypted.title ?? title;
    }

    await ctx.database.write(async () => {
      await results[0].update((conv) => {
        conv._setRaw("title", encryptedTitle);
      });
    });
    return true;
  }
  return false;
}

export async function deleteConversationOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  id: string
): Promise<boolean> {
  const results = await ctx.conversationsCollection
    .query(
      Q.where("wallet_address", walletAddress),
      Q.where("conversation_id", id),
      Q.where("is_deleted", false)
    )
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((conv) => {
        conv._setRaw("is_deleted", true);
      });
    });
    return true;
  }
  return false;
}

export async function getMessagesOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  convId: string
): Promise<StoredMessage[]> {
  const results = await ctx.messagesCollection
    .query(
      Q.where("wallet_address", walletAddress),
      Q.where("conversation_id", convId),
      Q.sortBy("message_id", Q.asc)
    )
    .fetch();

  return Promise.all(results.map(msg => messageToStored(msg, ctx)));
}

export async function getMessageCountOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  convId: string
): Promise<number> {
  return await ctx.messagesCollection
    .query(
      Q.where("wallet_address", walletAddress),
      Q.where("conversation_id", convId)
    )
    .fetchCount();
}

export async function clearMessagesOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  convId: string
): Promise<void> {
  const messages = await ctx.messagesCollection
    .query(
      Q.where("wallet_address", walletAddress),
      Q.where("conversation_id", convId)
    )
    .fetch();

  await ctx.database.write(async () => {
    for (const message of messages) {
      await message.destroyPermanently();
    }
  });
}

export async function createMessageOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  opts: CreateMessageOptions
): Promise<StoredMessage> {
  const existingCount = await getMessageCountOp(ctx, walletAddress, opts.conversationId);
  const messageId = existingCount + 1;

  // Encrypt message fields if encryption is available
  let encryptedOpts = opts;
  if (ctx.walletAddress && ctx.signMessage) {
    encryptedOpts = await encryptMessageFields(
      opts,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
  }

  // Encrypt JSON fields before database write
  let encryptedFilesJson: string | undefined;
  if (encryptedOpts.files) {
    const filesJson = JSON.stringify(encryptedOpts.files);
    encryptedFilesJson = ctx.walletAddress && ctx.signMessage
      ? await encryptJsonString(filesJson, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
      : filesJson;
  }

  let encryptedThoughtProcessJson: string | undefined;
  if (encryptedOpts.thoughtProcess) {
    const thoughtProcessJson = JSON.stringify(encryptedOpts.thoughtProcess);
    encryptedThoughtProcessJson = ctx.walletAddress && ctx.signMessage
      ? await encryptJsonString(thoughtProcessJson, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
      : thoughtProcessJson;
  }

  const created = await ctx.database.write(async () => {
    return await ctx.messagesCollection.create((msg) => {
      msg._setRaw("wallet_address", walletAddress);
      msg._setRaw("message_id", messageId);
      msg._setRaw("conversation_id", opts.conversationId);
      msg._setRaw("role", encryptedOpts.role);
      msg._setRaw("content", encryptedOpts.content);
      if (encryptedOpts.model) msg._setRaw("model", encryptedOpts.model);
      if (encryptedFilesJson) msg._setRaw("files", encryptedFilesJson);
      if (encryptedOpts.usage) msg._setRaw("usage", JSON.stringify(encryptedOpts.usage));
      if (encryptedOpts.sources) msg._setRaw("sources", JSON.stringify(encryptedOpts.sources));
      if (encryptedOpts.responseDuration !== undefined)
        msg._setRaw("response_duration", encryptedOpts.responseDuration);
      if (encryptedOpts.vector) msg._setRaw("vector", JSON.stringify(encryptedOpts.vector));
      if (encryptedOpts.embeddingModel)
        msg._setRaw("embedding_model", encryptedOpts.embeddingModel);
      if (encryptedOpts.wasStopped) msg._setRaw("was_stopped", encryptedOpts.wasStopped);
      if (encryptedOpts.error) msg._setRaw("error", encryptedOpts.error);
      if (encryptedThoughtProcessJson) msg._setRaw("thought_process", encryptedThoughtProcessJson);
      if (encryptedOpts.thinking) msg._setRaw("thinking", encryptedOpts.thinking);
    });
  });

  return messageToStored(created, ctx);
}

export async function updateMessageEmbeddingOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  uniqueId: string,
  vector: number[],
  embeddingModel: string
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
    // Verify message belongs to wallet
    if (message.walletAddress !== walletAddress) {
      return null;
    }
  } catch {
    return null;
  }

  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("vector", JSON.stringify(vector));
      msg._setRaw("embedding_model", embeddingModel);
    });
  });

  return messageToStored(message, ctx);
}

export async function updateMessageErrorOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  uniqueId: string,
  error: string
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
    // Verify message belongs to wallet
    if (message.walletAddress !== walletAddress) {
      return null;
    }
  } catch {
    return null;
  }

  // Encrypt error if encryption is available
  let encryptedError = error;
  if (ctx.walletAddress && ctx.signMessage) {
    const encrypted = await encryptMessageFields(
      { ...message, error } as CreateMessageOptions,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
    encryptedError = encrypted.error ?? error;
  }

  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("error", encryptedError);
    });
  });

  return messageToStored(message, ctx);
}

export async function updateMessageOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  uniqueId: string,
  opts: UpdateMessageOptions
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
    // Verify message belongs to wallet
    if (message.walletAddress !== walletAddress) {
      return null;
    }
  } catch {
    return null;
  }

  // Encrypt updated fields if encryption is available
  let encryptedContent = opts.content;
  let encryptedError = opts.error;
  let encryptedThinking = opts.thinking;
  let encryptedFilesJson: string | undefined;
  let encryptedThoughtProcessJson: string | undefined;

  if (ctx.walletAddress && ctx.signMessage) {
    if (opts.content !== undefined) {
      const encrypted = await encryptMessageFields(
        { ...message, content: opts.content } as CreateMessageOptions,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
      encryptedContent = encrypted.content;
    }
    if (opts.error !== undefined && opts.error !== null) {
      const encrypted = await encryptMessageFields(
        { ...message, error: opts.error } as CreateMessageOptions,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
      encryptedError = encrypted.error;
    }
    if (opts.thinking !== undefined && opts.thinking !== null) {
      const encrypted = await encryptMessageFields(
        { ...message, thinking: opts.thinking } as CreateMessageOptions,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
      encryptedThinking = encrypted.thinking;
    }
    if (opts.files !== undefined) {
      const filesJson = JSON.stringify(opts.files);
      encryptedFilesJson = await encryptJsonString(
        filesJson,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
    }
    if (opts.thoughtProcess !== undefined) {
      const thoughtProcessJson = JSON.stringify(opts.thoughtProcess);
      encryptedThoughtProcessJson = await encryptJsonString(
        thoughtProcessJson,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
    }
  }

  await ctx.database.write(async () => {
    await message.update((msg) => {
      if (encryptedContent !== undefined) msg._setRaw("content", encryptedContent);
      if (opts.model !== undefined) msg._setRaw("model", opts.model);
      if (encryptedFilesJson !== undefined) msg._setRaw("files", encryptedFilesJson);
      if (opts.usage !== undefined)
        msg._setRaw("usage", JSON.stringify(opts.usage));
      if (opts.sources !== undefined)
        msg._setRaw("sources", JSON.stringify(opts.sources));
      if (opts.responseDuration !== undefined)
        msg._setRaw("response_duration", opts.responseDuration);
      if (opts.vector !== undefined)
        msg._setRaw("vector", JSON.stringify(opts.vector));
      if (opts.embeddingModel !== undefined)
        msg._setRaw("embedding_model", opts.embeddingModel);
      if (opts.wasStopped !== undefined)
        msg._setRaw("was_stopped", opts.wasStopped);
      if (encryptedError !== undefined)
        msg._setRaw("error", encryptedError === null ? "" : encryptedError);
      if (encryptedThoughtProcessJson !== undefined)
        msg._setRaw("thought_process", encryptedThoughtProcessJson);
      if (encryptedThinking !== undefined)
        msg._setRaw("thinking", encryptedThinking === null ? "" : encryptedThinking);
    });
  });

  return messageToStored(message, ctx);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

export async function searchMessagesOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  queryVector: number[],
  options?: {
    limit?: number;
    minSimilarity?: number;
    conversationId?: string;
  }
): Promise<StoredMessageWithSimilarity[]> {
  const { limit = 10, minSimilarity = 0.5, conversationId } = options || {};

  const activeConversations = await ctx.conversationsCollection
    .query(
      Q.where("wallet_address", walletAddress),
      Q.where("is_deleted", false)
    )
    .fetch();
  const activeConversationIds = new Set(
    activeConversations.map((c) => c.conversationId)
  );

  const queryConditions = conversationId
    ? [
        Q.where("wallet_address", walletAddress),
        Q.where("conversation_id", conversationId)
      ]
    : [Q.where("wallet_address", walletAddress)];

  const messages = await ctx.messagesCollection
    .query(...queryConditions)
    .fetch();

  const resultsWithSimilarity: StoredMessageWithSimilarity[] = [];

  for (const message of messages) {
    if (!activeConversationIds.has(message.conversationId)) continue;

    const messageVector = message.vector;
    if (!messageVector || messageVector.length === 0) continue;

    const similarity = cosineSimilarity(queryVector, messageVector);
    if (similarity >= minSimilarity) {
      const storedMessage = await messageToStored(message, ctx);
      resultsWithSimilarity.push({
        ...storedMessage,
        similarity,
      });
    }
  }

  return resultsWithSimilarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export async function getMessagesWithEmbeddingsOp(
  ctx: StorageOperationsContext,
  walletAddress: string,
  conversationId?: string
): Promise<StoredMessage[]> {
  const activeConversations = await ctx.conversationsCollection
    .query(
      Q.where("wallet_address", walletAddress),
      Q.where("is_deleted", false)
    )
    .fetch();
  const activeConversationIds = new Set(
    activeConversations.map((c) => c.conversationId)
  );

  const queryConditions = conversationId
    ? [
        Q.where("wallet_address", walletAddress),
        Q.where("conversation_id", conversationId)
      ]
    : [Q.where("wallet_address", walletAddress)];

  const messages = await ctx.messagesCollection
    .query(...queryConditions)
    .fetch();

  const filteredMessages = messages.filter(
    (m) =>
      m.vector &&
      m.vector.length > 0 &&
      activeConversationIds.has(m.conversationId)
  );

  return Promise.all(filteredMessages.map(msg => messageToStored(msg, ctx)));
}

/**
 * Claims orphan data (data with empty wallet_address) and assigns it to the given wallet address.
 * Encrypts all sensitive fields during the claiming process.
 * 
 * This is used during migration from pre-wallet versions to assign existing data
 * to the first user who logs in after the migration.
 * 
 * @param ctx - Storage operations context
 * @param walletAddress - The wallet address to assign orphan data to
 * @returns Object with counts of claimed conversations and messages
 */
export async function claimOrphanDataOp(
  ctx: StorageOperationsContext,
  walletAddress: string
): Promise<{ conversations: number; messages: number }> {
  if (!ctx.walletAddress || !ctx.signMessage) {
    // Cannot claim orphan data without encryption context
    return { conversations: 0, messages: 0 };
  }

  // Find orphan conversations (wallet_address = "")
  const orphanConvs = await ctx.conversationsCollection
    .query(Q.where("wallet_address", ""))
    .fetch();
  
  // Find orphan messages
  const orphanMsgs = await ctx.messagesCollection
    .query(Q.where("wallet_address", ""))
    .fetch();
  
  if (orphanConvs.length === 0 && orphanMsgs.length === 0) {
    return { conversations: 0, messages: 0 };
  }

  await ctx.database.write(async () => {
    // Claim and encrypt conversations
    for (const conv of orphanConvs) {
      const encrypted = await encryptConversationFields(
        { conversationId: conv.conversationId, title: conv.title },
        walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
      await conv.update((c) => {
        c._setRaw("wallet_address", walletAddress);
        c._setRaw("title", encrypted.title ?? conv.title);
      });
    }
    
    // Claim and encrypt messages
    for (const msg of orphanMsgs) {
      // Prepare message data for encryption
      const messageData: CreateMessageOptions = {
        conversationId: msg.conversationId,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        files: msg.files,
        error: msg.error,
        thinking: msg.thinking,
        thoughtProcess: msg.thoughtProcess,
      };

      const encrypted = await encryptMessageFields(
        messageData,
        walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );

      // Encrypt JSON fields (files and thoughtProcess) as strings
      let encryptedFilesJson: string | undefined;
      if (encrypted.files) {
        const filesJson = JSON.stringify(encrypted.files);
        encryptedFilesJson = await encryptJsonString(
          filesJson,
          walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        );
      }

      let encryptedThoughtProcessJson: string | undefined;
      if (encrypted.thoughtProcess) {
        const thoughtProcessJson = JSON.stringify(encrypted.thoughtProcess);
        encryptedThoughtProcessJson = await encryptJsonString(
          thoughtProcessJson,
          walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        );
      }

      await msg.update((m) => {
        m._setRaw("wallet_address", walletAddress);
        m._setRaw("content", encrypted.content);
        if (encryptedFilesJson !== undefined) {
          m._setRaw("files", encryptedFilesJson);
        }
        if (encrypted.error !== undefined) {
          m._setRaw("error", encrypted.error ?? "");
        }
        if (encrypted.thinking !== undefined) {
          m._setRaw("thinking", encrypted.thinking ?? "");
        }
        if (encryptedThoughtProcessJson !== undefined) {
          m._setRaw("thought_process", encryptedThoughtProcessJson);
        }
      });
    }
  });

  return { conversations: orphanConvs.length, messages: orphanMsgs.length };
}
