import { SharedStory } from "@/components/public-pages";
export const metadata = { title: "A family story", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <SharedStory token={(await params).token} />;
}
