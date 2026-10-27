import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Package, Search, ShoppingBag } from "lucide-react";

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-daxul-bone text-daxul-black flex flex-col font-sans">
      <Header />

      <section className="py-12 sm:py-16 border-b border-daxul-black/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <span className="font-mono text-xs text-[#71717A] uppercase tracking-widest block mb-1">
            Account & Orders
          </span>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-daxul-black">My Orders</h1>
        </div>
      </section>

      <section className="flex-1 py-12 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center py-16 bg-white border border-daxul-black/10 rounded-xl space-y-4 px-6 shadow-sm">
          <Package className="w-10 h-10 text-[#71717A] mx-auto" />
          <h2 className="text-base font-bold uppercase text-daxul-black">Look up an order</h2>
          <p className="text-xs text-[#555550] max-w-md mx-auto leading-relaxed">
            Enter your order number and the email or phone number you used at checkout to see live production and
            shipping status.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/track"
              className="bg-daxul-lime hover:bg-[#bcf82a] text-daxul-black border border-daxul-black px-6 py-2.5 rounded-lg text-xs font-semibold uppercase inline-flex items-center gap-1.5 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track An Order</span>
            </Link>
            <Link
              href="/shop"
              className="bg-transparent hover:bg-daxul-black/5 text-daxul-black border border-daxul-black/20 px-6 py-2.5 rounded-lg text-xs font-semibold uppercase inline-flex items-center gap-1.5 transition-all"
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
