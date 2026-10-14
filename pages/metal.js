/*! ESSUGGEST: vanilla port of metal-fx v2.0.11 (c) Jakub Antalik, MIT License - https://github.com/Jakubantalik/metal-fx
 *  Uses the liquidMetal shader from Paper Shaders (c) Paper Design, Inc., Apache License 2.0 - https://github.com/paper-design/shaders
 *  The React components were replaced by EssuMetal.mount() (see the bottom of this file); the engine is unchanged. */
(() => {
"use strict";
function gs(t) {
  let e = t.replace("#", "");
  return e.length === 3 && (e = e[0] + e[0] + e[1] + e[1] + e[2] + e[2]), [parseInt(e.slice(0, 2), 16) / 255, parseInt(e.slice(2, 4), 16) / 255, parseInt(e.slice(4, 6), 16) / 255];
}
function vo(t) {
  let e = t.replace("#", "");
  (e.length === 3 || e.length === 4) && (e = e.split("").map((o) => o + o).join(""));
  const n = e.length >= 8 ? parseInt(e.slice(6, 8), 16) / 255 : 1;
  return [
    parseInt(e.slice(0, 2), 16) / 255,
    parseInt(e.slice(2, 4), 16) / 255,
    parseInt(e.slice(4, 6), 16) / 255,
    n
  ];
}
function ca(t, e, n) {
  t /= 255, e /= 255, n /= 255;
  const o = Math.max(t, e, n), a = Math.min(t, e, n), i = o - a;
  let r = 0;
  const l = o === 0 ? 0 : i / o;
  return i !== 0 && (o === t ? r = ((e - n) / i + 6) % 6 : o === e ? r = (n - t) / i + 2 : r = (t - e) / i + 4, r /= 6), [r, l, o];
}
function ua(t, e, n) {
  const o = Math.floor(t * 6), a = t * 6 - o, i = n * (1 - e), r = n * (1 - a * e), l = n * (1 - (1 - a) * e);
  let s = 0, c = 0, u = 0;
  switch (o % 6) {
    case 0:
      s = n, c = l, u = i;
      break;
    case 1:
      s = r, c = n, u = i;
      break;
    case 2:
      s = i, c = n, u = l;
      break;
    case 3:
      s = i, c = r, u = n;
      break;
    case 4:
      s = l, c = i, u = n;
      break;
    case 5:
      s = n, c = i, u = r;
      break;
  }
  return [Math.round(s * 255), Math.round(c * 255), Math.round(u * 255)];
}
let qa = 66; // ms between shader frames: the original caps the metal at ~15 fps (66). setFrameMs() changes it.
const Ka = 66, Qa = 1500, Za = 1, bo = 16, Ja = 96, tr = 2, er = 0, xs = 1, vs = 2, bs = 3, ws = 4, ys = 0, nr = 1, Ms = 2, Se = {
  colorBack: "#00000000",
  speed: 1,
  repetition: 1.5,
  softness: 0.05,
  shiftRed: 0.3,
  shiftBlue: 0.3,
  distortion: 0.1,
  contour: 0.4,
  angle: 90,
  shape: er,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  originX: 0.5,
  originY: 0.5,
  worldWidth: 0,
  worldHeight: 0,
  fit: nr
}, or = {
  name: "chromatic",
  modes: {
    // Cool blue burn with the dispersion pushed well past Paper's default —
    // the R/B channel split is the only knob that produces colour separation
    // in this shader, so it carries what the 5-stop palette used to do.
    dark: { ...Se, colorTint: "#88ccff2e", shiftRed: 0.75, shiftBlue: 0.75, repetition: 2, softness: 0.09, shaderOpacity: 1 },
    light: { ...Se, colorTint: "#66b0ff99", shiftRed: 0.6, shiftBlue: 0.6, shaderOpacity: 1 }
  }
}, ar = {
  name: "silver",
  modes: {
    // White tint at low amount = Paper's material essentially untouched.
    dark: { ...Se, colorTint: "#ffffff66", shaderOpacity: 0.88 },
    light: { ...Se, colorTint: "#ffffff40", shaderOpacity: 1 }
  }
}, rr = {
  name: "gold",
  modes: {
    dark: { ...Se, colorTint: "#ffcc55cc", speed: 0.85, shaderOpacity: 0.92 },
    light: { ...Se, colorTint: "#f7d488aa", shaderOpacity: 1 }
  }
}, gr_ = {
  name: "green",
  modes: {
    // ESSUGGEST brand green: a green burn tint, with the red/blue channel split turned way down
    // so the metal stays green instead of splitting into a rainbow.
    dark: { ...Se, colorTint: "#4ade80d9", shiftRed: 0.1, shiftBlue: 0.1, softness: 0.07, shaderOpacity: 1 },
    light: { ...Se, colorTint: "#22c55ee6", shiftRed: 0.08, shiftBlue: 0.08, shaderOpacity: 1 }
  }
}, da = {
  chromatic: or,
  silver: ar,
  gold: rr,
  green: gr_
}, ir = `
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
`, sr = `
vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
`, lr = `
  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);
`, cr = `
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`, ur = `#version 300 es
precision mediump float;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform vec2 u_resolution;
uniform float u_time;

uniform vec4 u_colorBack;
uniform vec4 u_colorTint;

uniform float u_softness;
uniform float u_repetition;
uniform float u_shiftRed;
uniform float u_shiftBlue;
uniform float u_distortion;
uniform float u_contour;
uniform float u_angle;

uniform float u_shape;
uniform bool u_isImage;

in vec2 v_objectUV;
in vec2 v_responsiveUV;
in vec2 v_responsiveBoxGivenSize;
in vec2 v_imageUV;

out vec4 fragColor;

${ir}
${sr}
${cr}

float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump, float tint) {

  float ch = mix(c2, c1, smoothstep(.0, 2. * blur, stripe_p));

  float border = w[0];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));

  if (u_isImage == true) {
    bump = smoothstep(.2, .8, bump);
  }
  border = w[0] + .4 * (1. - bump) * w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));

  border = w[0] + .5 * (1. - bump) * w[1];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));

  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));

  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
  ch = mix(ch, gradient, smoothstep(border, border + .5 * blur, stripe_p));

  // Tint color is applied with color burn blending
  ch = mix(ch, 1. - min(1., (1. - ch) / max(tint, 0.0001)), u_colorTint.a);
  return ch;
}

float getImgFrame(vec2 uv, float th) {
  float frame = 1.;
  frame *= smoothstep(0., th, uv.y);
  frame *= 1.0 - smoothstep(1. - th, 1., uv.y);
  frame *= smoothstep(0., th, uv.x);
  frame *= 1.0 - smoothstep(1. - th, 1., uv.x);
  return frame;
}

float blurEdge3x3(sampler2D tex, vec2 uv, vec2 dudx, vec2 dudy, float radius, float centerSample) {
  vec2 texel = 1.0 / vec2(textureSize(tex, 0));
  vec2 r = radius * texel;

  float w1 = 1.0, w2 = 2.0, w4 = 4.0;
  float norm = 16.0;
  float sum = w4 * centerSample;

  sum += w2 * textureGrad(tex, uv + vec2(0.0, -r.y), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(0.0, r.y), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(-r.x, 0.0), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(r.x, 0.0), dudx, dudy).r;

  sum += w1 * textureGrad(tex, uv + vec2(-r.x, -r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(r.x, -r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(-r.x, r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(r.x, r.y), dudx, dudy).r;

  return sum / norm;
}

float lst(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {

  const float firstFrameOffset = 2.8;
  float t = .3 * (u_time + firstFrameOffset);

  vec2 uv = v_imageUV;
  vec2 dudx = dFdx(v_imageUV);
  vec2 dudy = dFdy(v_imageUV);
  vec4 img = textureGrad(u_image, uv, dudx, dudy);

  if (u_isImage == false) {
    uv = v_objectUV + .5;
    uv.y = 1. - uv.y;
  }

  float cycleWidth = u_repetition;
  float edge = 0.;
  float contOffset = 1.;

  vec2 rotatedUV = uv - vec2(.5);
  float angle = (-u_angle + 70.) * PI / 180.;
  float cosA = cos(angle);
  float sinA = sin(angle);
  rotatedUV = vec2(
  rotatedUV.x * cosA - rotatedUV.y * sinA,
  rotatedUV.x * sinA + rotatedUV.y * cosA
  ) + vec2(.5);

  if (u_isImage == true) {
    float edgeRaw = img.r;
    edge = blurEdge3x3(u_image, uv, dudx, dudy, 6., edgeRaw);
    edge = pow(edge, 1.6);
    edge *= mix(0.0, 1.0, smoothstep(0.0, 0.4, u_contour));
  } else {
    if (u_shape < 1.) {
      // full-fill on canvas
      vec2 borderUV = v_responsiveUV + .5;
      float ratio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
      vec2 mask = min(borderUV, 1. - borderUV);
      vec2 pixel_thickness = min(250. / v_responsiveBoxGivenSize, vec2(.5));
      float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
      float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
      maskX = pow(maskX, .25);
      maskY = pow(maskY, .25);
      edge = clamp(1. - maskX * maskY, 0., 1.);

      uv = v_responsiveUV;
      if (ratio > 1.) {
        uv.y /= ratio;
      } else {
        uv.x *= ratio;
      }
      uv += .5;
      uv.y = 1. - uv.y;

      cycleWidth *= 2.;
      contOffset = 1.5;

    } else if (u_shape < 2.) {
      // circle
      vec2 shapeUV = uv - .5;
      shapeUV *= .67;
      edge = pow(clamp(3. * length(shapeUV), 0., 1.), 18.);
    } else if (u_shape < 3.) {
      // daisy
      vec2 shapeUV = uv - .5;
      shapeUV *= 1.68;

      float r = length(shapeUV) * 2.;
      float a = atan(shapeUV.y, shapeUV.x) + .2;
      r *= (1. + .05 * sin(3. * a + 2. * t));
      float f = abs(cos(a * 3.));
      edge = smoothstep(f, f + .7, r);
      edge *= edge;

      uv *= .8;
      cycleWidth *= 1.6;

    } else if (u_shape < 4.) {
      // diamond
      vec2 shapeUV = uv - .5;
      shapeUV = rotate(shapeUV, .25 * PI);
      shapeUV *= 1.42;
      shapeUV += .5;
      vec2 mask = min(shapeUV, 1. - shapeUV);
      vec2 pixel_thickness = vec2(.15);
      float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
      float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
      maskX = pow(maskX, .25);
      maskY = pow(maskY, .25);
      edge = clamp(1. - maskX * maskY, 0., 1.);
    } else if (u_shape < 5.) {
      // metaballs
      vec2 shapeUV = uv - .5;
      shapeUV *= 1.3;
      edge = 0.;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float speed = 1.5 + 2./3. * sin(fi * 12.345);
        float angle = -fi * 1.5;
        vec2 dir1 = vec2(cos(angle), sin(angle));
        vec2 dir2 = vec2(cos(angle + 1.57), sin(angle + 1.));
        vec2 traj = .4 * (dir1 * sin(t * speed + fi * 1.23) + dir2 * cos(t * (speed * 0.7) + fi * 2.17));
        float d = length(shapeUV + traj);
        edge += pow(1.0 - clamp(d, 0.0, 1.0), 4.0);
      }
      edge = 1. - smoothstep(.65, .9, edge);
      edge = pow(edge, 4.);
    }

    edge = mix(smoothstep(.9 - 2. * fwidth(edge), .9, edge), edge, smoothstep(0.0, 0.4, u_contour));

  }

  float opacity = 0.;
  if (u_isImage == true) {
    opacity = img.g;
    float frame = getImgFrame(v_imageUV, 0.);
    opacity *= frame;
  } else {
    opacity = 1. - smoothstep(.9 - 2. * fwidth(edge), .9, edge);
    if (u_shape < 2.) {
      edge = 1.2 * edge;
    } else if (u_shape < 5.) {
      edge = 1.8 * pow(edge, 1.5);
    }
  }

  float diagBLtoTR = rotatedUV.x - rotatedUV.y;
  float diagTLtoBR = rotatedUV.x + rotatedUV.y;

  vec3 color = vec3(0.);
  vec3 color1 = vec3(.98, 0.98, 1.);
  vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, diagTLtoBR));

  vec2 grad_uv = uv - .5;

  float dist = length(grad_uv + vec2(0., .2 * diagBLtoTR));
  grad_uv = rotate(grad_uv, (.25 - .2 * diagBLtoTR) * PI);
  float direction = grad_uv.x;

  float bump = pow(1.8 * dist, 1.2);
  bump = 1. - bump;
  bump *= pow(uv.y, .3);


  float thin_strip_1_ratio = .12 / cycleWidth * (1. - .4 * bump);
  float thin_strip_2_ratio = .07 / cycleWidth * (1. + .4 * bump);
  float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);

  float thin_strip_1_width = cycleWidth * thin_strip_1_ratio;
  float thin_strip_2_width = cycleWidth * thin_strip_2_ratio;

  float noise = snoise(uv - t);

  edge += (1. - edge) * u_distortion * noise;

  direction += diagBLtoTR;
  float contour = 0.;
  direction -= 2. * noise * diagBLtoTR * (smoothstep(0., 1., edge) * (1.0 - smoothstep(0., 1., edge)));
  direction *= mix(1., 1. - edge, smoothstep(.5, 1., u_contour));
  direction -= 1.7 * edge * smoothstep(.5, 1., u_contour);
  direction += .2 * pow(u_contour, 4.) * (1.0 - smoothstep(0., 1., edge));

  bump *= clamp(pow(uv.y, .1), .3, 1.);
  direction *= (.1 + (1.1 - edge) * bump);

  direction *= (.4 + .6 * (1.0 - smoothstep(.5, 1., edge)));
  direction += .18 * (smoothstep(.1, .2, uv.y) * (1.0 - smoothstep(.2, .4, uv.y)));
  direction += .03 * (smoothstep(.1, .2, 1. - uv.y) * (1.0 - smoothstep(.2, .4, 1. - uv.y)));

  direction *= (.5 + .5 * pow(uv.y, 2.));
  direction *= cycleWidth;
  direction -= t;


  float colorDispersion = (1. - bump);
  colorDispersion = clamp(colorDispersion, 0., 1.);
  float dispersionRed = colorDispersion;
  dispersionRed += .03 * bump * noise;
  dispersionRed += 5. * (smoothstep(-.1, .2, uv.y) * (1.0 - smoothstep(.1, .5, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, 1., bump)));
  dispersionRed -= diagBLtoTR;

  float dispersionBlue = colorDispersion;
  dispersionBlue *= 1.3;
  dispersionBlue += (smoothstep(0., .4, uv.y) * (1.0 - smoothstep(.1, .8, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, .8, bump)));
  dispersionBlue -= .2 * edge;

  dispersionRed *= (u_shiftRed / 20.);
  dispersionBlue *= (u_shiftBlue / 20.);

  float blur = 0.;
  float rExtraBlur = 0.;
  float gExtraBlur = 0.;
  if (u_isImage == true) {
    float softness = 0.05 * u_softness;
    blur = softness + .5 * smoothstep(1., 10., u_repetition) * smoothstep(.0, 1., edge);
    float smallCanvasT = 1.0 - smoothstep(100., 500., min(u_resolution.x, u_resolution.y));
    blur += smallCanvasT * smoothstep(.0, 1., edge);
    rExtraBlur = softness * (0.05 + .1 * (u_shiftRed / 20.) * bump);
    gExtraBlur = softness * 0.05 / max(0.001, abs(1. - diagBLtoTR));
  } else {
    blur = u_softness / 15. + .3 * contour;
  }

  vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
  w[1] -= .02 * smoothstep(.0, 1., edge + bump);
  float stripe_r = fract(direction + dispersionRed);
  float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + fwidth(stripe_r) + rExtraBlur, bump, u_colorTint.r);
  float stripe_g = fract(direction);
  float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + fwidth(stripe_g) + gExtraBlur, bump, u_colorTint.g);
  float stripe_b = fract(direction - dispersionBlue);
  float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + fwidth(stripe_b), bump, u_colorTint.b);

  color = vec3(r, g, b);
  color *= opacity;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1. - opacity);
  opacity = opacity + u_colorBack.a * (1. - opacity);

  ${lr}

  fragColor = vec4(color, opacity);
}
`, dr = (
  /* glsl */
  `#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_imageAspectRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_objectUV;
out vec2 v_objectBoxSize;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;
out vec2 v_patternUV;
out vec2 v_patternBoxSize;
out vec2 v_imageUV;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  // fit = none
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) { // fit = contain
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) { // fit = cover
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;

  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);


  // ===================================================

  float fixedRatio = 1.;
  vec2 fixedRatioBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  v_objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // ===================================================

  v_responsiveBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // ===================================================

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;

  vec3 boxSizeData = getBoxSize(patternBoxRatio, patternBoxGivenSize);
  v_patternBoxSize = boxSizeData.xy;
  float patternBoxNoFitBoxWidth = boxSizeData.z;
  vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  // x100 is a default multiplier between vertex and fragmant shaders
  // we use it to avoid UV presision issues
  v_patternUV *= .01;

  // ===================================================

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}`
), fr = ur;
function wo(t, e, n) {
  const o = t.createShader(e);
  if (!o) throw new Error("metal-fx: gl.createShader returned null");
  if (t.shaderSource(o, n), t.compileShader(o), !t.getShaderParameter(o, t.COMPILE_STATUS)) {
    const a = t.getShaderInfoLog(o);
    throw t.deleteShader(o), new Error(`metal-fx: shader compile failed: ${a ?? "(no info log)"}`);
  }
  return o;
}
function hr(t, e, n) {
  const o = t.createProgram();
  if (!o) throw new Error("metal-fx: gl.createProgram returned null");
  if (t.attachShader(o, e), t.attachShader(o, n), t.linkProgram(o), !t.getProgramParameter(o, t.LINK_STATUS)) {
    const a = t.getProgramInfoLog(o);
    throw t.deleteProgram(o), new Error(`metal-fx: program link failed: ${a ?? "(no info log)"}`);
  }
  return o;
}
const fa = 140, ha = 40, ma = 1.6, pa = 1.3;
let x = null, he = null;
function mr() {
  var t;
  if (he !== null) return he;
  if (typeof document > "u") return he = !1;
  try {
    const n = document.createElement("canvas").getContext("webgl2");
    he = !!n, (t = n == null ? void 0 : n.getExtension("WEBGL_lose_context")) == null || t.loseContext();
  } catch {
    he = !1;
  }
  return he;
}
let en = null;
function pr(t) {
  en = t;
}
const gr = [
  // Fragment stage (Paper liquidMetal)
  "u_resolution",
  "u_time",
  "u_pixelRatio",
  "u_colorBack",
  "u_colorTint",
  "u_repetition",
  "u_softness",
  "u_shiftRed",
  "u_shiftBlue",
  "u_distortion",
  "u_contour",
  "u_angle",
  "u_shape",
  "u_isImage",
  "u_image",
  // Vertex stage (Paper sizing)
  "u_originX",
  "u_originY",
  "u_worldWidth",
  "u_worldHeight",
  "u_fit",
  "u_scale",
  "u_rotation",
  "u_offsetX",
  "u_offsetY",
  "u_imageAspectRatio"
];
function yo(t) {
  t.enable(t.BLEND), t.blendFunc(t.ONE, t.ONE_MINUS_SRC_ALPHA);
  const e = wo(t, t.VERTEX_SHADER, dr), n = wo(t, t.FRAGMENT_SHADER, fr), o = hr(t, e, n);
  t.useProgram(o);
  const a = t.createBuffer();
  if (!a) throw new Error("metal-fx: gl.createBuffer returned null");
  t.bindBuffer(t.ARRAY_BUFFER, a), t.bufferData(t.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), t.STATIC_DRAW);
  const i = t.getAttribLocation(o, "a_position");
  t.enableVertexAttribArray(i), t.vertexAttribPointer(i, 2, t.FLOAT, !1, 0, 0);
  const r = {};
  for (const s of gr) r[s] = t.getUniformLocation(o, s);
  const l = t.createTexture();
  return l && (t.activeTexture(t.TEXTURE0), t.bindTexture(t.TEXTURE_2D, l), t.texImage2D(
    t.TEXTURE_2D,
    0,
    t.RGBA,
    1,
    1,
    0,
    t.RGBA,
    t.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255])
  ), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MIN_FILTER, t.LINEAR), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MAG_FILTER, t.LINEAR), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_S, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_T, t.CLAMP_TO_EDGE), r.u_image && t.uniform1i(r.u_image, 0)), { program: o, buffer: a, uniforms: r, dummyTexture: l };
}
function Kn() {
  if (x) return x;
  const t = Math.min(tr, typeof window < "u" && window.devicePixelRatio || 1), e = Math.round(Ja * t), n = typeof OffscreenCanvas < "u";
  let o, a;
  if (n)
    o = new OffscreenCanvas(e, e), a = o.getContext("webgl2", {
      alpha: !0,
      premultipliedAlpha: !0,
      antialias: !1
    });
  else {
    const d = document.createElement("canvas");
    d.width = e, d.height = e, a = d.getContext("webgl2", {
      alpha: !0,
      premultipliedAlpha: !0,
      antialias: !1,
      preserveDrawingBuffer: !0
    }), o = d;
  }
  if (!a) throw new Error("metal-fx: WebGL2 not supported");
  const { program: i, buffer: r, uniforms: l, dummyTexture: s } = yo(a), c = (d) => {
    d.preventDefault(), x && (x.contextLost = !0);
  }, u = () => {
    if (!x) return;
    const d = yo(x.gl);
    x.program = d.program, x.buffer = d.buffer, x.uniforms = d.uniforms, x.dummyTexture = d.dummyTexture, x.presetDirty = !0, x.contextLost = !1, en == null || en();
  };
  return o.addEventListener("webglcontextlost", c, !1), o.addEventListener("webglcontextrestored", u, !1), x = {
    glCanvas: o,
    gl: a,
    program: i,
    buffer: r,
    uniforms: l,
    dummyTexture: s,
    preset: da.chromatic.modes.dark,
    presetDirty: !0,
    contextLost: !1,
    useOffscreen: n,
    frameBitmap: null,
    startMs: performance.now(),
    pausedMs: 0,
    pausedAtMs: null,
    rafId: 0,
    dpr: t,
    instances: /* @__PURE__ */ new Set(),
    frameCount: 0,
    glowQueue: [],
    glowIdx: 0,
    glowSkip: 0,
    glowPixels: new Uint8Array(e * e * 4),
    glowPixelsW: e,
    glowPixelsH: e
  }, x;
}
function xr() {
  var i;
  if (!x) return;
  const { gl: t, program: e, buffer: n, frameBitmap: o, dummyTexture: a } = x;
  try {
    o == null || o.close(), t.deleteBuffer(n), t.deleteProgram(e), a && t.deleteTexture(a), (i = t.getExtension("WEBGL_lose_context")) == null || i.loseContext();
  } catch {
  }
  x = null;
}
let Mo = 0;
function vr() {
  if (!x) return;
  const t = performance.now();
  if (t - Mo < Qa) return;
  Mo = t;
  const { gl: e, glCanvas: n } = x, o = n.width, a = n.height;
  (x.glowPixelsW !== o || x.glowPixelsH !== a) && (x.glowPixelsW = o, x.glowPixelsH = a, x.glowPixels = new Uint8Array(o * a * 4)), e.readPixels(0, 0, o, a, e.RGBA, e.UNSIGNED_BYTE, x.glowPixels);
}
const me = { bx: 0, by: 0 };
function ln(t, e, n) {
  if (!x)
    return me.bx = 0, me.by = 0, me;
  const { glCanvas: o } = x, a = o.width, i = o.height, r = t.dpr, l = t.cssWidth * r, s = t.cssHeight * r, c = fa * r, u = ha * r;
  let d = l * (a / c) / t.shaderScale, h = s * (i / u) / t.shaderScale;
  d > a && (d = a), h > i && (h = i);
  const f = (a - d) / 2, p = (i - h) / 2, g = f + e / t.cssWidth * d, v = p + n / t.cssHeight * h;
  return me.bx = Math.round(g), me.by = Math.round(i - 1 - v), me;
}
const Ct = { r: 0, g: 0, b: 0, lum: 0, count: 0 };
function ga(t, e, n, o, a, i) {
  const r = Math.max(1, i | 0), l = Math.max(0, o - r), s = Math.min(e, o + r + 1), c = Math.max(0, a - r), u = Math.min(n, a + r + 1);
  Ct.r = 0, Ct.g = 0, Ct.b = 0, Ct.lum = 0, Ct.count = 0;
  for (let d = c; d < u; d++) {
    const h = d * e;
    for (let f = l; f < s; f++) {
      const p = (h + f) * 4;
      Ct.r += t[p], Ct.g += t[p + 1], Ct.b += t[p + 2], Ct.lum += (0.2126 * t[p] + 0.7152 * t[p + 1] + 0.0722 * t[p + 2]) / 255, Ct.count++;
    }
  }
  return Ct;
}
const lt = { r: 255, g: 255, b: 255 };
function Fn(t, e, n, o) {
  if (!x) return 0;
  const a = ln(t, e, n), i = ga(x.glowPixels, x.glowPixelsW, x.glowPixelsH, a.bx, a.by, o);
  return i.count > 0 ? i.lum / i.count : 0;
}
function xa(t, e, n, o) {
  if (!x)
    return lt.r = 255, lt.g = 255, lt.b = 255, lt;
  const a = ln(t, e, n), i = ga(x.glowPixels, x.glowPixelsW, x.glowPixelsH, a.bx, a.by, o);
  return i.count === 0 ? (lt.r = 255, lt.g = 255, lt.b = 255, lt) : (lt.r = i.r / i.count, lt.g = i.g / i.count, lt.b = i.b / i.count, lt);
}
function br(t, e, n, o) {
  if (!x)
    return lt.r = 255, lt.g = 255, lt.b = 255, lt;
  const a = ln(t, e, n), { glowPixels: i, glowPixelsW: r, glowPixelsH: l } = x, s = Math.max(1, o | 0), c = Math.max(0, a.bx - s), u = Math.min(r, a.bx + s + 1), d = Math.max(0, a.by - s), h = Math.min(l, a.by + s + 1);
  let f = -1;
  lt.r = 255, lt.g = 255, lt.b = 255;
  for (let p = d; p < h; p++) {
    const g = p * r;
    for (let v = c; v < u; v++) {
      const m = (g + v) * 4, b = i[m], w = i[m + 1], M = i[m + 2], y = Math.max(b, w, M), C = Math.min(b, w, M), E = (y > 0 ? (y - C) / y : 0) * (0.35 + 0.65 * (y / 255));
      E > f && (f = E, lt.r = b, lt.g = w, lt.b = M);
    }
  }
  return lt;
}
const Tt = { r: 255, g: 255, b: 255, lum: 0 };
function wr(t, e, n, o) {
  if (Tt.r = 255, Tt.g = 255, Tt.b = 255, Tt.lum = 0, !x) return Tt;
  const a = ln(t, e, n), { glowPixels: i, glowPixelsW: r, glowPixelsH: l } = x, s = Math.max(1, o | 0), c = Math.max(0, a.bx - s), u = Math.min(r, a.bx + s + 1), d = Math.max(0, a.by - s), h = Math.min(l, a.by + s + 1);
  for (let f = d; f < h; f++) {
    const p = f * r;
    for (let g = c; g < u; g++) {
      const v = (p + g) * 4, m = (0.2126 * i[v] + 0.7152 * i[v + 1] + 0.0722 * i[v + 2]) / 255;
      m > Tt.lum && (Tt.lum = m, Tt.r = i[v], Tt.g = i[v + 1], Tt.b = i[v + 2]);
    }
  }
  return Tt;
}
const Mn = 14, _o = 1.5, _n = { x: 0, y: 0 };
function Re(t = 512) {
  return { xy: new Float32Array(t * 2), n: 0 };
}
function Ce(t, e, n, o, a, i, r = Re()) {
  a = Math.max(0, Math.min(a, Math.min(n, o) / 2));
  const l = 4 * (Mn + 1) + Math.ceil(2 * (n + o) / _o) + 8;
  r.xy.length < l * 2 && (r.xy = new Float32Array(l * 2));
  const s = r.xy;
  let c = 0;
  const u = (f, p) => {
    i ? (i(f, p, _n), s[c * 2] = _n.x, s[c * 2 + 1] = _n.y) : (s[c * 2] = f, s[c * 2 + 1] = p), c++;
  }, d = (f, p, g, v) => {
    const m = Math.hypot(g - f, v - p), b = Math.max(1, Math.ceil(m / _o));
    for (let w = 0; w < b; w++) {
      const M = w / b;
      u(f + (g - f) * M, p + (v - p) * M);
    }
  }, h = (f, p, g, v) => {
    for (let m = 0; m <= Mn; m++) {
      const b = g + (v - g) * (m / Mn);
      u(f + a * Math.cos(b), p + a * Math.sin(b));
    }
  };
  return d(t + a, e, t + n - a, e), h(t + n - a, e + a, -Math.PI / 2, 0), d(t + n, e + a, t + n, e + o - a), h(t + n - a, e + o - a, 0, Math.PI / 2), d(t + n - a, e + o, t + a, e + o), h(t + a, e + o - a, Math.PI / 2, Math.PI), d(t, e + o - a, t, e + a), h(t + a, e + a, Math.PI, 1.5 * Math.PI), r.n = c, r;
}
pr(() => {
  x && x.instances.size > 0 && x.pausedAtMs === null && Ae();
});
typeof document < "u" && document.addEventListener("visibilitychange", () => {
  !x || x.pausedAtMs !== null || x.contextLost || (document.hidden ? Qn() : x.instances.size > 0 && Ae());
});
function yr(t) {
  const e = Kn(), n = t.hostCanvas.getContext("2d", { alpha: !0 });
  if (!n) throw new Error("metal-fx: canvas 2D context unavailable");
  const o = t.scale ?? 1, a = {
    canvas: t.hostCanvas,
    ctx: n,
    cssWidth: t.cssWidth,
    cssHeight: t.cssHeight,
    cornerRadius: t.cornerRadius,
    kind: t.kind,
    ringCssPx: t.ringCssPx ?? (t.kind === "circle" ? 2 : 1) * o,
    shaderScale: t.shaderScale ?? (t.kind === "circle" ? pa : ma) * o,
    opacityMul: t.opacityMul ?? 1,
    glowGain: t.glowGain ?? 1,
    visible: !0,
    paused: t.paused ?? !1,
    everCopied: !1,
    frozen: null,
    dpr: typeof window < "u" && window.devicePixelRatio || 1,
    scale: o,
    onAfterFrame: t.onAfterFrame,
    onComposite: t.onComposite,
    onFirstCopy: t.onFirstCopy,
    mask: t.mask ?? null,
    deform: null,
    deformLayers: null,
    overscan: 0,
    cursorLight: null,
    glowFast: !1,
    rawCanvas: null,
    wantRaw: !1,
    ringCanvas: null,
    wantRing: !1
  };
  return cn(a), e.instances.add(a), e.rafId === 0 && e.pausedAtMs === null && Ae(), a;
}
function Mr(t) {
  if (!x) return;
  x.instances.delete(t);
  const e = x.glowQueue.indexOf(t);
  e !== -1 && x.glowQueue.splice(e, 1), x.instances.size === 0 && (Qn(), xr());
}
function _r(t) {
  x && (x.glowQueue.includes(t) || x.glowQueue.push(t));
}
function Sr(t) {
  if (!x) return;
  const e = x.glowQueue.indexOf(t);
  e !== -1 && x.glowQueue.splice(e, 1);
}
function pe(t, e) {
  let n = !1;
  e.mask !== void 0 && (t.mask = e.mask), e.cssWidth !== void 0 && e.cssWidth !== t.cssWidth && (t.cssWidth = e.cssWidth, n = !0), e.cssHeight !== void 0 && e.cssHeight !== t.cssHeight && (t.cssHeight = e.cssHeight, n = !0), e.cornerRadius !== void 0 && (t.cornerRadius = e.cornerRadius), e.scale !== void 0 && (t.scale = e.scale), e.kind !== void 0 && e.kind !== t.kind && (t.kind = e.kind, e.shaderScale === void 0 && (t.shaderScale = (e.kind === "circle" ? pa : ma) * t.scale), e.ringCssPx === void 0 && (t.ringCssPx = (e.kind === "circle" ? 2 : 1) * t.scale)), e.shaderScale !== void 0 && (t.shaderScale = e.shaderScale), e.ringCssPx !== void 0 && (t.ringCssPx = e.ringCssPx), e.opacityMul !== void 0 && (t.opacityMul = e.opacityMul), e.glowGain !== void 0 && (t.glowGain = e.glowGain), e.paused !== void 0 && e.paused !== t.paused && (t.paused = e.paused, e.paused ? wa(t) : t.frozen = null, !e.paused && x && x.rafId === 0 && x.pausedAtMs === null && !x.contextLost && Ae()), n && cn(t);
}
function Rr(t, e) {
  t.visible = e, e && x && x.rafId === 0 && x.pausedAtMs === null && !x.contextLost && Ae();
}
function So(t, e, n = null, o = 0) {
  const a = va(t);
  if (!a) return !1;
  a.deform = e, a.deformLayers = e ? n : null;
  const i = e ? Math.max(0, Math.round(o)) : 0;
  return i !== a.overscan && (a.overscan = i, cn(a)), un(a), !0;
}
function Cr(t) {
  return (typeof window < "u" && window.devicePixelRatio || 1) === t.dpr ? !1 : (cn(t), un(t), !0);
}
function Tr(t) {
  const e = va(t);
  e && un(e);
}
function va(t) {
  if (!x) return null;
  for (const e of x.instances) if (e.canvas === t) return e;
  return null;
}
let ba = null;
function Ar(t, e) {
  const n = Kn();
  n.preset = ba ?? da[t].modes[e], n.presetDirty = !0;
}
function _s(t) {
  const e = Kn();
  ba = t, t && (e.preset = t, e.presetDirty = !0);
}
function Ss() {
  return x ? { ...x.preset } : null;
}
function Rs() {
  !x || x.pausedAtMs !== null || (x.pausedAtMs = performance.now(), Qn());
}
function Cs() {
  !x || x.pausedAtMs === null || (x.pausedMs += performance.now() - x.pausedAtMs, x.pausedAtMs = null, x.instances.size > 0 && Ae());
}
let ie = null;
function Er(t) {
  ie = t;
}
function Sn(t, e) {
  !ie || !x || !t.visible || t.paused || x.glowQueue.includes(t) && (t.glowFast = !!ie(t, e));
}
function cn(t) {
  t.dpr = typeof window < "u" && window.devicePixelRatio || 1;
  const e = t.overscan, n = Math.max(1, Math.round((t.cssWidth + 2 * e) * t.dpr)), o = Math.max(1, Math.round((t.cssHeight + 2 * e) * t.dpr));
  t.canvas.width !== n && (t.canvas.width = n), t.canvas.height !== o && (t.canvas.height = o);
  const a = t.canvas.style;
  e > 0 ? (a.left = `${-e}px`, a.top = `${-e}px`, a.width = `calc(100% + ${2 * e}px)`, a.height = `calc(100% + ${2 * e}px)`, a.borderRadius = "0") : a.left !== "" && (a.left = "", a.top = "", a.width = "100%", a.height = "100%", a.borderRadius = "");
}
function kr(t) {
  const { ctx: e, dpr: n, canvas: o } = t, a = t.ringCssPx * n, i = o.width, r = o.height, l = Math.max(0, (t.cornerRadius - t.ringCssPx) * n);
  e.save(), e.globalCompositeOperation = "destination-out", e.fillStyle = "#000", e.beginPath(), e.roundRect(a, a, i - 2 * a, r - 2 * a, l), e.fill(), e.restore();
}
const Ir = Re();
function oe(t, e, n, o, a, i, r, l) {
  const { xy: s, n: c } = Ce(e, n, o, a, i, r, Ir);
  t.beginPath();
  for (let u = 0; u < c; u++)
    u === 0 ? t.moveTo(s[0] * l, s[1] * l) : t.lineTo(s[u * 2] * l, s[u * 2 + 1] * l);
  t.closePath();
}
function wa(t) {
  if (!x) return null;
  const e = x.frameBitmap ?? x.glCanvas, n = x.glCanvas.width, o = x.glCanvas.height;
  if (n < 1 || o < 1) return null;
  let a = t.frozen;
  a || (a = document.createElement("canvas"), t.frozen = a), (a.width !== n || a.height !== o) && (a.width = n, a.height = o);
  const i = a.getContext("2d");
  return i ? (i.clearRect(0, 0, n, o), i.drawImage(e, 0, 0), a) : (t.frozen = null, null);
}
function un(t) {
  var w, M;
  if (!x) return;
  const e = (t.paused ? t.frozen ?? wa(t) : null) ?? x.frameBitmap ?? x.glCanvas, n = t.dpr, o = t.canvas.width, a = t.canvas.height;
  if (o < 1 || a < 1) return;
  const i = Math.max(1, Math.round(t.cssWidth * n)), r = Math.max(1, Math.round(t.cssHeight * n)), l = t.overscan * n, s = e.width, c = e.height, u = fa * n, d = ha * n;
  let h = i * (s / u) / t.shaderScale, f = r * (c / d) / t.shaderScale;
  h > s && (h = s), f > c && (f = c);
  const p = Math.max(0, (s - h) / 2), g = Math.max(0, (c - f) / 2), v = t.opacityMul * x.preset.shaderOpacity, m = t.ctx;
  m.clearRect(0, 0, o, a);
  const b = t.deform;
  if (t.mask) {
    if (v < 1 && (m.globalAlpha = v), m.drawImage(e, p, g, h, f, 0, 0, o, a), v < 1 && (m.globalAlpha = 1), t.wantRaw) {
      let y = t.rawCanvas;
      y || (y = document.createElement("canvas"), t.rawCanvas = y), (y.width !== o || y.height !== a) && (y.width = o, y.height = a);
      const C = y.getContext("2d");
      C && (C.clearRect(0, 0, o, a), C.drawImage(t.canvas, 0, 0));
    }
    m.save(), m.globalCompositeOperation = "destination-in", m.fillStyle = "#000", t.mask(m, o, a, n), m.restore(), m.globalCompositeOperation = "source-over";
  } else if (!b)
    v < 1 && (m.globalAlpha = v), m.drawImage(e, p, g, h, f, 0, 0, o, a), v < 1 && (m.globalAlpha = 1), kr(t);
  else {
    const y = t.cssWidth, C = t.cssHeight, N = t.cornerRadius, E = t.ringCssPx, P = t.deformLayers;
    m.save(), m.translate(l, l);
    const G = i / h, at = r / f, F = Math.min(s, h * (i + 2 * l) / i), S = Math.min(c, f * (r + 2 * l) / r), B = Math.max(0, (s - F) / 2), K = Math.max(0, (c - S) / 2), nt = F * G, U = S * at;
    if (v < 1 && (m.globalAlpha = v), m.drawImage(e, B, K, F, S, i / 2 - nt / 2, r / 2 - U / 2, nt, U), v < 1 && (m.globalAlpha = 1), m.globalCompositeOperation = "destination-in", oe(m, 0, 0, y, C, N, b, n), m.fillStyle = "#000", m.fill(), m.globalCompositeOperation = "destination-out", oe(m, E, E, y - 2 * E, C - 2 * E, Math.max(0, N - E), b, n), m.fill(), t.wantRing) {
      let _ = t.ringCanvas;
      _ || (_ = document.createElement("canvas"), t.ringCanvas = _), (_.width !== o || _.height !== a) && (_.width = o, _.height = a);
      const T = _.getContext("2d");
      T && (T.setTransform(1, 0, 0, 1, 0, 0), T.globalCompositeOperation = "source-over", T.clearRect(0, 0, o, a), T.translate(l, l), v < 1 && (T.globalAlpha = v), T.drawImage(e, B, K, F, S, i / 2 - nt / 2, r / 2 - U / 2, nt, U), T.globalAlpha = 1, T.globalCompositeOperation = "destination-out", oe(T, E, E, y - 2 * E, C - 2 * E, Math.max(0, N - E), b, n), T.fillStyle = "#000", T.fill(), T.globalCompositeOperation = "source-over", T.setTransform(1, 0, 0, 1, 0, 0));
    }
    if (P != null && P.hairline) {
      const _ = P.hairline;
      m.globalCompositeOperation = "destination-over", oe(m, _.inset, _.inset, y - 2 * _.inset, C - 2 * _.inset, Math.max(0, N - _.inset), b, n), m.lineWidth = _.width * n, m.strokeStyle = _.color, m.stroke();
    }
    if (P != null && P.fill && (m.globalCompositeOperation = "destination-over", oe(m, 0, 0, y, C, N, b, n), m.fillStyle = P.fill, m.fill()), P != null && P.rim) {
      const _ = P.rim;
      m.globalCompositeOperation = "source-over", m.save(), oe(m, 0, 0, y, C, N, b, n), m.clip();
      const T = _.inset + _.width / 2;
      oe(m, T, T, y - 2 * T, C - 2 * T, Math.max(0, N - T), b, n), m.lineWidth = _.width * n, m.strokeStyle = _.color, m.stroke(), m.restore();
    }
    m.restore(), m.globalCompositeOperation = "source-over";
  }
  if ((w = t.onComposite) == null || w.call(t), t.onFirstCopy) {
    const y = t.onFirstCopy;
    t.onFirstCopy = void 0, y();
  }
  (M = t.onAfterFrame) == null || M.call(t);
}
function Or() {
  if (!x) return;
  const { gl: t, uniforms: e, preset: n, glCanvas: o, dpr: a } = x;
  e.u_resolution && t.uniform2f(e.u_resolution, o.width, o.height), e.u_pixelRatio && t.uniform1f(e.u_pixelRatio, a), e.u_colorBack && t.uniform4fv(e.u_colorBack, vo(n.colorBack)), e.u_colorTint && t.uniform4fv(e.u_colorTint, vo(n.colorTint)), e.u_repetition && t.uniform1f(e.u_repetition, n.repetition), e.u_softness && t.uniform1f(e.u_softness, n.softness), e.u_shiftRed && t.uniform1f(e.u_shiftRed, n.shiftRed), e.u_shiftBlue && t.uniform1f(e.u_shiftBlue, n.shiftBlue), e.u_distortion && t.uniform1f(e.u_distortion, n.distortion), e.u_contour && t.uniform1f(e.u_contour, n.contour), e.u_angle && t.uniform1f(e.u_angle, n.angle), e.u_shape && t.uniform1f(e.u_shape, n.shape), e.u_isImage && t.uniform1i(e.u_isImage, 0), e.u_imageAspectRatio && t.uniform1f(e.u_imageAspectRatio, 1), e.u_originX && t.uniform1f(e.u_originX, n.originX), e.u_originY && t.uniform1f(e.u_originY, n.originY), e.u_worldWidth && t.uniform1f(e.u_worldWidth, n.worldWidth), e.u_worldHeight && t.uniform1f(e.u_worldHeight, n.worldHeight), e.u_fit && t.uniform1f(e.u_fit, n.fit), e.u_scale && t.uniform1f(e.u_scale, n.scale), e.u_rotation && t.uniform1f(e.u_rotation, n.rotation), e.u_offsetX && t.uniform1f(e.u_offsetX, n.offsetX), e.u_offsetY && t.uniform1f(e.u_offsetY, n.offsetY), x.presetDirty = !1;
}
function Lr(t) {
  if (!x) return;
  const { gl: e, uniforms: n, preset: o, glCanvas: a } = x, i = (t - x.startMs - x.pausedMs) / 1e3 * o.speed;
  e.viewport(0, 0, a.width, a.height), e.clearColor(0, 0, 0, 0), e.clear(e.COLOR_BUFFER_BIT), x.presetDirty && Or(), n.u_time && e.uniform1f(n.u_time, i), e.drawArrays(e.TRIANGLES, 0, 6), x.frameCount++;
}
let Ro = 0;
function ya(t) {
  var n;
  if (!x) return;
  if (x.contextLost) {
    x.rafId = 0;
    return;
  }
  let e = !1;
  for (const o of x.instances)
    if (o.visible && (!o.paused || !o.everCopied)) {
      e = !0;
      break;
    }
  if (!e) {
    x.rafId = 0;
    return;
  }
  if (x.rafId = requestAnimationFrame(ya), t - Ro < qa) {
    if (ie)
      for (const o of x.glowQueue)
        o.glowFast && o.visible && !o.paused && (o.glowFast = !!ie(o, t));
    return;
  }
  Ro = t, Lr(t), vr(), x.useOffscreen && ((n = x.frameBitmap) == null || n.close(), x.frameBitmap = x.glCanvas.transferToImageBitmap());
  for (const o of x.instances)
    o.visible && (o.paused && o.everCopied || (un(o), o.everCopied = !0));
  if (ie && x.glowQueue.length > 0 && ++x.glowSkip % Za === 0)
    for (const o of x.glowQueue)
      o.visible && !o.paused && (o.glowFast = !!ie(o, t));
}
function Ae() {
  !x || x.rafId !== 0 || (x.rafId = requestAnimationFrame(ya));
}
function Qn() {
  x && (x.rafId !== 0 && cancelAnimationFrame(x.rafId), x.rafId = 0);
}
const Bn = {
  linear: (t) => t,
  smoothstep: (t) => t * t * (3 - 2 * t)
};
function Oe(t, e, n, o = Bn.linear) {
  return { from: t, to: e, dur: n, ease: o, startMs: -1, val: t, done: !1 };
}
function Le(t, e) {
  t.startMs = e, t.val = t.from, t.done = !1;
}
function Co(t, e) {
  if (t.done || t.startMs < 0) return t.val;
  const n = Math.min(1, (e - t.startMs) / t.dur);
  return t.val = t.from + (t.to - t.from) * t.ease(n), n >= 1 && (t.done = !0), t.val;
}
const Fr = /* @__PURE__ */ new Set([
  "haloHalfLen",
  "extraHalfLen",
  "haloStrokeXl",
  "haloStrokeLg",
  "haloStrokeMd",
  "haloStrokeSm",
  "haloBlurXl",
  "haloBlurLg",
  "haloBlurMd",
  "haloBlurSm",
  "haloOpXl",
  "haloOpLg",
  "haloOpMd",
  "haloOpSm",
  "extraStrokeOuter",
  "extraStrokeCore",
  "extraBlurOuter",
  "extraBlurCore",
  "extraFadeR",
  "extraOpOuter"
]), Ma = Object.freeze({
  haloOpMul: 2,
  extraIntensity: 3.51,
  peakOp: 0.85,
  baseOp: 0.34,
  inset: 1.5,
  extraOutward: 1,
  wanderRange: 15,
  wanderLerp: 75e-4,
  fadeRate: 875e-5,
  lumLo: 0.08,
  lumHi: 0.32,
  minDwellMs: 1500,
  relocFadeMs: 300,
  relocFadeOutMs: 450,
  pointGain: 2.5,
  haloHalfLen: 7.8,
  extraHalfLen: 9.13952 / 3,
  haloStrokeXl: 26.4,
  haloStrokeLg: 15.6,
  haloStrokeMd: 7.2,
  haloStrokeSm: 3,
  haloBlurXl: 8.4,
  haloBlurLg: 4.8,
  haloBlurMd: 2.1,
  haloBlurSm: 0.9,
  haloOpXl: 0.385,
  haloOpLg: 0.595,
  haloOpMd: 0.7,
  haloOpSm: 0.7,
  extraStrokeOuter: 4 / 3,
  extraStrokeCore: 2 / 3,
  extraBlurOuter: 2 / 3,
  extraBlurCore: 1.35 / 3,
  extraFadeR: 13 / 3,
  extraOpOuter: 0.85
}), A = { ...Ma }, Pn = /* @__PURE__ */ new Set();
function Br(t) {
  let e = !1;
  for (const n of Object.keys(t)) {
    const o = t[n];
    o === void 0 || A[n] === o || (A[n] = o, Fr.has(n) && (e = !0));
  }
  for (const n of Pn) n(e);
}
function Ts() {
  Br({ ...Ma });
}
function Pr(t) {
  return Pn.add(t), () => {
    Pn.delete(t);
  };
}
const _a = Object.freeze({
  enabled: !0,
  reach: 56,
  fadeMs: 200,
  cursor: !0,
  cursorDistance: 186,
  cursorStrength: 3.35,
  cursorDiffuse: 1.4,
  cursorFalloff: 37,
  cursorDepth: 0.4,
  cursorEdge: 0,
  cursorReach: 11.5,
  cursorBlur: 0.5,
  cursorZoom: 3,
  spill: !1,
  spillRadius: 48,
  spillStrength: 0.55,
  spillOffset: 0.35,
  spillLumGain: 0.7,
  spillSaturation: 1.3,
  spillInside: 0.5,
  spillBlur: 0,
  catchLight: !1,
  catchFollow: 0.25,
  catchGain: 1
}), Yt = { ..._a };
function Nr(t) {
  Object.assign(Yt, t), !Yt.spill && kt && on(), Yt.cursor || Dt(), dn();
}
function As() {
  Nr({ ..._a });
}
let Qt = null, _e = null, Nn = 0;
function Ur() {
  const t = window.devicePixelRatio || 1;
  return Nn > 0 ? Nn / t : 1;
}
function Sa(t, e) {
  if (!Rt || !Qt) return;
  const n = Ur(), o = (t - Qt.hotX * n).toFixed(2), a = (e - Qt.hotY * n).toFixed(2);
  Rt.style.transform = n === 1 ? `translate3d(${o}px,${a}px,0)` : `translate3d(${o}px,${a}px,0) scale(${n.toFixed(4)})`;
}
let Zn = !1, Jn = 0, Be = 0, ye = null;
const jt = { x: 0, y: 0 };
let Pe = null, To = 0;
function Dr(t, e, n, o, a) {
  if (Pe && To === n && Pe.length === o * a) return Pe;
  const i = document.createElement("canvas");
  i.width = o, i.height = a;
  const r = i.getContext("2d", { willReadFrequently: !0 });
  if (!r) return null;
  r.scale(n, n), r.drawImage(t, 0, 0, e.width, e.height);
  const l = r.getImageData(0, 0, o, a).data, s = new Uint8ClampedArray(o * a);
  for (let c = 0, u = 3; c < s.length; c++, u += 4) s[c] = l[u] >= 128 ? 255 : 0;
  return Pe = s, To = n, s;
}
function Ao(t, e, n, o) {
  const a = t.getImageData(0, 0, e, n), i = a.data;
  for (let r = 0, l = 0, s = 3; r < n; r++)
    for (let c = 0; c < e; c++, l++, s += 4) {
      const u = i[s];
      if (u === 0) continue;
      const d = o(c, r, l);
      i[s] = d >= 1 ? u : d <= 0 ? 0 : u * d;
    }
  t.putImageData(a, 0, 0);
}
function Hr(t, e) {
  const o = document.createElement("canvas");
  o.width = Math.ceil(e.width * 2), o.height = Math.ceil(e.height * 2);
  const a = o.getContext("2d", { willReadFrequently: !0 });
  if (!a) return;
  a.drawImage(t, 0, 0, o.width, o.height);
  const i = a.getImageData(0, 0, o.width, o.height).data, r = [];
  let l = 0, s = 0, c = 0;
  for (let f = 0; f < o.height; f++)
    for (let p = 0; p < o.width; p++) {
      if (i[(f * o.width + p) * 4 + 3] < 128) continue;
      const v = (p + 0.5) / 2, m = (f + 0.5) / 2;
      r.push(v, m), l += v, s += m, c++;
    }
  if (c === 0) return;
  jt.x = e.centerX ?? l / c, jt.y = e.centerY ?? s / c;
  const u = new Float32Array(r.length);
  for (let f = 0; f < r.length; f += 2)
    u[f] = r[f] - jt.x, u[f + 1] = r[f + 1] - jt.y;
  ye = u;
  const d = document.createElement("canvas");
  d.width = o.width, d.height = o.height;
  const h = d.getContext("2d");
  if (h) {
    const f = h.createImageData(o.width, o.height);
    for (let p = 3; p < i.length; p += 4) i[p] >= 128 && (f.data[p - 3] = 255, f.data[p - 2] = 255, f.data[p - 1] = 255, f.data[p] = 255);
    h.putImageData(f, 0, 0);
  }
}
function zr(t, e) {
  if (!ye) return 0;
  let n = -1 / 0;
  for (let o = 0; o < ye.length; o += 2) {
    const a = ye[o] * t + ye[o + 1] * e;
    a > n && (n = a);
  }
  return n === -1 / 0 ? 0 : n;
}
function Es(t) {
  if (Qt = t, _e = null, ye = null, Pe = null, Zn = !1, Jn = 0, Be = 0, Nn = (typeof window < "u" && window.devicePixelRatio || 1) >= 1.5 ? 2 : 1, Dt(), !t || typeof Image > "u") return;
  const n = new Image();
  n.decoding = "async", n.onload = () => {
    Qt === t && (Hr(n, t), _e = n, dn());
  }, n.src = t.src;
}
let De = 0, Te = !1, se = 0, Un = 0, Et = Number.NaN, qt = Number.NaN, Ge = 0, We = 0, ae = 0, re = 0, it = null;
const X = { d: 0, nx: 0, ny: 0, k: 1, left: 0, top: 0 }, Rn = { x: 0, y: 0 }, Pt = { r: 255, g: 255, b: 255 };
let kt = null, Dn = "", Hn = -1, zn = -1, Ve = !1;
function Gr() {
  De++, Vr();
}
function Wr() {
  De = Math.max(0, De - 1), De === 0 && $r();
}
const Ne = (t) => typeof window.matchMedia == "function" && window.matchMedia(t).matches;
function Eo() {
  if (Zn || performance.now() < Jn || !Qt || !_e || Ne("(prefers-reduced-motion: reduce)") || Ne("(forced-colors: active)") || !Ne("(pointer: fine)") || !Ne("(hover: hover)")) return !1;
  const t = window.visualViewport;
  return !(t && Math.abs(t.scale - 1) > 1e-3);
}
function Vr() {
  Te || De === 0 || typeof document > "u" || Ne("(pointer: fine)") && (Te = !0, document.addEventListener("pointermove", Ra, { passive: !0 }), document.addEventListener("pointerleave", Kt), document.addEventListener("pointercancel", Kt), document.addEventListener("keydown", Ca, { passive: !0 }), document.addEventListener("visibilitychange", Kt), window.addEventListener("blur", Kt));
}
function $r() {
  Te && (Te = !1, document.removeEventListener("pointermove", Ra), document.removeEventListener("pointerleave", Kt), document.removeEventListener("pointercancel", Kt), document.removeEventListener("keydown", Ca), document.removeEventListener("visibilitychange", Kt), window.removeEventListener("blur", Kt), se !== 0 && (cancelAnimationFrame(se), se = 0), it && (it.cursorLight = null, it = null), ae = 0, re = 0, kt && (kt.remove(), kt = null, Dn = "", Hn = -1, zn = -1, Ve = !1), Dt(), Rt && (Rt.remove(), Rt = null));
}
let Gn = !0, to = !1;
function Ra(t) {
  Gn = t.pointerType === "mouse" || t.pointerType === "", to = !1, Et = Ge = t.clientX, qt = We = t.clientY, $e && Rt && (Gn && Ta(Et, qt) ? Sa(Et, qt) : Dt()), dn();
}
function Ca() {
  to = !0, Dt();
}
function Kt() {
  Et = qt = Number.NaN, dn();
}
function dn() {
  !Te || se !== 0 || (Un = performance.now(), se = requestAnimationFrame(Aa));
}
function Xr(t, e, n, o, a, i, r) {
  const l = i === "circle" ? Math.min(n, o) / 2 : Math.max(0, Math.min(a, Math.min(n, o) / 2)), s = n / 2, c = o / 2, u = Math.max(0, n / 2 - l), d = Math.max(0, o / 2 - l), h = Math.max(-u, Math.min(u, t - s)), f = Math.max(-d, Math.min(d, e - c)), p = t - s - h, g = e - c - f, v = Math.hypot(p, g);
  if (v > 1e-6)
    return r.x = s + h + p / v * l, r.y = c + f + g / v * l, v - l;
  const m = t, b = n - t, w = e, M = o - e, y = Math.min(m, b, w, M);
  return y === m ? (r.x = 0, r.y = e) : y === b ? (r.x = n, r.y = e) : y === w ? (r.x = t, r.y = 0) : (r.x = t, r.y = o), -y;
}
let Rt = null, $t = null, Wn = null, gt = null, Ue = null, ko = !1, Io = 0, Oo = 0, Lo = 0, $e = !1, Me = !1, Vn = "", Ut = null, He = "";
const Yr = /^(INPUT|TEXTAREA|SELECT)$/;
let $n = /* @__PURE__ */ new WeakMap(), Fo = 0, Xn = null;
function jr(t) {
  let e = t;
  for (; e && e !== document.body; ) {
    if (Yr.test(e.tagName) || e.isContentEditable) return !0;
    e = e.parentElement;
  }
  return !1;
}
function qr() {
  if (Rt) return !0;
  const t = document.createElement("div");
  t.className = "metal-fx-cursor", t.setAttribute("aria-hidden", "true"), t.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:2147483001;will-change:transform;transform-origin:0 0;display:none";
  const e = document.createElement("canvas");
  e.style.display = "block", t.appendChild(e), document.body.appendChild(t);
  const n = e.getContext("2d"), o = document.createElement("canvas"), a = o.getContext("2d");
  return !n || !a ? (t.remove(), !1) : (Rt = t, $t = e, Wn = n, gt = o, Ue = a, !0);
}
function Ta(t, e, n = !1) {
  const o = performance.now();
  if (!n && Me && o - Fo < 12) return !0;
  Fo = o;
  const a = document.elementFromPoint(t, e);
  if (!a)
    return Yn(), !1;
  if (a === Xn && Me) return !0;
  Xn = a;
  let i = $n.get(a);
  if (i === void 0) {
    if (i = !jr(a), i) {
      const r = getComputedStyle(a).cursor;
      i = r === "auto" || r === "default" || r === "none";
    }
    $n.set(a, i);
  }
  if (!i)
    return Yn(), !1;
  if (!Me) {
    const r = document.documentElement;
    Vn = r.style.cursor, r.style.cursor = "none", Me = !0;
  }
  return a !== Ut && (Ut && (Ut.style.cursor = He, Ut = null, He = ""), getComputedStyle(a).cursor !== "none" && (Ut = a, He = a.style.cursor, a.style.cursor = "none")), !0;
}
function Yn() {
  Ut && (Ut.isConnected && (Ut.style.cursor = He), Ut = null, He = ""), Me && (document.documentElement.style.cursor = Vn, Me = !1, Vn = ""), Xn = null, $n = /* @__PURE__ */ new WeakMap();
}
function Dt() {
  Yn(), Rt && $e && (Rt.style.display = "none", $e = !1);
}
function Kr(t, e, n) {
  if (!Wn || !Ue || !$t || !gt || !Rt || !Qt || !_e) return;
  const o = Qt, a = Math.min(3, window.devicePixelRatio || 1);
  if ((a !== Io || o.width !== Oo || o.height !== Lo) && (Io = a, Oo = o.width, Lo = o.height, $t.width = gt.width = Math.ceil(o.width * a), $t.height = gt.height = Math.ceil(o.height * a), $t.style.width = `${o.width}px`, $t.style.height = `${o.height}px`), !ko && (Ue = gt.getContext("2d", { willReadFrequently: !0 }), ko = !0, !Ue))
    return;
  const i = Wn, r = Ue, l = o.width, s = o.height;
  i.setTransform(1, 0, 0, 1, 0, 0), i.clearRect(0, 0, $t.width, $t.height), i.scale(a, a), i.drawImage(_e, 0, 0, l, s);
  const c = X.left + X.nx * X.k, u = X.top + X.ny * X.k, d = Ge - o.hotX + jt.x, h = We - o.hotY + jt.y, f = c - d, p = u - h, g = Math.hypot(f, p), v = g > 0.01 ? f / g : 1, m = g > 0.01 ? p / g : 0, b = zr(v, m) + e.cursorEdge, w = Math.max(0, g - b), M = Math.max(1, e.cursorFalloff), y = 1 / (1 + w / M * (w / M)), C = t.cssWidth / 2, N = t.cssHeight / 2, E = C - X.nx, P = N - X.ny, G = Math.hypot(E, P) || 1, at = t.mask ? 0 : t.ringCssPx * 0.5 + 1, F = X.nx + E / G * at, S = X.ny + P / G * at, B = wr(t, F, S, 4), K = B.lum, nt = B.r, U = B.g, _ = B.b, T = e.cursorStrength * y * n, V = e.cursorDiffuse * y * (0.5 + 0.5 * Math.min(1, K / 0.5)) * n;
  if (g > 0.01 && T + V > 5e-3) {
    const Z = f / g, Y = p / g, ut = Math.atan2(Y, Z), L = Math.max(0.1, Math.min(1, e.cursorDepth)), O = jt.x + b * Z, D = jt.y + b * Y, $ = Math.max(1, e.cursorReach);
    if (r.setTransform(1, 0, 0, 1, 0, 0), r.clearRect(0, 0, gt.width, gt.height), r.scale(a, a), T > 5e-3) {
      r.save(), r.filter = e.cursorBlur > 0 ? `blur(${e.cursorBlur}px)` : "none";
      const et = Math.max(1, e.cursorZoom);
      r.translate(O, D), r.rotate(ut), r.scale(-1, 1), r.translate((g - b) * L, 0), r.rotate(-ut), r.scale(et, et);
      const rt = t.overscan, st = X.k, dt = Math.max(1, Math.ceil(T));
      r.globalAlpha = Math.min(1, T / dt), r.globalCompositeOperation = "lighter";
      const ct = t.mask && t.rawCanvas ? t.rawCanvas : t.canvas;
      for (let H = 0; H < dt; H++)
        r.drawImage(ct, -(X.nx + rt) * st, -(X.ny + rt) * st, (t.cssWidth + 2 * rt) * st, (t.cssHeight + 2 * rt) * st);
      r.restore();
      const ot = 1 / a, k = 1 / $;
      Ao(r, gt.width, gt.height, (H, Q) => {
        const q = -(((H + 0.5) * ot - O) * Z + ((Q + 0.5) * ot - D) * Y);
        return q <= 0 ? 1 : 1 - q * k;
      });
    }
    if (V > 5e-3) {
      const et = Math.max(nt, U, _) || 1, rt = Math.round(nt * 255 / et), st = Math.round(U * 255 / et), dt = Math.round(_ * 255 / et), ct = $ * 1.2, ot = r.createLinearGradient(O + 0.5 * Z, D + 0.5 * Y, O - ct * Z, D - ct * Y), k = Math.min(1, V);
      ot.addColorStop(0, `rgba(${rt},${st},${dt},${k.toFixed(3)})`), ot.addColorStop(0.45, `rgba(${rt},${st},${dt},${(k * 0.4).toFixed(3)})`), ot.addColorStop(1, `rgba(${rt},${st},${dt},0)`), r.globalCompositeOperation = "lighter", r.fillStyle = ot, r.fillRect(0, 0, l, s), r.globalCompositeOperation = "source-over";
    }
    const W = Dr(_e, o, a, gt.width, gt.height);
    W && Ao(r, gt.width, gt.height, (et, rt, st) => W[st] === 0 ? 0 : 1), i.globalCompositeOperation = "lighter", i.drawImage(gt, 0, 0, l, s), i.globalCompositeOperation = "source-over";
  }
  Sa(Ge, We), $e || (Rt.style.display = "", $e = !0);
}
function Qr() {
  if (kt) return kt;
  const t = document.createElement("div");
  return t.className = "metal-fx-cursor-spill", t.setAttribute("aria-hidden", "true"), t.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:2147483000;border-radius:50%;mix-blend-mode:plus-lighter;will-change:transform,opacity;opacity:0;display:none", document.body.appendChild(t), kt = t, t;
}
function on() {
  !kt || !Ve || (kt.style.display = "none", kt.style.opacity = "0", Ve = !1);
}
function Aa(t) {
  if (se = 0, !Te) return;
  const e = performance.now();
  try {
    Zr(t);
  } catch (o) {
    Zn = !0, Dt(), on(), it && (it.cursorLight = null, it = null), typeof console < "u" && console.warn("metal-fx: cursor light disabled after error", o);
    return;
  }
  performance.now() - e > 6 ? ++Be >= 20 && (Be = 0, Jn = performance.now() + 5e3, Dt()) : Be > 0 && Be--;
}
function Zr(t) {
  const e = Yt, n = Math.min(0.05, Math.max(1e-3, (t - Un) / 1e3));
  Un = t;
  let o = null, a = 0, i = 0;
  if (e.enabled && x && !Number.isNaN(Et)) {
    let l = Number.POSITIVE_INFINITY;
    const s = Math.max(1, e.reach), c = e.cursor && Eo() ? Math.max(1, e.cursorDistance) : 0, u = Math.max(s, c);
    for (const d of x.instances) {
      if (!d.visible || !d.canvas.isConnected) continue;
      const h = d.canvas.getBoundingClientRect();
      if (h.width <= 0) continue;
      const f = d.overscan, p = h.width / (d.cssWidth + 2 * f), g = h.left + f * p, v = h.top + f * p, m = u * p;
      if (Et < g - m || Et > g + d.cssWidth * p + m || qt < v - m || qt > v + d.cssHeight * p + m) continue;
      const b = (Et - g) / p, w = (qt - v) / p, M = Xr(b, w, d.cssWidth, d.cssHeight, d.cornerRadius, d.kind, Rn), y = Math.abs(M);
      y <= u && y < l && (l = y, o = d, X.d = M, X.nx = Rn.x, X.ny = Rn.y, X.k = p, X.left = g, X.top = v);
    }
    if (o) {
      if (l <= s) {
        const d = 1 - l / s;
        a = d * d * (3 - 2 * d);
      }
      l <= c && (i = Math.min(1, (1 - l / c) * 3)), o.mask && (X.nx = o.cssWidth / 2, X.ny = o.cssHeight / 2, o.wantRaw = !0);
    }
  }
  const r = 1 - Math.exp(-(n * 1e3) / (Math.max(1, e.fadeMs) / 3));
  if (ae += (a - ae) * r, re += (i - re) * r, o && o !== it && (it && (it.cursorLight = null, Sn(it, t)), it = o), !o && ae < 2e-3 && re < 2e-3) {
    ae = 0, re = 0, it && (it.cursorLight = null, Sn(it, t), it = null), on(), Dt();
    return;
  }
  if (it) {
    if (e.catchLight) {
      const l = it.cursorLight ?? (it.cursorLight = { x: 0, y: 0, w: 0 });
      l.x = X.nx, l.y = X.ny, l.w = ae;
    } else it.cursorLight && (it.cursorLight = null);
    if (Sn(it, t), e.cursor && re > 2e-3 && Gn && !to && !Number.isNaN(Et) && Eo() && qr() && Ta(Et, qt) ? Kr(it, e, re) : Dt(), e.spill) {
      const l = Qr(), s = xa(it, X.nx, X.ny, 2), c = Fn(it, X.nx, X.ny, 3), u = Math.max(s.r, s.g, s.b) || 1, d = ca(s.r * 255 / u, s.g * 255 / u, s.b * 255 / u), [h, f, p] = ua(d[0], Math.min(1, d[1] * e.spillSaturation), 1);
      Pt.r += (h - Pt.r) * 0.15, Pt.g += (f - Pt.g) * 0.15, Pt.b += (p - Pt.b) * 0.15;
      const g = Math.round(Pt.r / 6) * 6, v = Math.round(Pt.g / 6) * 6, m = Math.round(Pt.b / 6) * 6, b = `radial-gradient(closest-side, rgba(${g},${v},${m},1) 0%, rgba(${g},${v},${m},0.35) 45%, rgba(${g},${v},${m},0) 100%)`;
      b !== Dn && (Dn = b, l.style.background = b);
      const w = Math.max(1, e.spillRadius * X.k);
      w !== Hn && (Hn = w, l.style.width = `${(2 * w).toFixed(1)}px`, l.style.height = `${(2 * w).toFixed(1)}px`), e.spillBlur !== zn && (zn = e.spillBlur, l.style.filter = e.spillBlur > 0 ? `blur(${e.spillBlur}px)` : "");
      const M = X.left + X.nx * X.k, y = X.top + X.ny * X.k, C = Ge + (M - Ge) * e.spillOffset, N = We + (y - We) * e.spillOffset;
      l.style.transform = `translate3d(${(C - w).toFixed(2)}px,${(N - w).toFixed(2)}px,0)`;
      const E = Math.min(1, Math.max(0, c / 0.3)), P = 1 - e.spillLumGain + e.spillLumGain * E, G = X.d < 0 ? e.spillInside : 1, at = Math.max(0, Math.min(1, e.spillStrength * ae * P * G));
      Ve || (l.style.display = "", Ve = !0), l.style.opacity = at.toFixed(3);
    } else
      on();
    se = requestAnimationFrame(Aa);
  }
}
const an = /* @__PURE__ */ new Map();
function Jr(t, e) {
  const n = Math.sqrt(12 * t * t / e + 1);
  let o = Math.floor(n);
  o % 2 === 0 && o--;
  const a = o + 2, i = (12 * t * t - e * o * o - 4 * e * o - 3 * e) / (-4 * o - 4), r = Math.round(i), l = [];
  for (let s = 0; s < e; s++) l.push(s < r ? o : a);
  return l;
}
function ti(t, e, n, o, a) {
  const i = 1 / (a + a + 1);
  for (let r = 0; r < o; r++) {
    const l = r * n;
    let s = 0;
    for (let c = -a; c <= a; c++) s += t[l + Math.min(n - 1, Math.max(0, c))];
    for (let c = 0; c < n; c++) {
      e[l + c] = s * i;
      const u = l + Math.max(0, c - a), d = l + Math.min(n - 1, c + a + 1);
      s += t[d] - t[u];
    }
  }
}
function ei(t, e, n, o, a) {
  const i = 1 / (a + a + 1);
  for (let r = 0; r < n; r++) {
    let l = 0;
    for (let s = -a; s <= a; s++) l += t[Math.min(o - 1, Math.max(0, s)) * n + r];
    for (let s = 0; s < o; s++) {
      e[s * n + r] = l * i;
      const c = Math.max(0, s - a) * n + r, u = Math.min(o - 1, s + a + 1) * n + r;
      l += t[u] - t[c];
    }
  }
}
function fn(t, e, n, o) {
  if (o <= 0.05) return t;
  const a = new Float32Array(t.length);
  let i = t;
  for (const r of Jr(o, 3)) {
    const l = (r - 1) / 2;
    ti(i, a, e, n, l), ei(a, i, e, n, l);
  }
  return i;
}
function ni(t, e, n, o, a, i, r) {
  const l = document.createElement("canvas");
  l.width = n, l.height = o;
  const s = l.getContext("2d", { willReadFrequently: !0 }), c = new Float32Array(n * o);
  if (!s) return c;
  s.scale(a, a), s.strokeStyle = "#fff", s.lineCap = "round", s.lineJoin = "round", s.lineWidth = e, s.beginPath(), s.moveTo(i - t, r), s.lineTo(i + t, r), s.stroke();
  const u = s.getImageData(0, 0, n, o).data;
  for (let d = 0, h = 3; d < c.length; d++, h += 4) c[d] = u[h] / 255;
  return c;
}
function Ea(t, e, n, o, a) {
  let i = 0;
  for (const g of t) i = Math.max(i, (g.stroke / 2 + 3 * g.blur) * n);
  const r = Math.ceil(i) + 1, l = 2 * e + 2 * r, s = 2 * r, c = Math.ceil(l * o), u = Math.ceil(s * o), d = new Float32Array(c * u);
  for (const g of t) {
    let v = ni(e, g.stroke * n, c, u, o, r, r);
    v = fn(v, c, u, g.blur * n * o);
    const m = g.opacity;
    for (let b = 0; b < d.length; b++) {
      const w = v[b] * m;
      d[b] = d[b] + w * (1 - d[b]);
    }
  }
  if (a > 0) {
    const g = r * o, v = r * o, m = a * n * o;
    for (let b = 0; b < u; b++) for (let w = 0; w < c; w++) {
      const M = Math.hypot(w + 0.5 - g, b + 0.5 - v) / m;
      let y;
      M <= 0.3 ? y = 1 : M <= 0.65 ? y = 1 - (M - 0.3) / 0.35 * 0.75 : M < 1 ? y = 0.25 * (1 - (M - 0.65) / 0.35) : y = 0, d[b * c + w] *= y;
    }
  }
  const h = document.createElement("canvas");
  h.width = c, h.height = u;
  const f = h.getContext("2d"), p = new Uint8ClampedArray(c * u);
  for (let g = 0; g < d.length; g++) p[g] = Math.round(Math.min(1, d[g]) * 255);
  if (f) {
    const g = f.createImageData(c, u), v = g.data;
    for (let m = 0, b = 0; m < d.length; m++, b += 4)
      v[b] = 255, v[b + 1] = 255, v[b + 2] = 255, v[b + 3] = p[m];
    f.putImageData(g, 0, 0);
  }
  return { canvas: h, alpha: p, w: l, h: s, ax: r, ay: r };
}
function ka() {
  return [
    A.haloStrokeXl,
    A.haloStrokeLg,
    A.haloStrokeMd,
    A.haloStrokeSm,
    A.haloBlurXl,
    A.haloBlurLg,
    A.haloBlurMd,
    A.haloBlurSm,
    A.haloOpXl,
    A.haloOpLg,
    A.haloOpMd,
    A.haloOpSm,
    A.extraStrokeOuter,
    A.extraStrokeCore,
    A.extraBlurOuter,
    A.extraBlurCore,
    A.extraFadeR,
    A.extraOpOuter
  ].join(",");
}
function oi(t, e, n) {
  const o = `h|${t.toFixed(2)}|${e}|${n}|${ka()}`;
  let a = an.get(o);
  return a || (a = Ea([
    { stroke: A.haloStrokeXl, blur: A.haloBlurXl, opacity: A.haloOpXl },
    { stroke: A.haloStrokeLg, blur: A.haloBlurLg, opacity: A.haloOpLg },
    { stroke: A.haloStrokeMd, blur: A.haloBlurMd, opacity: A.haloOpMd },
    { stroke: A.haloStrokeSm, blur: A.haloBlurSm, opacity: A.haloOpSm }
  ], t, e, n, 0), an.set(o, a)), a;
}
function ai(t, e, n) {
  const o = `e|${t.toFixed(2)}|${e}|${n}|${ka()}`;
  let a = an.get(o);
  return a || (a = Ea([
    { stroke: A.extraStrokeOuter, blur: A.extraBlurOuter, opacity: A.extraOpOuter },
    { stroke: A.extraStrokeCore, blur: A.extraBlurCore, opacity: 1 }
  ], t, e, n, A.extraFadeR), an.set(o, a)), a;
}
function Bo(t, e, n, o, a) {
  var c;
  const i = e << 16 | n << 8 | o;
  if (a.canvas && a.tint === i && a.src === t) return a.canvas;
  let r = a.canvas, l = a.img;
  (!r || !l || a.src !== t) && (r = document.createElement("canvas"), r.width = t.canvas.width, r.height = t.canvas.height, l = ((c = r.getContext("2d")) == null ? void 0 : c.createImageData(r.width, r.height)) ?? null);
  const s = r.getContext("2d");
  if (s && l) {
    const u = l.data, d = t.alpha;
    for (let h = 0, f = 0; h < d.length; h++, f += 4)
      u[f] = e, u[f + 1] = n, u[f + 2] = o, u[f + 3] = d[h];
    s.putImageData(l, 0, 0);
  }
  return a.canvas = r, a.img = l, a.tint = i, a.src = t, r;
}
function eo(t, e, n) {
  const o = Math.max(0, Math.min(n, Math.min(t, e) / 2));
  return 2 * Math.max(0, t - 2 * o) + 2 * Math.max(0, e - 2 * o) + 2 * Math.PI * o;
}
function rn(t, e, n, o) {
  return o === "circle" ? 2 * Math.PI * Math.max(0, Math.min(n, Math.min(t, e) / 2)) : eo(t, e, n);
}
function Xe(t, e, n, o, a, i, r, l) {
  const s = l || { x: 0, y: 0 }, c = Math.max(0, Math.min(o, Math.min(e, n) / 2));
  if (r === "circle") {
    const m = 2 * Math.PI * c;
    if (m <= 1e-4)
      return s.x = e * 0.5, s.y = n * 0.5, s;
    t = (t % m + m) % m;
    const b = -Math.PI / 2 + t / m * Math.PI * 2, w = Math.max(0, c - a + i);
    return s.x = e * 0.5 + w * Math.cos(b), s.y = n * 0.5 + w * Math.sin(b), s;
  }
  const u = Math.max(0, e - 2 * c), d = Math.max(0, n - 2 * c), h = Math.PI * c / 2, f = 2 * (u + d) + 4 * h;
  t = (t % f + f) % f;
  const p = Math.max(0, c - a + i);
  let g = t;
  if (g < u)
    return s.x = c + g, s.y = a - i, s;
  if (g -= u, g < h) {
    const m = -Math.PI / 2 + (h > 0 ? g / h : 0) * (Math.PI / 2);
    return s.x = e - c + p * Math.cos(m), s.y = c + p * Math.sin(m), s;
  }
  if (g -= h, g < d)
    return s.x = e - a + i, s.y = c + g, s;
  if (g -= d, g < h) {
    const m = (h > 0 ? g / h : 0) * (Math.PI / 2);
    return s.x = e - c + p * Math.cos(m), s.y = n - c + p * Math.sin(m), s;
  }
  if (g -= h, g < u)
    return s.x = e - c - g, s.y = n - a + i, s;
  if (g -= u, g < h) {
    const m = Math.PI / 2 + (h > 0 ? g / h : 0) * (Math.PI / 2);
    return s.x = c + p * Math.cos(m), s.y = n - c + p * Math.sin(m), s;
  }
  if (g -= h, g < d)
    return s.x = a - i, s.y = n - c - g, s;
  g -= d;
  const v = Math.PI + (h > 0 ? g / h : 0) * (Math.PI / 2);
  return s.x = c + p * Math.cos(v), s.y = c + p * Math.sin(v), s;
}
function ri(t, e, n, o, a, i) {
  const r = Math.max(0, Math.min(a, Math.min(n, o) / 2));
  if (i === "circle") {
    const y = 2 * Math.PI * r;
    return y <= 1e-4 ? 0 : ((Math.atan2(e - o / 2, t - n / 2) + Math.PI / 2) / (2 * Math.PI) * y % y + y) % y;
  }
  const l = Math.max(0, n - 2 * r), s = Math.max(0, o - 2 * r), c = Math.PI * r / 2, u = Math.PI / 2, d = l, h = d + c, f = h + s, p = f + c, g = p + l, v = g + c, m = v + s, b = t >= r && t <= n - r, w = e >= r && e <= o - r;
  if (b && w) {
    const y = t, C = n - t, N = e, E = o - e, P = Math.min(y, C, N, E);
    return P === N ? t - r : P === C ? h + (e - r) : P === E ? p + (n - r - t) : v + (o - r - e);
  }
  if (b) return e < o / 2 ? t - r : p + (n - r - t);
  if (w) return t > n / 2 ? h + (e - r) : v + (o - r - e);
  if (t > n / 2 && e < o / 2) {
    const y = Math.atan2(e - r, t - (n - r));
    return d + (y + u) / u * c;
  }
  if (t > n / 2) {
    const y = Math.atan2(e - (o - r), t - (n - r));
    return f + y / u * c;
  }
  if (e > o / 2) {
    const y = Math.atan2(e - (o - r), t - r);
    return g + (y - u) / u * c;
  }
  const M = Math.atan2(e - r, t - r);
  return m + (M + Math.PI) / u * c;
}
const Cn = { x: 0, y: 0 }, Tn = { x: 0, y: 0 };
function ii(t, e, n, o, a, i) {
  return Xe(t - 0.1, e, n, o, a, 0, i, Cn), Xe(t + 0.1, e, n, o, a, 0, i, Tn), Math.atan2(Tn.y - Cn.y, Tn.x - Cn.x);
}
function Po(t, e, n) {
  if (t === e) return n < t ? 0 : 1;
  const o = Math.max(0, Math.min(1, (n - t) / (e - t)));
  return o * o * (3 - 2 * o);
}
function si(t) {
  if (t.samplePoints && t.samplePoints.length > 0)
    return t.samplePoints.map((a, i) => ({ x: a.x, y: a.y, arc: i }));
  const e = rn(t.width, t.height, t.cornerRadius, t.kind), n = A.inset * (t.scale ?? 1), o = [];
  for (let a = 0; a < bo; a++) {
    const i = a / bo * e, r = Xe(i, t.width, t.height, t.cornerRadius, n, 0, t.kind);
    o.push({ x: r.x, y: r.y, arc: i });
  }
  return o;
}
const li = 0.05, ci = 120 * (1e3 / 15), No = 1e3 / 15, Uo = 2e3, An = 400, ui = 2.625, di = 1.008, fi = 0.31, Ia = 140, Oa = 40, La = 20, hi = 34, Je = 0.25, mi = 0.01, Do = 4e-3, pi = 0.5, gi = 3.5, Mt = { x: 0, y: 0 };
function Ho(t, e) {
  const { width: n, height: o } = e, a = e.scale ?? 1, i = Math.min(3, typeof window < "u" && window.devicePixelRatio || 1), r = rn(n, o, e.cornerRadius, e.kind) / eo(Ia, Oa, La), l = Math.max(1, A.haloHalfLen * r), s = Math.max(0.6, A.extraHalfLen * r), c = oi(l, a, i), u = ai(s, a, i), d = Math.ceil(Math.max(c.ay, u.ay) + A.extraOutward * r * a + 2), h = document.createElement("div");
  h.className = "metal-fx-glow-svg", h.setAttribute("aria-hidden", "true");
  const f = document.createElement("div");
  f.className = "metal-fx-glow-env", f.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0";
  const p = document.createElement("canvas");
  p.className = "metal-fx-glow-canvas";
  const g = n + 2 * d, v = o + 2 * d;
  p.width = Math.ceil(g * i), p.height = Math.ceil(v * i), p.style.cssText = `position:absolute;left:${-d}px;top:${-d}px;width:${g}px;height:${v}px;pointer-events:none`, f.appendChild(p), h.appendChild(f), t.appendChild(h);
  const m = p.getContext("2d", { willReadFrequently: !!e.maskDataUrl });
  if (!m) throw new Error("metal-fx: glow canvas 2D context unavailable");
  const b = {
    wrap: h,
    env: f,
    canvas: p,
    ctx: m,
    surroundPath: null,
    bandPath: null,
    maskAlpha: null,
    maskReady: !1,
    margin: d,
    dpr: i,
    halo: c,
    extra: u,
    haloTint: { canvas: null, img: null, tint: -1, src: null },
    extraTint: { canvas: null, img: null, tint: -1, src: null },
    mO: Re(),
    mI: Re(),
    maskSum: Number.NaN,
    maskDeformed: !1,
    deform: null,
    width: n,
    height: o,
    cornerRadius: e.cornerRadius,
    kind: e.kind,
    scale: a,
    perim: si(e),
    pointMode: !!(e.samplePoints && e.samplePoints.length > 0),
    currentIdx: 0,
    appearedAt: 0,
    glowOpacity: 0,
    relocTween: null,
    relocNextIdx: -1,
    relocMul: 0,
    envClock: 0,
    cursorMode: !1,
    cursorArc: 0,
    cursorTargetArc: 0,
    lastTickMs: 0,
    wanderS: 0,
    wanderTargetS: 0,
    wanderFrames: 0,
    tintFrom: { r: 255, g: 255, b: 255 },
    tintTarget: { r: 255, g: 255, b: 255 },
    tintTween: null,
    tintHoldUntil: 0,
    dX: Number.NaN,
    dY: Number.NaN,
    dAng: Number.NaN,
    dEX: Number.NaN,
    dEY: Number.NaN,
    dHOp: Number.NaN,
    dEOp: Number.NaN,
    dHaloTint: "",
    dExtraTint: "",
    dirty: !0,
    dEnv: -1
  };
  if (e.maskDataUrl) {
    const w = new Image();
    w.onload = () => {
      const M = document.createElement("canvas");
      M.width = p.width, M.height = p.height;
      const y = M.getContext("2d", { willReadFrequently: !0 });
      if (!y) return;
      y.scale(i, i), y.drawImage(w, d, d, n, o);
      const C = y.getImageData(0, 0, M.width, M.height).data, N = M.width * M.height, E = new Float32Array(N);
      for (let S = 0, B = 3; S < N; S++, B += 4) E[S] = C[B] / 255;
      const P = fn(Float32Array.from(E), M.width, M.height, gi * i);
      let G = 0;
      for (let S = 0; S < N; S++) P[S] > G && (G = P[S]);
      const at = G > 0 ? pi / G : 0, F = new Uint8ClampedArray(N);
      for (let S = 0; S < N; S++) F[S] = Math.round(Math.max(E[S], P[S] * at) * 255);
      b.maskAlpha = F, b.maskReady = !0, b.dirty = !0;
    }, w.src = e.maskDataUrl;
  } else
    jn(b, null);
  return b;
}
function jn(t, e) {
  if (t.pointMode) return;
  const { margin: n, width: o, height: a, cornerRadius: i } = t, r = t.kind === "circle" ? 2 : 1;
  Ce(0, 0, o, a, i, e, t.mO), Ce(r, r, o - 2 * r, a - 2 * r, Math.max(0, i - r), e, t.mI);
  const l = new Path2D();
  En(l, t.mO, n);
  const s = new Path2D();
  En(s, t.mO, n), En(s, t.mI, n);
  const c = new Path2D();
  c.rect(0, 0, o + 2 * n, a + 2 * n), c.addPath(l), t.surroundPath = c, t.bandPath = s, t.maskReady = !0;
}
function En(t, e, n) {
  const o = e.xy;
  for (let a = 0; a < e.n; a++) {
    const i = o[a * 2] + n, r = o[a * 2 + 1] + n;
    a === 0 ? t.moveTo(i, r) : t.lineTo(i, r);
  }
  t.closePath();
}
function xi(t, e) {
  if (!t) return 0;
  Ce(0, 0, e.width, e.height, e.cornerRadius, t, e.mO);
  let n = 0;
  const o = e.mO.xy;
  for (let a = 0; a < e.mO.n; a += 4) n += o[a * 2] * 1.37 + o[a * 2 + 1];
  return n;
}
function vi(t, e) {
  if (t.deform = e, !t.pointMode)
    if (e) {
      const n = xi(e, t);
      n !== t.maskSum && (t.maskSum = n, jn(t, e), t.maskDeformed = !0, t.dirty = !0);
    } else t.maskDeformed && (t.maskSum = Number.NaN, jn(t, null), t.maskDeformed = !1, t.dirty = !0);
}
function bi(t, e, n, o, a = "dark") {
  var ot;
  const { width: i, height: r, cornerRadius: l, perim: s } = t;
  if (s.length === 0) return !1;
  const c = 2;
  let u = -1, d = t.currentIdx, h = 0;
  for (let k = 0; k < s.length; k++) {
    const H = s[k], Q = Fn(e, H.x, H.y, c);
    Q > u && (u = Q, d = k), k === t.currentIdx && (h = Q);
  }
  const f = t.appearedAt > 0 && n - t.appearedAt < A.minDwellMs, p = A.baseOp + (A.peakOp - A.baseOp) * Po(A.lumLo, A.lumHi, h), g = !f && u - h > li, v = e.cursorLight, m = Yt.enabled && Yt.catchLight && !t.pointMode && !!v && v.w > 0.02, b = rn(i, r, l, t.kind);
  m && (t.cursorTargetArc = ri(v.x, v.y, i, r, l, t.kind));
  const w = m ? Math.min(1, A.peakOp * Yt.catchGain * v.w) : 0, M = t.lastTickMs > 0 ? Math.min(200, Math.max(0.5, n - t.lastTickMs)) : No;
  t.lastTickMs = n, t.envClock += Math.min(M, hi);
  const y = (k) => 1 - Math.pow(1 - k, M / No), C = Math.max(1, A.relocFadeMs), N = Math.max(1, A.relocFadeOutMs), E = -2, P = -3, G = () => {
    t.appearedAt = n, t.wanderS = 0, t.wanderTargetS = 0, t.wanderFrames = 0, t.relocTween = Oe(0, 1, C, Bn.smoothstep), Le(t.relocTween, t.envClock);
  }, at = (k) => {
    t.relocNextIdx = k, t.relocTween = Oe(1, 0, N, Bn.smoothstep), Le(t.relocTween, t.envClock);
  };
  if ((ot = t.relocTween) != null && ot.done && t.relocTween.to === 0) {
    let k = t.relocNextIdx;
    if (k === E && !m && (k = P), k === P)
      t.cursorMode = !1, t.appearedAt = 0, t.relocTween = null;
    else if (k === E)
      t.cursorMode = !0, t.cursorArc = t.cursorTargetArc, t.glowOpacity = w, G();
    else {
      t.currentIdx = k;
      const H = s[t.currentIdx], Q = Fn(e, H.x, H.y, c);
      t.glowOpacity = A.baseOp + (A.peakOp - A.baseOp) * Po(A.lumLo, A.lumHi, Q), G();
    }
  }
  if ((!t.relocTween || t.relocTween.done) && (t.appearedAt === 0 ? (m ? (t.cursorMode = !0, t.cursorArc = t.cursorTargetArc, t.glowOpacity = w) : (t.cursorMode = !1, t.currentIdx = d, t.glowOpacity = p), G()) : m !== t.cursorMode ? at(m ? E : P) : !t.cursorMode && g && at(d)), t.cursorMode) {
    m && (t.glowOpacity = w);
    const k = Math.max(0.01, Math.min(1, Yt.catchFollow)), H = 1 - Math.pow(1 - k, M / (1e3 / 60));
    let Q = t.cursorTargetArc - t.cursorArc;
    Q = (Q % b + b * 1.5) % b - b / 2, t.cursorArc += Q * H;
  } else
    t.glowOpacity += (p - t.glowOpacity) * y(A.fadeRate);
  t.glowOpacity = Math.max(0, Math.min(1, t.glowOpacity)), t.relocMul = t.relocTween ? Co(t.relocTween, t.envClock) : 1;
  const F = rn(i, r, l, t.kind) / eo(Ia, Oa, La), S = A.wanderRange * F;
  t.wanderFrames += M, t.wanderFrames >= ci && (t.wanderTargetS = (Math.random() * 2 - 1) * S, t.wanderFrames = 0), t.wanderS += (t.wanderTargetS - t.wanderS) * y(A.wanderLerp);
  let B, K, nt, U, _;
  if (t.pointMode) {
    const k = s[t.currentIdx];
    B = k.x + t.wanderS, K = k.y, nt = 0, U = B, _ = K;
  } else {
    const k = t.cursorMode ? t.cursorArc : s[t.currentIdx].arc + t.wanderS, H = A.inset * t.scale;
    Xe(k, i, r, l, H, 0, t.kind, Mt), B = Mt.x, K = Mt.y, nt = ii(k, i, r, l, H, t.kind);
    const Q = A.extraOutward * F * t.scale;
    Xe(k, i, r, l, H, Q, t.kind, Mt), U = Mt.x, _ = Mt.y;
  }
  t.deform && (t.deform(B, K, Mt), B = Mt.x, K = Mt.y, t.deform(U, _, Mt), U = Mt.x, _ = Mt.y);
  const T = a === "light", V = T ? br(e, B, K, c) : xa(e, B, K, c);
  t.tintTween ? t.tintTween.done && (T ? (t.tintFrom = {
    r: t.tintFrom.r + (t.tintTarget.r - t.tintFrom.r) * t.tintTween.val,
    g: t.tintFrom.g + (t.tintTarget.g - t.tintFrom.g) * t.tintTween.val,
    b: t.tintFrom.b + (t.tintTarget.b - t.tintFrom.b) * t.tintTween.val
  }, t.tintTarget = { ...V }, t.tintTween = Oe(0, 1, An), Le(t.tintTween, n)) : n >= t.tintHoldUntil && (t.tintFrom = { ...t.tintTarget }, t.tintTarget = { ...V }, t.tintTween = Oe(0, 1, An), Le(t.tintTween, n), t.tintHoldUntil = n + Uo)) : (t.tintFrom = { ...V }, t.tintTarget = { ...V }, t.tintTween = Oe(0, 1, An), Le(t.tintTween, n), t.tintHoldUntil = T ? 0 : n + Uo), Co(t.tintTween, n);
  const Z = t.tintTween.val;
  let Y, ut, L;
  if (T)
    Y = Math.round(t.tintFrom.r + (t.tintTarget.r - t.tintFrom.r) * Z), ut = Math.round(t.tintFrom.g + (t.tintTarget.g - t.tintFrom.g) * Z), L = Math.round(t.tintFrom.b + (t.tintTarget.b - t.tintFrom.b) * Z);
  else {
    const k = t.tintFrom.r + (t.tintTarget.r - t.tintFrom.r) * Z, H = t.tintFrom.g + (t.tintTarget.g - t.tintFrom.g) * Z, Q = t.tintFrom.b + (t.tintTarget.b - t.tintFrom.b) * Z, q = Math.max(k, H, Q) || 1;
    Y = Math.round(255 * (k / q)), ut = Math.round(255 * (H / q)), L = Math.round(255 * (Q / q));
  }
  const O = `rgb(${Y},${ut},${L})`;
  let D = "#ffffff";
  if (T) {
    const k = ca(Y, ut, L), [H, Q, q] = ua(k[0], Math.min(1, k[1] * ui), Math.max(fi, k[2] * di));
    D = `rgb(${H},${Q},${q})`;
  }
  const $ = Math.max(0, Math.min(1, o)) * (t.pointMode ? A.pointGain : 1), W = Math.min(1, t.glowOpacity * A.haloOpMul * $), et = Math.min(1, t.glowOpacity * A.extraIntensity * $);
  if (Math.abs(t.relocMul - t.dEnv) > 2e-3) {
    const k = t.relocMul >= 0.998 && t.dEnv < 0.998;
    t.dEnv = t.relocMul, t.env.style.opacity = t.relocMul.toFixed(3), k && (t.dirty = !0);
  }
  const rt = !!(t.relocTween && !t.relocTween.done) || t.cursorMode, st = !(Math.abs(B - t.dX) < Je && Math.abs(K - t.dY) < Je && Math.abs(nt - t.dAng) < mi && Math.abs(U - t.dEX) < Je && Math.abs(_ - t.dEY) < Je), dt = !(Math.abs(W - t.dHOp) < Do && Math.abs(et - t.dEOp) < Do), ct = O !== t.dHaloTint || D !== t.dExtraTint;
  return (t.dirty || st || dt || ct) && (t.dX = B, t.dY = K, t.dAng = nt, t.dEX = U, t.dEY = _, t.dHOp = W, t.dEOp = et, t.dHaloTint = O, t.dExtraTint = D, t.dirty = !1, wi(t, B, K, nt, U, _, W, et, O, D)), rt;
}
function wi(t, e, n, o, a, i, r, l, s, c) {
  const { ctx: u, canvas: d, dpr: h, margin: f } = t;
  if (u.setTransform(1, 0, 0, 1, 0, 0), u.globalCompositeOperation = "source-over", u.globalAlpha = 1, u.clearRect(0, 0, d.width, d.height), r <= 2e-3 && l <= 2e-3 || !t.maskReady) return;
  const p = r > 2e-3 ? Bo(t.halo, ...zo(s), t.haloTint) : null, g = l > 2e-3 ? c === "#ffffff" ? t.extra.canvas : Bo(t.extra, ...zo(c), t.extraTint) : null, v = (M) => {
    p && (u.save(), u.translate(e + f, n + f), u.rotate(o), u.globalAlpha = r * M, u.drawImage(p, -t.halo.ax, -t.halo.ay, t.halo.w, t.halo.h), u.restore()), g && (u.save(), u.translate(a + f, i + f), u.rotate(o), u.globalAlpha = l * M, u.drawImage(g, -t.extra.ax, -t.extra.ay, t.extra.w, t.extra.h), u.restore());
  };
  if (!t.pointMode && t.surroundPath && t.bandPath) {
    u.save(), u.scale(h, h), u.clip(t.surroundPath, "evenodd"), v(0.5), u.restore(), u.save(), u.scale(h, h), u.clip(t.bandPath, "evenodd"), v(1), u.restore();
    return;
  }
  u.save(), u.scale(h, h), v(1), u.restore();
  const m = t.maskAlpha;
  if (!m) return;
  const b = u.getImageData(0, 0, d.width, d.height), w = b.data;
  for (let M = 0, y = 3; M < m.length; M++, y += 4) {
    const C = m[M];
    if (C !== 255) {
      if (C === 0) {
        w[y] = 0;
        continue;
      }
      w[y] = (w[y] * C + 127) / 255;
    }
  }
  u.putImageData(b, 0, 0);
}
const ge = [255, 255, 255];
function zo(t) {
  if (t[0] === "#")
    return ge[0] = parseInt(t.slice(1, 3), 16), ge[1] = parseInt(t.slice(3, 5), 16), ge[2] = parseInt(t.slice(5, 7), 16), ge;
  let e = 4, n = 0, o = 0;
  for (; e < t.length && o < 3; ) {
    const a = t.charCodeAt(e++);
    a >= 48 && a <= 57 ? n = n * 10 + (a - 48) : (a === 44 || a === 41) && (ge[o++] = n, n = 0);
  }
  return ge;
}
function yi(t, e) {
  t.pointMode === e.pointMode && (e.currentIdx = Math.min(t.currentIdx, Math.max(0, e.perim.length - 1)), e.appearedAt = t.appearedAt, e.glowOpacity = t.glowOpacity, e.relocTween = t.relocTween, e.relocNextIdx = t.relocNextIdx, e.relocMul = t.relocMul, e.envClock = t.envClock, e.cursorMode = t.cursorMode, e.cursorArc = t.cursorArc, e.cursorTargetArc = t.cursorTargetArc, e.lastTickMs = t.lastTickMs, e.wanderS = t.wanderS, e.wanderTargetS = t.wanderTargetS, e.wanderFrames = t.wanderFrames, e.tintFrom = t.tintFrom, e.tintTarget = t.tintTarget, e.tintTween = t.tintTween, e.tintHoldUntil = t.tintHoldUntil, e.dEnv = t.relocMul, e.env.style.opacity = t.relocMul.toFixed(3));
}
const Go = Object.freeze({ offsetY: 1, blur: 0.5, alpha: 0.9, color: "#ffffff" });
function Mi(t, e, n) {
  const o = Math.min(3, typeof window < "u" && window.devicePixelRatio || 1), a = Math.ceil(3 * n.blur + Math.abs(n.offsetY) + 1), i = e.width + 2 * a, r = e.height + 2 * a, l = document.createElement("canvas");
  l.className = "metal-fx-rim-canvas", l.setAttribute("aria-hidden", "true"), l.width = Math.ceil(i * o), l.height = Math.ceil(r * o), l.style.cssText = `position:absolute;left:${-a}px;top:${-a}px;width:${i}px;height:${r}px;pointer-events:none`;
  const s = l.getContext("2d"), c = document.createElement("canvas");
  c.width = l.width, c.height = l.height;
  const u = c.getContext("2d", { willReadFrequently: !0 });
  if (!s || !u) return null;
  t.appendChild(l);
  const d = {
    canvas: l,
    ctx: s,
    scratch: c,
    sctx: u,
    width: e.width,
    height: e.height,
    cornerRadius: e.cornerRadius,
    kind: e.kind,
    ring: e.ring,
    margin: a,
    dpr: o,
    opts: n,
    mO: Re(),
    mI: Re(),
    sum: Number.NaN
  };
  return Fa(d, null, !0), d;
}
function Wo(t, e, n) {
  const o = e.xy;
  for (let a = 0; a < e.n; a++) {
    const i = o[a * 2] + n, r = o[a * 2 + 1] + n;
    a === 0 ? t.moveTo(i, r) : t.lineTo(i, r);
  }
  t.closePath();
}
function Fa(t, e, n = !1) {
  const { width: o, height: a, cornerRadius: i, ring: r, margin: l, dpr: s } = t;
  Ce(0, 0, o, a, i, e, t.mO), Ce(r, r, o - 2 * r, a - 2 * r, Math.max(0, i - r), e, t.mI);
  let c = 0;
  const u = t.mO.xy;
  for (let S = 0; S < t.mO.n; S += 4) c += u[S * 2] * 1.37 + u[S * 2 + 1];
  if (!n && c === t.sum) return;
  t.sum = c;
  const { sctx: d, scratch: h, ctx: f, canvas: p, opts: g } = t, v = h.width, m = h.height;
  d.setTransform(1, 0, 0, 1, 0, 0), d.clearRect(0, 0, v, m), d.scale(s, s), d.fillStyle = "#fff", d.beginPath(), Wo(d, t.mO, l), Wo(d, t.mI, l), d.fill("evenodd");
  const b = d.getImageData(0, 0, v, m).data, w = v * m, M = new Float32Array(w);
  for (let S = 0, B = 3; S < w; S++, B += 4) M[S] = b[B] / 255;
  const y = Math.round(g.offsetY * s) * v, C = new Float32Array(w);
  if (y >= 0)
    for (let S = 0; S < w; S++) C[S] = Math.max(0, M[S] - (S >= y ? M[S - y] : 0));
  else
    for (let S = 0; S < w; S++) C[S] = Math.max(0, M[S] - (S - y < w ? M[S - y] : 0));
  const N = fn(C, v, m, g.blur * s), E = parseInt(g.color.slice(1, 3), 16), P = parseInt(g.color.slice(3, 5), 16), G = parseInt(g.color.slice(5, 7), 16), at = f.createImageData(v, m), F = at.data;
  for (let S = 0, B = 0; S < w; S++, B += 4)
    F[B] = E, F[B + 1] = P, F[B + 2] = G, F[B + 3] = Math.round(Math.min(1, N[S] * M[S] * g.alpha) * 255);
  f.setTransform(1, 0, 0, 1, 0, 0), f.putImageData(at, 0, 0);
}
function Vo(t) {
  t && t.canvas.remove();
}
const nn = 12, $o = 32, Xo = 1, Yo = 0.55, _i = 1, Si = 1, Ri = 0.85, Ci = 0, Ti = 1.3, jo = 3.6, Ai = 0.7, Ei = 1, ki = 0.52, Ii = 1, Oi = 0.044, Li = 235, Fi = 2.535, qo = 0.7, Bi = 0.5, Pi = /* @__PURE__ */ new Set(["INPUT", "TEXTAREA", "SELECT", "OPTION"]);
function Ni(t, e) {
  const n = Math.max(t.left - e.right, e.left - t.right, 0), o = Math.max(t.top - e.bottom, e.top - t.bottom, 0);
  return Math.sqrt(n * n + o * o);
}
function Ui(t, e, n, o) {
  return !(Math.min(t.bottom, e.bottom) - Math.max(t.top, e.top) < n || Math.max(
    t.left - e.right,
    e.left - t.right,
    0
  ) > o);
}
function Di(t, e, n, o) {
  return Math.min(t.right, e.right) - Math.max(t.left, e.left) < n ? !1 : Math.max(
    t.top - e.bottom,
    e.top - t.bottom,
    0
  ) <= o;
}
function le(t, e, n, o, a, i) {
  const r = Math.max(0, Math.min(i, o * 0.5, a * 0.5)), l = t.roundRect;
  if (typeof l == "function") {
    l.call(t, e, n, o, a, r);
    return;
  }
  t.moveTo(e + r, n), t.lineTo(e + o - r, n), t.quadraticCurveTo(e + o, n, e + o, n + r), t.lineTo(e + o, n + a - r), t.quadraticCurveTo(e + o, n + a, e + o - r, n + a), t.lineTo(e + r, n + a), t.quadraticCurveTo(e, n + a, e, n + a - r), t.lineTo(e, n + r), t.quadraticCurveTo(e, n, e + r, n);
}
function Ba(t, e, n, o, a) {
  if (!a.flipX && !a.flipY) {
    t.drawImage(e, a.sx ?? 0, a.sy ?? 0, n, o, a.x, a.y, a.w, a.h);
    return;
  }
  t.save(), a.flipX && (t.translate(a.x + a.w, 0), t.scale(-1, 1)), a.flipY && (t.translate(0, a.y + a.h), t.scale(1, -1)), t.drawImage(
    e,
    a.sx ?? 0,
    a.sy ?? 0,
    n,
    o,
    a.flipX ? 0 : a.x,
    a.flipY ? 0 : a.y,
    a.w,
    a.h
  ), t.restore();
}
const Hi = 4;
function zi(t, e, n, o, a, i, r) {
  if (o <= 2 * r || a <= 2 * r) {
    t.beginPath(), le(t, e, n, o, a, i), t.clip();
    return;
  }
  t.beginPath(), le(t, e, n, o, a, i), le(t, e + r, n + r, o - 2 * r, a - 2 * r, Math.max(0, i - r)), t.clip("evenodd");
}
function Gi(t, e, n, o, a, i, r, l, s, c, u, d) {
  const h = d ?? Math.max(1, Math.round((nn + Hi * 3) * u));
  let f = Math.max(0, r), p = !0;
  for (let g = 0; g < 3 && f > 1e-4; g++) {
    const v = Math.min(1, f);
    t.save(), zi(t, c.x, c.y, c.w, c.h, c.r, h), t.globalCompositeOperation = p ? "source-over" : "lighter", p = !1, t.globalAlpha = v, Ba(t, e, n, o, s), t.globalAlpha = 1, t.globalCompositeOperation = "destination-in", t.fillStyle = l, t.fillRect(0, 0, a, i), t.restore(), f -= v;
  }
}
function Pa(t, e, n, o, a, i, r) {
  const l = r | 0;
  if (l < 1 || o <= 2 * l || a <= 2 * l) {
    t.beginPath(), le(t, e, n, o, a, i), t.clip();
    return;
  }
  t.beginPath(), le(t, e, n, o, a, i), le(t, e + l, n + l, o - 2 * l, a - 2 * l, Math.max(0, i - l)), t.clip("evenodd");
}
function Wi(t, e, n, o, a, i, r, l, s, c, u, d) {
  let h = l * u, f = !0;
  for (let p = 0; p < 3 && h > 1e-4; p++) {
    const g = Math.min(1, h);
    t.save(), Pa(t, r.x, r.y, r.w, r.h, r.r, s), t.globalCompositeOperation = f ? "source-over" : "lighter", f = !1, t.globalAlpha = g, Ba(t, e, n, o, d), t.globalAlpha = 1, t.globalCompositeOperation = "destination-in", t.fillStyle = c, t.fillRect(0, 0, a, i), t.restore(), h -= g;
  }
}
function Vi(t, e, n, o, a, i, r, l) {
  const s = t.createLinearGradient(o, a, i, r);
  s.addColorStop(0, `rgba(255,255,255,${l.toFixed(3)})`), s.addColorStop(0.5, `rgba(255,255,255,${(l * 0.45).toFixed(3)})`), s.addColorStop(1, "rgba(255,255,255,0)"), t.save(), Pa(t, e.x, e.y, e.w, e.h, e.r, n), t.globalCompositeOperation = "lighter", t.lineWidth = n * 2, t.strokeStyle = s, t.beginPath(), le(t, e.x, e.y, e.w, e.h, e.r), t.stroke(), t.restore();
}
function Na(t) {
  const e = getComputedStyle(t), n = [
    parseFloat(e.borderTopLeftRadius) || 0,
    parseFloat(e.borderTopRightRadius) || 0,
    parseFloat(e.borderBottomRightRadius) || 0,
    parseFloat(e.borderBottomLeftRadius) || 0
  ].filter((o) => o > 0);
  return n.length ? Math.min.apply(null, n) : 0;
}
function Ua(t) {
  const e = getComputedStyle(t), n = Math.max(
    parseFloat(e.borderTopWidth) || 0,
    parseFloat(e.borderRightWidth) || 0,
    parseFloat(e.borderBottomWidth) || 0,
    parseFloat(e.borderLeftWidth) || 0
  );
  let o = 0, a = 0;
  const i = e.boxShadow;
  if (i && i !== "none") {
    const c = i.replace(/rgba?\([^)]*\)/g, (h) => h.replace(/,/g, "\0")).split(/,\s*/);
    let u = 1 / 0, d = 1 / 0;
    for (const h of c) {
      const f = h.match(/-?\d+(?:\.\d+)?px/g);
      if (!f || f.length < 4) continue;
      const p = parseFloat(f[3]);
      p > 0 && (/\binset\b/.test(h) ? p < u && (u = p) : p < d && (d = p));
    }
    Number.isFinite(u) && (o = u), Number.isFinite(d) && (a = d);
  }
  const r = Math.max(n, a);
  return { width: Math.max(n, o, a) || 1, outerCssPx: r };
}
function Ko(t) {
  t.cornerRadius = Na(t.el);
  const e = Ua(t.el);
  t.hairlineWidth = e.width, t.hairlineOuterCssPx = e.outerCssPx;
}
function $i(t) {
  typeof ResizeObserver < "u" && (t.resizeObserver = new ResizeObserver(() => Ko(t)), t.resizeObserver.observe(t.el)), typeof MutationObserver < "u" && (t.mutationObserver = new MutationObserver(() => Ko(t)), t.mutationObserver.observe(t.el, {
    attributes: !0,
    attributeFilter: ["style", "class"]
  }));
}
function Xi(t) {
  var e, n;
  (e = t.resizeObserver) == null || e.disconnect(), t.resizeObserver = null, (n = t.mutationObserver) == null || n.disconnect(), t.mutationObserver = null;
}
const Zt = /* @__PURE__ */ new Set(), Da = Object.freeze({
  enabled: !0,
  radius: 11.5,
  strength: 0.57,
  penumbra: 0.55,
  falloff: 0.21,
  edgeFade: 0.7,
  softness: 0.24,
  repaintMs: 36
}), Ye = { ...Da };
function Yi(t) {
  Object.assign(Ye, t), hn();
}
function ks() {
  Yi({ ...Da });
}
let Xt = null, kn = 0, Qo = 0, Zo = !1;
function hn() {
  kn !== 0 || typeof requestAnimationFrame > "u" || (kn = requestAnimationFrame((t) => {
    if (kn = 0, t - Qo < Ye.repaintMs) {
      hn();
      return;
    }
    Qo = t, za();
  }));
}
let sn = !1;
function ji(t, e) {
  const n = Ye.radius;
  for (const o of Zt) {
    const a = o.anchorEl.getBoundingClientRect(), i = o.el.getBoundingClientRect(), r = Math.min(a.left, i.left) - n, l = Math.max(a.right, i.right) + n, s = Math.min(a.top, i.top) - n, c = Math.max(a.bottom, i.bottom) + n;
    if (t >= r && t <= l && e >= s && e <= c) return !0;
  }
  return !1;
}
function Jo(t) {
  if (Xt = { x: t.clientX, y: t.clientY }, !Ye.enabled) return;
  const e = ji(t.clientX, t.clientY);
  (e || sn) && hn(), sn = e;
}
function tn() {
  Xt = null, sn && hn(), sn = !1;
}
function Ha(t) {
  typeof document > "u" || t === Zo || (Zo = t, t ? (document.addEventListener("pointermove", Jo, { passive: !0 }), document.addEventListener("pointerleave", tn), window.addEventListener("blur", tn)) : (document.removeEventListener("pointermove", Jo), document.removeEventListener("pointerleave", tn), window.removeEventListener("blur", tn), Xt = null));
}
function qi(t, e, n, o, a, i, r, l, s) {
  if (!Xt) return;
  const c = Ye;
  if (!c.enabled || c.strength <= 0) return;
  const u = c.radius;
  let d, h, f, p, g, v;
  if (a) {
    const U = n.left >= o.right;
    d = U ? o.right : n.right, h = U ? n.left : o.left, f = Xt.x, p = Xt.y, g = Math.max(n.top, o.top), v = Math.min(n.bottom, o.bottom);
  } else {
    const U = n.top >= o.bottom;
    d = U ? o.bottom : n.bottom, h = U ? n.top : o.top, f = Xt.y, p = Xt.x, g = Math.max(n.left, o.left), v = Math.min(n.right, o.right);
  }
  const m = Math.min(d, h), b = Math.max(d, h), w = Math.max(1, b - m);
  if (f < m - u || f > b + u || p < g - u || p > v + u) return;
  const M = Math.max(0, Math.min(1, Math.abs(f - d) / w)), y = Math.max(0.5, u * c.edgeFade), C = Math.min(1, Math.min(f - (m - u), b + u - f) / y), N = Math.min(1, Math.min(p - (g - u), v + u - p) / y), E = c.strength * (1 - c.falloff * M) * C * N;
  if (E <= 1e-3) return;
  const P = u * s * (1 + c.penumbra * M), G = a ? (p - o.top + l) * s : (p - o.left + l) * s, at = Math.max(0, Math.min(0.5, (1 - c.softness) * 0.5)), F = Math.max(1e-3, 0.5 - at), S = a ? r : i, B = Math.max(0, Math.floor(G - P)), K = Math.min(S, Math.ceil(G + P));
  if (K <= B) return;
  const nt = new Float32Array(K - B);
  for (let U = B; U < K; U++) {
    const _ = (U + 0.5 - (G - P)) / (2 * P), T = _ < F ? _ / F : _ > 1 - F ? (1 - _) / F : 1;
    nt[U - B] = 1 - E * Math.max(0, Math.min(1, T));
  }
  for (const U of [t, e]) {
    const _ = a ? 0 : B, T = a ? B : 0, V = a ? i : K - B, Z = a ? K - B : r, Y = U.getImageData(_, T, V, Z), ut = Y.data;
    if (a)
      for (let L = 0; L < Z; L++) {
        const O = nt[L];
        if (!(O >= 0.999))
          for (let D = L * V * 4 + 3, $ = (L + 1) * V * 4; D < $; D += 4) ut[D] = ut[D] * O;
      }
    else
      for (let L = 0; L < Z; L++)
        for (let O = 0; O < V; O++) {
          const D = nt[O];
          if (D >= 0.999) continue;
          const $ = (L * V + O) * 4 + 3;
          ut[$] = ut[$] * D;
        }
    U.putImageData(Y, _, T);
  }
}
let Nt = null, ve = null, be = null, we = null;
function Ki(t, e) {
  return Nt || (Nt = document.createElement("canvas"), ve = document.createElement("canvas"), be = Nt.getContext("2d", { alpha: !0 }), we = ve.getContext("2d", { alpha: !0 })), !be || !we || !Nt || !ve ? !1 : (Nt.width !== t && (Nt.width = t, ve.width = t), Nt.height !== e && (Nt.height = e, ve.height = e), be.setTransform(1, 0, 0, 1, 0, 0), we.setTransform(1, 0, 0, 1, 0, 0), be.globalCompositeOperation = "source-over", we.globalCompositeOperation = "source-over", be.clearRect(0, 0, t, e), we.clearRect(0, 0, t, e), !0);
}
function Qi(t, e, n, o = 1) {
  if (typeof document > "u" || Pi.has(t.tagName)) return null;
  for (const p of Zt)
    if (p.el === t)
      return p.strength = o, p;
  const a = document.createElement("div");
  a.setAttribute("data-metal-fx-reflection", ""), a.setAttribute("aria-hidden", "true");
  const i = document.createElement("canvas");
  i.className = "metal-fx-reflection-canvas";
  const r = i.getContext("2d", { alpha: !0, willReadFrequently: !0 });
  if (!r) return null;
  const l = document.createElement("canvas");
  l.className = "metal-fx-reflection-stroke-canvas";
  const s = l.getContext("2d", { alpha: !0, willReadFrequently: !0 });
  if (!s) return null;
  a.appendChild(i), a.appendChild(l);
  const c = getComputedStyle(t);
  let u = !1;
  c.position === "static" && (t.style.position = "relative", u = !0);
  let d = !1;
  c.isolation !== "isolate" && (t.style.isolation = "isolate", d = !0), t.setAttribute("data-metal-fx-reflect-host", ""), t.insertBefore(a, t.firstChild);
  const h = Ua(t), f = {
    el: t,
    anchor: e,
    anchorEl: n,
    strength: o,
    wrap: a,
    canvas: i,
    ctx: r,
    strokeCanvas: l,
    strokeCtx: s,
    cornerRadius: Na(t),
    hairlineWidth: h.width,
    hairlineOuterCssPx: h.outerCssPx,
    appliedPositionRelative: u,
    appliedIsolation: d,
    resizeObserver: null,
    mutationObserver: null
  };
  return $i(f), Zt.add(f), Ha(!0), f;
}
function Zi(t) {
  for (const e of Zt)
    if (e.el === t) {
      Xi(e), e.canvas.width = 0, e.canvas.height = 0, e.strokeCanvas.width = 0, e.strokeCanvas.height = 0, e.wrap.parentNode === e.el && e.el.removeChild(e.wrap), e.el.removeAttribute("data-metal-fx-reflect-host"), e.appliedPositionRelative && (e.el.style.position = ""), e.appliedIsolation && (e.el.style.isolation = ""), Zt.delete(e), Zt.size === 0 && Ha(!1);
      return;
    }
}
function Ji(t, e, n, o, a) {
  if (o < 1 || a < 1) return null;
  const i = t.getContext("2d");
  if (!i) return null;
  const r = i.getImageData(e, n, o, a).data;
  let l = o, s = a, c = -1, u = -1;
  for (let d = 0; d < a; d++) {
    const h = d * o;
    for (let f = 0; f < o; f++)
      r[(h + f) * 4 + 3] > 8 && (f < l && (l = f), f > c && (c = f), d < s && (s = d), d > u && (u = d));
  }
  return c < 0 ? null : { x: e + l, y: n + s, w: c - l + 1, h: u - s + 1 };
}
function za() {
  if (Zt.size === 0) return;
  const t = typeof window < "u" && window.devicePixelRatio || 1, e = /* @__PURE__ */ new Map();
  for (const n of Zt) {
    const o = n.el.getBoundingClientRect();
    let a = e.get(n.anchorEl);
    if (a || (a = n.anchorEl.getBoundingClientRect(), e.set(n.anchorEl, a)), o.width < 1 || o.height < 1 || a.width < 1 || a.height < 1) continue;
    const i = n.el.hasAttribute("data-metal-fx-text");
    if (i && !n.glyphStyled && (n.canvas.style.filter = "blur(0.4px) saturate(1.35) brightness(1.2)", n.glyphStyled = !0), !Ui(a, o, Xo, $o) && !Di(a, o, Xo, $o)) {
      n.canvas.width !== 1 && (n.canvas.width = 1, n.canvas.height = 1), n.strokeCanvas.width !== 1 && (n.strokeCanvas.width = 1, n.strokeCanvas.height = 1);
      continue;
    }
    const r = i && !!n.anchor.mask;
    r && !n.anchor.wantRaw && (n.anchor.wantRaw = !0), n.anchor.wantRing || (n.anchor.wantRing = !0);
    const l = !!n.anchor.deform && !!n.anchor.ringCanvas, s = r && n.anchor.rawCanvas ? n.anchor.rawCanvas : l ? n.anchor.ringCanvas : n.anchor.canvas, c = Math.round(n.anchor.overscan * t);
    let u = c, d = c, h = (s.width | 0) - 2 * c, f = (s.height | 0) - 2 * c;
    if (n.anchor.mask && !r) {
      const Y = Ji(s, u, d, h, f);
      Y && (u = Y.x, d = Y.y, h = Y.w, f = Y.h);
    }
    if (h < 4 || f < 4) continue;
    const p = (a.left + a.right) * 0.5, g = (a.top + a.bottom) * 0.5, v = (o.left + o.right) * 0.5, m = (o.top + o.bottom) * 0.5, b = p - v, w = g - m, M = Math.max(a.left - o.right, o.left - a.right, 0), y = Math.max(a.top - o.bottom, o.top - a.bottom, 0), C = M >= y, N = Ni(a, o);
    let E = 1 - Math.min(1, N / nn);
    E = E * E * (3 - 2 * E);
    const P = Yo + (_i - Yo) * E, G = Math.min(
      jo,
      P * Ti * Ai
    ) * n.strength, F = a.left >= o.left && a.right <= o.right && a.top >= o.top && a.bottom <= o.bottom ? [!0, !1] : [C], S = n.anchor.scale ?? 1, B = Math.max(Ei * S, n.hairlineWidth), K = Math.max(1, Math.round(B * t)), nt = Math.max(
      1,
      Math.round(Math.max(Ii * S, n.hairlineWidth) * t)
    ), U = n.hairlineOuterCssPx;
    n.wrap.style.inset = `${-U}px`, n.wrap.style.borderRadius = `${Math.max(0, n.cornerRadius)}px`;
    const _ = Math.max(1, Math.round((o.width + U * 2) * t)), T = Math.max(1, Math.round((o.height + U * 2) * t));
    n.canvas.width !== _ && (n.canvas.width = _), n.canvas.height !== T && (n.canvas.height = T), n.strokeCanvas.width !== _ && (n.strokeCanvas.width = _), n.strokeCanvas.height !== T && (n.strokeCanvas.height = T);
    const V = n.ctx;
    V.setTransform(1, 0, 0, 1, 0, 0), V.clearRect(0, 0, _, T);
    const Z = n.strokeCtx;
    Z.setTransform(1, 0, 0, 1, 0, 0), Z.clearRect(0, 0, _, T);
    for (const [Y, ut] of F.entries()) {
      const L = Y > 0 && Ki(_, T), O = L ? be : V, D = L ? we : Z, $ = Math.min((i ? nn * 1.5 : nn) * t, Math.max(_, T));
      let W, et, rt, st;
      ut ? (W = b > 0 ? _ : 0, rt = b > 0 ? _ - $ : $, et = T * 0.5, st = T * 0.5) : (et = w > 0 ? T : 0, st = w > 0 ? T - $ : $, W = _ * 0.5, rt = _ * 0.5);
      const dt = V.createLinearGradient(W, et, rt, st);
      dt.addColorStop(0, `rgba(0,0,0,${Si})`), dt.addColorStop(0.5, `rgba(0,0,0,${Ri})`), dt.addColorStop(1, `rgba(0,0,0,${Ci})`);
      const ct = h / t, ot = i ? Math.max(1, Math.min(ut ? _ : T, Math.round(ut ? h : f))) : Math.max(1, Math.round(Li * Math.max(0.1, ct / 140) * t));
      let k, H, Q, q, bt = !1, xt = !1;
      if (ut) {
        const z = Math.max(a.top, o.top), J = Math.min(a.bottom, o.bottom);
        bt = !0, k = b > 0 ? _ - ot : 0, H = Math.round((z - o.top + U) * t), Q = ot, q = Math.max(1, Math.round((J - z) * t));
      } else {
        const z = Math.max(a.left, o.left), J = Math.min(a.right, o.right);
        xt = !0, k = Math.round((z - o.left + U) * t), H = w > 0 ? T - ot : 0, Q = Math.max(1, Math.round((J - z) * t)), q = ot;
      }
      const It = { x: k, y: H, w: Q, h: q, flipX: bt, flipY: xt, sx: u, sy: d }, ht = { x: 0, y: 0, w: _, h: T, r: Math.max(0, n.cornerRadius * t) }, I = i ? Math.min(1, G * qo) : Math.min(jo, G * Fi * qo * Bi);
      Gi(O, s, h, f, _, T, I, dt, It, ht, t, i ? Math.max(_, T) : void 0), i || (Wi(
        D,
        s,
        h,
        f,
        _,
        T,
        ht,
        G,
        K,
        dt,
        ki,
        It
      ), Vi(
        D,
        ht,
        nt,
        W,
        et,
        rt,
        st,
        Math.min(0.85, Oi * G)
      )), L && (V.globalCompositeOperation = "lighter", V.drawImage(Nt, 0, 0), Z.globalCompositeOperation = "lighter", Z.drawImage(ve, 0, 0));
    }
    for (const Y of F)
      qi(V, Z, a, o, Y, _, T, U, t);
    V.globalCompositeOperation = "source-over", Z.globalCompositeOperation = "source-over";
  }
}
let In = !1, ta = 0;
function ts() {
  In || (In = !0, !(typeof requestAnimationFrame > "u") && requestAnimationFrame((t) => {
    In = !1, !(t - ta < Ka) && (ta = t, za());
  }));
}
const ea = "metal-fx-styles", es = (
  /* css */
  `
.metal-fx-root {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;
  overflow: visible;
  background: #272727;
  color: #f8f8f8;
}
.metal-fx-root[data-theme='light'] {
  background: #ffffff;
  color: #1d1d1d;
}

.metal-fx-root::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;
  box-shadow: inset 0 0 50px 0 rgba(255, 255, 255, 0.02);
}
.metal-fx-root[data-theme='light']::before {
  box-shadow: inset 0 0 50px 0 rgba(0, 0, 0, 0.02);
}

.metal-fx-root::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 4;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}
.metal-fx-root[data-theme='light']::after {
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}
/* Circle variant gets a thicker outer rim than the button variant. */
.metal-fx-root[data-variant='circle']::after {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1);
}
.metal-fx-root[data-theme='light'][data-variant='circle']::after {
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.06);
}

.metal-fx-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
}

/* The inner spacer — defines the inset geometry where the metal ring meets
   the interior (3 px for Button, 1-2 px for Circle) and carries the Circle dark
   hairline ('box-shadow: inset' rules below). Intentionally transparent so
   the wrapper's background propagates through to the punched shader centre,
   giving consumers a single surface tone to override. See "Single-surface
   background" in the file header for the rationale. */
.metal-fx-inner {
  position: absolute;
  inset: 3px;
  border-radius: inherit;
  z-index: 1;
  pointer-events: none;
}

.metal-fx-root[data-variant='button'][data-shape='pill'] .metal-fx-inner {
  border-radius: calc(var(--mfx-radius, 20px) - 3px);
}
.metal-fx-root[data-variant='button'][data-shape='circle'] .metal-fx-inner {
  border-radius: calc(var(--mfx-radius, 16px) - 3px);
}
.metal-fx-root[data-variant='circle'][data-shape='pill'] .metal-fx-inner {
  inset: 0;
  border-radius: var(--mfx-radius, 20px);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}
.metal-fx-root[data-variant='circle'][data-shape='circle'] .metal-fx-inner {
  inset: 0;
  border-radius: var(--mfx-radius, 16px);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}
/* Circle-variant hairline alpha — light mode.
   Source-of-truth: index.html L2261-2267. The 0.45-alpha black inset that
   reads as a single-pixel frame against the dark interior is too heavy
   on a #ffffff inner: it ends up looking like a hard 2-px black ring
   against the iridescent shader. Suppressed entirely (alpha 0) — the
   shader's own iridescent rim already defines the silhouette in light
   mode, so an extra dark hairline only competes with it. The rule is
   kept (rather than deleted) as a tunable hook in case a future variant
   wants to re-introduce a soft edge. NOTE: we keep the dark-mode inset
   and border-radius values because — unlike index.html — our renderer
   does NOT overscan the canvas in light mode, so there is no 1-px gap
   between inner element and shader to compensate for. */
.metal-fx-root[data-theme='light'][data-variant='circle'][data-shape='pill'] .metal-fx-inner,
.metal-fx-root[data-theme='light'][data-variant='circle'][data-shape='circle'] .metal-fx-inner {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0);
}

/* ─── Combined glow SVG (z=3) ──────────────────────────────────────────────
   Single SVG per instance that holds BOTH the wide-halo group
   (#mfx_haloTravel) and the catch-light group (#mfx_extraTravel), exactly
   mirroring canonical's _buildGlowSvgInner (index.html L8078). One
   mix-blend-mode: screen lifts the combined composite onto the shader
   ring; per-frame opacity attributes on each inner group still drive the
   independent fade-in / fade-out cycles for the halo and the catch-light.

   Why a single SVG: the circle variant anchors halo + catch-light at the same
   perimeter point, so they overlap in the bright zone. Two separately-
   screened SVGs would double-screen the overlap (A + B + C - AB - AC -
   BC + ABC instead of A + B + C - AB - AC once both groups composite
   in source-over inside one SVG and then screen against the host once).
   That overlap looked muted versus canonical specifically on the circle
   variant where both layers travel together.

   Source-of-truth opacity: #btnGlowSvg drops to 0.7 in dark and 0.2746 in
   light (index.html L632/L643). */
.metal-fx-glow-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  z-index: 3;
  pointer-events: none;
  opacity: 0.7;
}
.metal-fx-root[data-theme='light'] .metal-fx-glow-svg {
  /* Light-mode 1-px overscan mirrors .btn-glow-svg in metal.html so the
     halo stays glued to the visible silhouette (the shader ring there sits
     1 px outside the host's padding box). */
  inset: -1px;
  width: calc(100% + 2px);
  height: calc(100% + 2px);
  mix-blend-mode: multiply;
  /* Source-of-truth: html[data-theme="light"] #btnGlowSvg { opacity: 0.2746 }
     → −35 % from 0.4225 from the original 0.7 dark-mode opacity. */
  opacity: 0.2746;
  filter: saturate(5.355) brightness(0.78);
}
/* Circle light-mode small variants (e.g. 36×36 send button): the geometrically
   shrunk halo loses density when multiplied against #ffffff. Mirror the
   canonical override at index.html L2316 — bump saturation + drop brightness
   so the small glow holds together visually. */
.metal-fx-root[data-variant='circle'][data-shape='circle'][data-theme='light'] .metal-fx-glow-svg {
  filter: saturate(7.5) brightness(0.6);
}

/* The wrapped child — hoisted into z=5 so it sits above every overlay, with
   normalized chrome so consumer button styles don't fight the metal frame. */
.metal-fx-content {
  position: relative;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  pointer-events: none;
}
.metal-fx-content > * {
  pointer-events: auto;
}
.metal-fx-root[data-normalize='true'] .metal-fx-content > * {
  background: transparent !important;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
  /* Sizing: we deliberately DO NOT force \`width: 100%; height: 100%\` on the
     child here. That used to be the contract ("the wrapper is the visible
     button surface; the child stretches to fill it"), but it created a cyclic
     percentage dependency: the wrapper is \`inline-flex\` with no intrinsic
     size, .metal-fx-content is \`width/height: 100%\` of the wrapper, and the
     child was \`100%\` of .metal-fx-content. With nothing breaking the cycle,
     icon-only / class-sized children collapsed.

     The new contract: the child sizes itself (intrinsic content, CSS class,
     or inline style — all work), and the wrapper's \`inline-flex\` wraps it
     tightly. Consumers who want a metal frame BIGGER than the child (e.g.
     padding around an icon) size <MetalFx style={{ width, height }}> AND
     explicitly set width/height on the child to fill (or accept that the
     child renders at its intrinsic size, centered).

     Typography is intentionally NOT touched. We used to apply
     \`color: inherit; font: inherit;\` here to "match" the wrapper, but
     \`font: inherit\` is a shorthand that overrides font-family, font-size,
     font-weight, AND line-height on the child — which (a) shrank the
     button height (line-height changes propagate through the flex
     content box) and (b) scaled em-based icons / font-icons inside the
     child to whatever the wrapper inherited. The wrapper now stays out
     of the child's typography entirely; consumers who want typographic
     normalization can apply it themselves on the child element. */
}

[data-metal-fx-reflection] {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  overflow: hidden;
  z-index: 0;
  isolation: isolate;
}
.metal-fx-reflection-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  filter: blur(4px) saturate(1.2) brightness(1.58);
}
.metal-fx-reflection-stroke-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  filter: saturate(1.35) brightness(1.75);
}
/* Hosts that participate as reflection targets need positioning + isolation
   so the wrap composites only against the host (not the parent stack). The
   wrap injects these inline as well, but stating them here keeps reflections
   working on hosts that already have other inline styles applied. */
[data-metal-fx-reflect-host] {
  isolation: isolate;
}
`
);
let On = !1;
function ns() {
  if (On || typeof document > "u") return;
  if (document.getElementById(ea)) {
    On = !0;
    return;
  }
  const t = document.createElement("style");
  t.id = ea, t.textContent = es, document.head.appendChild(t), On = !0;
}
ns();
const os = { position: "absolute", inset: 0, width: "100%", height: "100%" }, as = { position: "absolute", inset: 3 }, rs = { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3, borderRadius: "inherit" }, is = { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 }, ze = /* @__PURE__ */ new Map();
function ss() {
  const t = globalThis;
  t.__MFX_DEBUG__ && (t.__mfxGlow = ze);
}
Er((t, e) => {
  const n = ze.get(t);
  return n ? bi(n.handles, t, e, t.opacityMul * t.glowGain, n.themeRef.current) : !1;
});
const Wa = Object.freeze({
  enabled: !0,
  applyTo: "ring",
  strength: 0.74,
  fadeInMs: 200,
  fadeOutMs: 350,
  smoothMs: 140,
  reach: 36,
  blob: 13,
  liquidBlob: 10,
  maxDisp: 9,
  gain: 0.6,
  pressGain: 0.55,
  pullGain: 0.49,
  press: 5,
  liquid: 7.5,
  liquidReach: 8,
  liquidStiffness: 53,
  liquidDamping: 9,
  stiffness: 260,
  damping: 13,
  mass: 1,
  follow: 0.32,
  mapRes: 2,
  smooth: 0.25
}), ao = { ...Wa };
function Ls(t) {
  Object.assign(ao, t);
}
function Fs() {
  Object.assign(ao, Wa);
}
function Bs(t, e = () => ao) {
  return (() => {
    const n = t.current;
    if (!n || typeof document > "u") return;
    const o = n.querySelector("canvas.metal-fx-canvas"), a = n.querySelector(".metal-fx-inner");
    let i = null, r = null, l = !1, s = !1, c = 0, u = 0, d = 0, h = 0, f = 0, p = 0, g = 0, v = 0, m = 0, b = 0, w = 0, M = 0, y = 0, C = 0, N = 0, E = 0, P = 0, G = 0, at = NaN, F = NaN, S = NaN, B = NaN, K = NaN, nt = 0, U = 0, _ = 0, T = 1, V = 1;
    const Z = (j, R, tt) => {
      const pt = j - c, ft = R - u, wt = pt * pt + ft * ft, At = Math.exp(-wt / T), Ht = Math.exp(-wt / V);
      tt.x = nt * At + pt * _ * Ht, tt.y = U * At + ft * _ * Ht;
    }, Y = { x: 0, y: 0 }, ut = (j, R, tt) => {
      Z(j, R, Y), tt.x = j + Y.x, tt.y = R + Y.y;
    }, L = "mfx-bend-style";
    if (!document.getElementById(L)) {
      const j = document.createElement("style");
      j.id = L, j.textContent = ".metal-fx-root[data-mfx-bend]::before,.metal-fx-root[data-mfx-bend]::after{box-shadow:none!important}", document.head.appendChild(j);
    }
    let O = !1, D = null;
    const $ = n.style.background, W = (a == null ? void 0 : a.style.visibility) ?? "", et = (j) => {
      if (!j || j === "none") return null;
      const R = j.match(/^(rgba?\([^)]*\)|#[0-9a-fA-F]+|[a-z]+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/);
      return R ? { color: R[1], spread: Math.abs(parseFloat(R[5])) } : null;
    }, rt = (j) => {
      if (O || !o) return;
      const R = et(getComputedStyle(n, "::after").boxShadow), tt = a ? et(getComputedStyle(a).boxShadow) : null, pt = a && parseFloat(getComputedStyle(a).inset) || 0;
      D = {
        fill: getComputedStyle(n).backgroundColor,
        rim: R && R.spread > 0 ? { inset: 0, width: R.spread, color: R.color } : null,
        hairline: tt && tt.spread > 0 ? { inset: pt, width: tt.spread, color: tt.color } : null
      }, n.style.background = "transparent", n.setAttribute("data-mfx-bend", ""), a && (a.style.visibility = "hidden"), So(o, ut, D, j), O = !0;
    }, st = () => {
      !O || !o || (So(o, null, null, 0), n.style.background = $, n.removeAttribute("data-mfx-bend"), a && (a.style.visibility = W), O = !1);
    }, dt = `mfx-bend-${Math.random().toString(36).slice(2, 8)}`, ct = "http://www.w3.org/2000/svg", ot = 0.75, k = document.createElementNS(ct, "svg");
    k.setAttribute("aria-hidden", "true"), k.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    const H = document.createElementNS(ct, "filter");
    H.setAttribute("id", dt), H.setAttribute("x", `-${ot * 100}%`), H.setAttribute("y", `-${ot * 100}%`), H.setAttribute("width", `${(1 + 2 * ot) * 100}%`), H.setAttribute("height", `${(1 + 2 * ot) * 100}%`), H.setAttribute("color-interpolation-filters", "sRGB");
    const Q = document.createElementNS(ct, "feFlood");
    Q.setAttribute("flood-color", "rgb(128,128,0)"), Q.setAttribute("flood-opacity", "1"), Q.setAttribute("result", "neutral");
    const q = document.createElementNS(ct, "feImage");
    q.setAttribute("result", "img"), q.setAttribute("preserveAspectRatio", "none");
    const bt = document.createElementNS(ct, "feComposite");
    bt.setAttribute("in", "img"), bt.setAttribute("in2", "neutral"), bt.setAttribute("operator", "over"), bt.setAttribute("result", "map");
    const xt = document.createElementNS(ct, "feDisplacementMap");
    xt.setAttribute("in", "SourceGraphic"), xt.setAttribute("in2", "map"), xt.setAttribute("xChannelSelector", "R"), xt.setAttribute("yChannelSelector", "G"), xt.setAttribute("result", "bent");
    const It = document.createElementNS(ct, "feGaussianBlur");
    It.setAttribute("in", "bent"), It.setAttribute("stdDeviation", "0");
    for (const j of [Q, q, bt, xt, It]) H.appendChild(j);
    k.appendChild(H), document.body.appendChild(k);
    const ht = document.createElement("canvas"), I = ht.getContext("2d", { alpha: !1, willReadFrequently: !0 });
    let z = null, J = null;
    const mt = 4278222976;
    let Ot = !1;
    const mn = n.style.filter, ce = () => {
      Ot && (n.style.filter = mn, Ot = !1);
    }, ue = (j, R, tt, pt) => {
      if (!I) return;
      const ft = Math.max(0.25, j.mapRes), wt = -R * ot, At = -tt * ot, Ht = R * (1 + 2 * ot), Ft = tt * (1 + 2 * ot), yt = Math.max(2, Math.round(Ht * ft)), zt = Math.max(2, Math.round(Ft * ft));
      (ht.width !== yt || ht.height !== zt || !z || !J) && (ht.width = yt, ht.height = zt, z = I.createImageData(yt, zt), J = new Uint32Array(z.data.buffer)), J.fill(mt);
      const de = z.data, Gt = 3 * Math.max(j.blob, j.liquidBlob), Ke = Math.max(0, Math.floor((c - Gt - wt) * ft)), Ee = Math.min(yt - 1, Math.ceil((c + Gt - wt) * ft)), pn = Math.max(0, Math.floor((u - Gt - At) * ft)), gn = Math.min(zt - 1, Math.ceil((u + Gt - At) * ft)), Qe = 255 / pt;
      for (let Wt = pn; Wt <= gn; Wt++) {
        const ke = At + (Wt + 0.5) / ft;
        let te = (Wt * yt + Ke) * 4;
        for (let fe = Ke; fe <= Ee; fe++, te += 4) {
          const Ze = wt + (fe + 0.5) / ft;
          Z(Ze, ke, Y);
          let Bt = 127.5 - Y.x * Qe;
          Bt = Bt < 0 ? 0 : Bt > 255 ? 255 : Bt;
          let ee = 127.5 - Y.y * Qe;
          ee = ee < 0 ? 0 : ee > 255 ? 255 : ee, de[te] = Bt, de[te + 1] = ee;
        }
      }
      I.putImageData(z, 0, 0), q.setAttribute("x", wt.toFixed(2)), q.setAttribute("y", At.toFixed(2)), q.setAttribute("width", Ht.toFixed(2)), q.setAttribute("height", Ft.toFixed(2)), q.setAttribute("href", ht.toDataURL("image/png")), xt.setAttribute("scale", pt.toFixed(2)), It.setAttribute("stdDeviation", Math.max(0, j.smooth).toFixed(3)), Ot || (n.style.filter = `url(#${dt})`, Ot = !0);
    }, Lt = () => {
      E === 0 && (P = performance.now(), E = requestAnimationFrame(Jt));
    }, Jt = (j) => {
      E = 0;
      const R = e(), tt = Math.min(0.032, Math.max(1e-3, (j - P) / 1e3));
      P = j;
      const pt = n.getBoundingClientRect(), ft = pt.width, wt = pt.height, At = ft / 2, Ht = wt / 2;
      let Ft = 0, yt = 0;
      if (M = 0, R.enabled && i) {
        const ne = i.x - pt.left, xn = i.y - pt.top, so = ne - At, lo = xn - Ht, Vt = Math.hypot(so, lo), co = Math.min(ft, wt) / 2, uo = Math.max(ft, wt) / 2 + R.reach, $a = s;
        s = Vt < uo;
        const vn = Math.max(0, 1 - Math.abs(Vt - co) / Math.max(1, R.liquidReach));
        if (M = vn * vn * (3 - 2 * vn), s) {
          $a || (c = ne, u = xn);
          const fo = 1 - Math.pow(1 - Math.min(0.999, R.follow), tt * 60);
          c += (ne - c) * fo, u += (xn - u) * fo;
          const ho = 1 - Math.max(0, (Vt - (uo - R.reach)) / R.reach);
          Ft = C * (R.gain / 100) * ho, yt = N * (R.gain / 100) * ho;
          const mo = Vt > 1e-3 ? so / Vt : 0, po = Vt > 1e-3 ? lo / Vt : 0, bn = co - Vt;
          if (bn > 0) {
            const Ie = bn * R.pressGain;
            Ft -= mo * Ie, yt -= po * Ie;
          } else {
            const Ie = -bn, yn = Math.max(0, 1 - Ie / Math.max(1, R.reach)), go = Ie * R.pullGain * (yn * yn * (3 - 2 * yn));
            Ft += mo * go, yt += po * go;
          }
          const wn = Math.hypot(Ft, yt);
          wn > R.maxDisp && (Ft *= R.maxDisp / wn, yt *= R.maxDisp / wn);
        }
      } else
        s = !1;
      C *= Math.exp(-tt * 12), N *= Math.exp(-tt * 12);
      const zt = 1 - Math.exp(-(tt * 1e3) / Math.max(1, R.smoothMs));
      m += (Ft - m) * zt, b += (yt - b) * zt;
      const de = Math.max(0.05, R.mass);
      f += (-R.stiffness * (d - m) - R.damping * f) / de * tt, p += (-R.stiffness * (h - b) - R.damping * p) / de * tt, d += f * tt, h += p * tt;
      const Gt = l && s && R.enabled ? R.press : 0, Ke = s && R.enabled ? R.liquid * (M + (l ? 0.5 : 0)) : 0;
      w += (Ke - w) * zt, v += (-R.liquidStiffness * (g - w) - R.liquidDamping * v) / de * tt, g += v * tt;
      const Ee = s && R.enabled ? 1 : 0, pn = Math.max(1, Ee ? R.fadeInMs : R.fadeOutMs) / 3;
      y += (Ee - y) * (1 - Math.exp(-(tt * 1e3) / pn)), y < 2e-3 && Ee === 0 && (y = 0);
      const gn = Math.hypot(d, h), Qe = !s && y === 0 && gn < 0.05 && Math.hypot(f, p) < 1 && Math.abs(g) < 0.05 && Gt === 0;
      if (R.applyTo === "ring" ? ce() : st(), Qe) {
        d = h = f = p = g = v = 0, m = b = w = 0, at = F = S = B = K = NaN, st(), ce();
        return;
      }
      const Wt = Math.max(0, R.strength) * y;
      let ke = At - c, te = Ht - u;
      const fe = Math.hypot(ke, te) || 1;
      ke /= fe, te /= fe;
      const Ze = Math.max(0.5, R.blob), Bt = Math.max(0.5, R.liquidBlob);
      T = 2 * Ze * Ze, V = 2 * Bt * Bt, nt = (d + ke * Gt) * Wt, U = (h + te * Gt) * Wt, _ = g / Bt * Wt;
      const ee = !(Math.abs(d - at) < 0.05 && Math.abs(h - F) < 0.05 && Math.abs(g - S) < 0.05 && Math.abs(c - B) < 0.05 && Math.abs(u - K) < 0.05), Va = j - G >= 1e3 / 60 - 0.5;
      if (ee && Va)
        if (G = j, at = d, F = h, S = g, B = c, K = u, R.applyTo === "ring" && o) {
          const ne = Math.ceil((R.maxDisp + R.liquid * 1.5) * Math.max(1, R.strength)) + 4;
          rt(ne), Tr(o);
        } else {
          const ne = Math.max(1, (R.maxDisp + R.liquid * 1.5) * 2 * Math.max(1, R.strength));
          ue(R, ft, wt, ne);
        }
      else R.applyTo === "ring" && o && !O && rt(Math.ceil((R.maxDisp + R.liquid * 1.5) * Math.max(1, R.strength)) + 4);
      E = requestAnimationFrame(Jt);
    }, ro = (j) => {
      const R = performance.now();
      if (r) {
        const tt = Math.max(4e-3, (R - r.t) / 1e3), pt = 1 - Math.exp(-tt / 0.04);
        C += ((j.clientX - r.x) / tt - C) * pt, N += ((j.clientY - r.y) / tt - N) * pt;
      }
      r = { x: j.clientX, y: j.clientY, t: R }, i = { x: j.clientX, y: j.clientY }, Lt();
    }, je = () => {
      i = null, r = null, Lt();
    }, io = () => {
      l = !0, Lt();
    }, qe = () => {
      l = !1, Lt();
    };
    return document.addEventListener("pointermove", ro, { passive: !0 }), document.addEventListener("pointerleave", je), window.addEventListener("blur", je), n.addEventListener("pointerdown", io), document.addEventListener("pointerup", qe), document.addEventListener("pointercancel", qe), () => {
      E !== 0 && cancelAnimationFrame(E), document.removeEventListener("pointermove", ro), document.removeEventListener("pointerleave", je), window.removeEventListener("blur", je), n.removeEventListener("pointerdown", io), document.removeEventListener("pointerup", qe), document.removeEventListener("pointercancel", qe), st(), ce(), k.parentNode && k.parentNode.removeChild(k);
    };
  })();
}

  /* ------------------------------------------------------------------
     VANILLA MOUNT
     Plain-DOM version of the <MetalFx> component: wraps one element in the
     metal ring and (optionally) turns on the cursor dent. No React.
       const fx = EssuMetal.mount(button, { variant: "circle", theme: "light", innerShadow: true, bend: true });
       fx.destroy();   // fx is null when WebGL2 isn't available (the button is left untouched)
  ------------------------------------------------------------------- */
  function mount(child, o) {
    o = o || {};
    if (!child || !mr()) return null;
    if (o.frameMs) qa = Math.max(8, o.frameMs); // shared by every metal on the page

    const variant = o.variant === "circle" ? "circle" : "button";
    const kind = variant === "circle" ? "circle" : "pill";
    const preset = o.preset || "chromatic";
    const scale = o.scale === undefined ? 1 : o.scale;
    const strength = o.strength === undefined ? 1 : o.strength;
    const glowGain = o.glowGain === undefined ? 1 : o.glowGain;
    const paused = !!o.paused;
    const glowOn = !o.disableGlow;
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const resolveTheme = () => (o.theme === "light" || o.theme === "dark" ? o.theme : !mq || mq.matches ? "dark" : "light");
    const themeRef = { current: resolveTheme() };

    const root = document.createElement("div");
    root.className = o.className ? "metal-fx-root " + o.className : "metal-fx-root";
    root.setAttribute("data-variant", variant);
    root.setAttribute("data-shape", kind);
    root.setAttribute("data-theme", themeRef.current);
    root.setAttribute("data-normalize", "true");
    if (paused) root.setAttribute("data-paused", "true");
    root.style.setProperty("--mfx-strength", String(Math.min(1, Math.max(0, strength))));
    root.style.opacity = "0";
    root.style.visibility = "hidden";

    const canvas = document.createElement("canvas");
    canvas.className = "metal-fx-canvas";
    Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });

    const inner = document.createElement("div");
    inner.className = "metal-fx-inner";
    inner.setAttribute("aria-hidden", "true");
    Object.assign(inner.style, { position: "absolute", inset: "3px" });

    const glowBox = document.createElement("div");
    glowBox.setAttribute("aria-hidden", "true");
    Object.assign(glowBox.style, { position: "absolute", inset: "0", pointerEvents: "none", zIndex: "3", borderRadius: "inherit" });
    if (!glowOn) glowBox.style.display = "none";

    let shadowBox = null;
    if (o.innerShadow) {
      shadowBox = document.createElement("div");
      shadowBox.setAttribute("aria-hidden", "true");
      Object.assign(shadowBox.style, { position: "absolute", inset: "0", pointerEvents: "none", zIndex: "4" });
    }

    const content = document.createElement("div");
    content.className = "metal-fx-content";

    root.append(canvas, inner, glowBox);
    if (shadowBox) root.appendChild(shadowBox);
    root.appendChild(content);

    // swap the wrapper in where the child was, then move the child inside it
    if (child.parentNode) child.parentNode.insertBefore(root, child);
    content.appendChild(child);

    let fallbackRadius = 0;
    {
      const r = parseFloat(getComputedStyle(root).borderTopLeftRadius);
      const c = parseFloat(getComputedStyle(child).borderTopLeftRadius);
      fallbackRadius = Number.isFinite(c) ? c : Number.isFinite(r) ? r : 0;
    }

    // layout size (offsetWidth), not getBoundingClientRect: the chat panel scales in while it opens
    const radiusFor = (w, h) => {
      if (kind === "circle") return Math.min(w, h) / 2;
      const d = typeof o.borderRadius === "number" ? o.borderRadius : fallbackRadius;
      return Math.min(d, Math.min(w, h) / 2);
    };
    const measure = () => {
      const w = Math.max(1, Math.round(root.offsetWidth));
      const h = Math.max(1, Math.round(root.offsetHeight));
      return { cssWidth: w, cssHeight: h, cornerRadius: radiusFor(w, h) };
    };

    Ar(preset, themeRef.current);

    const size0 = measure();
    let glow = null;
    let rim = null;
    let inst = null;

    inst = yr({
      hostCanvas: canvas,
      cssWidth: size0.cssWidth,
      cssHeight: size0.cssHeight,
      cornerRadius: size0.cornerRadius,
      kind,
      paused,
      shaderScale: o.shaderScale,
      ringCssPx: o.ringCssPx,
      scale,
      mask: null,
      onComposite: () => {
        if (inst && glow) vi(glow, inst.deform);
        if (inst && rim) Fa(rim, inst.deform);
      },
      onFirstCopy: () => {
        root.style.visibility = "visible";
        root.style.opacity = "1";
        root.style.transition = "opacity 0.15s ease-out";
      },
    });
    root.style.setProperty("--mfx-radius", size0.cornerRadius + "px");
    root.style.borderRadius = size0.cornerRadius + "px";

    const buildGlow = (s) => {
      const old = glow;
      glowBox.innerHTML = "";
      glow = Ho(glowBox, { width: s.cssWidth, height: s.cssHeight, cornerRadius: s.cornerRadius, kind, scale });
      if (old) yi(old, glow);
      if (inst && glow) ze.set(inst, { handles: glow, themeRef });
    };
    const rimOpts = () => (o.innerShadow ? (o.innerShadow === true ? Go : { ...Go, ...o.innerShadow }) : null);
    const buildRim = (s) => {
      Vo(rim);
      rim = null;
      const opts = rimOpts();
      if (!shadowBox || !inst || !opts) return;
      rim = Mi(shadowBox, { width: s.cssWidth, height: s.cssHeight, cornerRadius: s.cornerRadius, kind, ring: inst.ringCssPx }, opts);
    };

    glow = Ho(glowBox, { width: size0.cssWidth, height: size0.cssHeight, cornerRadius: size0.cornerRadius, kind, scale });
    buildRim(size0);

    pe(inst, { opacityMul: Math.max(0, Math.min(1, strength)), glowGain: Math.max(0, glowGain) });

    let lastW = size0.cssWidth;
    let lastH = size0.cssHeight;
    let lastR = size0.cornerRadius;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!inst) return;
        const s = measure();
        if (Math.abs(s.cssWidth - lastW) < 0.5 && Math.abs(s.cssHeight - lastH) < 0.5 && Math.abs(s.cornerRadius - lastR) < 0.5) return;
        lastW = s.cssWidth;
        lastH = s.cssHeight;
        lastR = s.cornerRadius;
        pe(inst, { cssWidth: s.cssWidth, cssHeight: s.cssHeight, cornerRadius: s.cornerRadius });
        root.style.setProperty("--mfx-radius", s.cornerRadius + "px");
        root.style.borderRadius = s.cornerRadius + "px";
        buildGlow(s);
        buildRim(s);
      });
    });
    ro.observe(root);

    // screen density changes (moving the window between monitors)
    let dpq = null;
    const onDpr = () => {
      if (inst && Cr(inst)) {
        const s = measure();
        buildGlow(s);
        buildRim(s);
      }
      watchDpr();
    };
    const watchDpr = () => {
      if (dpq) dpq.removeEventListener("change", onDpr);
      dpq = window.matchMedia ? window.matchMedia("(resolution: " + (window.devicePixelRatio || 1) + "dppx)") : null;
      if (dpq) dpq.addEventListener("change", onDpr);
    };
    watchDpr();

    const offReady = Pr((ready) => {
      if (ready && inst) buildGlow(measure());
    });

    let io = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          if (!inst) return;
          for (const e of entries) Rr(inst, e.isIntersecting);
        },
        { rootMargin: "64px" }
      );
      io.observe(root);
    }

    if (glow) {
      ze.set(inst, { handles: glow, themeRef });
      _r(inst);
    }
    Gr();
    ss();

    // light/dark switching
    const applyTheme = (t) => {
      themeRef.current = t;
      root.setAttribute("data-theme", t);
      Ar(preset, t);
    };
    const onScheme = () => applyTheme(resolveTheme());
    if (o.theme !== "light" && o.theme !== "dark" && mq) mq.addEventListener("change", onScheme);

    // cursor-driven liquid dent
    const stopBend = o.bend ? Bs({ current: root }) : null;

    let dead = false;
    return {
      el: root,
      setStrength(v) {
        if (!inst) return;
        const s = Math.max(0, Math.min(1, v));
        root.style.setProperty("--mfx-strength", String(s));
        pe(inst, { opacityMul: s });
      },
      setPaused(p) {
        if (!inst) return;
        root.toggleAttribute("data-paused", !!p);
        pe(inst, { paused: !!p });
      },
      destroy() {
        if (dead) return;
        dead = true;
        if (stopBend) stopBend();
        if (mq) mq.removeEventListener("change", onScheme);
        Wr();
        Vo(rim);
        rim = null;
        ro.disconnect();
        if (dpq) dpq.removeEventListener("change", onDpr);
        if (io) io.disconnect();
        offReady();
        if (raf) cancelAnimationFrame(raf);
        if (inst) {
          ze.delete(inst);
          Sr(inst);
          Mr(inst);
        }
        inst = null;
        glowBox.innerHTML = "";
        // put the child back where the wrapper was
        if (root.parentNode) root.parentNode.insertBefore(child, root);
        root.remove();
      },
    };
  }

  window.EssuMetal = { mount, supported: mr, setFrameMs: (ms) => { qa = Math.max(8, ms); } };
})();