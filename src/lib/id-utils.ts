/**
 * Utility functions for handling ID fields from backend
 * Backend returns _id but frontend expects id
 */

export interface HasId {
  id?: string;
  _id?: string;
}

/**
 * Transform an object or array of objects to ensure they have 'id' field
 * Uses _id as fallback if id doesn't exist
 */
export function ensureId<T extends HasId>(item: T): T & { id: string };
export function ensureId<T extends HasId>(items: T[]): (T & { id: string })[];
export function ensureId<T extends HasId>(data: T | T[]): (T & { id: string }) | (T & { id: string })[] {
  if (Array.isArray(data)) {
    return data.map(item => ({
      ...item,
      id: item.id || item._id || ''
    }));
  }
  
  return {
    ...data,
    id: data.id || data._id || ''
  };
}

/**
 * Get the ID from an object that might have either 'id' or '_id'
 */
export function getId(item: HasId): string {
  return item.id || item._id || '';
}

/**
 * Check if an item has a valid ID
 */
export function hasValidId(item: HasId): boolean {
  const id = getId(item);
  return id !== '' && id != null;
}
