import { Metadata } from "next";
import SettlementsAdminClient from "./SettlementsAdminClient";

export const metadata: Metadata = {
  title: "Partner Settlements Verification | DAXUL Studio OS",
};

export default function SettlementsPage() {
  return <SettlementsAdminClient />;
}

