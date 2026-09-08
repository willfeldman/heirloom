import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Heirloom — A life, in stories", template: "%s · Heirloom" },
  description:
    "An open-source home for your family's memories. Record a voice, keep a story, make a book. Your stories, your keys, your own little corner of the internet.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
