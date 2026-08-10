export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {children}
    </main>
  );
}
