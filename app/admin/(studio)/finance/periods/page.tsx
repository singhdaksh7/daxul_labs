import { Metadata } from "next";
import PeriodsAdminClient from "./PeriodsAdminClient";

export const metadata: Metadata = {
  title: "Profit Periods & Accounting | DAXUL Studio OS",
};

export default function PeriodsPage() {
  return <PeriodsAdminClient />;
}

