/** Discriminant for {@link AuthError}. */
export type AuthErrorSubtype = "missing_bearer" | "invalid_bearer" | "expired" | "revoked";

/** Thrown by `extractGrantContext` when the bearer is missing, malformed, expired, or revoked. */
export class AuthError extends Error {
  public readonly subtype: AuthErrorSubtype;

  constructor(subtype: AuthErrorSubtype, message?: string) {
    super(message ?? subtype);
    this.name = "AuthError";
    this.subtype = subtype;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}
