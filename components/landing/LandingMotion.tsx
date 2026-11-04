"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** With prefers-reduced-motion, Framer drops transforms and keeps fades. */
export function LandingMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
