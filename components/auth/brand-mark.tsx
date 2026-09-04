export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Connecting paths */}
      <path
        d="M20 20 C30 10, 40 10, 40 20"
        stroke="#B0B3BE"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M40 20 C50 10, 55 15, 60 20"
        stroke="#B0B3BE"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Gray nodes */}
      <circle cx="20" cy="20" r="5" fill="#B0B3BE" />
      <circle cx="60" cy="20" r="4" fill="#B0B3BE" />
      {/* Red accent node */}
      <circle cx="40" cy="20" r="6" fill="#f13c57" />
    </svg>
  );
}
