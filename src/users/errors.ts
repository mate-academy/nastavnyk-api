export type UserErrorCode = "INVALID_INPUT" | "EMAIL_TAKEN" | "USER_NOT_FOUND";

export const USER_ERROR_MESSAGES: Record<UserErrorCode, string> = {
  INVALID_INPUT: "Please check the highlighted fields",
  EMAIL_TAKEN: "Email already registered",
  USER_NOT_FOUND: "User not found",
};

export type FieldErrors = Record<string, string[]>;

export class UserError extends Error {
  constructor(
    public readonly code: UserErrorCode,
    public readonly fields: FieldErrors = {},
  ) {
    super(USER_ERROR_MESSAGES[code]);
    this.name = "UserError";
  }
}
