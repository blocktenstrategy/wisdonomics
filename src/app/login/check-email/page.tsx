export default function CheckEmailPage() {
  return (
    <>
      <div className="glow a" aria-hidden="true" />
      <div className="glow b" aria-hidden="true" />
      <main className="auth">
        <div className="auth-card">
          <div className="auth-ok" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
          </div>
          <h1>Check your inbox</h1>
          <p>We sent you a sign-in link. Open it on this device to continue. It works once and expires in 24 hours.</p>
          <p className="auth-note">
            Nothing there after a minute? Check your spam folder, or <a href="/login">send a new link</a>.
          </p>
        </div>
      </main>
    </>
  );
}
