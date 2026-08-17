import { Providers } from "@/components/providers";
import { ManualEntryForm } from "@/components/contributor/manual-entry-form";
import { MySubmissions } from "@/components/contributor/my-submissions";

export default function ContributePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <Providers>
        <ManualEntryForm />
        <MySubmissions />
      </Providers>
    </main>
  );
}
