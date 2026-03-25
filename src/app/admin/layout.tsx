export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
      <nav className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Admin</span>
          <a href="/admin" className="text-sm text-slate-300 hover:text-white">
            Dashboard
          </a>
          <a href="/admin/leads" className="text-sm text-slate-300 hover:text-white">
            Leads
          </a>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-slate-400 hover:text-white">
            View Site
          </a>
          <form action="/api/admin/logout" method="POST">
            <button className="text-sm text-slate-400 hover:text-white">
              Logout
            </button>
          </form>
        </div>
      </nav>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
