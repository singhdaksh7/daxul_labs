import { Metadata } from "next";
import MarginsClient from "./MarginsClient";

export const metadata: Metadata = { title: "Margin Analytics | DAXUL Studio OS" };

export default function MarginsPage() {
  return <MarginsClient />;
}
