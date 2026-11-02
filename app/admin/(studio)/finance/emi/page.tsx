import { Metadata } from "next";
import EmiAdminClient from "./EmiAdminClient";

export const metadata: Metadata = {
  title: "EMI Schedules & Financing | DAXUL Studio OS",
};

export default function EmiPage() {
  return <EmiAdminClient />;
}

