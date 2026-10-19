// Inlined by build-earth-motion.mjs into the two standalone experimental pages.
const { mode, day, night } = EARTH_MOTION;
const turnDuration = 400000;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function waitForEarth() {
  return new Promise(resolve => {
    const find = () => {
      const earth = document.querySelector('.earth-art .earth');
      if (earth) { observer.disconnect(); resolve(earth); }
    };
    const observer = new MutationObserver(find);
    observer.observe(document.getElementById('chart'), { childList: true, subtree: true });
    find();
  });
}

// A single quad shades a sphere, so the surface can turn without rotating the light.
async function fixedLightGlobe(image) {
  const textureImages = [day, night].map(source => {
    const texture = new Image();
    texture.src = source;
    return texture;
  });
  await Promise.all(textureImages.map(texture => texture.decode()));
  const canvas = document.createElement('canvas');
  canvas.className = 'earth earth-globe';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('This browser could not start the globe animation. The static Earth is shown.');
  const shader = (type, source) => {
    const value = gl.createShader(type);
    gl.shaderSource(value, source);
    gl.compileShader(value);
    if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(value));
    return value;
  };
  const vertex = shader(gl.VERTEX_SHADER, `
    attribute vec2 position;
    varying vec2 point;
    void main() { point = position; gl_Position = vec4(position, 0.0, 1.0); }
  `);
  const fragment = shader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 point;
    uniform sampler2D daySurface;
    uniform sampler2D nightSurface;
    uniform float turn;
    const float PI = 3.14159265359;
    void main() {
      // Match the illustrated cutout's rim and transparent margin, including its cap height.
      vec2 p = point / 0.942;
      float radius = length(p);
      if (radius >= 1.0) { gl_FragColor = vec4(0.0); return; }
      vec3 normal = vec3(p, sqrt(max(0.0, 1.0 - dot(p, p))));
      // Tilt the geographic axis, then look down toward northern latitudes.
      float tilt = 0.4084;
      vec3 globe = vec3(cos(tilt) * normal.x + sin(tilt) * normal.y,
                        -sin(tilt) * normal.x + cos(tilt) * normal.y, normal.z);
      float latitude = 0.28;
      globe.yz = mat2(cos(latitude), -sin(latitude), sin(latitude), cos(latitude)) * globe.yz;
      float u = fract(atan(globe.x, globe.z) / (2.0 * PI) + 0.5 + turn);
      float v = 0.5 - asin(clamp(globe.y, -1.0, 1.0)) / PI;
      vec3 day = texture2D(daySurface, vec2(u, v)).rgb;
      vec3 night = texture2D(nightSurface, vec2(u, v)).rgb;
      // Lighting uses the unrotated screen-space normal, independently of the surface.
      float sun = dot(normal, normalize(vec3(-0.90, 0.20, 0.23)));
      float daylight = smoothstep(-0.12, 0.18, sun);
      // Lift the printed cloud highlights toward white, retaining their dark ink texture.
      float clouds = smoothstep(0.48, 0.66, min(day.r, min(day.g, day.b)));
      day = mix(day, vec3(0.99, 0.995, 0.99), clouds * 0.72);
      float luminance = dot(day, vec3(0.2126, 0.7152, 0.0722));
      day = mix(vec3(luminance), day, 1.22);
      vec3 sunlit = clamp(day * (0.95 + 0.20 * max(sun, 0.0)), 0.0, 1.0) * 0.96;
      // Warm the cloud whites after exposure, preserving the approved highlight brightness.
      vec3 paperWhite = sunlit * vec3(1.0, 0.965, 0.84);
      float paperLuminance = dot(paperWhite, vec3(0.2126, 0.7152, 0.0722));
      float targetLuminance = dot(sunlit * vec3(1.0, 0.996, 0.972), vec3(0.2126, 0.7152, 0.0722));
      paperWhite *= targetLuminance / max(paperLuminance, 0.001);
      sunlit = mix(sunlit, paperWhite, clouds);
      vec3 color = mix(night * 0.90, sunlit, daylight);
      float rim = pow(1.0 - normal.z, 5.0) * smoothstep(-0.1, 0.7, sun) * 0.35;
      color = mix(color, vec3(0.91, 0.86, 0.65), rim);
      float alpha = 1.0 - smoothstep(0.997, 1.0, radius);
      gl_FragColor = vec4(color * alpha, alpha);
    }
  `);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  textureImages.forEach((image, unit) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(program, unit ? 'nightSurface' : 'daySurface'), unit);
  });
  const rotation = gl.getUniformLocation(program, 'turn');
  image.replaceWith(canvas);
  const draw = phase => {
    const size = Math.min(1536, Math.max(512, Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2))));
    if (canvas.width !== size) { canvas.width = size; canvas.height = size; gl.viewport(0, 0, size, size); }
    gl.uniform1f(rotation, phase);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  return { element: canvas, draw, fallback: image };
}

const earth = await waitForEarth();
await earth.decode();
const poster = earth.closest('.poster');
const controls = document.createElement('div');
controls.className = 'earth-motion-controls';
controls.innerHTML = `<label>Preview rotation <input class="earth-rotation" type="range" min="0" max="360" step="0.1" value="0" aria-label="Earth rotation" /></label><label>Rotation speed <input class="earth-speed" type="range" min="0.25" max="3" step="0.25" value="1" aria-label="Earth rotation speed" /><output class="earth-speed-value">1×</output></label><button type="button" class="earth-motion-toggle" aria-pressed="true">Pause Earth</button><span class="earth-motion-status" role="status"></span>`;
document.getElementById('chart').after(controls);
const slider = controls.querySelector('.earth-rotation');
const speedSlider = controls.querySelector('.earth-speed');
const speedValue = controls.querySelector('.earth-speed-value');
const toggle = controls.querySelector('button');
const status = controls.querySelector('[role="status"]');
let renderer;
try {
  renderer = mode === 'fixed'
    ? await fixedLightGlobe(earth)
    : { element: earth, draw: phase => { earth.style.transform = `rotate(${phase * 360}deg)`; } };
} catch (error) {
  status.textContent = error.message;
  slider.disabled = speedSlider.disabled = toggle.disabled = true;
  poster.dataset.earthReady = 'unavailable';
}

if (renderer) {
  let phase = 0, speed = 1, playing = !reducedMotion.matches, inView = false, downloading = false, available = true;
  let frame = 0, previous = null;
  const draw = () => {
    renderer.draw(phase);
    slider.value = String(phase * 360);
    slider.setAttribute('aria-valuetext', `${Math.round(phase * 360)} degrees`);
  };
  const running = () => playing && inView && !document.hidden && !downloading;
  const tick = now => {
    frame = 0;
    if (!running()) { previous = null; return; }
    if (previous === null) previous = now;
    if (now - previous >= 1000 / 30) {
      phase = (phase + (now - previous) * speed / turnDuration) % 1;
      previous = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    toggle.textContent = playing ? 'Pause Earth' : 'Play Earth';
    toggle.setAttribute('aria-pressed', String(playing));
    slider.disabled = speedSlider.disabled = toggle.disabled = downloading || !available;
    if (!running()) { cancelAnimationFrame(frame); frame = 0; previous = null; }
    else if (!frame) frame = requestAnimationFrame(tick);
  };
  toggle.addEventListener('click', () => { playing = !playing; sync(); });
  slider.addEventListener('input', () => {
    phase = Number(slider.value) / 360;
    playing = false;
    sync();
    draw();
  });
  speedSlider.setAttribute('aria-valuetext', '1 times normal speed');
  speedSlider.addEventListener('input', () => {
    speed = Number(speedSlider.value);
    previous = null;
    speedValue.textContent = `${speed}×`;
    speedSlider.setAttribute('aria-valuetext', `${speed} times normal speed`);
  });
  reducedMotion.addEventListener('change', () => { playing = !reducedMotion.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  const visibility = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); });
  visibility.observe(poster);
  const resize = new ResizeObserver(draw);
  resize.observe(poster);
  // Pause before the utility's click handler starts, then resume when its capture finishes.
  // Keep the requested play state, so a poster that was paused stays paused after export.
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.poster-download');
    if (button && button.getAttribute('aria-disabled') !== 'true' && !button.hasAttribute('aria-busy')) {
      downloading = true;
      sync();
    }
  }, true);
  const downloads = new MutationObserver(() => {
    const busy = Boolean(document.querySelector('.poster-download[aria-busy="true"]'));
    if (busy !== downloading) { downloading = busy; sync(); }
  });
  downloads.observe(document.body, { attributes: true, attributeFilter: ['aria-busy'], subtree: true });
  renderer.element.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    playing = false;
    available = false;
    sync();
    renderer.element.replaceWith(renderer.fallback);
    renderer.draw = () => {};
    slider.disabled = speedSlider.disabled = toggle.disabled = true;
    status.textContent = 'The globe animation stopped. The static Earth is shown.';
    poster.dataset.earthReady = 'unavailable';
  });
  draw();
  sync();
  poster.dataset.earthReady = 'true';
}
