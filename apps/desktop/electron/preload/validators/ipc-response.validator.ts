export function isStringResponse(value: unknown): value is string {
  return typeof value === "string";
}
