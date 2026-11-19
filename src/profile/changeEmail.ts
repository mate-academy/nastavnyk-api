import { UserError } from "../users/errors";
import { userRepository, User } from "../users/userRepository";
import { normalizeEmail, validateEmail } from "../validation/email";

export interface ChangeEmailResult {
  user: User;
  changed: boolean;
}

// Порядок перевірок: користувач існує → формат → збігається з поточним → зайнятий іншим → збереження.
export function changeEmail(userId: number, newEmail: string): ChangeEmailResult {
  const user = userRepository.findById(userId);
  if (!user) throw new UserError("USER_NOT_FOUND");

  const email = normalizeEmail(newEmail);

  const emailErrors = validateEmail(email);
  if (emailErrors.length) throw new UserError("INVALID_INPUT", { email: emailErrors });

  if (email === user.email) return { user, changed: false };

  // Власний email уже оброблено вище, тож будь-який знайдений власник — інший користувач.
  if (userRepository.findByEmail(email)) throw new UserError("EMAIL_TAKEN");

  return { user: userRepository.updateEmail(user.id, email), changed: true };
}
