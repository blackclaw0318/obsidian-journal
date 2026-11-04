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
    let cleanup = () => {};
    onReady(false);

    const start = async () => {
      const [T, { GLTFLoader }] = await Promise.all([
        import("three"), import("three/addons/loaders/GLTFLoader.js")
      ]);
      if (disposed) return;
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      } catch { return; }

      // Install teardown before async resource loads, including Strict Mode remounts.
      let frame = 0;
      let model: THREE.Object3D | undefined;
      let contextAvailable = true;
      let visible = true;
      const textures = new Set<THREE.Texture>();
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const collectResources = (object: THREE.Object3D) => {
        object.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          geometries.add(mesh.geometry);
          (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => {
            materials.add(material);
            Object.values(material).forEach((value) => {
              if (value && (value as THREE.Texture).isTexture) textures.add(value as THREE.Texture);
            });
          });
        });
      };
      const releaseResources = () => {
        textures.forEach((texture) => texture.dispose());
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        textures.clear(); geometries.clear(); materials.clear();
      };

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.NoToneMapping;
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      const world = new T.Scene();
      const camera = new T.PerspectiveCamera(36, 1, .1, 40);
      const character = new T.Group(); world.add(character);
      // Broad fill preserves the colours of the matte, cel-style PBR model.
      world.add(new T.HemisphereLight(0xffffff, 0xbfc7b3, 1.7));
      const key = new T.DirectionalLight(0xfff6ed, 1.4); key.position.set(-3, 5, 5); world.add(key);
      const fill = new T.DirectionalLight(0xffffff, .6); fill.position.set(4, 2, 3); world.add(fill);

      const eyes: THREE.Object3D[] = [];
      const lids: THREE.Object3D[] = [];
      const creases: THREE.Object3D[] = [];
      const pointer = { x: 0, y: 0, active: false, dragging: false, id: -1, last: 0, yaw: 0 };
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      let modelWidth = 3.35;
      let lastReset = state.current.reset;
      let nextBlink = performance.now() + 3200;
      let blinkStart = -Infinity;
      let lastTime = 0;
      let lastTelemetry = 0;
      const render = () => { if (!disposed && contextAvailable) renderer.render(world, camera); };
      const resize = () => {
        if (disposed) return;
        const width = host.clientWidth; const height = host.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height); camera.aspect = width / height;
        // Fit the mesh at every aspect ratio, including the compact mobile stage.
        const halfFov = T.MathUtils.degToRad(camera.fov / 2);
        const distance = Math.max(3.35 / 2 / Math.tan(halfFov), modelWidth / 2 / (Math.tan(halfFov) * camera.aspect)) * 1.08;
        camera.position.set(0, 1.675, distance); camera.lookAt(0, 1.675, 0);
        camera.updateProjectionMatrix(); render();
      };
      const observer = new ResizeObserver(resize); observer.observe(host);
      const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: "100px" });
      visibilityObserver.observe(host);

      const move = (event: PointerEvent) => {
        if (event.pointerType === "touch" && !pointer.dragging) return;
        const box = host.getBoundingClientRect();
        // Eyes follow the cursor across the page while the head stays nearly still.
        pointer.x = T.MathUtils.clamp((event.clientX - box.left - box.width / 2) / Math.max(box.width / 2, window.innerWidth * .35), -1, 1);
        pointer.y = T.MathUtils.clamp((event.clientY - box.top - box.height * .43) / Math.max(box.height / 2, window.innerHeight * .35), -1, 1);
        pointer.active = true;
        if (pointer.dragging && event.pointerId === pointer.id) {
          pointer.yaw = T.MathUtils.clamp(pointer.yaw + (event.clientX - pointer.last) * .004, -.14, .14);
          pointer.last = event.clientX;
        }
      };
      const down = (event: PointerEvent) => {
        if (event.button !== 0) return;
        pointer.dragging = true; pointer.id = event.pointerId; pointer.last = event.clientX;
        host.setPointerCapture(event.pointerId);
      };
      const up = (event: PointerEvent) => {
        if (pointer.id !== event.pointerId) return;
        if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
        pointer.dragging = false; pointer.id = -1;
      };
      const leave = () => { pointer.active = false; pointer.x = 0; pointer.y = 0; pointer.dragging = false; };
      const contextLost = (event: Event) => {
        event.preventDefault(); contextAvailable = false;
        host.classList.remove("scene-ready"); onReady(false);
      };
      const contextRestored = () => {
        contextAvailable = true;
        if (model) { host.classList.add("scene-ready"); onReady(true); render(); }
      };

      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("blur", leave);
      document.documentElement.addEventListener("pointerleave", leave);
      host.addEventListener("pointerdown", down); host.addEventListener("pointerup", up); host.addEventListener("pointercancel", up);
      renderer.domElement.addEventListener("webglcontextlost", contextLost);
      renderer.domElement.addEventListener("webglcontextrestored", contextRestored);
      cleanup = () => {
        cancelAnimationFrame(frame); observer.disconnect(); visibilityObserver.disconnect();
        window.removeEventListener("pointermove", move); window.removeEventListener("blur", leave);
        document.documentElement.removeEventListener("pointerleave", leave);
        host.removeEventListener("pointerdown", down); host.removeEventListener("pointerup", up); host.removeEventListener("pointercancel", up);
        renderer.domElement.removeEventListener("webglcontextlost", contextLost);
        renderer.domElement.removeEventListener("webglcontextrestored", contextRestored);
        releaseResources(); renderer.dispose(); renderer.domElement.remove(); host.classList.remove("scene-ready");
      };
      resize();

      new GLTFLoader().load("/models/avatar-v3.glb", (gltf) => {
        collectResources(gltf.scene);
        if (disposed) { releaseResources(); return; }
        model = gltf.scene;
        const bounds = new T.Box3().setFromObject(model);
        const size = bounds.getSize(new T.Vector3()); const center = bounds.getCenter(new T.Vector3());
        const scale = 3.35 / size.y; model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        modelWidth = size.x * scale; character.add(model);
        for (const side of ["Left", "Right"]) {
          const eye = model.getObjectByName(`Gaze${side}`);
          const lid = model.getObjectByName(`Lid${side}`);
          const crease = model.getObjectByName(`WinkCrease${side}`);
          if (eye) eyes.push(eye);
          if (lid) lids.push(lid);
          if (crease) creases.push(crease);
        }
        host.dataset.model = "avatar-v3";
        host.classList.add("scene-ready"); onReady(true); resize();
      }, undefined, () => { if (!disposed) { host.classList.remove("scene-ready"); onReady(false); } });

      const animate = (time: number) => {
        if (disposed) return;
        frame = requestAnimationFrame(animate);
        if (!visible || document.hidden || !model || !contextAvailable || time - lastTime < 32) return;
        const delta = Math.min((time - (lastTime || time)) / 1000, .1);
        const ease = 1 - Math.exp(-12 * delta); lastTime = time;
        const current = state.current;
        if (lastReset !== current.reset) {
          pointer.yaw = 0; pointer.x = 0; pointer.y = 0; pointer.active = false; lastReset = current.reset;
        }
        const thinking = current.expression === 2;
        const gazeX = reduced.matches ? 0 : pointer.active ? pointer.x * .20 : thinking ? -.085 : 0;
        const gazeY = reduced.matches ? 0 : pointer.active ? pointer.y * .12 : thinking ? -.025 : 0;
        eyes.forEach((eye) => {
          eye.rotation.y = T.MathUtils.lerp(eye.rotation.y, gazeX, ease);
          eye.rotation.x = T.MathUtils.lerp(eye.rotation.x, gazeY, ease);
        });
        if (!reduced.matches && time >= nextBlink) {
          blinkStart = time; nextBlink = time + 3600 + Math.random() * 2600;
        }
        const blinkAge = time - blinkStart;
        const blink = !reduced.matches && blinkAge >= 0 && blinkAge < 190 ? Math.sin(blinkAge / 190 * Math.PI) : 0;
        lids.forEach((lid, index) => {
          const target = current.expression === 1 && index === 1 ? 1 : blink;
          lid.scale.y = T.MathUtils.lerp(lid.scale.y, Math.max(.001, target), current.expression === 1 ? ease : .85);
          lid.visible = lid.scale.y > .01;
          if (creases[index]) creases[index].visible = lid.scale.y > .8;
        });
        const pose = current.scene === "research" ? -.025 : current.scene === "motion" ? .025 : 0;
        character.rotation.y = T.MathUtils.lerp(character.rotation.y, T.MathUtils.clamp(pointer.yaw + pose + (reduced.matches ? 0 : pointer.x * .035), -.16, .16), ease * .55);
        character.rotation.x = T.MathUtils.lerp(character.rotation.x, reduced.matches ? 0 : pointer.y * .015, ease * .4);
        character.position.y = reduced.matches ? 0 : Math.sin(time * .0014) * .012;
        if (time - lastTelemetry > 120) {
          host.dataset.gazeX = (eyes[0]?.rotation.y ?? 0).toFixed(4);
          host.dataset.gazeY = (eyes[0]?.rotation.x ?? 0).toFixed(4);
          host.dataset.viewYaw = character.rotation.y.toFixed(4); lastTelemetry = time;
        }
        render();
      };
      frame = requestAnimationFrame(animate);
    };
    start().catch(() => { cleanup(); /* Keep the portrait and all content usable without WebGL. */ });
    return () => { disposed = true; cleanup(); };
  }, [onReady]);
  return <div className="portfolio-scene" ref={mount} aria-hidden="true" />;
}
