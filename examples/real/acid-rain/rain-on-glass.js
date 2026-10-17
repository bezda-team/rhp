// Sparse, pinned beads with occasional coalescence and short gravity-driven runs.
export class RainSimulation {
  constructor(width, height, seed = 713031) {
    this.width = width;
    this.height = height;
    this.seed = seed;
    this.time = 0;
    this.nextHit = this.random(.7, 2);
    this.nextRun = this.random(.45, 1.3);
    this.drops = [];
    this.trails = [];
    for (let i = 0; i < 11; i++) {
      this.addDrop(true);
      this.drops[i].x = (i + .5 + this.random(-.25, .25)) / 11 * width;
    }
    Object.assign(this.drops[0], { x: width * this.random(.15, .87), y: height * this.random(.28, .55), r: this.random(9, 12), pinnedUntil: 0 });
  }

  random(min = 0, max = 1) {
    this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
    return min + this.seed / 4294967296 * (max - min);
  }

  get movingLimit() { return this.width < 640 ? 1 : 2; }
  get dropLimit() { return this.width < 640 ? 14 : 20; }

  addDrop(initial = false) {
    if (this.drops.length >= this.dropLimit) return;
    let x = this.random(.08, .92);
    if (this.random() < .3) x = this.random() < .5 ? this.random(.04, .19) : this.random(.81, .96);
    const target = !initial && this.random() < .3 && this.drops.find(d => !d.speed);
    this.drops.push({
      x: target ? target.x + this.random(-3, 3) : x * this.width,
      y: target ? target.y - this.random(2, 6) : this.random(.07, .83) * this.height,
      r: this.random(initial ? 3.5 : 4, initial ? 9.5 : 10.5),
      age: initial ? 3 : 0, life: this.random(35, 65), speed: 0,
      run: 0, stretch: 0, drift: this.random(-.9, .9), phase: this.random(0, Math.PI * 2), light: this.random(-.7, .7),
      trailWidth: this.random(1, 2),
      pinnedUntil: this.time + 5,
    });
  }

  resize(width, height) {
    for (const d of [...this.drops, ...this.trails]) {
      d.x *= width / this.width;
      d.y *= height / this.height;
    }
    this.width = width;
    this.height = height;
    this.drops.length = Math.min(this.drops.length, this.dropLimit);
    for (const d of this.drops.filter(d => d.speed).slice(this.movingLimit)) d.speed = 0;
  }

  step(dt) {
    let changed = this.trails.length > 0 || this.drops.some(d => d.speed || d.age < 1 || d.life - d.age < 4);
    this.time += dt;
    if (this.time >= this.nextHit) {
      this.addDrop();
      changed = true;
      this.nextHit = this.time + this.random(1.8, 5.2);
    }
    if (this.time >= this.nextRun) {
      if (this.drops.filter(d => d.speed).length < this.movingLimit) {
        const choices = this.drops.filter(d => !d.speed && d.age > 2 && d.pinnedUntil <= this.time);
        const drop = choices.sort((a, b) => b.r - a.r)[0];
        if (drop) {
          drop.speed = 7;
          drop.run = this.random(100, 230);
          changed = true;
        }
      }
      this.nextRun = this.time + this.random(3.5, 7.5);
    }
    for (const d of this.drops) {
      d.age += dt;
      const target = Math.min(1, d.speed / 22);
      d.stretch += (target - d.stretch) * (1 - Math.exp(-dt * 5));
      if (Math.abs(target - d.stretch) > .001) changed = true;
      else d.stretch = target;
      if (!d.speed) continue;
      d.speed = Math.min(24 + d.r * 1.8, d.speed + dt * 10);
      const dy = d.speed * dt, previousX = d.x, previousY = d.y;
      d.x += Math.sin(this.time * 1.8 + d.phase) * d.drift * dt;
      d.y += dy;
      d.run -= dy;
      d.r = Math.max(2.7, d.r - dy * .0028);
      this.trails.push({ x: (previousX + d.x) / 2, y: (previousY + d.y) / 2, rx: d.r * .34 * d.trailWidth, ry: dy / 2 + .7, age: 0, light: d.light });
      if (d.run <= 0) {
        d.speed = 0;
        d.age = 3;
        d.life = this.random(30, 55);
        d.pinnedUntil = this.time + this.random(16, 28);
      }
    }
    // Coalescence grows a bead; a moving drop carries its neighbor onward.
    for (let i = 0; i < this.drops.length; i++) for (let j = i + 1; j < this.drops.length; j++) {
      let a = this.drops[i], b = this.drops[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) > (a.r + b.r) * .72) continue;
      if (b.speed && !a.speed) [a, b] = [b, a];
      const volumeA = a.r ** 3, volumeB = b.r ** 3;
      a.x = (a.x * volumeA + b.x * volumeB) / (volumeA + volumeB);
      a.y = Math.max(a.y, b.y);
      a.r = Math.min(14, Math.cbrt(volumeA + volumeB));
      a.age = 3;
      a.life = Math.max(a.life, 45);
      changed = true;
      this.drops[i] = a;
      this.drops.splice(j--, 1);
    }
    this.drops = this.drops.filter(d => d.y < this.height + 20 && d.age < d.life);
    for (const trail of this.trails) trail.age += dt;
    this.trails = this.trails.filter(d => d.age < 5.5).slice(-360);
    return changed;
  }
}

