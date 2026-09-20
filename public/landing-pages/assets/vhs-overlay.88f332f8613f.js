  // VHS overlay for the DOM: grain, scanlines, head-switching band and AC beat as a screen-blended layer.
  (function () {
    const cv = document.getElementById('vhs-overlay'); const gl = cv.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) return;
    const cfg = () => window.VHS || { speed: .5, switching: .05, switchingHeight: .02, acBeat: 1, grain: .1, scanlines: .1, jitter: .25 };
    const V = `#version 300 es
    precision highp float; layout(location=0) in vec2 aPos; out vec2 vUv; void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.,1.); }`;
    const F = `#version 300 es
    precision highp float; in vec2 vUv; out vec4 o; uniform vec2 uRes; uniform float uTime, uSwitching, uSwitchHeight, uAcBeat, uGrain, uScanlines, uJitter, uScroll;
    #define PI 3.14159265
    float hash(vec2 v){ return fract(sin(dot(v, vec2(89.44, 19.36))) * 22189.22); }
    float iHash(vec2 v, vec2 r){ float h00=hash(floor(v*r)/r); float h10=hash(floor(v*r+vec2(1.,0.))/r); float h01=hash(floor(v*r+vec2(0.,1.))/r); float h11=hash(floor(v*r+vec2(1.,1.))/r); vec2 ip=smoothstep(vec2(0.),vec2(1.),mod(v*r,1.)); return (h00*(1.-ip.x)+h10*ip.x)*(1.-ip.y)+(h01*(1.-ip.x)+h11*ip.x)*ip.y; }
    float noise(vec2 v){ float sum=0.; float s=2.; for(int i=1;i<7;i++){ sum+=iHash(v+vec2(float(i)),vec2(2.*s))/s; s*=2.; } return sum; }
    void main(){
      vec2 uv = vUv; float t = uTime;
      float lineNoise = noise(vec2(uv.y*100.0, t*10.0));
      float snPhase = smoothstep(max(uSwitchHeight,1e-4), 0.0, uv.y) * uSwitching;
      float beat = clamp(noise(vec2(0.0, uv.y + t*0.2))*0.6-0.25, 0.0, 0.1) * uAcBeat;
      float g = hash(uv*uRes + fract(t)*vec2(127.1,311.7)) - 0.5;
      float scan = sin(uv.y*uRes.y*PI)*0.5;
      vec3 col = vec3(0.5 + g) * uGrain * 1.6 + beat * 0.5;
      col += vec3(0.9, 0.95, 1.0) * snPhase * 6.0 * (0.4 + lineNoise * 0.6);
      float a = clamp(uGrain*0.9 + snPhase*6.0 + beat*0.6, 0.0, 1.0);
      col *= 1.0 - uScanlines*0.35*scan;
      o = vec4(col * a, a);
    }`;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, V)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, F)); gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['uRes','uTime','uSwitching','uSwitchHeight','uAcBeat','uGrain','uScanlines','uJitter','uScroll'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
    let time = 0, last = performance.now(), vhsRaf = 0;
    function syncVhsPlayback() {
      if (document.hidden) { cancelAnimationFrame(vhsRaf); vhsRaf = 0; return; }
      if (!vhsRaf) { last = performance.now(); vhsRaf = requestAnimationFrame(frame); }
    }
    function frame(now) {
      vhsRaf = 0;
      if (document.hidden) return;
      const dpr = Math.min(devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.25 : 2); const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const c = cfg(); const dt = Math.min((now - last) / 1000, 1 / 30); last = now; time += dt * c.speed;
      gl.viewport(0, 0, w, h); gl.useProgram(prog);
      gl.uniform2f(U.uRes, w, h); gl.uniform1f(U.uTime, time); gl.uniform1f(U.uSwitching, c.switching); gl.uniform1f(U.uSwitchHeight, c.switchingHeight); gl.uniform1f(U.uAcBeat, c.acBeat); gl.uniform1f(U.uGrain, c.grain); gl.uniform1f(U.uScanlines, c.scanlines); gl.uniform1f(U.uJitter, c.jitter); gl.uniform1f(U.uScroll, scrollY);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      vhsRaf = requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', syncVhsPlayback);
    syncVhsPlayback();
  })();

