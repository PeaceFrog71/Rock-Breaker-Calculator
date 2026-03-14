import { useEffect, useRef, useMemo } from 'react';
import { LASER_HEADS, MODULES, GADGETS } from '../types';
import type { Ship } from '../types';
import './ChargeGauge.css';

interface ChargeGaugeProps {
  chargeRateModifier: number;
  chargeWindowModifier: number;
  adjustedInstability?: number; // Drives needle jitter intensity
  ship?: Ship; // Ship context for per-ship scale ranges
  laserCount?: number; // Number of active lasers (for multi-laser stacking)
}

// ─── Scale Range Calculation ──────────────────────

interface ScaleRange {
  min: number;
  max: number;
}

/**
 * Calculate theoretical min/max charge rate and window modifiers
 * from possible equipment combinations, scoped to the current ship.
 *
 * @param ship - If provided, only considers lasers that fit this ship's size constraints
 * @param laserCount - Number of active lasers (modifiers multiply across lasers)
 */
function calculateScaleRanges(
  ship?: Ship,
  laserCount: number = 1
): { rate: ScaleRange; window: ScaleRange } {
  let rateMin = Infinity;
  let rateMax = -Infinity;
  let windowMin = Infinity;
  let windowMax = -Infinity;

  // Filter lasers by ship size constraints
  const validLasers = LASER_HEADS.filter(laser => {
    if (laser.id === 'none') return false;
    if (!ship) return true;
    // Golem uses bespoke size 0 (Pitman only)
    if (ship.id === 'golem') return laser.size === 0;
    // Other ships: check size range
    const minSize = ship.minLaserSize ?? 1;
    return laser.size >= minSize && laser.size <= ship.maxLaserSize;
  });

  // Get all modules (skip 'none')
  const availableModules = MODULES.filter(m => m.id !== 'none');
  const rateModules = availableModules.filter(m => m.chargeRateModifier !== undefined);
  const windowModules = availableModules.filter(m => m.chargeWindowModifier !== undefined);

  for (const laser of validLasers) {
    const slots = laser.moduleSlots;

    // Calculate rate modifier for this laser with best/worst module combos
    const rateCombos = getModifierExtremes(
      rateModules.map(m => m.chargeRateModifier!),
      slots
    );
    const windowCombos = getModifierExtremes(
      windowModules.map(m => m.chargeWindowModifier!),
      slots
    );

    for (const moduleSum of [rateCombos.minSum, rateCombos.maxSum]) {
      const laserMod = laser.chargeRateModifier ?? 1;
      const combined = laserMod * (1 + moduleSum);
      rateMin = Math.min(rateMin, combined);
      rateMax = Math.max(rateMax, combined);
    }

    for (const moduleSum of [windowCombos.minSum, windowCombos.maxSum]) {
      const laserMod = laser.chargeWindowModifier ?? 1;
      const combined = laserMod * (1 + moduleSum);
      windowMin = Math.min(windowMin, combined);
      windowMax = Math.max(windowMax, combined);
    }
  }

  // Fallback if no valid lasers found
  if (rateMin === Infinity) { rateMin = 1; rateMax = 1; }
  if (windowMin === Infinity) { windowMin = 1; windowMax = 1; }

  // Multi-laser stacking: modifiers multiply across lasers
  // Best case: best single-laser raised to laserCount power
  // Worst case: worst single-laser raised to laserCount power
  if (laserCount > 1) {
    rateMin = Math.pow(rateMin, laserCount);
    rateMax = Math.pow(rateMax, laserCount);
    windowMin = Math.pow(windowMin, laserCount);
    windowMax = Math.pow(windowMax, laserCount);
  }

  // Apply gadget extremes — up to 3 gadgets can stack (modifiers multiply)
  const MAX_GADGETS = 3;
  const gadgetRates = GADGETS
    .filter(g => g.id !== 'none' && g.chargeRateModifier !== undefined)
    .map(g => g.chargeRateModifier!);
  const gadgetWindows = GADGETS
    .filter(g => g.id !== 'none' && g.chargeWindowModifier !== undefined)
    .map(g => g.chargeWindowModifier!);

  const gadgetRateMin = gadgetRates.length > 0 ? Math.pow(Math.min(...gadgetRates), MAX_GADGETS) : 1;
  const gadgetRateMax = gadgetRates.length > 0 ? Math.pow(Math.max(...gadgetRates), MAX_GADGETS) : 1;
  const gadgetWindowMin = gadgetWindows.length > 0 ? Math.pow(Math.min(...gadgetWindows), MAX_GADGETS) : 1;
  const gadgetWindowMax = gadgetWindows.length > 0 ? Math.pow(Math.max(...gadgetWindows), MAX_GADGETS) : 1;

  return {
    rate: {
      min: rateMin * gadgetRateMin,
      max: rateMax * gadgetRateMax,
    },
    window: {
      min: windowMin * gadgetWindowMin,
      max: windowMax * gadgetWindowMax,
    },
  };
}

