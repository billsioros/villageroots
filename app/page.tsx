import Link from "next/link";
import { BrandMark } from "@/components/graph/brand-mark";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex items-center gap-3">
        <BrandMark size={32} />
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
