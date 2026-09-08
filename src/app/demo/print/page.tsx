import { demoState } from "@/lib/demo";
import { PrintBook } from "@/components/print-book";
export const metadata = { title: "Sample keepsake book" };
export default function Page() {
  return <PrintBook book={demoState.book!} stories={demoState.stories} baseUrl="" demo />;
}