/**
 * Given an array of modifier values and a number of slots,
 * find the min and max possible sum of (modifier - 1) percentages.
 */
function getModifierExtremes(
  modifiers: number[],
  slots: number
): { minSum: number; maxSum: number } {
  if (slots === 0 || modifiers.length === 0) {
    return { minSum: 0, maxSum: 0 };
  }

  // Sort ascending for min, descending for max
  // Modules can be duplicated (you can equip multiple of the same)
  const percentages = modifiers.map(m => m - 1);
  const sorted = [...percentages].sort((a, b) => a - b);

  // Take the N smallest for min, N largest for max
  let minSum = 0;
  let maxSum = 0;
  for (let i = 0; i < slots; i++) {
    minSum += sorted[0]; // worst module repeated
    maxSum += sorted[sorted.length - 1]; // best module repeated
  }

  return { minSum, maxSum };
}

// ─── SVG Gauge Component ──────────────────────

// SVG dimensions
const CX = 100;
const CY = 100;
const RADIUS = 75;
const NEEDLE_LENGTH = 60;
const TICK_OUTER = RADIUS - 2;
const TICK_INNER_MAJOR = RADIUS - 12;
const TICK_INNER_MINOR = RADIUS - 7;

// Arc constants
const WINDOW_ARC_RADIUS = RADIUS - 18;
const WINDOW_ARC_STROKE = 8;

/**
 * Map a value to an angle on the top semicircle (180° to 0°)
 * using a logarithmic scale.
 * 180° = leftmost (turtle/slow), 0° = rightmost (rabbit/fast)
 */
function valueToAngle(value: number, min: number, max: number): number {
  // Clamp
  const clamped = Math.max(min, Math.min(max, value));
  // Log scale mapping
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const logVal = Math.log(clamped);
  const t = (logVal - logMin) / (logMax - logMin);
  // Map 0→180° (left/slow) to 1→0° (right/fast)
  return 180 - t * 180;
}

/**
 * Convert angle in degrees to radians
 */
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Get point on circle at given angle (0° = right, 90° = top, 180° = left)
 */
function polarToXY(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = degToRad(angleDeg);
  return {
    x: cx + r * Math.cos(rad),
    y: cy - r * Math.sin(rad), // SVG y is inverted
  };
}

/**
 * Generate SVG arc path for the window indicator (bottom half)
 */
