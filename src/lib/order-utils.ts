/**
 * Generate a short, user-friendly order ID
 * Format: ORD-XXXX (where XXXX is a 4-character alphanumeric code)
 * Examples: ORD-A1B2, ORD-X9K3, ORD-M7N4
 */
export function generateShortOrderId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ORD-';
  
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generate a timestamp-based short order ID
 * Format: ORD-YYMMDD-HHMM (e.g., ORD-241225-1430)
 */
export function generateTimestampOrderId(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  
  return `ORD-${year}${month}${day}-${hours}${minutes}`;
}

/**
 * Generate a simple sequential order ID
 * Format: ORD-XXXX (where XXXX is a 4-digit number)
 */
export function generateSequentialOrderId(): string {
  // For now, use timestamp-based to avoid conflicts
  // In production, you might want to use a counter from Firestore
  const timestamp = Date.now();
  const shortId = (timestamp % 10000).toString().padStart(4, '0');
  return `ORD-${shortId}`;
}

