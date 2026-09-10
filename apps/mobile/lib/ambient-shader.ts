/**
 * Ambient background: a still, dark table — not a drink.
 *
 * Replaces the earlier amber-bubble-field concept entirely (that one read as
 * "brown liquid with floating circles", not as a beer-pong app). This is
 * deliberately restrained: a near-black charcoal ground, a soft vignette, a
 * faint far net-line and cup-rack triangle (the one piece of geometry a
 * beer-pong table actually has), and fine dither to stop OLED banding.
 * Static by construction — see AmbientBeer.tsx, which renders this once, not
 * per frame. No bloom, no gradient wash, no glow: it sits behind type, it
 * does not compete with it.
 */
export const AMBIENT_SHADER = `
uniform float2 u_res;

float hash21(float2 p) {
  float3 q = fract(p.xyx * float3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

// Distance-to-ring outline at radius r, edge half-thickness w.
float ring(float2 p, float2 at, float r, float w) {
  float d = abs(length(p - at) - r);
  return smoothstep(w, 0.0, d);
}

half4 main(float2 fragCoord) {
  float2 res = u_res;
  float aspect = res.x / res.y;
  float2 st = fragCoord / res;
  // Centred, aspect-corrected, y up-positive.
  float2 uv = float2((st.x - 0.5) * aspect, 0.5 - st.y);

  // Charcoal, not brown — a hair above pure black so the screen has a floor.
  float3 col = float3(0.043, 0.038, 0.034);

  // Soft vignette: darker at the corners, never fully black.
  float vign = smoothstep(0.95, 0.10, length(uv) / (aspect * 0.62));
  col *= mix(0.76, 1.0, vign);

  // The far net-line — the one horizontal mark an actual table has, set low
  // so it reads as ground, not as a UI divider.
  float lineY = -0.08;
  float netLine = smoothstep(0.0022, 0.0, abs(uv.y - lineY))
                * smoothstep(aspect * 0.60, aspect * 0.08, abs(uv.x));
  col += float3(0.85, 0.78, 0.62) * netLine * 0.045;

  // A faint six-cup triangle rack, low and off-centre — restrained texture,
  // not a decoration fighting for attention.
  float2 rackOrigin = float2(aspect * 0.24, -0.32);
  float spacing = 0.088;
  float rack = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float row = fi < 0.5 ? 0.0 : (fi < 2.5 ? 1.0 : 2.0);
    float col_ = fi < 0.5 ? 0.0 : (fi < 2.5 ? fi - 1.0 : fi - 3.0);
    float2 at = rackOrigin + float2((col_ - row * 0.5) * spacing, row * spacing * 0.9);
    rack += ring(uv, at, spacing * 0.32, 0.0026);
  }
  col += float3(0.85, 0.78, 0.62) * rack * 0.05;

  // Fine static dither — long charcoal ramps band badly on OLED otherwise.
  col += (hash21(fragCoord) - 0.5) * 0.012;

  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}
`;
