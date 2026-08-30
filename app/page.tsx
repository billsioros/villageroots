import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function Home() {
  return (
    <AuthShell footer="Invitation only · Potidaneia, Fokida">
      <SignInForm
        heading="Welcome to the village"
        description="Sign in to explore the infinite spatial knowledge graph of village heritage."
      />
    </AuthShell>
  );
}
