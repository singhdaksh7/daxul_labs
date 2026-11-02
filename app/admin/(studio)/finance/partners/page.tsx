import { Metadata } from "next";
import PartnersAdminClient from "./PartnersAdminClient";

export const metadata: Metadata = {
  title: "Partner Accounts & Split Configuration | DAXUL Studio OS",
};

export default function PartnersPage() {
  return <PartnersAdminClient />;
}

