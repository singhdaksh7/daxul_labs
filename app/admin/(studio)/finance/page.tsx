import { Metadata } from "next";
import FinanceDashboardAdminClient from "./FinanceDashboardAdminClient";

export const metadata: Metadata = {
  title: "Partner Finance | DAXUL Studio OS",
};

export default function FinanceDashboardPage() {
  return <FinanceDashboardAdminClient />;
}

