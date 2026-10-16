'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useId, useMemo } from 'react';
import {
  PATH_VIEWBOX,
  couplePosition,
  pathD,
  waypointsFor,
} from '@/lib/pathgeometry';
import { normaliseMilestoneDays, sceneryStage } from '@/lib/streak';
import { Calvary } from '@/components/Calvary';

// Sky colours for each stretch of scenery (see sceneryStage in streak.ts).
const SKIES: [string, string][] = [
  ['#F8E1D2', '#FAF6EF'], // 0 first light
  ['#F2C7AD', '#FAF6EF'], // 1 morning
  ['#E6ECE2', '#FAF6EF'], // 2 meadow
  ['#C9D4C5', '#FAF6EF'], // 3 river
  ['#EFDDB2', '#FAF6EF'], // 4 high pastures
  ['#F2C7AD', '#EFDDB2'], // 5 golden light
];

type Props = {
  walked: number;
  milestoneDays: readonly number[];
  unlockedDays?: readonly number[];
  names?: [string, string];
  className?: string;
};

// Amy: long braids, pearl necklace, cream dress with a full skirt, cream heels.
function Amy({ x, label }: { x: number; label: string }) {
  return (
    <g transform={`translate(${x} 0)`} aria-label={label}>
      <ellipse cx="0" cy="2" rx="10" ry="3" fill="#344B3F" opacity="0.15" />
      {/* skirt and bodice */}
      <path d="M-4.5 -19 L4.5 -19 L5.5 -12 L10 0 L-10 0 L-5.5 -12 Z" fill="#F6E6CF" stroke="#E2CDAE" strokeWidth="0.5" />
      <path d="M-5 -21 C-5 -24 5 -24 5 -21 L4.5 -17 L-4.5 -17 Z" fill="#F6E6CF" />
      {/* shoulders, neck, face */}
      <path d="M-5.2 -21.5 C-3 -23.5 3 -23.5 5.2 -21.5 L4.6 -24 L-4.6 -24 Z" fill="#7A4B33" />
      <rect x="-1.6" y="-26.5" width="3.2" height="3.4" fill="#7A4B33" />
      <circle cx="0" cy="-30" r="5.6" fill="#7A4B33" />
      {/* pearls */}
      <path d="M-3.6 -24.6 Q0 -22.4 3.6 -24.6" fill="none" stroke="#FFFDF8" strokeWidth="1.3" strokeDasharray="1 0.8" strokeLinecap="round" />
      {/* hair and long braids */}
      <path d="M-6 -30 C-6.5 -37 6.5 -37 6 -30 C3 -33.5 -3 -33.5 -6 -30 Z" fill="#2B1D16" />
      <path d="M-5.6 -30 C-7.2 -25 -6.6 -19 -6.2 -14" fill="none" stroke="#2B1D16" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5.6 -30 C7.2 -25 6.6 -19 6.2 -14" fill="none" stroke="#2B1D16" strokeWidth="1.7" strokeLinecap="round" />
      {/* bouquet */}
      <path d="M2 -14 L7.5 -22 L10.5 -14 Z" fill="#FFFFFF" stroke="#F2C7AD" strokeWidth="0.5" />
      <circle cx="8" cy="-23" r="2" fill="#C8355A" />
      <circle cx="10" cy="-21.6" r="1.4" fill="#F8F3EC" />
    </g>
  );
}

// Aaron: short dark hair, navy short-sleeved shirt, black trousers, white trainers.
function Aaron({ x, label }: { x: number; label: string }) {
  return (
    <g transform={`translate(${x} 0)`} aria-label={label}>
      <ellipse cx="0" cy="2" rx="9" ry="3" fill="#344B3F" opacity="0.15" />
      {/* trousers and trainers */}
      <rect x="-5" y="-12" width="4.4" height="11" rx="1.2" fill="#1C1C20" />
      <rect x="0.6" y="-12" width="4.4" height="11" rx="1.2" fill="#1C1C20" />
      <rect x="-6" y="-2" width="6" height="2.6" rx="1.2" fill="#FFFFFF" stroke="#D9D4CC" strokeWidth="0.4" />
      <rect x="0" y="-2" width="6" height="2.6" rx="1.2" fill="#FFFFFF" stroke="#D9D4CC" strokeWidth="0.4" />
      {/* shirt */}
      <path d="M-7 -21 C-7 -24 7 -24 7 -21 L6 -11 L-6 -11 Z" fill="#1F2F57" />
      <rect x="-9" y="-22" width="3.2" height="6" rx="1.4" fill="#1F2F57" />
      <rect x="5.8" y="-22" width="3.2" height="6" rx="1.4" fill="#1F2F57" />
      {/* neck, face, hair */}
      <rect x="-1.7" y="-25.5" width="3.4" height="3.4" fill="#E2B58C" />
      <circle cx="0" cy="-29.5" r="5.6" fill="#E2B58C" />
      <path d="M-5.8 -30.4 C-6 -36.6 6 -36.6 5.8 -30.4 C3 -33 -3 -33 -5.8 -30.4 Z" fill="#2B2420" />
    </g>
  );
}

