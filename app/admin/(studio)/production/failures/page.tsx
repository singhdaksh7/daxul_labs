import { Metadata } from "next";
import FailuresClient from "./FailuresClient";

export const metadata: Metadata = { title: "Failures & Reprints | DAXUL Studio OS" };

export default function FailuresPage() {
  return <FailuresClient />;
}
