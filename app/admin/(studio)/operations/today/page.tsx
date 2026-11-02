import { Metadata } from "next";
import TodayOperationsAdminClient from "./TodayOperationsAdminClient";

export const metadata: Metadata = {
  title: "Today's Operations | DAXUL Studio OS",
};

export default function TodayOperationsPage() {
  return <TodayOperationsAdminClient />;
}

