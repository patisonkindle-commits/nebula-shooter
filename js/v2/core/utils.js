// Project Nebula v2 — pure math/utility helpers
// All helpers are pure functions — no globals, no side effects.

/**
 * Linear float between min and max.
 */
export const rand = (min, max) => Math.random() * (max - min) + min;

/**
 * Integer random in [min, max] inclusive.
 */
export const randInt = (min, max) => Math.floor(rand(min, max + 1));

/**
 * Clamp a value between lo and hi.
 */
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Euclidean distance between two points.
 */
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Angle from point `from` toward point `to`.
 */
export const angleTo = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);

/**
 * Interpolate between a and b by t in [0,1].
 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Normalized angle difference (-π to π).
 */
export const angleDiff = (a, b) => {
  let d = b - a;
  while (d >  Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

/**
 * Smooth step from 0→1 over [edge0, edge1].
 */
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Map a value from one range to another.
 */
export const mapRange = (v, inMin, inMax, outMin, outMax) =>
  outMin + (outMax - outMin) * ((v - inMin) / (inMax - inMin));

/**
 * Distance squared (faster when you only need comparison).
 */
export const distSq = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/**
 * Check if two AABB overlap.
 */
export const aabbOverlap = (a, b) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

/**
 * Format integer with comma separators.
 */
export const fmtNum = (n) => n.toLocaleString('en-US');
