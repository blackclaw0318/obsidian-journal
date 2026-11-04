"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";
import type { CharacterScene } from "@/lib/portfolio";

export default function PortfolioScene({ scene, expression, reset, onReady }: { scene: CharacterScene; expression: number; reset: number; onReady: (ready: boolean) => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef({ scene, expression, reset });
  state.current = { scene, expression, reset };

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let disposed = false;
    let renderer: THREE.WebGLRenderer | undefined;
    let frame = 0;
    let cleanup = () => {};
    const start = async () => {
      const [T, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
        import("three"), import("three/addons/loaders/GLTFLoader.js"), import("three/addons/environments/RoomEnvironment.js")
      ]);
      if (disposed) return;
      try {
        renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      } catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      const world = new T.Scene();
      const camera = new T.PerspectiveCamera(34, 1, 0.1, 40);
      camera.position.set(0, 1.66, 6.3);
      camera.lookAt(0, 1.66, 0);
      const pmrem = new T.PMREMGenerator(renderer);
      const environmentScene = new RoomEnvironment();
      const env = pmrem.fromScene(environmentScene, 0.04);
      world.environment = env.texture;
      environmentScene.dispose();
      pmrem.dispose();
      world.environmentIntensity = .65;
      world.add(new T.HemisphereLight(0xfff8e9, 0xb4a58b, 1.6));
      const key = new T.DirectionalLight(0xffead0, 2.5); key.position.set(-3, 5, 4); world.add(key);
      const rim = new T.DirectionalLight(0xffffff, 2.5); rim.position.set(3, 2, -2); world.add(rim);
      const character = new T.Group(); world.add(character);
      const expressionMaterials: (THREE.Material & { map: THREE.Texture | null })[] = [];
      const expressionTextures: (THREE.Texture | undefined)[] = [];
      const originalTextures = new Set<THREE.Texture>();
      let appliedExpression = -1;
      let model: THREE.Object3D | undefined;
      const pointer = { x: 0, y: 0, dragging: false, last: 0, yaw: 0 };
      let visible = true;
      let lastReset = state.current.reset;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      const requestRender = () => { if (!disposed && renderer) renderer.render(world, camera); };
      const resize = () => {
        if (!renderer || disposed) return;
        const w = host.clientWidth; const h = host.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); requestRender();
      };
      const observer = new ResizeObserver(resize); observer.observe(host); resize();
      const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: "100px" });
      visibilityObserver.observe(host);
      const move = (event: PointerEvent) => {
        const box = host.getBoundingClientRect();
        pointer.x = T.MathUtils.clamp((event.clientX - box.left) / box.width * 2 - 1, -1, 1);
        pointer.y = T.MathUtils.clamp((event.clientY - box.top) / box.height * 2 - 1, -1, 1);
        if (pointer.dragging) { pointer.yaw = T.MathUtils.clamp(pointer.yaw + (event.clientX - pointer.last) * .002, -.14, .14); pointer.last = event.clientX; }
      };
      const down = (event: PointerEvent) => { pointer.dragging = true; pointer.last = event.clientX; host.setPointerCapture(event.pointerId); };
      const up = () => { pointer.dragging = false; };
      const leave = () => { if (!pointer.dragging) { pointer.x = 0; pointer.y = 0; } };
      host.addEventListener("pointermove", move); host.addEventListener("pointerdown", down); host.addEventListener("pointerup", up); host.addEventListener("pointercancel", up); host.addEventListener("pointerleave", leave);
      const contextLost = (event: Event) => { event.preventDefault(); host.classList.remove("scene-ready"); onReady(false); };
      renderer.domElement.addEventListener("webglcontextlost", contextLost);
      new GLTFLoader().load("/models/avatar-v2.glb", (gltf) => {
        if (disposed) { disposeObject(gltf.scene); return; }
        model = gltf.scene;
        const bounds = new T.Box3().setFromObject(model); const size = bounds.getSize(new T.Vector3()); const center = bounds.getCenter(new T.Vector3());
        const scale = 3.35 / size.y; model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        character.add(model);
        model.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => {
              if ((material as THREE.MeshBasicMaterial).isMeshBasicMaterial) material.toneMapped = false;
              if ("map" in material && material.map) originalTextures.add(material.map as THREE.Texture);
              if (material.name === "Front source reprojection" && "map" in material) expressionMaterials.push(material as THREE.Material & { map: THREE.Texture | null });
            });
          }
        });
        const textureLoader = new T.TextureLoader();
        ["natural", "wink", "thinking"].forEach((name, index) => {
          textureLoader.load(`/models/avatar-v2-${name}.webp`, (texture) => {
            if (disposed) { texture.dispose(); return; }
            texture.flipY = false; texture.colorSpace = T.SRGBColorSpace;
            texture.anisotropy = Math.min(4, renderer?.capabilities.getMaxAnisotropy() ?? 1);
            expressionTextures[index] = texture;
          });
        });
        host.classList.add("scene-ready"); onReady(true); requestRender();
      }, undefined, () => { host.classList.remove("scene-ready"); });
      function disposeObject(object: THREE.Object3D) {
        object.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh; mesh.geometry.dispose();
            (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => { if ("map" in material) (material.map as THREE.Texture | null)?.dispose(); material.dispose(); });
          }
        });
      }
      let lastTime = 0;
      const animate = (time: number) => {
        if (disposed) return;
        frame = requestAnimationFrame(animate);
        // Cap to 30fps; stop drawing offscreen and in background tabs.
        if (!visible || document.hidden || !model || time - lastTime < 32) return;
        lastTime = time;
        const current = state.current; const t = time * .001;
        const desiredTexture = expressionTextures[current.expression];
        if (appliedExpression !== current.expression && desiredTexture) {
          expressionMaterials.forEach((material) => { material.map = desiredTexture; material.needsUpdate = true; });
          appliedExpression = current.expression;
        }
        if (lastReset !== current.reset) { pointer.yaw = 0; pointer.x = 0; pointer.y = 0; lastReset = current.reset; }
        const pose = current.scene === "research" ? -.025 : current.scene === "motion" ? .025 : 0;
        character.rotation.y = T.MathUtils.lerp(character.rotation.y, T.MathUtils.clamp(pointer.yaw + (reduced.matches ? 0 : pointer.x * .025) + pose, -.18, .18), .07);
        if (!reduced.matches) character.position.y = Math.sin(t * 1.4) * .014;
        character.rotation.x = T.MathUtils.lerp(character.rotation.x, reduced.matches ? 0 : pointer.y * .015, .06);
        requestRender();
      };
      frame = requestAnimationFrame(animate);
      cleanup = () => {
        cancelAnimationFrame(frame); observer.disconnect(); visibilityObserver.disconnect();
        host.removeEventListener("pointermove", move); host.removeEventListener("pointerdown", down); host.removeEventListener("pointerup", up); host.removeEventListener("pointercancel", up); host.removeEventListener("pointerleave", leave);
        renderer?.domElement.removeEventListener("webglcontextlost", contextLost);
        if (model) disposeObject(model);
        expressionTextures.forEach((texture) => texture?.dispose());
        originalTextures.forEach((texture) => texture.dispose());
        env.dispose(); renderer?.dispose(); renderer?.domElement.remove(); host.classList.remove("scene-ready");
      };
    };
    start().catch(() => { /* The poster and all content remain usable when WebGL is unavailable. */ });
    return () => { disposed = true; cleanup(); };
  }, [onReady]);
  return <div className="portfolio-scene" ref={mount} aria-hidden="true" />;
}
