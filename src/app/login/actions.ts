"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export async function requestLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/login?error=EmailMissing");
  // Auth.js checks the invite list (signIn callback), sends the email, then redirects to /login/check-email.
  await signIn("resend", { email, redirectTo: "/" });
}
