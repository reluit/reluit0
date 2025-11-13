import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reluit Admin",
  description: "Manage client dashboards and tenant provisioning.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reluit Platform</p>
            <h1 className="text-lg font-semibold text-slate-100">Admin Control Center</h1>
          </div>
          <div className="text-right text-xs text-slate-400">
            <p>admin.reluit.com</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Provision tenant dashboards</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

