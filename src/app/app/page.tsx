import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { configured } from "@/lib/config";
import { Dashboard } from "@/components/dashboard";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your family archive", robots: { index: false, follow: false } };
export default async function AppPage() {
  if (!configured()) redirect("/setup");
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <Dashboard />;
}
