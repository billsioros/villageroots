import { Providers } from "@/components/providers";
import { GraphApp } from "@/components/graph/graph-app";

export default function ProtectedPage() {
  return (
    <main className="flex h-full flex-1 flex-col">
      <Providers>
        <GraphApp />
      </Providers>
    </main>
  );
}
