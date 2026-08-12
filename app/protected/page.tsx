import Link from "next/link";
import { Providers } from "@/components/providers";
import { GraphApp } from "@/components/graph/graph-app";

export default function ProtectedPage() {
  return (
    <main className="flex h-full flex-1 flex-col">
      <div className="flex justify-end p-4">
        <Link
          href="/protected/contribute"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          Contribute
        </Link>
      </div>
      <Providers>
        <GraphApp />
      </Providers>
    </main>
  );
}
