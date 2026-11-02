import { Metadata } from "next";
import MaterialsAdminClient from "./MaterialsAdminClient";

export const metadata: Metadata = {
  title: "Materials & Spools | DAXUL Studio OS",
};

export default function MaterialsPage() {
  return <MaterialsAdminClient />;
}