function windowArcPath(halfAngleDeg: number): string {
  if (halfAngleDeg <= 0) return '';

  const clampedHalf = Math.min(halfAngleDeg, 89);
  // Arc goes from (270 - half) to (270 + half) in standard math angles
  // In SVG terms: from (-(90 - half)) to (-(90 + half))
  // Easier: use angles measured from bottom center
  const startAngle = 270 - clampedHalf;
  const endAngle = 270 + clampedHalf;

  const start = polarToXY(CX, CY, WINDOW_ARC_RADIUS, startAngle);
  const end = polarToXY(CX, CY, WINDOW_ARC_RADIUS, endAngle);

  const largeArc = clampedHalf * 2 > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${WINDOW_ARC_RADIUS} ${WINDOW_ARC_RADIUS} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export default function ChargeGauge({ chargeRateModifier, chargeWindowModifier, adjustedInstability, ship, laserCount = 1 }: ChargeGaugeProps) {
  const needleRef = useRef<SVGLineElement>(null);
  const animRef = useRef<number>(0);

  // Calculate scale ranges dynamically based on current ship constraints
  const scales = useMemo(
    () => calculateScaleRanges(ship, laserCount),
    [ship?.id, laserCount]
  );

  // Instability severity — drives needle color and label
  const instab = adjustedInstability ?? 0;
  const instabSeverity = useMemo(() => {
    if (instab <= 100) return { color: 'var(--accent-cyan)', label: 'STABLE', glowColor: 'rgba(0, 255, 204, 0.4)' };
    if (instab <= 300) return { color: '#ff6600', label: 'UNSTABLE', glowColor: 'rgba(255, 102, 0, 0.6)' };
    return { color: '#ff3366', label: 'ERRATIC', glowColor: 'rgba(255, 51, 102, 0.7)' };
  }, [instab]);

  // Calculate needle angle from charge rate
  const baseAngle = valueToAngle(chargeRateModifier, scales.rate.min, scales.rate.max);

  // Calculate window arc half-angle
  const windowHalfAngle = useMemo(() => {
    const logMin = Math.log(scales.window.min);
    const logMax = Math.log(scales.window.max);
    const logVal = Math.log(Math.max(scales.window.min, Math.min(scales.window.max, chargeWindowModifier)));
    const t = (logVal - logMin) / (logMax - logMin);
    // Map to 10° (narrowest) to 80° (widest) half-angle
    return 10 + t * 70;
  }, [chargeWindowModifier, scales.window.min, scales.window.max]);

  // Needle jitter animation using direct DOM manipulation
  useEffect(() => {
    // Jitter amplitude driven by instability
    // 0-75: no movement, 75-100: noticeable wobble, 100-400: more wobble, >400: erratic
    const instab = adjustedInstability ?? 0;
    let amplitude: number;
    if (instab <= 75) {
      amplitude = 0;
    } else if (instab <= 100) {
      // Noticeable wobble: 0 → 6° over 75-100 range
      amplitude = ((instab - 75) / 25) * 6;
    } else if (instab <= 400) {
      // More wobble: 6° → 16° over 100-400 range
      amplitude = 6 + ((instab - 100) / 300) * 10;
    } else {
      // Erratic shaking: 16° → 28° (capped)
      amplitude = 16 + Math.min((instab - 400) / 200, 1) * 12;
    }

    // No jitter needed — set static position and skip rAF loop
    if (amplitude === 0) {
      if (needleRef.current) {
        const staticAngle = 90 - baseAngle;
        needleRef.current.setAttribute('transform', `rotate(${staticAngle} ${CX} ${CY})`);
      }
      return;
    }

    let currentJitter = 0;
    let targetJitter = 0;
    let lastTargetTime = 0;

    const animate = (time: number) => {
      // Pick a new random target — faster at higher instability
      // 75-100: every 150ms, 100-400: every 80ms, >400: every 30ms
      const targetInterval = instab <= 100 ? 150 : instab <= 400 ? 80 : 30;
      if (time - lastTargetTime > targetInterval) {
        targetJitter = (Math.random() - 0.5) * 2 * amplitude;
        lastTargetTime = time;
      }

      // Smooth lerp toward target
      currentJitter += (targetJitter - currentJitter) * 0.15;

      // Apply to needle via DOM ref
      // Needle starts pointing up (90° in math). SVG rotate is clockwise.
      // baseAngle: 180° = left (slow), 0° = right (fast)
      // Rotation from up: -90° = left, 0° = up, +90° = right
      // So: rotation = 90 - baseAngle
      if (needleRef.current) {
        const totalAngle = 90 - baseAngle + currentJitter;
        needleRef.current.setAttribute('transform', `rotate(${totalAngle} ${CX} ${CY})`);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [baseAngle, adjustedInstability]);

  // Generate tick marks for top semicircle
  const ticks = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
    // 9 major ticks (every 22.5°) from 180° to 0°
    for (let i = 0; i <= 8; i++) {
      const angle = 180 - i * (180 / 8);
      const outer = polarToXY(CX, CY, TICK_OUTER, angle);
      const inner = polarToXY(CX, CY, TICK_INNER_MAJOR, angle);
      result.push({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, major: true });
    }
    // Minor ticks between majors
    for (let i = 0; i < 8; i++) {
      const angle = 180 - (i + 0.5) * (180 / 8);
      const outer = polarToXY(CX, CY, TICK_OUTER, angle);
      const inner = polarToXY(CX, CY, TICK_INNER_MINOR, angle);
      result.push({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, major: false });
    }
    return result;
  }, []);

  // Turtle and rabbit positions — pushed inward to fit larger emoji
  const turtlePos = polarToXY(CX, CY, RADIUS - 28, 168);
  const rabbitPos = polarToXY(CX, CY, RADIUS - 28, 12);

  // Needle end point (for initial SVG, animation overrides via transform)
  const needleEnd = polarToXY(CX, CY, NEEDLE_LENGTH, 90); // starts pointing up, rotated by animation

  // Calculate zone angles for colored arc segments
  // Red: min → midpoint below 1.0, Yellow: midpoint → 1.0, Green: 1.0 → max
  const zoneAngles = useMemo(() => {
    const minAngle = 180; // left edge (slowest)
    const maxAngle = 0;   // right edge (fastest)
    const oneAngle = valueToAngle(1.0, scales.rate.min, scales.rate.max);
    // Split below-1.0 zone in half for red/yellow boundary
    const redYellowAngle = (minAngle + oneAngle) / 2;
    return { minAngle, maxAngle, oneAngle, redYellowAngle };
  }, [scales.rate.min, scales.rate.max]);

  // Helper to build an SVG arc path between two angles on the top semicircle
  const arcBetween = (startAngle: number, endAngle: number, r: number = RADIUS) => {
    const start = polarToXY(CX, CY, r, startAngle);
    const end = polarToXY(CX, CY, r, endAngle);
    const sweep = startAngle - endAngle; // going from left to right = decreasing angle
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Format modifier for display
  const formatMod = (v: number) => {
    if (v >= 10) return v.toFixed(0);
    if (v >= 1) return v.toFixed(1);
    return v.toFixed(2);
  };

  return (
    <div className="charge-gauge">
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        {/* Colored arc zones between ticks - Red → Yellow → Green */}
        {/* Drawn at mid-point between major tick inner and outer radius */}
        <path
          d={arcBetween(zoneAngles.minAngle, zoneAngles.redYellowAngle, (TICK_INNER_MAJOR + TICK_OUTER) / 2)}
          fill="none"
          stroke="#ff3366"
          strokeWidth="6"
          opacity="0.5"
          strokeLinecap="round"
        />
        <path
          d={arcBetween(zoneAngles.redYellowAngle, zoneAngles.oneAngle, (TICK_INNER_MAJOR + TICK_OUTER) / 2)}
          fill="none"
          stroke="#ffdd00"
          strokeWidth="6"
          opacity="0.5"
          strokeLinecap="round"
        />
        <path
          d={arcBetween(zoneAngles.oneAngle, zoneAngles.maxAngle, (TICK_INNER_MAJOR + TICK_OUTER) / 2)}
          fill="none"
          stroke="var(--success)"
          strokeWidth="6"
          opacity="0.5"
          strokeLinecap="round"
        />

        {/* Background arc - bottom semicircle (subtle) */}
        <path
          d={`M ${CX + RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 0 1 ${CX - RADIUS} ${CY}`}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1} y1={tick.y1}
            x2={tick.x2} y2={tick.y2}
            stroke={tick.major ? 'var(--text-secondary)' : 'var(--border)'}
            strokeWidth={tick.major ? 1.5 : 0.8}
            opacity={tick.major ? 0.8 : 0.5}
          />
        ))}

        {/* Turtle silhouette (slow, left side, facing left) */}
        <g transform={`translate(${turtlePos.x}, ${turtlePos.y})`} className="gauge-icon">
          {/* Shell */}
          <ellipse cx="0" cy="-2" rx="6" ry="4.5" fill="none" stroke="white" strokeWidth="1.2" />
          {/* Shell pattern lines */}
          <line x1="-2" y1="-5.5" x2="-2" y2="1" stroke="white" strokeWidth="0.6" opacity="0.5" />
          <line x1="2" y1="-5.5" x2="2" y2="1" stroke="white" strokeWidth="0.6" opacity="0.5" />
          {/* Head */}
          <circle cx="-8" cy="0" r="2" fill="none" stroke="white" strokeWidth="1.2" />
          {/* Legs */}
          <line x1="-4" y1="2" x2="-5" y2="5" stroke="white" strokeWidth="1" />
          <line x1="4" y1="2" x2="5" y2="5" stroke="white" strokeWidth="1" />
          <line x1="-2" y1="2.5" x2="-3" y2="5" stroke="white" strokeWidth="0.8" />
          <line x1="2" y1="2.5" x2="3" y2="5" stroke="white" strokeWidth="0.8" />
          {/* Tail */}
          <line x1="6" y1="-1" x2="8" y2="-3" stroke="white" strokeWidth="0.8" />
        </g>

        {/* Rabbit silhouette (fast, right side, running right) */}
        <g transform={`translate(${rabbitPos.x}, ${rabbitPos.y})`} className="gauge-icon">
          {/* Body */}
          <ellipse cx="0" cy="0" rx="6" ry="3.5" fill="none" stroke="white" strokeWidth="1.2" />
          {/* Head */}
          <circle cx="7" cy="-2" r="2.5" fill="none" stroke="white" strokeWidth="1.2" />
          {/* Ears (long, swept back for speed) */}
          <line x1="6" y1="-4" x2="2" y2="-10" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="8" y1="-4" x2="4" y2="-11" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          {/* Eye */}
          <circle cx="8.5" cy="-2.5" r="0.6" fill="white" />
          {/* Front legs (extended forward — running) */}
          <line x1="4" y1="3" x2="8" y2="6" stroke="white" strokeWidth="1" strokeLinecap="round" />
          <line x1="3" y1="3.5" x2="7" y2="7" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
          {/* Back legs (kicked back — running) */}
          <line x1="-4" y1="2.5" x2="-8" y2="5" stroke="white" strokeWidth="1" strokeLinecap="round" />
          <line x1="-3" y1="3" x2="-7" y2="6.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
          {/* Tail (small puff) */}
          <circle cx="-6" cy="-1" r="1.2" fill="none" stroke="white" strokeWidth="0.8" />
        </g>

        {/* Charge window arc (bottom) — colored by modifier value */}
        <path
          d={windowArcPath(windowHalfAngle)}
          fill="none"
          stroke={chargeWindowModifier >= 1.0 ? 'var(--success)' : chargeWindowModifier >= 0.5 ? '#ffdd00' : '#ff3366'}
          strokeWidth={WINDOW_ARC_STROKE}
          strokeLinecap="round"
          className="gauge-window-arc"
        />

        {/* Center hub — color reflects instability */}
        <circle
          cx={CX} cy={CY} r={4}
          fill={instabSeverity.color}
          className="gauge-hub"
          style={{ filter: `drop-shadow(0 0 6px ${instabSeverity.glowColor})` }}
        />

        {/* Needle — color reflects instability */}
        <line
          ref={needleRef}
          x1={CX} y1={CY}
          x2={needleEnd.x} y2={needleEnd.y}
          stroke={instabSeverity.color}
          strokeWidth="2"
          strokeLinecap="round"
          className="gauge-needle"
          style={{ filter: `drop-shadow(0 0 4px ${instabSeverity.glowColor})` }}
        />

        {/* Rate label */}
        <text
          x={CX} y={CY - 24}
          textAnchor="middle"
          className="gauge-label"
        >
          RATE
        </text>

        {/* Rate value */}
        <text
          x={CX} y={CY - 8}
          textAnchor="middle"
          className="gauge-value"
        >
          {formatMod(chargeRateModifier)}x
        </text>

        {/* Instability severity label — inside gauge center, below rate */}
        {instab > 0 && (
          <text
            x={CX} y={CY + 20}
            textAnchor="middle"
            fill={instabSeverity.color}
            className="gauge-instability-label"
            style={{ fontSize: '12px' }}
          >
            {instabSeverity.label}
          </text>
        )}

        {/* Window value — above the bottom arc */}
        <text
          x={CX} y={CY + WINDOW_ARC_RADIUS - WINDOW_ARC_STROKE - 4}
          textAnchor="middle"
          className="gauge-value gauge-value-window"
        >
          {formatMod(chargeWindowModifier)}x
        </text>
      </svg>
    </div>
  );
}

