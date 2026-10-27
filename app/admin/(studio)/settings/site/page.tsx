import { redirect } from "next/navigation";

export default function SiteSettingsRedirect() {
  redirect("/admin/settings");
}
