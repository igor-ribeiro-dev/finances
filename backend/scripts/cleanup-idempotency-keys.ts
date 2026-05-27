/**
 * Cleanup expired IdempotencyKey rows (TTL 24h).
 *
 * Designed to be invoked on a schedule (cron / Kubernetes CronJob / etc.):
 *   npm run cleanup:idempotency
 *
 * Idempotent — safe to run repeatedly. Logs the number of rows removed as
 * structured JSON for log aggregation.
 */
import { prisma } from '../src/infra/prisma';

async function main(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await prisma.idempotencyKey.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  console.log(
    JSON.stringify({
      event: 'idempotency.cleanup',
      removed: result.count,
      cutoff: cutoff.toISOString(),
    }),
  );
}

main()
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'idempotency.cleanup',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
