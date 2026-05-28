/**
 * Error subclasses thrown by `@anuma/agent-runtime`.
 *
 * - {@link AuthError} comes out of `extractGrantContext` when the bearer is
 *   missing, malformed, expired, or already revoked.
 */

/** Discriminant for {@link AuthError}. */
export type AuthErrorSubtype = "missing_bearer" | "invalid_bearer" | "expired" | "revoked";

export class AuthError extends Error {
  public readonly subtype: AuthErrorSubtype;

  constructor(subtype: AuthErrorSubtype, message?: string) {
    super(message ?? subtype);
    this.name = "AuthError";
    this.subtype = subtype;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}
