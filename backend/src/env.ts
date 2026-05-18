export function validateEnv(required: string[]): void {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    process.stderr.write(`Missing required env vars: ${missing.join(', ')}\n`);
    process.exit(1);
  }
}
