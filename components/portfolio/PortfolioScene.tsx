"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { avatarAsset, avatarCameraShots, avatarDomains, avatarExpressions, type AvatarAction, type AvatarDomain, type AvatarScrollSource } from "@/lib/avatar-world";

interface SceneProps {
  focus: AvatarDomain; onFocus: (domain: AvatarDomain) => void;
  expression: number; reset: number;
  actions: { kind: AvatarAction; nonce: number }[]; onAction: (kind: AvatarAction) => void;
  onReady: (ready: boolean) => void;
  cinematic?: boolean; scrollSource?: AvatarScrollSource;
}

export default function PortfolioScene(props: SceneProps) {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef(props); state.current = props;
  const { onReady } = props;
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};
    onReady(false);
    const start = async () => {
      const [T, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
        import("three"), import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js")
      ]);
      if (disposed) return;
      let renderer: THREE.WebGLRenderer;
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
      catch { return; }
      let frame = 0; let model: THREE.Object3D | undefined;
      let contextAvailable = true; let visible = true;
      const textures = new Set<THREE.Texture>(); const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
      const collect = (object: THREE.Object3D) => object.traverse(node => {
        const mesh = node as THREE.Mesh; if (!mesh.isMesh) return;
        geometries.add(mesh.geometry);
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => {
          materials.add(material);
          Object.values(material).forEach(value => { if (value && (value as THREE.Texture).isTexture) textures.add(value as THREE.Texture); });
        });
      });
      const release = () => {
        const bitmaps = new Set<ImageBitmap>();
        textures.forEach(texture => { const data = texture.source?.data; if (typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap) bitmaps.add(data); texture.dispose(); });
        bitmaps.forEach(bitmap => bitmap.close()); geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
        textures.clear(); geometries.clear(); materials.clear();
      };
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.NoToneMapping; renderer.setClearColor(0, 0);
      host.appendChild(renderer.domElement);
      const world = new T.Scene(); const camera = new T.PerspectiveCamera(40, 1, .1, 35);
      const character = new T.Group(); world.add(character);
      world.add(new T.HemisphereLight(0xffffff, 0xb9b8a2, 1.65));
      const key = new T.DirectionalLight(0xfff3e3, 1.45); key.position.set(-3, 5, 6); world.add(key);
      const fill = new T.DirectionalLight(0xffffff, .6); fill.position.set(4, 2, 4); world.add(fill);
      const flashLight = new T.PointLight(0xffffff, 0, 8); flashLight.position.set(.9, 1.6, 2); world.add(flashLight);
      const nodes: Record<string, THREE.Object3D> = {};
      const bases = new Map<string, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>();
      const morphs: THREE.Mesh[] = [];
      const pointer = { x: 0, y: 0, active: false, dragging: false, id: -1, last: 0, originX: 0, originY: 0, moved: false, yaw: 0 };
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      const raycaster = new T.Raycaster(); const rayPointer = new T.Vector2();
      const look = new T.Vector3(0, 1.55, 0); const wantedLook = look.clone(); const wantedCamera = new T.Vector3(0, 1.55, 6.6);
      let fitDistance = 6.6; let modelWidth = 2.8; let modelHeight = 3.1;
      let lastReset = state.current.reset; let lastAction = state.current.actions.at(-1)?.nonce ?? 0;
      let appleStart = -Infinity; let breadStart = -Infinity; let flashStart = -Infinity;
      let bitten = false; let pendingBites = 0; let actionCount = 0;
      let nextBlink = performance.now() + 3500; let blinkStart = -Infinity; let lastTime = 0; let lastTelemetry = 0;
      host.dataset.actionCount = "0"; host.dataset.bread = "whole";
      const render = () => { if (!disposed && contextAvailable) renderer.render(world, camera); };
      const resize = () => {
        if (disposed || !host.clientWidth || !host.clientHeight) return;
        renderer.setSize(host.clientWidth, host.clientHeight); camera.aspect = host.clientWidth / host.clientHeight;
        const tan = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
        fitDistance = state.current.cinematic ? modelHeight / 2 / tan : Math.max(modelHeight / 2 / tan, modelWidth / 2 / (tan * camera.aspect)) * 1.13;
        if (!model || !lastTime) { camera.position.set(0, 1.55, fitDistance); camera.lookAt(look); }
        camera.updateProjectionMatrix(); render();
      };
      const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
      const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: "100px" }); visibilityObserver.observe(host);
      const hit = (event: PointerEvent) => {
        if (!model || !contextAvailable) return undefined;
        const box = host.getBoundingClientRect();
        rayPointer.set((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1);
        raycaster.setFromCamera(rayPointer, camera);
        for (const intersection of raycaster.intersectObject(model, true)) {
          let object: THREE.Object3D | null = intersection.object;
          let ancestor: THREE.Object3D | null = object;
          let hidden = false;
          while (ancestor) { if (!ancestor.visible) { hidden = true; break; } ancestor = ancestor.parent; }
          if (hidden) continue;
          let candidate: AvatarDomain | AvatarAction | undefined;
          while (object && object !== model) {
            if (!object.visible) { candidate = undefined; break; }
            const label = avatarDomains.find(domain => domain.node === object?.name);
            if (label) candidate = label.id;
            if (object.name === "Apple") candidate = "apple";
            if (object.name === "BreadWhole" || object.name === "BreadBitten") candidate = "bread";
            if (object.name === "Phone") candidate = "flash";
            object = object.parent;
          }
          if (candidate) return candidate;
          // The closest opaque surface blocks labels on the far side of the head.
          if ((intersection.object as THREE.Mesh).isMesh) return undefined;
        }
      };
      const move = (event: PointerEvent) => {
        if (event.pointerType === "touch" && !pointer.dragging) return;
        const box = host.getBoundingClientRect();
        pointer.x = T.MathUtils.clamp((event.clientX - box.left - box.width / 2) / Math.max(box.width / 2, window.innerWidth * .32), -1, 1);
        pointer.y = T.MathUtils.clamp((event.clientY - box.top - box.height * .43) / Math.max(box.height / 2, window.innerHeight * .32), -1, 1); pointer.active = true;
        if (pointer.dragging && pointer.id === event.pointerId) {
          pointer.yaw = T.MathUtils.clamp(pointer.yaw + (event.clientX - pointer.last) * .004, -.14, .14); pointer.last = event.clientX;
          if (Math.hypot(event.clientX - pointer.originX, event.clientY - pointer.originY) > 6) pointer.moved = true;
        }
      };
      const hover = (event: PointerEvent) => { if (!pointer.dragging) host.style.cursor = hit(event) ? "pointer" : "grab"; };
      const down = (event: PointerEvent) => {
        if (event.button !== 0) return;
        pointer.dragging = true; pointer.id = event.pointerId; pointer.last = pointer.originX = event.clientX; pointer.originY = event.clientY; pointer.moved = false;
        host.setPointerCapture(event.pointerId);
      };
      const up = (event: PointerEvent) => {
        if (pointer.id !== event.pointerId) return;
        if (event.type !== "pointercancel" && !pointer.moved) {
          const target = hit(event);
          if (target === "apple" || target === "bread" || target === "flash") state.current.onAction(target);
          else if (target) state.current.onFocus(target);
        }
        if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
        pointer.dragging = false; pointer.id = -1;
      };
      const leave = () => { pointer.active = false; pointer.x = 0; pointer.y = 0; pointer.dragging = false; };
      const lost = (event: Event) => { event.preventDefault(); contextAvailable = false; host.classList.remove("scene-ready"); onReady(false); };
      const restored = () => { contextAvailable = true; if (model) { host.classList.add("scene-ready"); onReady(true); render(); } };
      window.addEventListener("pointermove", move, { passive: true }); window.addEventListener("blur", leave); document.documentElement.addEventListener("pointerleave", leave);
      host.addEventListener("pointermove", hover, { passive: true }); host.addEventListener("pointerdown", down); host.addEventListener("pointerup", up); host.addEventListener("pointercancel", up);
      renderer.domElement.addEventListener("webglcontextlost", lost); renderer.domElement.addEventListener("webglcontextrestored", restored);
      cleanup = () => {
        cancelAnimationFrame(frame); resizeObserver.disconnect(); visibilityObserver.disconnect();
        window.removeEventListener("pointermove", move); window.removeEventListener("blur", leave); document.documentElement.removeEventListener("pointerleave", leave);
        host.removeEventListener("pointermove", hover); host.removeEventListener("pointerdown", down); host.removeEventListener("pointerup", up); host.removeEventListener("pointercancel", up);
        renderer.domElement.removeEventListener("webglcontextlost", lost); renderer.domElement.removeEventListener("webglcontextrestored", restored);
        release(); renderer.dispose(); renderer.domElement.remove(); host.classList.remove("scene-ready");
      };
      resize();
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(avatarAsset.url, gltf => {
        collect(gltf.scene); if (disposed) { release(); return; }
        model = gltf.scene;
        const bounds = new T.Box3().setFromObject(model); const size = bounds.getSize(new T.Vector3()); const center = bounds.getCenter(new T.Vector3());
        const scale = 3.1 / size.y; model.scale.setScalar(scale); model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        modelWidth = size.x * scale; modelHeight = 3.1; character.add(model);
        for (const name of ["Head", "HandLeft", "HandRight", "GazeLeft", "GazeRight", "LidLeft", "LidRight", "WinkCreaseLeft", "WinkCreaseRight", "Apple", "BreadWhole", "BreadBitten", "Phone", "Flash", "MouthOpen", "Tongue", "TeethUpper", ...avatarDomains.map(domain => domain.node)]) {
          const node = model.getObjectByName(name); if (!node) continue;
          nodes[name] = node; bases.set(name, { position: node.position.clone(), rotation: node.rotation.clone(), scale: node.scale.clone() });
        }
        model.traverse(node => { const mesh = node as THREE.Mesh; if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) morphs.push(mesh); });
        for (const name of ["BreadBitten", "Flash", "MouthOpen", "LidLeft", "LidRight", "WinkCreaseLeft", "WinkCreaseRight"]) if (nodes[name]) nodes[name].visible = false;
        host.dataset.model = avatarAsset.id;
        if (contextAvailable) { host.classList.add("scene-ready"); onReady(true); }
        resize();
      }, undefined, () => { if (!disposed) { host.classList.remove("scene-ready"); onReady(false); } });
      const animate = (time: number) => {
        if (disposed) return;
        frame = requestAnimationFrame(animate);
        if (!visible || document.hidden || !model || !contextAvailable || time - lastTime < 32) return;
        const delta = Math.min((time - (lastTime || time)) / 1000, .1); lastTime = time;
        const ease = reduced.matches ? 1 : 1 - Math.exp(-9 * delta); const current = state.current;
        if (current.reset !== lastReset) {
          pointer.x = pointer.y = pointer.yaw = 0; pointer.active = false; lastReset = current.reset;
          appleStart = breadStart = flashStart = -Infinity; pendingBites = 0; bitten = false; host.dataset.bread = "whole";
        }
        for (const action of current.actions) {
          if (action.nonce <= lastAction) continue;
          lastAction = action.nonce; actionCount++; host.dataset.action = action.kind; host.dataset.actionCount = String(actionCount);
          if (action.kind === "apple") appleStart = time;
          if (action.kind === "bread") { breadStart = time; pendingBites++; }
          if (action.kind === "flash") flashStart = time;
        }
        const domain = avatarDomains.find(item => item.id === current.focus);
        wantedLook.set(0, 1.55, 0); let zoom = 1; let angle = pointer.yaw; let elevation = .005;
        const pose = current.scrollSource?.current;
        if (current.cinematic && pose) {
          const from = avatarCameraShots[pose.from]; const to = avatarCameraShots[pose.to];
          const mix = pose.mix;
          const target = (shot: typeof from) => {
            const point = new T.Vector3(...shot.look as [number, number, number]);
            const label = avatarDomains.find(item => item.id === shot.domain);
            const anchor = label && nodes[label.node];
            if (anchor) point.lerp(new T.Box3().setFromObject(anchor).getCenter(new T.Vector3()), shot.anchor);
            return point;
          };
          wantedLook.copy(target(from)).lerp(target(to), mix);
          zoom = T.MathUtils.lerp(from.zoom, to.zoom, mix);
          angle += T.MathUtils.lerp(from.angle, to.angle, mix);
          elevation = T.MathUtils.lerp(from.elevation, to.elevation, mix);
          // On a narrow screen the portrait remains large, with space below the
          // eyes for text. Fitting the complete model width would shrink it.
          if (camera.aspect < .8) {
            const portraitWeight = (pose.from === "portrait" ? 1 - mix : 0) + (pose.to === "portrait" ? mix : 0);
            wantedLook.x *= .12; wantedLook.y -= .10; zoom *= T.MathUtils.lerp(1.10, 1, portraitWeight);
          }
          host.dataset.scrollProgress = pose.progress.toFixed(4);
          host.dataset.shot = mix < .5 ? pose.from : pose.to;
          host.dataset.storyIndex = String(pose.index);
        } else if (domain) {
          const anchor = nodes[domain.node];
          if (anchor) { const center = new T.Box3().setFromObject(anchor).getCenter(new T.Vector3()); wantedLook.lerp(center, .54); }
          zoom = .82; angle += domain.angle;
        }
        angle = T.MathUtils.clamp(angle, -.72, .72);
        const distance = fitDistance * zoom;
        wantedCamera.set(wantedLook.x + Math.sin(angle) * distance, wantedLook.y + elevation * distance, wantedLook.z + Math.cos(angle) * distance);
        if (reduced.matches) { camera.position.copy(wantedCamera); look.copy(wantedLook); }
        else { camera.position.lerp(wantedCamera, ease * .65); look.lerp(wantedLook, ease * .65); }
        camera.lookAt(look);
        const silly = current.expression === 1; const wow = current.expression === 2; const grin = current.expression === 3;
        const gazeX = reduced.matches ? 0 : pointer.active ? pointer.x * .2 : silly ? -.12 : 0;
        const gazeY = reduced.matches ? 0 : pointer.active ? pointer.y * .12 : silly ? -.1 : 0;
        ["Left", "Right"].forEach((side, index) => {
          const eye = nodes[`Gaze${side}`]; const base = bases.get(`Gaze${side}`); if (!eye || !base) return;
          const independent = silly && !reduced.matches ? (index === 0 ? -.045 : .075) : (index === 0 ? 1 : .94);
          const x = T.MathUtils.clamp(silly && !reduced.matches ? gazeX + independent : gazeX * independent, -.15, .15);
          eye.rotation.y = T.MathUtils.lerp(eye.rotation.y, base.rotation.y + x, ease); eye.rotation.x = T.MathUtils.lerp(eye.rotation.x, base.rotation.x + gazeY, ease);
        });
        if (!reduced.matches && time >= nextBlink) { blinkStart = time; nextBlink = time + 3500 + Math.random() * 2500; }
        const age = time - blinkStart; const blink = !reduced.matches && age >= 0 && age < 180 ? Math.sin(age / 180 * Math.PI) : 0;
        ["Left", "Right"].forEach((side, index) => {
          const lid = nodes[`Lid${side}`]; if (!lid) return;
          const target = silly && index === 0 ? 1 : blink;
          lid.scale.y = T.MathUtils.lerp(lid.scale.y, Math.max(.001, target), silly ? ease : .85); lid.visible = lid.scale.y > .01;
          if (nodes[`WinkCrease${side}`]) nodes[`WinkCrease${side}`].visible = lid.scale.y > .8;
        });
        morphs.forEach(mesh => {
          for (const [name, active] of [["Surprise", wow], ["Grin", grin || silly]] as const) {
            const index = mesh.morphTargetDictionary?.[name]; if (index === undefined || !mesh.morphTargetInfluences) continue;
            mesh.morphTargetInfluences[index] = T.MathUtils.lerp(mesh.morphTargetInfluences[index], active ? 1 : 0, ease);
          }
        });
        if (nodes.MouthOpen) { nodes.MouthOpen.visible = silly || wow || grin; const base = bases.get("MouthOpen")!; nodes.MouthOpen.scale.copy(base.scale).multiply(new T.Vector3(wow ? .65 : 1, grin ? .72 : 1, 1)); }
        if (nodes.Tongue) nodes.Tongue.visible = silly;
        if (nodes.TeethUpper) nodes.TeethUpper.visible = silly || grin;
        const apple = nodes.Apple; const appleBase = bases.get("Apple");
        if (apple && appleBase) {
          const progress = Math.min((time - appleStart) / 850, 1); const lift = progress < 1 ? Math.sin(progress * Math.PI) : 0;
          apple.position.copy(appleBase.position); apple.rotation.copy(appleBase.rotation);
          if (!reduced.matches) { apple.position.y += lift * .65; apple.rotation.z += progress < 1 ? progress * Math.PI * 2 : 0; }
          const hand = nodes.HandLeft; const handBase = bases.get("HandLeft");
          if (hand && handBase) { hand.rotation.copy(handBase.rotation); if (!reduced.matches) { hand.rotation.z -= lift * .09; hand.rotation.x += lift * .055; } }
        }
        const breadProgress = Math.min((time - breadStart) / 480, 1);
        if (pendingBites && (breadProgress > .45 || reduced.matches)) { if (pendingBites % 2) bitten = !bitten; pendingBites = 0; host.dataset.bread = bitten ? "bitten" : "whole"; }
        ["BreadWhole", "BreadBitten"].forEach(name => {
          const bread = nodes[name]; const base = bases.get(name); if (!bread || !base) return;
          bread.visible = !silly && !wow && !grin && name === (bitten ? "BreadBitten" : "BreadWhole"); bread.position.copy(base.position); bread.rotation.copy(base.rotation);
          if (!reduced.matches && breadProgress < 1) { const bite = Math.sin(breadProgress * Math.PI); bread.position.y += bite * .12; bread.position.z -= bite * .1; bread.rotation.z += bite * .12; }
        });
        const flashing = time - flashStart < (reduced.matches ? 75 : 130);
        if (nodes.Flash) nodes.Flash.visible = flashing; flashLight.intensity = flashing && !reduced.matches ? 2 : 0;
        const phoneAge = Math.min((time - flashStart) / 420, 1);
        for (const name of ["Phone", "HandRight"]) {
          const object = nodes[name]; const base = bases.get(name); if (!object || !base) continue;
          object.rotation.copy(base.rotation); if (!reduced.matches && phoneAge < 1) object.rotation.z += Math.sin(phoneAge * Math.PI) * .035;
        }
        host.dataset.flash = String(nodes.Flash?.visible ?? false);
        host.dataset.appleY = (apple?.position.y ?? 0).toFixed(4);
        host.dataset.breadWholeVisible = String(nodes.BreadWhole?.visible ?? false);
        host.dataset.breadBittenVisible = String(nodes.BreadBitten?.visible ?? false);
        character.position.y = reduced.matches ? 0 : Math.sin(time * .0014) * .008;
        if (time - lastTelemetry > 100) {
          const gaze = (name: string, axis: "x" | "y") => (nodes[name]?.rotation[axis] ?? 0) - (bases.get(name)?.rotation[axis] ?? 0);
          host.dataset.gazeX = gaze("GazeLeft", "y").toFixed(4); host.dataset.gazeY = gaze("GazeLeft", "x").toFixed(4);
          host.dataset.gazeLeft = gaze("GazeLeft", "y").toFixed(4); host.dataset.gazeRight = gaze("GazeRight", "y").toFixed(4); host.dataset.viewYaw = pointer.yaw.toFixed(4);
          host.dataset.cameraX = camera.position.x.toFixed(4); host.dataset.cameraY = camera.position.y.toFixed(4); host.dataset.cameraZ = camera.position.z.toFixed(4);
          host.dataset.cameraTargetX = look.x.toFixed(4); host.dataset.cameraTargetY = look.y.toFixed(4); host.dataset.cameraTargetZ = look.z.toFixed(4); lastTelemetry = time;
          // Measure the actual loaded model after projecting through the current
          // Three camera; a viewport-sized canvas alone is not a large portrait.
          character.updateMatrixWorld(true); camera.updateMatrixWorld(true);
          const box = new T.Box3().setFromObject(character);
          let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
          for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
            const point = new T.Vector3(x, y, z).project(camera);
            minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x); minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
          }
          host.dataset.modelScreenWidth = ((maxX - minX) / 2 * host.clientWidth).toFixed(1);
          host.dataset.modelScreenHeight = ((maxY - minY) / 2 * host.clientHeight).toFixed(1);
          host.dataset.modelViewportWidth = (Math.max(0, Math.min(1, maxX) - Math.max(-1, minX)) / 2).toFixed(4);
          host.dataset.modelViewportHeight = (Math.max(0, Math.min(1, maxY) - Math.max(-1, minY)) / 2).toFixed(4);
        }
        render();
      };
      frame = requestAnimationFrame(animate);
    };
    start().catch(() => { cleanup(); /* The portrait and every content link remain usable. */ });
    return () => { disposed = true; cleanup(); };
  }, [onReady]);
  return <div className="world-scene" data-testid="avatar-scene" data-focus={props.focus} data-expression={avatarExpressions[props.expression]} ref={mount} aria-hidden="true" />;
}
