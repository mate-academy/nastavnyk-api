// Помилки винесено в спільний модуль users/errors.ts.
// Старі імена залишено як аліаси для зворотної сумісності.
export {
  UserError as RegistrationError,
  USER_ERROR_MESSAGES as REGISTRATION_MESSAGES,
} from "../users/errors";
export type { FieldErrors, UserErrorCode as RegistrationErrorCode } from "../users/errors";
