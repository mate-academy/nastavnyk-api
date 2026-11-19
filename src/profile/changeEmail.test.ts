import { changeEmail } from "./changeEmail";
import { registerUser } from "../registration/registerUser";
import { userRepository } from "../users/userRepository";
import { UserError } from "../users/errors";

const JOHN_ID = 1;
const OLENA_ID = 2;
const UNKNOWN_ID = 999;

function captureError(fn: () => unknown): UserError {
  try {
    fn();
  } catch (error) {
    if (error instanceof UserError) return error;
    throw error;
  }
  throw new Error("Expected a UserError to be thrown");
}

function snapshot() {
  return {
    john: { ...userRepository.findById(JOHN_ID) },
    olena: { ...userRepository.findById(OLENA_ID) },
  };
}

beforeEach(() => {
  userRepository.reset();
  jest.restoreAllMocks();
});

describe("changeEmail — spec", () => {
  it("S1: changes the email to a new valid one", () => {
    const result = changeEmail(JOHN_ID, "john.new@example.com");

    expect(result).toEqual({
      user: { id: JOHN_ID, email: "john.new@example.com", username: "John_Doe" },
      changed: true,
    });
    expect(userRepository.findByEmail("john.new@example.com")?.id).toBe(JOHN_ID);
    expect(userRepository.findByEmail("john@example.com")).toBeUndefined();
  });

  it("S2: normalizes the new email before saving", () => {
    const { user } = changeEmail(JOHN_ID, "  John.New@Example.COM  ");

    expect(user.email).toBe("john.new@example.com");
    expect(userRepository.findById(JOHN_ID)?.email).toBe("john.new@example.com");
  });

  it("S3: rejects an invalid email and keeps the old one", () => {
    const error = captureError(() => changeEmail(JOHN_ID, "not-an-email"));

    expect(error.code).toBe("INVALID_INPUT");
    expect(error.message).toBe("Please check the highlighted fields");
    expect(error.fields).toEqual({ email: ["must be a valid email"] });
    expect(userRepository.findById(JOHN_ID)?.email).toBe("john@example.com");
  });

  it("S4: rejects an email that belongs to another user", () => {
    const before = snapshot();
    const error = captureError(() => changeEmail(JOHN_ID, "olena@example.com"));

    expect(error.code).toBe("EMAIL_TAKEN");
    expect(error.message).toBe("Email already registered");
    expect(snapshot()).toEqual(before);
  });

  it("S5: rejects another user's email regardless of case and whitespace", () => {
    const error = captureError(() => changeEmail(JOHN_ID, "  OLENA@Example.com "));

    expect(error.code).toBe("EMAIL_TAKEN");
  });

  it("S6: does nothing when the new email equals the current one", () => {
    const updateSpy = jest.spyOn(userRepository, "updateEmail");

    const result = changeEmail(JOHN_ID, "john@example.com");

    expect(result).toEqual({
      user: { id: JOHN_ID, email: "john@example.com", username: "John_Doe" },
      changed: false,
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("S7: treats the current email in different case/whitespace as unchanged (no EMAIL_TAKEN)", () => {
    const updateSpy = jest.spyOn(userRepository, "updateEmail");

    const result = changeEmail(JOHN_ID, "  JOHN@Example.com ");

    expect(result.changed).toBe(false);
    expect(result.user.email).toBe("john@example.com");
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("S8: rejects an unknown user", () => {
    const error = captureError(() => changeEmail(UNKNOWN_ID, "x@example.com"));

    expect(error.code).toBe("USER_NOT_FOUND");
    expect(error.message).toBe("User not found");
    expect(userRepository.findByEmail("x@example.com")).toBeUndefined();
  });
});

describe("changeEmail — format edge cases", () => {
  it.each([
    ["empty string", ""],
    ["whitespace only", "   "],
    ["space inside", "john new@example.com"],
    ["no dot in domain", "john@example"],
    ["missing local part", "@example.com"],
    ["missing domain", "john@"],
  ])("rejects %s", (_label, input) => {
    const before = snapshot();
    const error = captureError(() => changeEmail(JOHN_ID, input));

    expect(error.code).toBe("INVALID_INPUT");
    expect(error.fields.email).toEqual(["must be a valid email"]);
    expect(snapshot()).toEqual(before);
  });

  it.each([
    ["shortest valid", "a@b.co"],
    ["plus addressing", "john+tag@example.com"],
  ])("accepts %s", (_label, input) => {
    const result = changeEmail(JOHN_ID, input);

    expect(result.changed).toBe(true);
    expect(result.user.email).toBe(input);
  });
});

describe("changeEmail — uniqueness and the released email", () => {
  it("lets a new user register with the released old email", () => {
    changeEmail(JOHN_ID, "john.new@example.com");

    const user = registerUser({
      email: "john@example.com",
      username: "another_john",
      password: "s3cret-pass",
    });

    expect(user.email).toBe("john@example.com");
  });

  it("lets another user take over the released old email", () => {
    changeEmail(JOHN_ID, "john.new@example.com");

    const result = changeEmail(OLENA_ID, "john@example.com");

    expect(result.changed).toBe(true);
    expect(userRepository.findByEmail("john@example.com")?.id).toBe(OLENA_ID);
  });

  it("blocks registration with the newly taken email", () => {
    changeEmail(JOHN_ID, "john.new@example.com");

    expect(() =>
      registerUser({
        email: "John.New@example.com",
        username: "someone",
        password: "s3cret-pass",
      }),
    ).toThrow("Email already registered");
  });

  it("allows changing A → B → A", () => {
    changeEmail(JOHN_ID, "john.new@example.com");
    const result = changeEmail(JOHN_ID, "john@example.com");

    expect(result.changed).toBe(true);
    expect(userRepository.findById(JOHN_ID)?.email).toBe("john@example.com");
  });

  it("treats a repeated change to the same new email as a no-op", () => {
    changeEmail(JOHN_ID, "john.new@example.com");
    const second = changeEmail(JOHN_ID, "john.new@example.com");

    expect(second.changed).toBe(false);
  });
});

describe("changeEmail — check order", () => {
  it("reports USER_NOT_FOUND before validating the email", () => {
    expect(captureError(() => changeEmail(UNKNOWN_ID, "not-an-email")).code).toBe(
      "USER_NOT_FOUND",
    );
  });

  it("reports INVALID_INPUT before checking uniqueness", () => {
    expect(captureError(() => changeEmail(JOHN_ID, "olena@example")).code).toBe(
      "INVALID_INPUT",
    );
  });
});

describe("changeEmail — no side effects", () => {
  it("keeps id and username on a successful change", () => {
    const { user } = changeEmail(JOHN_ID, "john.new@example.com");

    expect(user.id).toBe(JOHN_ID);
    expect(user.username).toBe("John_Doe");
  });

  it("does not touch other users on a successful change", () => {
    const olenaBefore = { ...userRepository.findById(OLENA_ID) };

    changeEmail(JOHN_ID, "john.new@example.com");

    expect(userRepository.findById(OLENA_ID)).toEqual(olenaBefore);
  });

  it("does not mutate a previously obtained user object", () => {
    const johnBefore = userRepository.findById(JOHN_ID)!;

    changeEmail(JOHN_ID, "john.new@example.com");

    expect(johnBefore.email).toBe("john@example.com");
  });
});