export function Pathway({ walked, milestoneDays, unlockedDays = [], names = ['Amy', 'Aaron'], className }: Props) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const days = useMemo(() => normaliseMilestoneDays(milestoneDays), [milestoneDays]);
  const points = useMemo(() => waypointsFor(days.length), [days.length]);
  const d = useMemo(() => pathD(points), [points]);
  const pos = couplePosition(walked, days, points);
  const stage = sceneryStage(walked);
  const [skyTop, skyBottom] = SKIES[Math.min(stage, SKIES.length - 1)];
  const { width, height } = PATH_VIEWBOX;
  const cross = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`Your shared path. ${walked} ${walked === 1 ? 'day' : 'days'} walked together.`}
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBottom} />
        </linearGradient>
        <radialGradient id={`glow-${uid}`}>
          <stop offset="0" stopColor="#D8B56B" stopOpacity="0.55" />
          <stop offset="1" stopColor="#D8B56B" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={width} height={height} fill={`url(#sky-${uid})`} rx="28" />

      {/* light behind the cross, brighter the further you walk */}
      <circle cx={cross.x} cy={cross.y - 10} r={stage >= 5 ? 120 : 80} fill={`url(#glow-${uid})`} opacity={0.5 + stage * 0.1} />

      {/* drifting clouds */}
      <g className={reduce ? undefined : 'animate-drift'} opacity="0.7">
        <ellipse cx="90" cy="70" rx="36" ry="9" fill="#FFFFFF" />
        <ellipse cx="112" cy="62" rx="22" ry="8" fill="#FFFFFF" />
        <ellipse cx="310" cy="120" rx="30" ry="8" fill="#FFFFFF" />
      </g>

      {/* far and near hills */}
      <path d={`M0 ${height * 0.48} Q 90 ${height * 0.34} 190 ${height * 0.44} T ${width} ${height * 0.4} V ${height} H0 Z`} fill="#C9D4C5" />
      <path d={`M0 ${height * 0.64} Q 120 ${height * 0.5} 230 ${height * 0.6} T ${width} ${height * 0.56} V ${height} H0 Z`} fill="#879B83" />
      <path d={`M0 ${height * 0.82} Q 140 ${height * 0.7} 260 ${height * 0.78} T ${width} ${height * 0.74} V ${height} H0 Z`} fill="#6F8A70" />

      {/* scenery that appears as you walk further */}
      {stage >= 2 && (
        <g>
          {[
            [60, 560], [96, 590], [330, 540], [352, 580], [40, 470], [360, 450],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle r="3.2" fill={i % 2 ? '#F2C7AD' : '#D8B56B'} />
              <circle r="1.2" fill="#FAF6EF" />
            </g>
          ))}
        </g>
      )}
      {stage >= 3 && (
        <path d={`M0 ${height * 0.7} q 100 -14 200 0 t 200 0 v 14 q -100 14 -200 0 t -200 0 Z`} fill="#A9C3CC" opacity="0.7" />
      )}
      {stage >= 4 && (
        <g fill="#344B3F" opacity="0.75">
          {[[70, 330], [330, 280], [48, 250]].map(([x, y], i) => (
            <path key={i} transform={`translate(${x} ${y})`} d="M0 0 L-9 20 H9 Z M0 -14 L-7 6 H7 Z" />
          ))}
        </g>
      )}

      {/* the path */}
      <path d={d} fill="none" stroke="#F1EADD" strokeWidth="22" strokeLinecap="round" opacity="0.95" />
      <path d={d} fill="none" stroke="#D8B56B" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 9" opacity="0.9" />

      {/* checkpoints */}
      {points.slice(1).map((p, i) => {
        const dayCount = days[i];
        const earned = unlockedDays.includes(dayCount) || walked >= dayCount;
        return (
          <g key={dayCount} transform={`translate(${p.x} ${p.y})`}>
            <circle r="13" fill={earned ? '#D8B56B' : '#FAF6EF'} stroke={earned ? '#B8924A' : '#879B83'} strokeWidth="2" />
            <text textAnchor="middle" dy="4" fontSize="11" fontWeight="600" fill={earned ? '#344B3F' : '#4A6556'} fontFamily="var(--font-sans)">
              {dayCount}
            </text>
          </g>
        );
      })}

      {/* Calvary: the cross at the end of the path */}
      <g transform={`translate(${cross.x} ${cross.y + 14})`}>
        <Calvary glow={stage >= 5} />
      </g>

      {/* the couple */}
      <motion.g
        initial={false}
        animate={{ x: pos.x, y: pos.y }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 40, damping: 14 }}
      >
        <g className={reduce ? undefined : 'animate-floaty'}>
          <Amy x={-11} label={names[0]} />
          <Aaron x={11} label={names[1]} />
        </g>
      </motion.g>
    </svg>
  );
}
