import { AuthShell } from "@/components/auth/auth-shell";
import { SetPasswordForm } from "@/components/auth/set-password-form";

export default function InvitePage() {
  return (
    <AuthShell footer="VillageRoots · your story, kept alive">
      <SetPasswordForm />
    </AuthShell>
  );
}
