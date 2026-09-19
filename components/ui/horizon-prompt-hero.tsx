"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { useSceneVisible } from "./use-scene-visible";
import { createWebGLRenderer } from "./create-webgl-renderer";
import styles from "./horizon-prompt-hero.module.css";

const chapters = [
  { title: "HORIZON", line1: "Where vision meets reality,", line2: "we shape the future of tomorrow" },
  { title: "COSMOS", line1: "Beyond the boundaries of imagination,", line2: "lies the universe of possibilities" },
  { title: "INFINITY", line1: "In the space between thought and creation,", line2: "we find the essence of true innovation" },
];

export function HorizonPromptHero() {
  const containerRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneVisible = useSceneVisible(stageRef);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!sceneVisible) return;
    const container = containerRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!container || !stage || !canvas) return;

    const renderer = createWebGLRenderer(canvas);
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.00025);
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    camera.position.set(0, 30, 300);
    camera.lookAt(0, 10, -600);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.4, 0.85);
    composer.addPass(bloom);

    const stars: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>[] = [];
    for (let layer = 0; layer < 3; layer++) {
      const count = window.innerWidth < 760 ? 1800 : 5000;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      for (let index = 0; index < count; index++) {
        const radius = 200 + Math.random() * 800;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[index * 3 + 2] = radius * Math.cos(phi);
        const color = new THREE.Color();
        const choice = Math.random();
        if (choice < 0.7) color.setHSL(0, 0, 0.8 + Math.random() * 0.2);
        else if (choice < 0.9) color.setHSL(0.08, 0.5, 0.8);
        else color.setHSL(0.6, 0.5, 0.8);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
        sizes[index] = Math.random() * 2 + 0.5;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, depth: { value: layer } },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          uniform float time;
          uniform float depth;
          void main() {
            vColor = color;
            vec3 pos = position;
            float angle = time * 0.05 * (1.0 - depth * 0.3);
            mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            pos.xy = rot * pos.xy;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float opacity = 1.0 - smoothstep(0.0, 0.5, dist);
            gl_FragColor = vec4(vColor, opacity);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const field = new THREE.Points(geometry, material);
      scene.add(field);
      stars.push(field);
    }

    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x0033ff) },
        color2: { value: new THREE.Color(0xff0066) },
        opacity: { value: 0.3 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vElevation;
        uniform float time;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float elevation = sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 20.0;
          pos.z += elevation;
          vElevation = elevation;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float opacity;
        uniform float time;
        varying vec2 vUv;
        varying float vElevation;
        void main() {
          float mixFactor = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
          vec3 color = mix(color1, color2, mixFactor * 0.5 + 0.5);
          float alpha = opacity * (1.0 - length(vUv - 0.5) * 2.0);
          alpha *= 1.0 + vElevation * 0.01;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const nebula = new THREE.Mesh(new THREE.PlaneGeometry(8000, 4000, 100, 100), nebulaMaterial);
    nebula.position.z = -1050;
    scene.add(nebula);

    const mountains: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>[] = [];
    [
      { distance: -50, height: 60, color: 0x1a1a2e, opacity: 1 },
      { distance: -100, height: 80, color: 0x16213e, opacity: 0.8 },
      { distance: -150, height: 100, color: 0x0f3460, opacity: 0.6 },
      { distance: -200, height: 120, color: 0x0a4668, opacity: 0.4 },
    ].forEach((layer, layerIndex) => {
      const points: THREE.Vector2[] = [];
      for (let index = 0; index <= 50; index++) {
        const x = (index / 50 - 0.5) * 1000;
        const y = Math.sin(index * 0.1) * layer.height
          + Math.sin(index * 0.05) * layer.height * 0.5
          + Math.random() * layer.height * 0.2 - 100;
        points.push(new THREE.Vector2(x, y));
      }
      points.push(new THREE.Vector2(5000, -300), new THREE.Vector2(-5000, -300));
      const mountain = new THREE.Mesh(
        new THREE.ShapeGeometry(new THREE.Shape(points)),
        new THREE.MeshBasicMaterial({ color: layer.color, transparent: true, opacity: layer.opacity, side: THREE.DoubleSide }),
      );
      mountain.position.z = layer.distance;
      mountain.position.y = layer.distance;
      mountain.userData.layerIndex = layerIndex;
      scene.add(mountain);
      mountains.push(mountain);
    });

    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform float time;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          vec3 atmosphere = vec3(0.3, 0.6, 1.0) * intensity;
          atmosphere *= sin(time * 2.0) * 0.1 + 0.9;
          gl_FragColor = vec4(atmosphere, intensity * 0.25);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 32), atmosphereMaterial);
    scene.add(atmosphere);

    const resize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      bloom.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();

    const updateScroll = () => {
      const rect = container.getBoundingClientRect();
      const travel = Math.max(rect.height - window.innerHeight, 1);
      const next = THREE.MathUtils.clamp(-rect.top / travel, 0, 1);
      progressRef.current = next;
      setProgress(next);
    };
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    updateScroll();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frameId = 0;
    const animate = (timeMs: number) => {
      const time = timeMs * 0.001;
      const travel = progressRef.current * 2;
      const cameraStops = [
        new THREE.Vector3(0, 30, 300),
        new THREE.Vector3(0, 40, -50),
        new THREE.Vector3(0, 50, -700),
      ];
      const index = Math.min(Math.floor(travel), 1);
      const nextCamera = cameraStops[index].clone().lerp(cameraStops[index + 1], travel - index);
      camera.position.lerp(nextCamera, 0.05);
      camera.position.x += Math.sin(time * 0.1) * 0.03;
      camera.lookAt(0, 10, -600);
      stars.forEach((field) => { field.material.uniforms.time.value = time; });
      nebulaMaterial.uniforms.time.value = time * 0.5;
      atmosphereMaterial.uniforms.time.value = time;
      mountains.forEach((mountain, mountainIndex) => {
        const factor = 1 + mountainIndex * 0.5;
        mountain.position.x = Math.sin(time * 0.1) * 2 * factor;
        mountain.position.y = 50 + Math.cos(time * 0.15) * factor;
        mountain.visible = progressRef.current < 0.7;
      });
      composer.render();
      if (!reducedMotion) frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, [sceneVisible]);

  const chapterIndex = Math.min(Math.floor(progress * 3), 2);
  const chapter = chapters[chapterIndex];

  return (
    <section ref={containerRef} className={styles.container} aria-label="Horizon demo hero">
      <div ref={stageRef} className={styles.stage}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <div className={styles.menu} aria-hidden="true">
          <div className={styles.menuIcon}><span /><span /><span /></div>
          <div className={styles.verticalText}>SPACE</div>
        </div>
        <div className={styles.content} key={chapter.title}>
          <h2 className={styles.title}>{chapter.title}</h2>
          <div className={styles.subtitle}>
            <p>{chapter.line1}</p>
            <p>{chapter.line2}</p>
          </div>
        </div>
        <div className={styles.scroll} aria-label={`Scroll progress ${Math.round(progress * 100)} percent`}>
          <span>SCROLL</span>
          <span className={styles.track}><span style={{ width: `${progress * 100}%` }} /></span>
          <span>{String(chapterIndex + 1).padStart(2, "0")} / 03</span>
        </div>
      </div>
    </section>
  );
}
