import { matches, validate } from "./rules";
import { EMAIL_PATTERN } from "./patterns";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmail(email: string): string[] {
  return validate(email, [matches(EMAIL_PATTERN, "must be a valid email")]);
}
