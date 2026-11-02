import { Metadata } from "next";
import OperationsSettingsClient from "./OperationsSettingsClient";

export const metadata: Metadata = { title: "Operations Settings | DAXUL Studio OS" };

export default function OperationsSettingsPage() {
  return <OperationsSettingsClient />;
}
