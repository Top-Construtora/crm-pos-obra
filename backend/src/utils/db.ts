/**
 * Converte objeto com chaves snake_case para camelCase (recursivo)
 */
export function toCamel<T = any>(row: any): T {
  if (!row) return row;
  if (Array.isArray(row)) return row.map((r) => toCamel(r)) as any;
  if (typeof row !== 'object' || row instanceof Date) return row;

  const result: any = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (Array.isArray(value)) {
      result[camelKey] = value.map((v) =>
        v && typeof v === 'object' ? toCamel(v) : v
      );
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      result[camelKey] = toCamel(value);
    } else {
      result[camelKey] = value;
    }
  }
  return result;
}

/**
 * Converte objeto com chaves camelCase para snake_case
 */
export function toSnake(obj: any): any {
  if (!obj) return obj;
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Remove senha do objeto de usuario
 */
export function sanitizeUser(user: any) {
  if (!user) return user;
  const { senha, ...rest } = user;
  return rest;
}

/**
 * Remove senha de um array de usuarios
 */
export function sanitizeUsers(users: any[]) {
  return users.map(sanitizeUser);
}
