import { Metadata } from "next";
import CapitalAdminClient from "./CapitalAdminClient";

export const metadata: Metadata = {
  title: "Capital Contributions & Advances | DAXUL Studio OS",
};

export default function CapitalPage() {
  return <CapitalAdminClient />;
}

