// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useAsyncAction.ts
// PURPOSE: Unified hook for async actions with loading/error/success state
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';

interface AsyncActionOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useAsyncAction<T = void>(options: AsyncActionOptions<T> = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const execute = useCallback(async (action: () => Promise<T>): Promise<T | undefined> => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await action();
      setSuccess(true);
      options.onSuccess?.(result);
      if (options.successMessage) {
        window.setTimeout(() => setSuccess(false), 2000);
      }
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : (options.errorMessage || 'حدث خطأ غير متوقع');
      setError(message);
      options.onError?.(err instanceof Error ? err : new Error(message));
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const clearError = useCallback(() => setError(''), []);

  return { loading, error, success, execute, clearError };
}
