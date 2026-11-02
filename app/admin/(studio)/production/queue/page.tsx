import { Metadata } from "next";
import QueueClient from "./QueueClient";

export const metadata: Metadata = { title: "Print Queue & Fleet | DAXUL Studio OS" };

export default function QueuePage() {
  return <QueueClient />;
}
