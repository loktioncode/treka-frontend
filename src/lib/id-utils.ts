/**
 * Utility functions for handling ID fields from backend
 * Backend returns _id and frontend uses _id consistently
 */

export interface HasId {
  _id: string;
}

/**
 * Transform an object or array of objects to ensure they have '_id' field
 */
export function ensureId<T extends HasId>(item: T): T;
export function ensureId<T extends HasId>(items: T[]): T[];
export function ensureId<T extends HasId>(data: T | T[]): T | T[] {
  if (Array.isArray(data)) {
    return data.map(item => {
      if (!item._id) {
        console.warn('Item missing _id field:', item);
      }
      return item;
    });
  }
  
  if (!data._id) {
    console.warn('Item missing _id field:', data);
  }
  
  return data;
}

/**
 * Get the ID from an object that has '_id'
 */
export function getId(item: HasId): string {
  return item._id || '';
}

/**
 * Check if an item has a valid ID
 */
export function hasValidId(item: HasId): boolean {
  const id = getId(item);
  return id !== '' && id != null;
}
