// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useError.ts
// PURPOSE: React hook for centralized error handling in components
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { ErrorCode } from '@/types';
import { AppError } from '@/lib/errors';
import { handleError, getErrorMessage, logError, isAppError } from '@/lib/errors';

// ─── Return Type ──────────────────────────────────────────────────────────────

export interface UseErrorReturn {
  error: string | null;
  isError: boolean;
  setError: (message: string) => void;
  handle: (error: unknown) => AppError;
  clear: () => void;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

export function useError(): UseErrorReturn {
  const [error, setErrorState] = useState<string | null>(null);

  /**
   * Sets a simple string error message
   */
  const setError = useCallback((message: string) => {
    setErrorState(message);
  }, []);

  /**
   * Handles any error type, converts to AppError, logs it, and sets display message
   */
  const handle = useCallback((error: unknown): AppError => {
    const appError = handleError(error);
    const message = getErrorMessage(appError);
    
    setErrorState(message);
    logError(appError);
    
    return appError;
  }, []);

  /**
   * Clears the current error
   */
  const clear = useCallback(() => {
    setErrorState(null);
  }, []);

  return {
    error,
    isError: error !== null,
    setError,
    handle,
    clear,
  };
}

// ─── Specialized Error Hooks ──────────────────────────────────────────────────

export interface UseAsyncErrorReturn {
  error: string | null;
  isLoading: boolean;
  execute: <T>(operation: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for handling async operations with loading and error states
 */
export function useAsyncError(): UseAsyncErrorReturn {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async <T>(operation: () => Promise<T>): Promise<T | null> => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await operation();
      return result;
    } catch (err) {
      const appError = handleError(err);
      const message = getErrorMessage(appError);
      
      setError(message);
      logError(appError, { operation: operation.name });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return { error, isLoading, execute, reset };
}

// ─── Error Toast Integration Hook ─────────────────────────────────────────────

export interface UseErrorToastReturn extends UseErrorReturn {
  success: (message: string) => void;
  toastMessage: string | null;
  toastType: 'error' | 'success' | null;
  clearToast: () => void;
}

/**
 * Hook that adds success messages alongside error handling
 */
export function useErrorToast(): UseErrorToastReturn {
  const { error, isError, setError, handle, clear } = useError();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'error' | 'success' | null>(null);

  const success = useCallback((message: string) => {
    setToastMessage(message);
    setToastType('success');
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
    setToastType(null);
  }, []);

  return {
    error,
    isError,
    setError,
    handle,
    clear,
    success,
    toastMessage,
    toastType,
    clearToast,
  };
}

// ─── Validation Error Helper ──────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export function getFieldError(
  errors: ValidationError[],
  fieldName: string
): string | undefined {
  return errors.find(e => e.field === fieldName)?.message;
}

export function createValidationError(
  field: string,
  message: string
): ValidationError {
  return { field, message };
}