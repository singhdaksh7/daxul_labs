import { Metadata } from "next";
import AlertsClient from "./AlertsClient";

export const metadata: Metadata = { title: "Alert Center | DAXUL Studio OS" };

export default function AlertsPage() {
  return <AlertsClient />;
}
