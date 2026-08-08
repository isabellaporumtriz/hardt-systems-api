import { DashboardGuard } from "@/components/layout/dashboard-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <div className="flex h-screen w-full overflow-hidden bg-zinc-950">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />

          <main className="min-w-0 flex-1 overflow-x-auto overflow-y-auto p-8">
            {children}
          </main>
        </div>
      </div>
    </DashboardGuard>
  );
}
