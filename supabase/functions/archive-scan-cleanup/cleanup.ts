export interface CleanableFile {
  name: string;
  createdAt?: string | null;
}

export function filterExpired(
  files: CleanableFile[],
  ttlMs: number,
  now: number,
): string[] {
  return files
    .filter((file) => {
      if (!file.createdAt) return false;
      const created = Date.parse(file.createdAt);
      if (Number.isNaN(created)) return false;
      return now - created > ttlMs;
    })
    .map((file) => file.name);
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new RangeError("chunk size must be positive");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
