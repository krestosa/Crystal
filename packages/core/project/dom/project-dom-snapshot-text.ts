export interface ProjectDomTextPreview {
  readonly value: string;
  readonly truncated: boolean;
}

export function createProjectDomTextPreview(value: string, maxLength: number): ProjectDomTextPreview {
  const normalized = normalizeProjectDomText(value);
  if (normalized.length <= maxLength) return { value: normalized, truncated: false };
  return { value: `${normalized.slice(0, Math.max(0, maxLength - 1))}…`, truncated: true };
}

export function normalizeProjectDomText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function hasMeaningfulProjectDomText(value: string): boolean {
  return normalizeProjectDomText(value).length > 0;
}
