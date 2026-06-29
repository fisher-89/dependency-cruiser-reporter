import { isAbsolute, resolve } from 'node:path';

/**
 * Parse the storage directory path.
 * - Absolute path: used directly, not resolved against absCwd
 * - Relative path: resolved against absCwd
 */
export function parseStorageDir(storageDir: string, absCwd: string): string {
  if (isAbsolute(storageDir)) {
    return storageDir;
  }
  return resolve(absCwd, storageDir);
}
