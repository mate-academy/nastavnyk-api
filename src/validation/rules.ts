export type Rule = (value: string) => string | null;

export function lengthBetween(min: number, max: number): Rule {
  return (value) =>
    value.length >= min && value.length <= max
      ? null
      : `must be between ${min} and ${max} characters`;
}

export function matches(pattern: RegExp, message: string): Rule {
  return (value) => (pattern.test(value) ? null : message);
}

export function validate(value: string, rules: Rule[]): string[] {
  return rules
    .map((rule) => rule(value))
    .filter((error): error is string => error !== null);
}
