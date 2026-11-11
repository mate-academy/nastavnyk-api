import { FieldErrors } from "../registration/errors";

export type EmailChangeErrorCode = "INVALID_INPUT" | "EMAIL_TAKEN" | "USER_NOT_FOUND";

export const EMAIL_CHANGE_MESSAGES: Record<EmailChangeErrorCode, string> = {
  INVALID_INPUT: "Please check the highlighted fields",
  EMAIL_TAKEN: "Email already registered",
  USER_NOT_FOUND: "User not found",
};

export class EmailChangeError extends Error {
  constructor(
    public readonly code: EmailChangeErrorCode,
    public readonly fields: FieldErrors = {},
  ) {
    super(EMAIL_CHANGE_MESSAGES[code]);
    this.name = "EmailChangeError";
  }
}
