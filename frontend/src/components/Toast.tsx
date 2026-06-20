import { useEffect } from 'react';

export interface ToastState {
  kind: 'success' | 'error';
  message: string;
}

interface ToastProps {
  value: ToastState | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function Toast({ value, onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    if (!value) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [value, durationMs, onDismiss]);

  if (!value) return null;

  const isSuccess = value.kind === 'success';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-overlay ${
        isSuccess ? 'bg-success text-white' : 'bg-danger text-white'
      }`}
    >
      {value.message}
    </div>
  );
}
