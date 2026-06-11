import { materializeWindowUseCase } from '../application/recurring-bill/materialize-window.use-case';

export function startRecurringBillScheduler(): void {
  // Run immediately on startup
  void materializeWindowUseCase().catch(console.error);

  // Run daily (every 24 hours)
  setInterval(
    () => {
      void materializeWindowUseCase().catch(console.error);
    },
    24 * 60 * 60 * 1000,
  );
}
