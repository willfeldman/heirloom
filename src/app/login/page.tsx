import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { configured, mailEnabled } from "@/lib/config";
export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome back", robots: { index: false, follow: false } };
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm configured={configured()} emailEnabled={mailEnabled()} />
    </Suspense>
  );
}
