/**
 * User-friendly error message mapping
 * Converts technical errors to user-friendly messages
 */

interface ErrorMap {
  [key: string]: string;
}

const errorMessages: ErrorMap = {
  // Authentication errors
  'auth/user-not-found': 'No account found with this email. Please sign up.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
  'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your internet connection.',
  'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
  
  // Firestore errors
  'permission-denied': 'You don\'t have permission to perform this action.',
  'unavailable': 'Service temporarily unavailable. Please try again.',
  'deadline-exceeded': 'Request timed out. Please try again.',
  'not-found': 'The requested item was not found.',
  'already-exists': 'This item already exists.',
  'failed-precondition': 'Operation cannot be completed. Please try again.',
  'aborted': 'Operation was cancelled. Please try again.',
  'out-of-range': 'Invalid input. Please check your data.',
  'unimplemented': 'This feature is not yet available.',
  'internal': 'An internal error occurred. Please try again.',
  'unauthenticated': 'Please sign in to continue.',
  'resource-exhausted': 'Service limit reached. Please try again later.',
  
  // Custom errors
  'INVALID_INPUT': 'Please check your input and try again.',
  'UNAUTHORIZED': 'You are not authorized to perform this action.',
  'NOT_FOUND': 'The requested resource was not found.',
  'VALIDATION_ERROR': 'Please check your input and try again.',
  'NETWORK_ERROR': 'Network error. Please check your connection.',
  'SERVER_ERROR': 'Server error. Please try again later.',
  'TIMEOUT': 'Request timed out. Please try again.',
};

/**
 * Logging service with different log levels
 * In production, this should integrate with Sentry/LogRocket
 */
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

class Logger {
  private isDevelopment = import.meta.env.DEV;
  
  error(message: string, error?: any, context?: any) {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, context);
    }
    // TODO: In production, send to error tracking service
    // Example: Sentry.captureException(error, { extra: context, tags: { message } });
  }
  
  warn(message: string, context?: any) {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context);
    }
  }
  
  info(message: string, context?: any) {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context);
    }
  }
  
  debug(message: string, context?: any) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }
}

export const logger = new Logger();

export const getErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred. Please try again.';
  
  // Check for Firebase error code
  if (error.code && errorMessages[error.code]) {
    return errorMessages[error.code];
  }
  
  // Check for custom error code
  if (error.message && errorMessages[error.message]) {
    return errorMessages[error.message];
  }
  
  // Check for error message string
  if (typeof error === 'string' && errorMessages[error]) {
    return errorMessages[error];
  }
  
  // Return user-friendly message if available
  if (error.message && typeof error.message === 'string') {
    // Check if it's already user-friendly (doesn't contain technical terms)
    if (!error.message.includes('Error:') && !error.message.includes('at ') && error.message.length < 100) {
      return error.message;
    }
  }
  
  // Default fallback
  return 'Something went wrong. Please try again.';
};

export const handleError = (
  error: any,
  notify?: (message: string, type?: string) => void,
  context?: any
): void => {
  const message = getErrorMessage(error);
  logger.error(message, error, context);
  
  if (notify) {
    notify(message, 'error');
  } else {
    // Fallback to console if notify not available
    logger.error('Error notification not available', error, context);
  }
};

