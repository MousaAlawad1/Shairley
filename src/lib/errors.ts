// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/lib/errors.ts
// PURPOSE: centralized error handling for the entire application
// ═══════════════════════════════════════════════════════════════════════════════

import { ErrorCode, AppErrorData } from '@/types';

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_REQUIRED]: 'يجب تسجيل الدخول أولاً',
  [ErrorCode.WORKSPACE_NOT_FOUND]: 'مساحة العمل غير موجودة',
  [ErrorCode.FILE_NOT_FOUND]: 'الملف غير موجود',
  [ErrorCode.MEMBER_NOT_FOUND]: 'العضو غير موجود',
  [ErrorCode.PERMISSION_DENIED]: 'ليس لديك صلاحية لهذا الإجراء',
  [ErrorCode.STORAGE_LIMIT_EXCEEDED]: 'المساحة المتبقية لا تكفي لهذا الملف',
  [ErrorCode.NETWORK_ERROR]: 'حدث خطأ في الاتصال. حاول مرة أخرى',
  [ErrorCode.INVALID_INPUT]: 'البيانات المدخلة غير صحيحة',
  [ErrorCode.UNKNOWN_ERROR]: 'حدث خطأ غير متوقع',
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: string;
  public readonly isOperational: boolean;

  constructor(code: ErrorCode, message?: string, details?: string) {
    const finalMessage = message || ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR];
    super(finalMessage);

    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON(): AppErrorData {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }

  getUserMessage(): string {
    return this.message;
  }
}

export const errors = {
  authRequired: (details?: string) => new AppError(ErrorCode.AUTH_REQUIRED, undefined, details),
  workspaceNotFound: (workspaceId?: string) =>
    new AppError(
      ErrorCode.WORKSPACE_NOT_FOUND,
      `مساحة العمل${workspaceId ? ` "${workspaceId}"` : ''} غير موجودة`,
      workspaceId ? `Workspace ID: ${workspaceId}` : undefined
    ),
  fileNotFound: (fileId?: string) =>
    new AppError(
      ErrorCode.FILE_NOT_FOUND,
      `الملف${fileId ? ` "${fileId}"` : ''} غير موجود`,
      fileId ? `File ID: ${fileId}` : undefined
    ),
  memberNotFound: (memberId?: string) =>
    new AppError(
      ErrorCode.MEMBER_NOT_FOUND,
      `العضو${memberId ? ` "${memberId}"` : ''} غير موجود`,
      memberId ? `Member ID: ${memberId}` : undefined
    ),
  permissionDenied: (action?: string) =>
    new AppError(
      ErrorCode.PERMISSION_DENIED,
      action ? `ليس لديك صلاحية: ${action}` : 'ليس لديك صلاحية لهذا الإجراء',
      action
    ),
  storageLimitExceeded: (required: number, available: number) =>
    new AppError(
      ErrorCode.STORAGE_LIMIT_EXCEEDED,
      'المساحة المتبقية لا تكفي لهذا الملف',
      `Required: ${required} bytes, Available: ${available} bytes`
    ),
  networkError: (originalError?: string) =>
    new AppError(
      ErrorCode.NETWORK_ERROR,
      'حدث خطأ في الاتصال. تحقق من اتصالك بالإنترنت',
      originalError
    ),
  invalidInput: (field: string, reason: string) =>
    new AppError(
      ErrorCode.INVALID_INPUT,
      `قيمة "${field}" غير صحيحة: ${reason}`,
      `${field}: ${reason}`
    ),
  unknown: (originalError?: string) =>
    new AppError(
      ErrorCode.UNKNOWN_ERROR,
      'حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً',
      originalError
    ),
};

const FIREBASE_ERROR_MAP: Record<string, AppError> = {
  'permission-denied': errors.permissionDenied(),
  'not-found': errors.fileNotFound(),
  'already-exists': errors.invalidInput('البيانات', 'موجودة مسبقاً'),
  'resource-exhausted': errors.networkError('Resource exhausted'),
  'unauthenticated': errors.authRequired(),
  'storage/object-not-found': errors.fileNotFound(),
  'storage/unauthorized': errors.permissionDenied(),
  'storage/quota-exceeded': errors.storageLimitExceeded(0, 0),
  'auth/requires-recent-login': errors.authRequired('يتطلب تسجيل دخول حديث'),
  'auth/network-request-failed': errors.networkError('Firebase Auth network error'),
};

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;
    if (code && FIREBASE_ERROR_MAP[code]) {
      return FIREBASE_ERROR_MAP[code];
    }

    if (error.message.includes('Missing or insufficient permissions')) {
      return errors.permissionDenied();
    }

    if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
      return errors.networkError(error.message);
    }

    return errors.unknown(error.message);
  }

  return errors.unknown();
}

export function logError(error: AppError, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.group(`[Error] ${error.code}`);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Stack:', error.stack);
    if (context) console.error('Context:', context);
    console.groupEnd();
  }
}

export async function withErrorHandling<T>(operation: () => Promise<T>, fallbackError?: AppError): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const appError = handleError(error);
    if (fallbackError) throw fallbackError;
    throw appError;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === ErrorCode.NETWORK_ERROR;
  }
  return false;
}

export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) return error.getUserMessage();
  if (error instanceof Error) return error.message;
  return 'حدث خطأ غير متوقع';
}
