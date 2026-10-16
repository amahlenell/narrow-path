// The destination of the path: three crosses on a hill, with Christ on the
// centre one. Drawn as a quiet, reverent silhouette (no detail or suffering
// shown), lit by golden light. Origin (0,0) is the base of the hill.

export function Calvary({ glow = false }: { glow?: boolean }) {
  return (
    <g aria-label="Christ on the cross, at the end of the path">
      {/* rays of light */}
      <g stroke="#D8B56B" strokeLinecap="round" opacity={glow ? 0.7 : 0.4}>
        {[-60, -40, -20, 0, 20, 40, 60].map((a) => (
          <line
            key={a}
            x1="0"
            y1="-52"
            x2={Math.sin((a * Math.PI) / 180) * 88}
            y2={-52 - Math.cos((a * Math.PI) / 180) * 88}
            strokeWidth="1.6"
          />
        ))}
      </g>

      {/* hill */}
      <path d="M-64 6 Q -34 -12 0 -10 Q 34 -12 64 6 Z" fill="#6F8A70" />

      {/* the two crosses either side */}
      {[-38, 38].map((x) => (
        <g key={x} transform={`translate(${x} -6) scale(0.62)`} fill="#344B3F">
          <rect x="-2.5" y="-62" width="5" height="62" rx="1.5" />
          <rect x="-16" y="-50" width="32" height="5" rx="1.5" />
        </g>
      ))}

      {/* the central cross */}
      <g transform="translate(0 -8)">
        <rect x="-3.5" y="-78" width="7" height="78" rx="2" fill="#344B3F" />
        <rect x="-24" y="-64" width="48" height="7" rx="2" fill="#344B3F" />
        {/* the sign above his head */}
        <rect x="-8" y="-86" width="16" height="4" rx="1" fill="#344B3F" />

        {/* Christ: head bowed, arms along the beam, body in a simple silhouette */}
        <g fill="#F5E4D0" stroke="#344B3F" strokeWidth="0.8" strokeLinejoin="round">
          <path d="M-22 -62.5 L-6 -60 L6 -60 L22 -62.5 L22 -58.5 L6 -56 L-6 -56 L-22 -58.5 Z" />
          <path d="M-5 -58 C-5 -52 -5.5 -42 -4.5 -34 L-4 -20 L-1.2 -20 L0 -30 L1.2 -20 L4 -20 L4.5 -34 C5.5 -42 5 -52 5 -58 Z" />
          <circle cx="0.8" cy="-62" r="4.6" />
        </g>
        {/* crown of thorns, as a thin line */}
        <path d="M-4.4 -64.4 C-2 -67 3.4 -67 5.6 -64.4" fill="none" stroke="#344B3F" strokeWidth="0.9" />
      </g>
    </g>
  );
}
