import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/shell/ui";
import BackInStockClient from "./BackInStockClient";

export const dynamic = "force-dynamic";

export default async function AdminBackInStockPage() {
  const check = await requireAdminSession();
  if (!check.authorized) {
    redirect("/admin/login");
  }

  const subscriptions = await prisma.backInStockSubscription.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          stock: true,
          trackInventory: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = subscriptions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    notifiedAt: s.notifiedAt ? s.notifiedAt.toISOString() : null,
    status: s.status as "PENDING" | "NOTIFIED" | "CANCELLED",
  }));

  return (
    <>
      <PageHeader
        title="Back-in-Stock Alerts"
        subtitle="Track unsatisfied demand for sold-out objects and trigger automated subscriber notifications."
      />
      <BackInStockClient initialItems={serialized} />
    </>
  );
}
