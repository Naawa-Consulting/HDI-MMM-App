export async function register() {
  // Disable TLS verification only when running behind the corporate proxy locally.
  // Never disable in production (Vercel) — CORPORATE_PROXY env var must be set explicitly.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.CORPORATE_PROXY === "1"
  ) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}
