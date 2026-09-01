/**
 * Ambient background: beer particles drifting up a warm, glowing ground.
 *
 * Distinct from the pour shader in lib/beer-shader.ts, which fills the screen
 * with liquid. This one sits BEHIND the UI, so every choice is about not
 * competing with type:
 *
 *   - Bubbles drift rather than rise. The pour's bubbles accelerate; these move
 *     slowly and wobble, so peripheral vision reads them as atmosphere instead
 *     of as motion demanding attention.
 *   - Two bloom sources, both off-centre and soft: a broad amber wash at the top
 *     behind the wordmark, and a dimmer one low down so the screen does not go
 *     flat black at the bottom. This is what stops the app reading as a black
 *     rectangle.
 *   - Nothing is fully opaque. Text sits on top at full contrast; the ground
 *     never gets brighter than roughly 12% luminance.
 */
export const AMBIENT_SHADER = `
uniform float2 u_res;
uniform float  u_time;

float hash21(float2 p) {
  float3 q = fract(p.xyx * float3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

// One soft radial bloom. falloff above 1 tightens it.
float bloom(float2 uv, float2 at, float radius, float falloff) {
  float d = length((uv - at) / float2(1.0, 1.0)) / radius;
  return pow(max(0.0, 1.0 - d), falloff);
}

// Drifting bubbles. Cell-based, so cost is fixed regardless of count.
float particles(float2 p, float t) {
  float acc = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float scale = 4.5 + fi * 3.2;
    float drift = 0.020 + fi * 0.012;

    float2 g = p * scale;
    g.y -= t * drift * scale;

    float2 cell = floor(g);
    float2 f = fract(g) - 0.5;

    float h = hash21(cell + fi * 23.0);
    float alive = step(0.80, h);

    float r = 0.030 + fract(h * 11.3) * 0.055;
    // Lateral sway, slower and wider than in the pour.
    f.x += sin(g.y * 1.1 + h * 30.0 + t * 0.35) * 0.20;

    float d = length(f);
    // A ring with a faint fill — a bubble seen against a dark ground.
    float rim = smoothstep(r, r * 0.74, d) - smoothstep(r * 0.66, r * 0.34, d);
    float core = smoothstep(r * 0.9, 0.0, d) * 0.16;
    acc += alive * (rim * 0.55 + core);
  }
  return acc;
}

half4 main(float2 fragCoord) {
  float2 st = fragCoord / u_res;
  float aspect = u_res.x / u_res.y;
  float x = st.x;
  float y = 1.0 - st.y;
  float t = u_time;

  // Warm near-black, a touch lifted off #0A0908 so the screen has a floor
  // rather than a void.
  float3 col = float3(0.055, 0.048, 0.040);

  float2 uv = float2(x * aspect, y);

  // Top bloom, behind the wordmark. Broad and amber.
  col += float3(0.62, 0.36, 0.07)
       * bloom(uv, float2(0.50 * aspect, 0.86), 0.80, 2.3) * 0.40;

  // A second, tighter highlight slightly off-centre, so the glow has a source
  // instead of looking like a uniform vignette.
  col += float3(0.75, 0.47, 0.12)
       * bloom(uv, float2(0.34 * aspect, 0.80), 0.38, 2.8) * 0.24;

  // Low bloom, so the bottom of the screen is not flat.
  col += float3(0.34, 0.17, 0.03)
       * bloom(uv, float2(0.66 * aspect, -0.06), 0.70, 2.2) * 0.42;

  // Very slow breathing, so a static screen still feels alive. Deliberately
  // under 4% — any more and it reads as a flicker bug.
  col *= 0.97 + 0.035 * sin(t * 0.42);

  col += float3(1.00, 0.86, 0.58) * particles(uv, t) * 0.30;

  // Dither: long amber ramps band badly on OLED.
  col += (hash21(fragCoord + t * 60.0) - 0.5) * 0.008;

  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}
`;
