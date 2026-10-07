import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Package, Search, ShoppingBag } from "lucide-react";

/**
 * Customer accounts are not enabled yet. Orders are tracked with an order
 * number plus the email or phone used at checkout (no browser-stored order
 * history).
 */
export default function AccountPage() {
  return (
    <main className="min-h-screen bg-daxul-black flex flex-col font-sans text-white">
      <Header />

      <section className="bg-daxul-dark border-b border-daxul-graphite py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-mono text-daxul-lime uppercase tracking-widest block mb-1">
            DAXUL COLLECTOR ACCOUNT
          </span>
          <h1 className="text-3xl font-extrabold uppercase">My Orders</h1>
        </div>
      </section>

      <section className="flex-1 py-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center py-16 bg-daxul-dark border border-daxul-graphite rounded-2xl space-y-4 px-6">
          <Package className="w-12 h-12 text-gray-600 mx-auto" />
          <h2 className="text-base font-bold uppercase">Look up an order</h2>
          <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
            Enter your order number and the email or phone number you used at checkout to see live production and
            shipping status.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/track"
              className="bg-daxul-lime text-daxul-black px-6 py-2.5 rounded-full text-xs font-extrabold uppercase inline-flex items-center gap-1.5 hover:bg-white transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track An Order</span>
            </Link>
            <Link
              href="/shop"
              className="bg-daxul-graphite hover:bg-daxul-lime hover:text-daxul-black text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1.5 transition-all"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Explore Objects</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