function makeRenderer(canvas, photo) {
  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power',
  });
  if (!gl) return null;
  const vertex = `
    attribute vec2 a_quad;
    uniform vec2 u_view, u_center, u_size;
    varying vec2 v_local, v_pixel;
    void main() {
      v_local = a_quad;
      v_pixel = u_center + a_quad * u_size;
      gl_Position = vec4(v_pixel.x / u_view.x * 2.0 - 1.0, 1.0 - v_pixel.y / u_view.y * 2.0, 0.0, 1.0);
    }
  `;
  const fragment = `
    precision highp float;
    uniform sampler2D u_scene;
    uniform vec2 u_view, u_center, u_size;
    uniform float u_alpha, u_trail, u_motion, u_shape, u_skew, u_light;
    varying vec2 v_local, v_pixel;
    void main() {
      float bead = 1.0 - u_trail;
      vec2 q = v_local * (1.0 + .08 * bead);
      float belly = (.10 + .15 * u_motion) * bead;
      q.y = (q.y - belly) / (q.y < belly ? 1.0 + belly : 1.0 - belly);
      float lean = u_skew * (.045 + .10 * pow(max(-q.y, 0.0), 2.0)) * bead;
      float width = .75 + .24 * q.y - .14 * u_motion * (1.0 - q.y);
      q.x = (q.x - lean) / mix(1.0, max(.25, width), bead);
      float angle = atan(q.y, q.x);
      float outline = 1.0 + bead * (.035 * sin(angle * 3.0 + u_shape) + .02 * sin(angle * 5.0 - u_shape * .7));
      q /= outline;
      float distance2 = dot(q, q);
      if (distance2 >= 1.0) discard;
      float dome = sqrt(max(0.0, 1.0 - mix(distance2, q.x * q.x, u_trail)));
      vec2 offset = q * u_size * (6.0 + 3.0 * dome);
      offset.y *= 1.0 - u_trail;
      vec2 uv = clamp((v_pixel - offset) / u_view, vec2(0.0), vec2(1.0));
      vec3 color = texture2D(u_scene, uv).rgb;
      vec3 normal = normalize(vec3(q.x, q.y * (1.0 - u_trail), dome));
      vec2 lightDirection = vec2(sin(u_light), cos(u_light));
      float glint = pow(max(dot(normal, normalize(vec3(lightDirection * .75, .8))), 0.0), 12.0);
      float lateral = dot(q, vec2(lightDirection.y, -lightDirection.x));
      float reflected = dot(q, lightDirection);
      float arc = .58 - lateral * lateral * .30;
      float softReflection = exp(-pow((reflected - arc) / .22, 2.0) - pow(lateral / .78, 4.0)) * bead;
      float brightCore = exp(-pow((reflected - arc) / .065, 2.0) - pow(lateral / .65, 4.0)) * bead;
      float rim = smoothstep(.50, .99, sqrt(mix(distance2, q.x * q.x, u_trail)));
      float upperShadow = (1.0 - smoothstep(-.55, .18, dot(q, lightDirection))) * bead * .65;
      float shadow = min(.88, upperShadow + rim * (.35 + .25 * max(-dot(vec2(q.x, q.y * bead), lightDirection), 0.0)));
      color *= 1.0 - shadow;
      float reflection = clamp(glint * .06 + softReflection * .12 + brightCore * .48, 0.0, .68);
      color = mix(color, vec3(.76, .84, .87), reflection) + vec3(.60, .75, .79) * rim * .025;
      float edge = 1.0 - smoothstep(1.0 - 1.4 / max(u_size.x, 2.0), 1.0, distance2);
      float alpha = u_alpha * edge;
      gl_FragColor = vec4(color * alpha, alpha);
    }
  `;
  const shader = (type, source) => {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  };
  const program = gl.createProgram();
  const shaders = [shader(gl.VERTEX_SHADER, vertex), shader(gl.FRAGMENT_SHADER, fragment)];
  for (const item of shaders) gl.attachShader(program, item);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  for (const item of shaders) gl.deleteShader(item);
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const attribute = gl.getAttribLocation(program, 'a_quad');
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['view', 'center', 'size', 'alpha', 'trail', 'motion', 'shape', 'skew', 'light', 'scene'].map(key => [key, gl.getUniformLocation(program, `u_${key}`)]));
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  for (const filter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, filter, gl.LINEAR);
  for (const wrap of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, wrap, gl.CLAMP_TO_EDGE);
  gl.uniform1i(uniforms.scene, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  return {
    resize(w, h) {
      const maximum = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      const ratio = Math.min(devicePixelRatio || 1, 1.5, maximum / w, maximum / h);
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.view, w, h);
      const scene = document.createElement('canvas');
      scene.width = Math.ceil(w); scene.height = Math.ceil(h);
      const ctx = scene.getContext('2d');
      ctx.fillStyle = getComputedStyle(photo.parentElement).backgroundColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = Number(getComputedStyle(photo).opacity);
      const scale = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
      ctx.drawImage(photo, (w - photo.naturalWidth * scale) / 2, (h - photo.naturalHeight * scale) / 2, photo.naturalWidth * scale, photo.naturalHeight * scale);
      // A soft backing plate clears photographed beads inside the moving water.
      // Using a small canvas gives every browser the same local blur without CSS filters.
      const clear = document.createElement('canvas');
      clear.width = Math.max(1, Math.ceil(w / 24)); clear.height = Math.max(1, Math.ceil(h / 24));
      clear.getContext('2d').drawImage(scene, 0, 0, clear.width, clear.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, clear);
    },
    draw(simulation) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      const bead = (x, y, rx, ry, opacity, trail, motion = 0, shape = 0, skew = 0, light = 0) => {
        gl.uniform2f(uniforms.center, x, y);
        gl.uniform2f(uniforms.size, rx, ry);
        gl.uniform1f(uniforms.alpha, opacity);
        gl.uniform1f(uniforms.trail, trail);
        gl.uniform1f(uniforms.motion, motion);
        gl.uniform1f(uniforms.shape, shape);
        gl.uniform1f(uniforms.skew, skew);
        gl.uniform1f(uniforms.light, light);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };
      for (const t of simulation.trails) bead(t.x, t.y, t.rx, t.ry, Math.min(1, (5.5 - t.age) / 3.5), 1, 0, 0, 0, t.light);
      for (const d of simulation.drops) {
        const landing = 1 - Math.exp(-d.age * 9);
        const wobble = Math.sin(d.age * 24) * Math.exp(-d.age * 7) * .12;
        const fading = Math.min(1, (d.life - d.age) / 4);
        bead(d.x, d.y, d.r * landing * (1 + wobble), d.r * landing * (1.22 + d.stretch * .8 - wobble), landing * fading, 0, d.stretch, d.phase, d.drift, d.light);
      }
    },
    dispose() {
      gl.deleteBuffer(buffer); gl.deleteTexture(texture); gl.deleteProgram(program);
    },
  };
}

