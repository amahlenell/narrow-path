import { useId } from "react";

export function Calvary({ glow = false }: { glow?: boolean }) {
  const haloId = useId();
  const blurId = useId();

  const crossColor = "#344B3F";
  const hillColor = "#6F8A70";
  const lightColor = "#D8B56B";

  return (
    <g aria-label="Christ on the cross at Calvary">
      <defs>
        <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={lightColor} stopOpacity={glow ? 0.55 : 0.28} />
          <stop offset="45%" stopColor={lightColor} stopOpacity={glow ? 0.22 : 0.1} />
          <stop offset="100%" stopColor={lightColor} stopOpacity="0" />
        </radialGradient>

        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={glow ? 4 : 2.5} />
        </filter>
      </defs>

      {/* soft golden glow behind the centre cross */}
      <g opacity={1}>
        <circle
          cx="0"
          cy="-56"
          r={glow ? 34 : 26}
          fill={`url(#${haloId})`}
          filter={`url(#${blurId})`}
        />
      </g>

      {/* rays of light */}
      <g
        stroke={lightColor}
        strokeLinecap="round"
        opacity={glow ? 0.55 : 0.28}
      >
        {[-70, -50, -30, -10, 10, 30, 50, 70].map((a) => (
          <line
            key={a}
            x1="0"
            y1="-56"
            x2={Math.sin((a * Math.PI) / 180) * 92}
            y2={-56 - Math.cos((a * Math.PI) / 180) * 92}
            strokeWidth="1.4"
          />
        ))}
      </g>

      {/* hill */}
      <path
        d="M-72 8 Q -52 -2 -32 -5 Q -12 -8 0 -13 Q 12 -8 32 -5 Q 52 -2 72 8 L72 18 L-72 18 Z"
        fill={hillColor}
      />

      {/* side crosses */}
      <g opacity="0.92" fill={crossColor}>
        <g transform="translate(-38 -7) scale(0.62)">
          <rect x="-2.4" y="-60" width="4.8" height="60" rx="1.4" />
          <rect x="-15" y="-47" width="30" height="4.8" rx="1.4" />
        </g>

        <g transform="translate(38 -7) scale(0.62)">
          <rect x="-2.4" y="-60" width="4.8" height="60" rx="1.4" />
          <rect x="-15" y="-47" width="30" height="4.8" rx="1.4" />
        </g>
      </g>

      {/* centre cross */}
      <g transform="translate(0 -8)">
        {/* cross */}
        <rect x="-3.8" y="-82" width="7.6" height="82" rx="2" fill={crossColor} />
        <rect x="-25" y="-66" width="50" height="7.2" rx="2" fill={crossColor} />
        <rect x="-7" y="-90" width="14" height="4" rx="1" fill={crossColor} />

        {/* Christ as a simple silhouette */}
        <g fill={crossColor}>
          {/* arms draped along the beam */}
          <path d="M-21 -62.5 Q-13 -60.5 -6 -60 Q0 -59.7 6 -60 Q13 -60.5 21 -62.5 L21 -58.5 Q13 -56.8 6 -56.4 Q0 -56.1 -6 -56.4 Q-13 -56.8 -21 -58.5 Z" />

          {/* head */}
          <circle cx="0" cy="-63" r="4.8" />

          {/* torso and legs */}
          <path d="M-5.4 -57.5
                   Q-5.1 -48 -4.5 -39
                   Q-4 -32 -3.2 -24
                   L-1.8 -16
                   L-0.4 -16
                   L0 -27
                   L0.4 -16
                   L1.8 -16
                   L3.2 -24
                   Q4 -32 4.5 -39
                   Q5.1 -48 5.4 -57.5
                   Q3.2 -56.3 0 -56.3
                   Q-3.2 -56.3 -5.4 -57.5 Z" />
        </g>

        {/* subtle crown line */}
        <path
          d="M-4.3 -65 C-2.2 -67 2.2 -67 4.3 -65"
          fill="none"
          stroke={lightColor}
          strokeWidth="0.75"
          opacity="0.9"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}