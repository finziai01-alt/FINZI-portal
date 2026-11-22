import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose conditional class names, with later Tailwind utilities winning over
 * earlier conflicting ones so a caller can override a primitive's default.
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));