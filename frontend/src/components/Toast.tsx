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
      className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
        isSuccess ? 'bg-teal-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {value.message}
    </div>
  );
}
