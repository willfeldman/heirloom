import { GuestRecord } from "@/components/public-pages";
export const metadata = {
  title: "A little question for you",
  robots: { index: false, follow: false },
};
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <GuestRecord token={(await params).token} />;
}
