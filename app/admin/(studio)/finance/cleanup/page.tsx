import { Metadata } from "next";
import CleanupClient from "./CleanupClient";

export const metadata: Metadata = { title: "Finance Clean-up | DAXUL Studio OS" };

export default function FinanceCleanupPage() {
  return <CleanupClient />;
}
