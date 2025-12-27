/**
 * Input Validation Utilities
 *
 * Provides validation functions for wallet addresses, hex strings, and database inputs.
 */

/**
 * Validate Ethereum wallet address format
 * @param address - The wallet address to validate
 * @returns True if valid, false otherwise
 */
export function isValidWalletAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  
  // Ethereum address format: 0x followed by 40 hex characters (case-insensitive)
  const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethereumAddressRegex.test(address);
}

/**
 * Validate hex string format
 * @param hex - The hex string to validate
 * @param minLength - Minimum length in hex characters (default: 0)
 * @param maxLength - Maximum length in hex characters (default: unlimited)
 * @returns True if valid, false otherwise
 */
export function isValidHexString(
  hex: string,
  minLength = 0,
  maxLength?: number
): boolean {
  if (!hex || typeof hex !== "string") return false;
  
  // Remove 0x prefix if present for validation
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  
  // Check if all characters are hex
  const hexRegex = /^[a-fA-F0-9]+$/;
  if (!hexRegex.test(cleanHex)) return false;
  
  // Check length constraints
  if (cleanHex.length < minLength) return false;
  if (maxLength !== undefined && cleanHex.length > maxLength) return false;
  
  return true;
}

/**
 * Validate database field value
 * @param value - The value to validate
 * @param fieldName - Name of the field (for error messages)
 * @param maxLength - Maximum length in characters (default: unlimited)
 * @returns Validated value or throws error
 */
export function validateDatabaseField(
  value: unknown,
  fieldName: string,
  maxLength?: number
): string {
  if (value === null || value === undefined) {
    throw new Error(`Field ${fieldName} is required`);
  }
  
  if (typeof value !== "string") {
    throw new Error(`Field ${fieldName} must be a string`);
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    throw new Error(
      `Field ${fieldName} exceeds maximum length of ${maxLength} characters`
    );
  }
  
  return value;
}

/**
 * Validate namespace string
 * @param namespace - The namespace to validate
 * @returns Validated namespace or throws error
 */
export function validateNamespace(namespace: string): string {
  return validateDatabaseField(namespace, "namespace", 255);
}

/**
 * Validate memory key string
 * @param key - The key to validate
 * @returns Validated key or throws error
 */
export function validateMemoryKey(key: string): string {
  return validateDatabaseField(key, "key", 255);
}

/**
 * Validate memory value string
 * @param value - The value to validate
 * @returns Validated value or throws error
 */
export function validateMemoryValue(value: string): string {
  // Memory values can be large (up to 1MB for encryption)
  return validateDatabaseField(value, "value", 1024 * 1024);
}

/**
 * Validate conversation ID format
 * @param conversationId - The conversation ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidConversationId(conversationId: string): boolean {
  if (!conversationId || typeof conversationId !== "string") return false;
  
  // Conversation IDs are typically alphanumeric with underscores/hyphens
  // Format: conv_<timestamp>_<random>
  const conversationIdRegex = /^conv_\d+_[a-z0-9]+$/i;
  return conversationIdRegex.test(conversationId);
}

/**
 * Sanitize string input (remove control characters)
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  
  // Remove control characters except newlines and tabs
  return input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
}

