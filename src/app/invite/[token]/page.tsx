import { AcceptInvite } from "@/components/public-pages";
export const metadata = { title: "You're invited", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <AcceptInvite token={(await params).token} />;
}
