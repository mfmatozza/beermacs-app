/**
 * The pour, as a single SkSL fragment shader.
 *
 * Everything is procedural — no images, no sprite sheets, no stacked Views.
 * A realistic pint needs five things happening at once, and each of them is a
 * few lines here rather than a component:
 *
 *   1. Optical depth. Beer is a filter, so it goes gold at the surface and
 *      near-brown at the bottom of the glass (Beer–Lambert, roughly).
 *   2. A head that is bubbles, not a white rectangle: two noise scales, a
 *      ragged crest, and a wet underside where the beer shows through.
 *   3. Bubble streams that nucleate in columns, wobble sideways as they rise,
 *      and squash slightly because a moving bubble is not a sphere.
 *   4. Caustics — light bending through liquid that is itself moving.
 *   5. Slosh. Three superimposed waves, damped as the glass fills and the
 *      liquid has less room to move.
 *
 * Uniforms are set from the render loop in PourScreen.
 */
export const BEER_SHADER = `
uniform float2 u_res;    // viewport, in pixels
uniform float  u_time;   // seconds since mount
uniform float  u_fill;   // 0 = empty, 1 = overflowing past the top edge

// ── hashing ─────────────────────────────────────────────────────────────────

float hash21(float2 p) {
  float3 q = fract(p.xyx * float3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float vnoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + float2(1.0, 0.0));
  float c = hash21(i + float2(0.0, 1.0));
  float d = hash21(i + float2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(float2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * vnoise(p);
    p = p * 2.02 + float2(11.3, 7.1);
    amp *= 0.5;
  }
  return sum;
}

// ── the liquid's colour at a given optical depth ────────────────────────────

float3 beerBody(float d) {
  float3 lit  = float3(1.000, 0.812, 0.353);  // backlit gold just under the head
  float3 mid  = float3(0.902, 0.510, 0.055);
  float3 deep = float3(0.353, 0.129, 0.016);  // where the light gives up
  float3 c = mix(lit, mid, smoothstep(0.00, 0.34, d));
  return mix(c, deep, smoothstep(0.30, 1.05, d));
}

// ── rising bubbles ─────────────────────────────────────────────────────────
// Three tiled layers, one bubble per cell. Cell-based rather than a loop over
// individual bubbles, so cost is constant however full the glass is.

float bubbles(float2 p, float t) {
  float acc = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float scale = 11.0 + fi * 8.0;
    float rise  = 0.30 + fi * 0.22;

    float2 g = p * scale;
    g.y -= t * rise * scale * 0.14;      // sampling lower over time reads as rising

    float2 cell = floor(g);
    float2 f = fract(g) - 0.5;

    float h = hash21(cell + fi * 37.0);
    float alive = step(0.66, h);          // beer nucleates in streams, not evenly

    float r = 0.055 + fract(h * 13.7) * 0.075;
    f.x += sin(g.y * 2.1 + h * 40.0) * 0.13;   // lateral wobble on the way up
    f.y *= 1.18;                                // squashed by its own motion

    float d = length(f);
    float rim  = smoothstep(r, r * 0.70, d) - smoothstep(r * 0.62, r * 0.26, d);
    float core = smoothstep(r * 0.90, r * 0.05, d);
    acc += alive * (rim * 0.90 + core * 0.14);
  }
  return acc;
}

// ── main ───────────────────────────────────────────────────────────────────

half4 main(float2 fragCoord) {
  float2 st = fragCoord / u_res;
  float aspect = u_res.x / u_res.y;
  float x = st.x;
  float y = 1.0 - st.y;            // 0 at the bottom of the screen
  float t = u_time;
  float px = 1.0 / u_res.y;        // one pixel, in y units, for anti-aliasing

  // Where the top of the beer sits. Starts just off the bottom edge and ends
  // past the top, so the screen is solid before the cross-fade to the app.
  float level = mix(-0.10, 1.16, u_fill);

  float energy = (1.0 - smoothstep(0.55, 1.0, u_fill)) * 0.85 + 0.15;
  float wave = sin(x *  7.1 + t * 2.10) * 0.0072
             + sin(x * 13.3 - t * 2.90) * 0.0038
             + sin(x *  3.3 + t * 1.30) * 0.0056;
  float surface = level + wave * energy;

  // The head builds through the pour, then compresses as it settles.
  float headH = (0.042 + 0.078 * smoothstep(0.05, 0.62, u_fill))
              * (1.0 - 0.16 * smoothstep(0.80, 1.0, u_fill));

  // Foam is bubbles, so the crest is ragged rather than a line.
  float crest = surface + (fbm(float2(x * 7.0 * aspect, t * 0.30)) - 0.5) * 0.026;

  float liquidMask = smoothstep(crest + px * 1.5, crest - px * 1.5, y);
  float depth = crest - y;         // 0 at the crest, growing downward

  // ── head ──
  float2 fp = float2(x * aspect, y);
  float coarse = fbm(fp * 26.0 + float2(0.0, -t * 0.06));
  float fine   = vnoise(fp * 88.0 + float2(t * 0.04, -t * 0.15));
  float cells  = smoothstep(0.30, 0.82, coarse * 0.72 + fine * 0.38);

  float3 foam = mix(float3(0.792, 0.714, 0.596), float3(1.000, 0.980, 0.945), cells);
  // The underside of the head is wet and lets the beer through.
  foam = mix(foam, float3(0.964, 0.706, 0.271),
             smoothstep(headH * 0.62, headH * 1.05, depth) * 0.58);
  float foamMask = 1.0 - smoothstep(headH * 0.78, headH * 1.04, depth);

  // ── liquid ──
  float bodyDepth = clamp((depth - headH) / max(level, 0.12), 0.0, 1.3);
  float3 beer = beerBody(bodyDepth);

  // The bright band right beneath the head. This is the detail that makes the
  // whole thing read as beer rather than as orange paint.
  beer += float3(1.00, 0.78, 0.34) * smoothstep(0.12, 0.0, depth - headH) * 0.28;

  float caustic = fbm(float2(x * 5.0 * aspect + t * 0.06, y * 3.0 - t * 0.16));
  beer *= 0.86 + caustic * 0.30;

  beer += float3(1.00, 0.94, 0.78) * bubbles(fp, t) * 0.50;

  // Light wrapping at the screen edges. There is deliberately no "bubbles
  // clinging to the glass" pass: the beer fills the screen edge to edge, so
  // there is no glass for them to cling to, and a speckle confined to a narrow
  // band reads as a rendering seam rather than as bubbles.
  float edge = smoothstep(0.075, 0.0, x) + smoothstep(0.925, 1.0, x);
  beer *= 1.0 + edge * 0.085;

  float3 col = mix(beer, foam, foamMask);

  // ── the empty glass above the beer ──
  float3 bg = float3(0.039, 0.035, 0.031);
  bg += float3(0.300, 0.150, 0.030) * smoothstep(0.15, 0.0, y - crest) * 0.90;

  float3 outc = mix(bg, col, liquidMask);

  // Dither. Long amber ramps band badly on OLED without it.
  outc += (hash21(fragCoord + t * 60.0) - 0.5) * 0.010;

  return half4(half3(clamp(outc, 0.0, 1.0)), 1.0);
}
`;
