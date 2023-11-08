
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