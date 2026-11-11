import { RegistrationError, FieldErrors } from "./errors";
import { userRepository, User } from "../users/userRepository";
import { lengthBetween, validate } from "../validation/rules";
import { normalizeEmail, validateEmail } from "../validation/email";

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

export function registerUser(input: RegisterInput): User {
  const email = normalizeEmail(input.email);

  const fields: FieldErrors = {};
  const emailErrors = validateEmail(email);
  const passwordErrors = validate(input.password, [lengthBetween(8, 72)]);
  if (emailErrors.length) fields.email = emailErrors;
  if (passwordErrors.length) fields.password = passwordErrors;
  if (Object.keys(fields).length) throw new RegistrationError("INVALID_INPUT", fields);

  if (userRepository.findByEmail(email)) throw new RegistrationError("EMAIL_TAKEN");

  return userRepository.create({ email, username: input.username });
}
