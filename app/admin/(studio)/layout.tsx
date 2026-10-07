import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth";
import AdminShell from "@/components/admin/shell/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "DAXUL Studio OS", robots: { index: false, follow: false } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  // DB-backed check on every render: deleted/demoted admins are redirected immediately
  // (middleware only sees the JWT).
  const check = await requireAdminSession();
  if (!check.authorized) {
    redirect("/admin/login");
  }
  const user = check.session.user as { email?: string | null; role?: string };
  return (
    <AdminShell email={user.email ?? "unknown"} role={user.role ?? "ADMIN"}>
      {children}
    </AdminShell>
  );
}
