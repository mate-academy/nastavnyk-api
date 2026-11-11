import { changeEmail } from "./changeEmail";
import { EmailChangeError } from "./errors";
import { userRepository } from "../users/userRepository";

// Сид-дані: id 1 — john@example.com, id 2 — olena@example.com
beforeEach(() => {
  userRepository.reset();
});

function catchError(fn: () => unknown): EmailChangeError {
  try {
    fn();
  } catch (e) {
    if (e instanceof EmailChangeError) return e;
    throw e;
  }
  throw new Error("expected EmailChangeError to be thrown");
}

describe("changeEmail", () => {
  it("changes the email to a new valid one", () => {
    const user = changeEmail(1, "john.new@example.com");

    expect(user).toMatchObject({ id: 1, email: "john.new@example.com" });
    expect(userRepository.findByEmail("john.new@example.com")?.id).toBe(1);
    expect(userRepository.findByEmail("john@example.com")).toBeUndefined();
  });

  it("normalizes the new email like registration does", () => {
    const user = changeEmail(1, "  John.New@Example.COM ");

    expect(user.email).toBe("john.new@example.com");
  });

  it("rejects an invalid email with a field error", () => {
    const error = catchError(() => changeEmail(1, "not-an-email"));

    expect(error.code).toBe("INVALID_INPUT");
    expect(error.message).toBe("Please check the highlighted fields");
    expect(error.fields).toEqual({ email: ["must be a valid email"] });
    expect(userRepository.findById(1)?.email).toBe("john@example.com");
  });

  it("rejects an email that belongs to another user, regardless of case", () => {
    const error = catchError(() => changeEmail(1, "Olena@Example.com"));

    expect(error.code).toBe("EMAIL_TAKEN");
    expect(error.message).toBe("Email already registered");
    expect(userRepository.findById(1)?.email).toBe("john@example.com");
  });

  it("does nothing when the new email equals the current one", () => {
    const before = userRepository.findById(1);

    const user = changeEmail(1, "john@example.com");

    expect(user).toBe(before);
    expect(userRepository.findById(1)).toBe(before);
  });

  it("does nothing when the new email differs from the current one only in case and spaces", () => {
    const before = userRepository.findById(1);

    const user = changeEmail(1, " JOHN@example.com ");

    expect(user).toBe(before);
    expect(userRepository.findById(1)).toBe(before);
  });

  it("rejects an unknown user", () => {
    const error = catchError(() => changeEmail(999, "someone@example.com"));

    expect(error.code).toBe("USER_NOT_FOUND");
    expect(error.message).toBe("User not found");
  });
});
