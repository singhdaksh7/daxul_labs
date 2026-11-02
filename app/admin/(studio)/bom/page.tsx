import { Metadata } from "next";
import BomClient from "./BomClient";

export const metadata: Metadata = { title: "Bill of Materials | DAXUL Studio OS" };

export default function BomPage() {
  return <BomClient />;
}
