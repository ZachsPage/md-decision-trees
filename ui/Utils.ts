
// Help with mouse events
export enum MouseState { Down, Up, Moving };

// Group coordinates
export class Point { 
  x: number = 0; y: number = 0;
  constructor(x: number, y: number) { this.update(x, y); }
  update(x: number, y: number) { this.x = x; this.y = y; }
  getDiff(x: number, y: number): [number, number] {
    return [x - this.x, y - this.y];
  }
  static fromMouse(event: MouseEvent) { return new Point(event.clientX, event.clientY); }
}

export function isLeftClick(event: MouseEvent): boolean { return event.button == 0; }

// Throws if is_true is false - should be programmer error & not handlable
export function assert(is_true: any): void {
  if (!is_true) { throw new Error("Utils.ts - assert - fatal"); }
}

export function notNull(element: any): NonNullable<any> {
  if (element == null) { throw new Error("Utils.ts - notNull - fatal"); }
  return element;
}