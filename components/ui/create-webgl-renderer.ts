import * as THREE from "three";

let webGLUnavailable = false;

export function createWebGLRenderer(canvas: HTMLCanvasElement) {
  if (webGLUnavailable) return null;

  const context = canvas.getContext("webgl2", { antialias: true, alpha: true });
  if (!context) {
    webGLUnavailable = true;
    return null;
  }

  try {
    return new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  } catch {
    webGLUnavailable = true;
    return null;
  }
}
