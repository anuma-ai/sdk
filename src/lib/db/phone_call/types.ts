/**
 * Phone call types for persisting Bland AI call data.
 *
 * A phone call record tracks the lifecycle of an AI-placed phone call,
 * from creation through completion or failure, with cached API responses.
 */

/**
 * Stored representation of a phone call in the database.
 */
export interface StoredPhoneCall {
  /** WatermelonDB internal ID */
  uniqueId: string;
  /** Bland API call ID (indexed for queries) */
  callId: string;
  /** Which conversation this call belongs to (indexed) */
  conversationId: string;
  /** uniqueID of the tool result message that created the offer (indexed) */
  offerMessageId: string;
  /** Call lifecycle status */
  status: PhoneCallStatus;
  /** JSON-stringified create request */
  request: string;
  /** JSON-stringified API response (transcript, summary, etc.) */
  response: string;
  /** When the call record was created */
  createdAt: Date;
  /** When the call record was last updated */
  updatedAt: Date;
}

export type PhoneCallStatus =
  | "placing"
  | "in_progress"
  | "completed"
  | "failed";

/**
 * Options for creating a new phone call record.
 */
export interface CreatePhoneCallOptions {
  callId: string;
  conversationId: string;
  offerMessageId: string;
  status: PhoneCallStatus;
  request?: string;
  response?: string;
}

/**
 * Options for updating an existing phone call record.
 */
export interface UpdatePhoneCallOptions {
  status?: PhoneCallStatus;
  response?: string;
}
