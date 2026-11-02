import { Metadata } from "next";
import PartnerFinancePortalClient from "./PartnerFinancePortalClient";

export const metadata: Metadata = {
  title: "Partner Financial Portal | DAXUL LABS",
};

export default function PartnerFinancePage() {
  return <PartnerFinancePortalClient />;
}

