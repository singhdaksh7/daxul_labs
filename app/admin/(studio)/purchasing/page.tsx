import { Metadata } from "next";
import PurchasingClient from "./PurchasingClient";

export const metadata: Metadata = { title: "Suppliers & POs | DAXUL Studio OS" };

export default function PurchasingPage() {
  return <PurchasingClient />;
}
