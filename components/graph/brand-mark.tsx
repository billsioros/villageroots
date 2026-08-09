export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="17" r="3" fill="var(--primary)" />
      <circle cx="18" cy="6" r="3" fill="var(--primary)" />
      <circle cx="17" cy="18" r="3" fill="var(--primary)" />
      <path d="M8.6 15.2 15.4 7.8" stroke="var(--primary)" strokeWidth="1.6" />
      <path d="M8.2 16.2 15.8 16.6" stroke="var(--primary)" strokeWidth="1.6" />
      <path d="M16.6 8.4 15.6 15.4" stroke="var(--primary)" strokeWidth="1.6" />
    </svg>
  );
}
