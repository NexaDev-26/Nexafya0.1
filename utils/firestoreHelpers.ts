/**
 * Firestore Helper Utilities
 * Removes undefined values and ensures data is Firestore-compatible
 */

/**
 * Remove undefined values from an object (Firestore doesn't allow undefined)
 * Also converts null to empty string for string fields if needed
 */
export function cleanFirestoreData<T extends Record<string, any>>(data: T): Partial<T> {
  const cleaned: any = {};
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    // Skip undefined values
    if (value === undefined) {
      return;
    }
    
    // Handle null values - convert to empty string for string fields, keep null for others
    if (value === null) {
      // You can customize this behavior if needed
      cleaned[key] = null;
      return;
    }
    
    // Handle arrays - clean each item
    if (Array.isArray(value)) {
      cleaned[key] = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return cleanFirestoreData(item);
        }
        return item;
      });
      return;
    }
    
    // Handle nested objects
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      // Check if it's a Firestore Timestamp or other special type
      if (value.toDate || value.toMillis) {
        // It's a Firestore Timestamp or similar, keep as is
        cleaned[key] = value;
      } else {
        // Recursively clean nested objects
        cleaned[key] = cleanFirestoreData(value);
      }
      return;
    }
    
    // Keep all other values (strings, numbers, booleans, dates, etc.)
    cleaned[key] = value;
  });
  
  return cleaned;
}

/**
 * Prepare data for Firestore - removes undefined and handles special cases
 */
export function prepareForFirestore<T extends Record<string, any>>(data: T): Partial<T> {
  return cleanFirestoreData(data);
}

