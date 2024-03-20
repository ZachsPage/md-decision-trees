// Throws if is_true is false - should be an unrecoverable programmer error
export function assert(is_true: any): void {
  if (!is_true) { throw new Error("Utils.ts - assert - fatal"); }
}

export function notNull(element: any): NonNullable<any> {
  if (element == null) { throw new Error("Utils.ts - notNull - fatal"); }
  return element;
}