// Loaded before every test file (package.json "test" script).
process.env.PAYMENT_MODE ??= 'simulator'; // the payment simulator is opt-in
process.env.AUTH_SECRET ??= 'test-only-root-secret-not-used-anywhere-else-0123456789'; // no built-in fallback exists
process.env.PWNED_CHECK ??= 'off'; // no network calls to Have I Been Pwned from tests
process.env.RATE_LIMIT ??= 'off'; // route tests share one fake IP; the limiter has its own tests

// Tests write and delete rows: they only ever run against a local PostgreSQL (`npm run db:dev` creates
// pandiones_test). TEST_DATABASE_URL may point elsewhere (CI service container) but must stay on loopback.
const url = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54329/pandiones_test';
const host = new URL(url).hostname;
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) {
  throw new Error(`Tests refuse to run against a non-local database (${host}).`);
}
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
