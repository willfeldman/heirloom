import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { configured, appUrl } from "@/lib/config";
import { getState } from "@/lib/data";
import { PrintBook } from "@/components/print-book";
import type { Book, Story } from "@/lib/types";
import { uuid } from "@/lib/validation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your keepsake book", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!configured()) redirect("/setup");
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const state = await getState(session.user.id, id);
  return (
    <PrintBook book={state.book as Book} stories={state.stories as Story[]} baseUrl={appUrl()} />
  );
}
