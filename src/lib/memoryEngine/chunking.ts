/**
 * Text Chunking Utilities
 *
 * Splits text into overlapping chunks for better semantic search.
 * Uses sentence boundaries when possible to preserve meaning.
 */

export interface ChunkingOptions {
  /** Target chunk size in characters (default: 400) */
  chunkSize?: number;
  /** Overlap between chunks in characters (default: 50) */
  chunkOverlap?: number;
  /** Minimum chunk size to create (default: 50) */
  minChunkSize?: number;
}

export interface TextChunk {
  /** The chunk text */
  text: string;
  /** Character offset where this chunk starts in the original text */
  startOffset: number;
  /** Character offset where this chunk ends in the original text */
  endOffset: number;
}

export const DEFAULT_CHUNK_SIZE = 400;
export const DEFAULT_CHUNK_OVERLAP = 50;
export const DEFAULT_MIN_CHUNK_SIZE = 50;

function splitIntoSentences(text: string): string[] {
  const sentenceRegex = /[.!?]+[\s"')}\]]*(?=\s|$)/g;
  const sentences: string[] = [];
  let lastIndex = 0;

  let match;
  while ((match = sentenceRegex.exec(text)) !== null) {
    const endIndex = match.index + match[0].length;
    const sentence = text.slice(lastIndex, endIndex).trim();
    if (sentence) {
      sentences.push(sentence);
    }
    lastIndex = endIndex;
  }

  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    sentences.push(remaining);
  }

  return sentences;
}

/**
 * Split text into overlapping chunks using sentence boundaries.
 *
 * Algorithm:
 * 1. Split text into sentences
 * 2. Accumulate sentences until chunk size is reached
 * 3. Create chunk with overlap from previous chunk
 * 4. Handle edge cases (very long sentences, short texts)
 */
export function chunkText(text: string, options?: ChunkingOptions): TextChunk[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap: requestedOverlap = DEFAULT_CHUNK_OVERLAP,
    minChunkSize = DEFAULT_MIN_CHUNK_SIZE,
  } = options ?? {};

  const chunkOverlap = Math.min(requestedOverlap, chunkSize - 1);

  if (text.length <= chunkSize) {
    return [
      {
        text: text.trim(),
        startOffset: 0,
        endOffset: text.length,
      },
    ];
  }

  const sentences = splitIntoSentences(text);
  const chunks: TextChunk[] = [];
  let currentChunkSentences: string[] = [];
  let currentChunkStart = 0;
  let currentOffset = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    let sentenceStart = text.indexOf(sentence, currentOffset);
    if (sentenceStart === -1) {
      sentenceStart = currentOffset;
    }
    const sentenceEnd = sentenceStart + sentence.length;

    if (sentence.length > chunkSize) {
      if (currentChunkSentences.length > 0) {
        const chunkText = currentChunkSentences.join(" ");
        chunks.push({
          text: chunkText,
          startOffset: currentChunkStart,
          endOffset: currentOffset,
        });
        currentChunkSentences = [];
      }

      for (let j = 0; j < sentence.length; j += chunkSize - chunkOverlap) {
        const chunkEnd = Math.min(j + chunkSize, sentence.length);
        const chunk = sentence.slice(j, chunkEnd);
        if (chunk.length >= minChunkSize) {
          chunks.push({
            text: chunk,
            startOffset: sentenceStart + j,
            endOffset: sentenceStart + chunkEnd,
          });
        }
      }

      currentChunkStart = sentenceEnd;
      currentOffset = sentenceEnd;
      continue;
    }

    const currentText = currentChunkSentences.join(" ");
    const potentialLength = currentText.length + (currentText ? 1 : 0) + sentence.length;

    if (potentialLength > chunkSize && currentChunkSentences.length > 0) {
      chunks.push({
        text: currentText,
        startOffset: currentChunkStart,
        endOffset: currentOffset,
      });

      const overlapSentences: string[] = [];
      let overlapLength = 0;
      for (let j = currentChunkSentences.length - 1; j >= 0 && overlapLength < chunkOverlap; j--) {
        overlapSentences.unshift(currentChunkSentences[j]);
        overlapLength += currentChunkSentences[j].length + 1;
      }

      if (overlapSentences.length > 0) {
        currentChunkSentences = [...overlapSentences, sentence];
        const overlapText = overlapSentences[0];
        const overlapStart = text.lastIndexOf(overlapText, currentOffset);
        currentChunkStart = overlapStart === -1 ? sentenceStart : overlapStart;
      } else {
        currentChunkSentences = [sentence];
        currentChunkStart = sentenceStart;
      }
    } else {
      if (currentChunkSentences.length === 0) {
        currentChunkStart = sentenceStart;
      }
      currentChunkSentences.push(sentence);
    }

    currentOffset = sentenceEnd;
  }

  if (currentChunkSentences.length > 0) {
    const chunkText = currentChunkSentences.join(" ");
    if (chunkText.length >= minChunkSize) {
      chunks.push({
        text: chunkText,
        startOffset: currentChunkStart,
        endOffset: text.length,
      });
    }
  }

  if (chunks.length === 0) {
    const trimmedText = text.trim();
    if (trimmedText.length > 0) {
      return [
        {
          text: trimmedText,
          startOffset: 0,
          endOffset: text.length,
        },
      ];
    }
  }

  return chunks;
}

/**
 * Check if a message should be chunked based on its length.
 */
export function shouldChunkMessage(
  content: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): boolean {
  return content.length > chunkSize;
}
