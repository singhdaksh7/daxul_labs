import { Metadata } from "next";
import ShiprocketSettingsClient from "./ShiprocketSettingsClient";

export const metadata: Metadata = { title: "Shiprocket | DAXUL Studio OS" };

export default function ShiprocketSettingsPage() {
  return <ShiprocketSettingsClient />;
}
