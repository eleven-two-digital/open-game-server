// SPDX-License-Identifier: Apache-2.0

export type CollisionPoint = { x: number; y: number };

export function sweptCircleCollisionTime(
  relativeStart: CollisionPoint,
  relativeEnd: CollisionPoint,
  radius: number,
): number | null {
  if (!Number.isFinite(radius) || radius < 0) {
    throw new RangeError("Collision radius must be finite and non-negative.");
  }
  const delta = {
    x: relativeEnd.x - relativeStart.x,
    y: relativeEnd.y - relativeStart.y,
  };
  const lengthSquared = delta.x * delta.x + delta.y * delta.y;
  const time =
    lengthSquared === 0
      ? 0
      : clamp(-(relativeStart.x * delta.x + relativeStart.y * delta.y) / lengthSquared, 0, 1);
  const nearest = {
    x: relativeStart.x + delta.x * time,
    y: relativeStart.y + delta.y * time,
  };
  return Math.hypot(nearest.x, nearest.y) <= radius ? time : null;
}

export function sweptRectangleCollisionTime(
  start: CollisionPoint,
  end: CollisionPoint,
  rectangle: { x: number; y: number; width: number; height: number },
): number | null {
  let near = 0;
  let far = 1;
  const axes: Array<{ start: number; delta: number; min: number; max: number }> = [
    {
      start: start.x,
      delta: end.x - start.x,
      min: rectangle.x,
      max: rectangle.x + rectangle.width,
    },
    {
      start: start.y,
      delta: end.y - start.y,
      min: rectangle.y,
      max: rectangle.y + rectangle.height,
    },
  ];
  for (const axis of axes) {
    if (axis.delta === 0) {
      if (axis.start < axis.min || axis.start > axis.max) {
        return null;
      }
      continue;
    }
    let first = (axis.min - axis.start) / axis.delta;
    let second = (axis.max - axis.start) / axis.delta;
    if (first > second) {
      [first, second] = [second, first];
    }
    near = Math.max(near, first);
    far = Math.min(far, second);
    if (near > far) {
      return null;
    }
  }
  return near;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