async function startRain(poster, photo, download) {
  await photo.decode();
  const canvas = document.createElement('canvas');
  canvas.className = 'poster-rain';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer = makeRenderer(canvas, photo);
  // Unsupported graphics contexts retain the complete still poster.
  if (!renderer) return;
  photo.after(canvas);
  const bounds = poster.getBoundingClientRect();
  const simulation = new RainSimulation(bounds.width, bounds.height, crypto.getRandomValues(new Uint32Array(1))[0]);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'rain-toggle';
  download.before(button);
  let userPaused = null, visible = true, pageActive = true, lost = false;
  let frame = 0, lastPaint = 0;
  const wanted = () => userPaused === null ? !motion.matches : !userPaused;
  const runnable = () => wanted() && visible && !document.hidden && pageActive && !lost && !download.hasAttribute('aria-busy');
  function paint(now) {
    frame = 0;
    if (!runnable()) return;
    frame = requestAnimationFrame(paint);
    if (lastPaint && now - lastPaint < 1000 / 30 - 1) return;
    const changed = simulation.step(lastPaint ? Math.min(.06, (now - lastPaint) / 1000) : 0);
    lastPaint = now;
    if (changed) renderer.draw(simulation);
  }
  function sync() {
    button.textContent = wanted() ? 'Pause rain' : 'Play rain';
    button.setAttribute('aria-label', wanted() ? 'Pause background rain' : 'Play background rain');
    if (!runnable()) {
      cancelAnimationFrame(frame); frame = 0; lastPaint = 0;
    } else if (!frame) frame = requestAnimationFrame(paint);
  }
  const resize = () => {
    if (lost) return;
    const {width, height} = poster.getBoundingClientRect();
    simulation.resize(width, height);
    renderer.resize(width, height);
    renderer.draw(simulation);
  };
  const observer = new ResizeObserver(resize); observer.observe(poster);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  intersection.observe(poster);
  const exporting = new MutationObserver(sync);
  exporting.observe(download, {attributes: true, attributeFilter: ['aria-busy']});
  button.addEventListener('pointerdown', event => event.stopPropagation());
  button.addEventListener('mousedown', event => { event.preventDefault(); event.stopPropagation(); });
  button.addEventListener('click', event => { event.stopPropagation(); userPaused = wanted(); sync(); });
  poster.addEventListener('focusout', event => { if (button.contains(event.relatedTarget)) event.stopImmediatePropagation(); }, true);
  poster.addEventListener('pointerleave', event => {
    if (button.contains(event.relatedTarget) || document.activeElement === button) event.stopImmediatePropagation();
  }, true);
  poster.addEventListener('pointermove', event => {
    if (document.activeElement === button && !event.target.closest('.rhp-chart')) event.stopImmediatePropagation();
  }, true);
  const preference = () => { userPaused = null; sync(); };
  motion.addEventListener('change', preference);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { pageActive = false; sync(); });
  window.addEventListener('pageshow', () => { pageActive = true; sync(); });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; sync(); });
  canvas.addEventListener('webglcontextrestored', () => { renderer = makeRenderer(canvas, photo); lost = false; resize(); sync(); });
  resize(); sync();
}

if (typeof document !== 'undefined') {
  const mount = () => {
    const photo = document.querySelector('.poster-photo'), download = document.querySelector('.poster-download');
    if (!photo || !download) return false;
    startRain(photo.closest('.poster'), photo, download).catch(error => console.error('Rain background:', error));
    return true;
  };
  if (!mount()) {
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
    // Gallery navigation adds the download toolbar outside the chart mount.
    observer.observe(document.body, {childList: true, subtree: true});
  }
}
