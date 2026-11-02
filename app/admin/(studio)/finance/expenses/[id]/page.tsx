import { Metadata } from "next";
import ExpenseDetailClient from "./ExpenseDetailClient";

export const metadata: Metadata = {
  title: "Expense Timeline & Proof Attachments | DAXUL Studio OS",
};

export default function ExpenseDetailPage() {
  return <ExpenseDetailClient />;
}

