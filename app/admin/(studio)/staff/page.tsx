import { Metadata } from "next";
import StaffAdminClient from "./StaffAdminClient";

export const metadata: Metadata = { title: "Staff & Permissions | DAXUL Studio OS" };

export default function StaffPage() {
  return <StaffAdminClient />;
}