// ─── Mobile Bars Component ──────────────────────

interface ChargeBarsProps {
  chargeRateModifier: number;
  chargeWindowModifier: number;
  adjustedInstability?: number;
  ship?: Ship;
  laserCount?: number;
}

export function ChargeBars({ chargeRateModifier, chargeWindowModifier, adjustedInstability, ship, laserCount = 1 }: ChargeBarsProps) {
  const instabilityRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const scales = useMemo(
    () => calculateScaleRanges(ship, laserCount),
    [ship?.id, laserCount]
  );

  const ratePercent = useMemo(() => {
    const logMin = Math.log(scales.rate.min);
    const logMax = Math.log(scales.rate.max);
    const logVal = Math.log(Math.max(scales.rate.min, Math.min(scales.rate.max, chargeRateModifier)));
    return ((logVal - logMin) / (logMax - logMin)) * 100;
  }, [chargeRateModifier, scales.rate.min, scales.rate.max]);

  const windowPercent = useMemo(() => {
    const logMin = Math.log(scales.window.min);
    const logMax = Math.log(scales.window.max);
    const logVal = Math.log(Math.max(scales.window.min, Math.min(scales.window.max, chargeWindowModifier)));
    return ((logVal - logMin) / (logMax - logMin)) * 100;
  }, [chargeWindowModifier, scales.window.min, scales.window.max]);

  // Instability bar animation — oscillates back and forth
  const instab = adjustedInstability ?? 0;
  const instabSeverity = useMemo(() => {
    if (instab <= 100) return { color: 'var(--accent-cyan)', label: 'STABLE' };
    if (instab <= 300) return { color: '#ff6600', label: 'UNSTABLE' };
    return { color: '#ff3366', label: 'ERRATIC' };
  }, [instab]);

  useEffect(() => {
    if (!instabilityRef.current || instab <= 0) return;

    // Amplitude: how far the bar swings (% of track width)
    // 0-75: minimal, 75-100: noticeable, 100-400: moderate, >400: wild
    let amplitude: number;
    let speed: number; // oscillations per second
    if (instab <= 75) {
      amplitude = 5;
      speed = 0.3;
    } else if (instab <= 100) {
      amplitude = 5 + ((instab - 75) / 25) * 15;
      speed = 0.3 + ((instab - 75) / 25) * 0.7;
    } else if (instab <= 400) {
      amplitude = 20 + ((instab - 100) / 300) * 25;
      speed = 1.0 + ((instab - 100) / 300) * 2.0;
    } else {
      amplitude = 45 + Math.min((instab - 400) / 200, 1) * 5;
      speed = 3.0 + Math.min((instab - 400) / 200, 1) * 2.0;
    }

    // Add jitter for erratic feel at high instability
    let jitterOffset = 0;
    let lastJitterTime = 0;

    const animate = (time: number) => {
      // Add random jitter at high instability
      if (instab > 100) {
        const jitterInterval = instab > 400 ? 50 : 120;
        if (time - lastJitterTime > jitterInterval) {
          jitterOffset = (Math.random() - 0.5) * (instab > 400 ? 10 : 5);
          lastJitterTime = time;
        }
      }

      // Base oscillation with sine wave
      const t = time / 1000;
      const basePosition = 50 + Math.sin(t * speed * Math.PI * 2) * amplitude;
      const position = Math.max(2, Math.min(98, basePosition + jitterOffset));

      if (instabilityRef.current) {
        instabilityRef.current.style.width = `${position}%`;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [instab]);

  const formatMod = (v: number) => v >= 1 ? v.toFixed(1) : v.toFixed(2);

  return (
    <div className="charge-bars">
      <div className="charge-bar-row">
        <span className="charge-bar-label-text">OPT RATE</span>
        <div className="charge-bar-track">
          <div
            className="charge-bar-fill charge-bar-fill-rate"
            style={{ width: `${ratePercent}%` }}
          />
        </div>
        <span className="charge-bar-value">{formatMod(chargeRateModifier)}x</span>
      </div>
      <div className="charge-bar-row">
        <span className="charge-bar-label-text">WINDOW</span>
        <div className="charge-bar-track">
          <div
            className="charge-bar-fill charge-bar-fill-window"
            style={{ width: `${windowPercent}%` }}
          />
        </div>
        <span className="charge-bar-value charge-bar-value-window">{formatMod(chargeWindowModifier)}x</span>
      </div>
      {instab > 0 && (
        <div className="charge-bar-row">
          <span className="charge-bar-label-text" style={{ color: instabSeverity.color }}>
            {instabSeverity.label}
          </span>
          <div className="charge-bar-track charge-bar-track-instability">
            <div
              ref={instabilityRef}
              className="charge-bar-fill charge-bar-fill-instability"
              style={{
                width: '50%',
                background: `linear-gradient(90deg, transparent 0%, ${instabSeverity.color} 50%, transparent 100%)`,
                boxShadow: `0 0 6px ${instabSeverity.color}`,
              }}
            />
          </div>
          <span className="charge-bar-value" style={{ color: instabSeverity.color }}>
            {instab.toFixed(0)}
          </span>
        </div>
      )}
    </div>
  );
}
