/**
 * Safe Access Utilities
 * Prevents crashes from undefined/null access
 */

/**
 * Safely get a value from an object with fallback
 */
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result == null) return defaultValue;
      result = result[key];
    }
    return result != null ? result : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely call toString on a value
 */
export function safeToString(value: any, defaultValue: string = '0'): string {
  try {
    if (value == null) return defaultValue;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    return String(value);
  } catch {
    return defaultValue;
  }
}

/**
 * Safely format a number with toLocaleString
 */
export function safeToLocaleString(value: any, defaultValue: string = '0'): string {
  try {
    if (value == null) return defaultValue;
    const num = typeof value === 'number' ? value : Number(value);
    if (isNaN(num)) return defaultValue;
    return num.toLocaleString();
  } catch {
    return defaultValue;
  }
}

/**
 * Safely map over an array
 */
export function safeMap<T, R>(arr: T[] | null | undefined, fn: (item: T, index: number) => R, defaultValue: R[] = []): R[] {
  try {
    if (!Array.isArray(arr)) return defaultValue;
    return arr.map(fn);
  } catch {
    return defaultValue;
  }
}

/**
 * Safely filter an array
 */
export function safeFilter<T>(arr: T[] | null | undefined, fn: (item: T, index: number) => boolean, defaultValue: T[] = []): T[] {
  try {
    if (!Array.isArray(arr)) return defaultValue;
    return arr.filter(fn);
  } catch {
    return defaultValue;
  }
}

/**
 * Safely reduce an array
 */
export function safeReduce<T, R>(
  arr: T[] | null | undefined,
  fn: (acc: R, item: T, index: number) => R,
  initialValue: R
): R {
  try {
    if (!Array.isArray(arr)) return initialValue;
    return arr.reduce(fn, initialValue);
  } catch {
    return initialValue;
  }
}

/**
 * Safely access array index
 */
export function safeArrayAccess<T>(arr: T[] | null | undefined, index: number, defaultValue: T | null = null): T | null {
  try {
    if (!Array.isArray(arr)) return defaultValue;
    if (index < 0 || index >= arr.length) return defaultValue;
    return arr[index];
  } catch {
    return defaultValue;
  }
}

/**
 * Safely get number value
 */
export function safeNumber(value: any, defaultValue: number = 0): number {
  try {
    if (value == null) return defaultValue;
    const num = typeof value === 'number' ? value : Number(value);
    return isNaN(num) ? defaultValue : num;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely get string value
 */
export function safeString(value: any, defaultValue: string = ''): string {
  try {
    if (value == null) return defaultValue;
    return String(value);
  } catch {
    return defaultValue;
  }
}

