import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import AdminShell from "@/components/admin/shell/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "DAXUL Studio OS", robots: { index: false, follow: false } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  const user = session?.user as { email?: string | null; role?: string } | undefined;
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/admin/login");
  }
  return (
    <AdminShell email={user.email ?? "unknown"} role={user.role ?? "ADMIN"}>
      {children}
    </AdminShell>
  );
}
