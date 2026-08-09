import Link from "next/link";

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-primary" aria-hidden>
      <circle cx="6" cy="17" r="3" fill="currentColor" />
      <circle cx="18" cy="6" r="3" fill="currentColor" />
      <circle cx="17" cy="18" r="3" fill="currentColor" />
      <path
        d="M8.6 15.4 L15.4 7.6 M8.8 16.4 L15.4 17.2 M16.4 8.4 L16.2 15.4"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex items-center gap-3">
        <BrandMark />
        <h1 className="text-[22px] font-bold tracking-tight text-primary">
          VillageRoots
        </h1>
      </div>
      <p className="max-w-md text-sm leading-relaxed text-fg-2">
        The infinite spatial knowledge graph of village heritage — people,
        places, and events of Potidaneia, woven into one living record.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/auth/login"
          className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-accent-hover active:scale-95"
        >
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
          className="inline-flex h-11 items-center rounded-md border border-border bg-background px-6 text-sm font-medium transition-colors hover:border-fg-2 hover:bg-fg-soft"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
