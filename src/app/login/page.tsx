import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requestLink } from "./actions";

const ERRORS: Record<string, string> = {
  NotInvited: "That email isn't on the invite list yet. Ask Block Ten Strategy for access, or try the email your invite was sent to.",
  Verification: "That sign-in link has expired or was already used. Enter your email to get a new one.",
  EmailMissing: "Enter your email address.",
  Default: "Something went wrong signing you in. Try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; email?: string }> }) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { error, email } = await searchParams;
  const msg = error ? ERRORS[error] ?? ERRORS.Default : null;

  return (
    <>
      <div className="glow a" aria-hidden="true" />
      <div className="glow b" aria-hidden="true" />
      <main className="auth">
        <div className="auth-card">
          <div className="brand">
            <img src="/logo.png" alt="" width={34} height={34} />
            <span>Block Ten Strategy</span>
          </div>
          <h1>
            Wisdon<span className="o">o</span>mics Engine
          </h1>
          <p>Sign in with the email your invite was sent to. We'll email you a link. No password needed.</p>
          {msg && <div className="auth-err" role="alert">{msg}</div>}
          <form action={requestLink}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" defaultValue={email ?? ""} placeholder="you@company.com" />
            <button className="btn primary" type="submit">Email me a sign-in link</button>
          </form>
          <p className="auth-note">The Wisdonomics Engine is invite-only.</p>
        </div>
      </main>
    </>
  );
}
