export const SCAN_MAX_BYTES = 10 * 1024 * 1024;

const EXTENSION_MIME_TYPES: Record<string, Set<string>> = {
  jpg: new Set(["image/jpeg", "image/jpg"]),
  jpeg: new Set(["image/jpeg", "image/jpg"]),
  png: new Set(["image/png"]),
  webp: new Set(["image/webp"]),
};

const REJECTION =
  "Please choose a JPG, PNG or WebP under 10MB";

export function validateScanFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!Object.hasOwn(EXTENSION_MIME_TYPES, extension)) return REJECTION;
  if (!EXTENSION_MIME_TYPES[extension].has(file.type.toLowerCase())) return REJECTION;
  if (file.size === 0 || file.size > SCAN_MAX_BYTES) return REJECTION;
  return null;
}
