"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { profile } from "@/lib/content";
import { useSceneVisible } from "./use-scene-visible";
import { createWebGLRenderer } from "./create-webgl-renderer";
import styles from "./horizon-hero-section.module.css";

function HorizonScene({
  stageRef,
  scrollProgressRef,
  active,
}: {
  stageRef: React.RefObject<HTMLDivElement | null>;
  scrollProgressRef: React.RefObject<number>;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const renderer = createWebGLRenderer(canvas);
    if (!renderer) return;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030711, 0.0015);
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 2000);
    camera.position.set(0, 16, 145);
    camera.lookAt(0, 0, -120);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.65, 0.4, 0.85);
    composer.addPass(bloom);

    const starFields: THREE.Points[] = [];
    for (let layer = 0; layer < 3; layer++) {
      const count = window.innerWidth < 700 ? 450 : 1100;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let index = 0; index < count; index++) {
        positions[index * 3] = (Math.random() - 0.5) * 1300;
        positions[index * 3 + 1] = (Math.random() - 0.5) * 650;
        positions[index * 3 + 2] = -100 - Math.random() * 850;
        const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.16, 0.25, 0.65 + Math.random() * 0.3);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const material = new THREE.PointsMaterial({
        size: 1.3 + layer * 0.45,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const field = new THREE.Points(geometry, material);
      scene.add(field);
      starFields.push(field);
    }

    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform float time;
        void main() {
          vec2 p = vUv - 0.5;
          float cloud = sin(p.x * 12.0 + time * 0.15) * cos(p.y * 9.0 - time * 0.1);
          float glow = exp(-dot(p, p) * 12.0) * (0.55 + cloud * 0.2);
          vec3 color = mix(vec3(0.03, 0.16, 0.36), vec3(0.25, 0.08, 0.33), vUv.x);
          gl_FragColor = vec4(color, glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const nebula = new THREE.Mesh(new THREE.PlaneGeometry(1200, 650), nebulaMaterial);
    nebula.position.z = -450;
    scene.add(nebula);

    const mountains: THREE.Mesh[] = [];
    [
      { depth: -15, height: 30, color: 0x070d1b },
      { depth: -65, height: 43, color: 0x101a36 },
      { depth: -125, height: 57, color: 0x18345b },
    ].forEach((layer, layerIndex) => {
      const shape = new THREE.Shape();
      shape.moveTo(-650, -250);
      for (let index = 0; index <= 80; index++) {
        const x = -650 + (index / 80) * 1300;
        const y = -54 + Math.sin(index * 0.23 + layerIndex) * layer.height
          + Math.sin(index * 0.61) * layer.height * 0.26;
        shape.lineTo(x, y);
      }
      shape.lineTo(650, -250);
      shape.closePath();
      const mountain = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({ color: layer.color, side: THREE.DoubleSide }),
      );
      mountain.position.z = layer.depth;
      scene.add(mountain);
      mountains.push(mountain);
    });

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

    const pointer = { x: 0, y: 0 };
    const handlePointer = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    stage.addEventListener("pointermove", handlePointer);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frameId = 0;
    const animate = (time: number) => {
      const progress = scrollProgressRef.current;
      nebulaMaterial.uniforms.time.value = time * 0.001;
      camera.position.x += (pointer.x * 12 - camera.position.x) * 0.035;
      camera.position.y += (16 - pointer.y * 6 - camera.position.y) * 0.035;
      camera.position.z += (145 - progress * 80 - camera.position.z) * 0.045;
      camera.lookAt(0, 0, -120);
      starFields.forEach((field, index) => {
        field.rotation.z = time * 0.000004 * (index + 1);
        field.position.x = -progress * (index + 1) * 8;
      });
      mountains.forEach((mountain, index) => {
        mountain.position.x = -progress * (3 - index) * 22;
      });
      nebula.position.x = progress * 18;
      composer.render();
      if (!reducedMotion) frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      stage.removeEventListener("pointermove", handlePointer);
      observer.disconnect();
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
  }, [stageRef, scrollProgressRef, active]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}

export function HorizonHeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneVisible = useSceneVisible(stageRef);
  const scrollProgressRef = useRef(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const scrollDistance = Math.max(rect.height - window.innerHeight, 1);
      const progress = THREE.MathUtils.clamp(-rect.top / scrollDistance, 0, 1);
      scrollProgressRef.current = progress;
      setScrollProgress(progress);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.hero} aria-label="Introduction">
      <div ref={stageRef} className={styles.stage}>
        <HorizonScene stageRef={stageRef} scrollProgressRef={scrollProgressRef} active={sceneVisible} />
        <div className={styles.shade} />
        <div className={styles.content}>
          <p className={styles.eyebrow}>CAIRO, EGYPT / WORKING WORLDWIDE</p>
          <h1 className={styles.title}>{profile.name}<span>.</span></h1>
          <p className={styles.role}>Full-Stack &amp; Frontend Engineer</p>
          <p className={styles.description}>
            I build thoughtful digital experiences, production web applications,
            and the systems that make them work.
          </p>
          <div className={styles.actions}>
            <Link href="#work" className={styles.primaryAction}>View my work <ArrowUpRight size={18} /></Link>
            <Link href="#contact" className={styles.secondaryAction}>Let&apos;s talk <ArrowUpRight size={18} /></Link>
          </div>
        </div>
        <a href="#work" className={styles.scroll}>
          <span>SCROLL TO EXPLORE</span>
          <span className={styles.progress}><span style={{ width: `${scrollProgress * 100}%` }} /></span>
          <ArrowDown size={16} />
        </a>
      </div>
    </section>
  );
}
