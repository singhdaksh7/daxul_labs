import { Metadata } from "next";
import ExpensesAdminClient from "./ExpensesAdminClient";

export const metadata: Metadata = {
  title: "Business Expenses & Split Ledger | DAXUL Studio OS",
};

export default function ExpensesPage() {
  return <ExpensesAdminClient />;
}

