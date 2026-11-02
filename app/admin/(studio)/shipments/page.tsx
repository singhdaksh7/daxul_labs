import { Metadata } from "next";
import ShipmentsClient from "./ShipmentsClient";

export const metadata: Metadata = { title: "Shipments & Dispatch | DAXUL Studio OS" };

export default function ShipmentsPage() {
  return <ShipmentsClient />;
}
