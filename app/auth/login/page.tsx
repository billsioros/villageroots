import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function LoginPage() {
  return (
    <AuthShell footer="VillageRoots · people, places and stories of Potidaneia">
      <SignInForm />
    </AuthShell>
  );
}
