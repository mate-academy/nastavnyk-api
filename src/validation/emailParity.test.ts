import { registerUser } from "../registration/registerUser";
import { changeEmail } from "../profile/changeEmail";
import { userRepository } from "../users/userRepository";
import { UserError } from "../users/errors";

// Доказ, що реєстрація і зміна email у профілі застосовують однакові правила до email.
const CASES = [
  "",
  "   ",
  "not-an-email",
  "john new@example.com",
  "john@example",
  "@example.com",
  "john@",
  "a@b.co",
  "john+tag@example.com",
  "  Mixed.Case@Example.COM  ",
];

function emailVerdict(fn: () => unknown): string {
  try {
    fn();
    return "accepted";
  } catch (error) {
    if (error instanceof UserError && error.code === "INVALID_INPUT") {
      return `invalid: ${JSON.stringify(error.fields.email ?? [])}`;
    }
    throw error;
  }
}

beforeEach(() => {
  userRepository.reset();
});

describe("email rules parity between registration and profile change", () => {
  it.each(CASES)("gives the same verdict for %j", (email) => {
    const onRegister = emailVerdict(() =>
      registerUser({ email, username: "parity_user", password: "s3cret-pass" }),
    );
    userRepository.reset();
    const onChange = emailVerdict(() => changeEmail(1, email));

    expect(onChange).toBe(onRegister);
  });
});
