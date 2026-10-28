import { getAuthSession } from "@/lib/auth";
import CustomerPortal from "./CustomerPortal";
import GuestAccountView from "./GuestAccountView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Account & Orders — DAXUL LABS",
  description: "View order history, track live fabrication, approve custom 3D model proofs, and manage saved addresses.",
};

export default async function AccountPage() {
  const session = await getAuthSession();

  return (
    <main className="min-h-screen bg-daxul-bone text-daxul-black flex flex-col font-sans">
      {session?.user ? (
        <CustomerPortal user={session.user} />
      ) : (
        <GuestAccountView />
      )}
    </main>
  );
}
