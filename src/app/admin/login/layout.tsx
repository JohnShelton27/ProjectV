export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This doesn't bypass the parent admin layout in Next.js App Router.
  // The login page renders inside the admin layout.
  // We handle this by making the login page a full-screen overlay.
  return <>{children}</>;
}
