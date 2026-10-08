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
