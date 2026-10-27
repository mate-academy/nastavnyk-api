import { registerUser } from "./registerUser";
import { userRepository } from "../users/userRepository";

const validInput = {
  email: "new.user@example.com",
  username: "new_user",
  password: "s3cret-pass",
};

beforeEach(() => {
  userRepository.reset();
});

describe("registerUser", () => {
  it("registers a user with valid data", () => {
    const user = registerUser(validInput);

    expect(user).toMatchObject({ email: "new.user@example.com" });
    expect(userRepository.findByEmail("new.user@example.com")).toBeDefined();
  });

  it("rejects an invalid email", () => {
    expect(() => registerUser({ ...validInput, email: "not-an-email" })).toThrow(
      "Please check the highlighted fields",
    );
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(() => registerUser({ ...validInput, password: "short" })).toThrow(
      "Please check the highlighted fields",
    );
  });

  it("rejects an email that is already registered", () => {
    expect(() => registerUser({ ...validInput, email: "John@Example.com" })).toThrow(
      "Email already registered",
    );
  });
});
