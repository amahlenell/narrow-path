
/**
 * Realistic crucifix at the end of the Narrow Path.
 * Uses the generated transparent PNG image.
 *
 * Origin (0,0) is the base of the scene.
 */

export function Calvary({ glow = false }: { glow?: boolean }) {
  return (
    <g aria-label="Jesus Christ on the crucifix, at the end of the path">
      <image
        href="/crucifix.png"
        x="-35"
        y="-105"
        width="70"
        height="105"
        preserveAspectRatio="xMidYMid meet"
        style={{
          filter: glow
            ? "drop-shadow(0 0 12px rgba(216,181,107,0.8))"
            : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
          transition: "filter 0.5s ease",
        }}
      />
    </g>
  );
}
