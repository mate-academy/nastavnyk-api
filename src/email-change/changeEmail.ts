import { EmailChangeError } from "./errors";
import { userRepository, User } from "../users/userRepository";
import { normalizeEmail, validateEmail } from "../validation/email";

export function changeEmail(userId: number, newEmail: string): User {
  const user = userRepository.findById(userId);
  if (!user) throw new EmailChangeError("USER_NOT_FOUND");

  const email = normalizeEmail(newEmail);

  const emailErrors = validateEmail(email);
  if (emailErrors.length) throw new EmailChangeError("INVALID_INPUT", { email: emailErrors });

  if (email === user.email) return user;

  if (userRepository.findByEmail(email)) throw new EmailChangeError("EMAIL_TAKEN");

  return userRepository.updateEmail(userId, email);
}
