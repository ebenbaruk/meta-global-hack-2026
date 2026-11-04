"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

interface SparklineProps {
  values: number[];
  /** Stroke color, any CSS color. */
  color?: string;
  height?: number;
  className?: string;
}

const WIDTH = 300;
const PAD = 4;

/** Animated area sparkline. Scales to its container width. */
export function Sparkline({ values, color = "var(--color-lilac-ink)", height = 64, className }: SparklineProps) {
  const id = useId();
  const reduce = useReducedMotion();
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * WIDTH;
    const y = PAD + (1 - (v - min) / span) * (height - PAD * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${WIDTH},${height} L0,${height} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <div className={`relative ${className ?? ""}`} style={{ height }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label={`Trend over ${values.length} points, latest ${values[values.length - 1]}`}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill={`url(#${id}-fill)`}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {/* End dot lives in HTML so it stays round while the SVG stretches. */}
      <motion.span
        aria-hidden
        className="absolute size-2.5 rounded-full border-2 bg-yellow"
        style={{ x: "-50%", y: "-50%", left: `${(lastX / WIDTH) * 100}%`, top: lastY, borderColor: color }}
        initial={reduce ? false : { opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.0, type: "spring", stiffness: 400, damping: 20 }}
      />
    </div>
  );
}
