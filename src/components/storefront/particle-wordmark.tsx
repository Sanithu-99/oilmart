"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  velocityX: number;
  velocityY: number;
  phase: number;
  size: number;
  alpha: number;
  color: readonly [number, number, number];
};

type PointerState = {
  x: number;
  y: number;
  active: boolean;
  pressed: boolean;
  lastSeen: number;
};

const oilPalette = [
  [168, 57, 27],
  [217, 91, 28],
  [240, 139, 34],
  [248, 186, 58],
  [255, 222, 132],
] as const;

export function ParticleWordmark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const source = new Image();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let particles: Particle[] = [];
    let animationFrame = 0;
    let visible = false;
    let inViewport = false;
    let logicalWidth = 0;
    let logicalHeight = 0;
    let lastDrawTime = 0;
    let resizeFrame = 0;
    const pointer: PointerState = { x: 0, y: 0, active: false, pressed: false, lastSeen: 0 };

    const draw = (time = 0) => {
      if (!reducedMotion.matches && time - lastDrawTime < 26) {
        if (visible) animationFrame = window.requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = time;
      context.clearRect(0, 0, logicalWidth, logicalHeight);
      context.globalCompositeOperation = "lighter";

      if (pointer.active && time - pointer.lastSeen > 720) pointer.active = false;
      const waveCenter = reducedMotion.matches ? -1000 : (time * .045) % (logicalWidth + 220) - 110;
      for (const particle of particles) {
        if (reducedMotion.matches) {
          particle.x = particle.homeX;
          particle.y = particle.homeY;
        } else {
          const idleX = particle.homeX + Math.sin(time * .00075 + particle.phase) * .42;
          const idleY = particle.homeY + Math.cos(time * .00068 + particle.phase) * .32;
          particle.velocityX += (idleX - particle.x) * .032;
          particle.velocityY += (idleY - particle.y) * .032;

          if (pointer.active) {
            const offsetX = particle.x - pointer.x;
            const offsetY = particle.y - pointer.y;
            const distanceSquared = offsetX * offsetX + offsetY * offsetY;
            const radius = pointer.pressed ? 112 : 82;
            if (distanceSquared > .01 && distanceSquared < radius * radius) {
              const distance = Math.sqrt(distanceSquared);
              const force = (1 - distance / radius) * (pointer.pressed ? 2.7 : 1.35);
              particle.velocityX += offsetX / distance * force;
              particle.velocityY += offsetY / distance * force;
            }
          }

          particle.velocityX *= .86;
          particle.velocityY *= .86;
          particle.x += particle.velocityX;
          particle.y += particle.velocityY;
        }

        const distanceFromWave = Math.abs(particle.homeX - waveCenter);
        const wave = distanceFromWave < 86 ? Math.sin((86 - distanceFromWave) / 86 * Math.PI) : 0;
        const shimmer = reducedMotion.matches ? 1 : .78 + Math.sin(time * .0017 + particle.phase) * .13 + wave * .28;
        const [red, green, blue] = particle.color;

        context.beginPath();
        context.fillStyle = `rgb(${red} ${green} ${blue} / ${Math.min(1, particle.alpha * shimmer)})`;
        context.arc(particle.x, particle.y, particle.size + wave * .38, 0, Math.PI * 2);
        context.fill();
      }
      context.globalCompositeOperation = "source-over";

      if (visible && !reducedMotion.matches) animationFrame = window.requestAnimationFrame(draw);
    };

    const rebuild = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height || !source.complete || !source.naturalWidth) return;

      logicalWidth = Math.round(bounds.width);
      logicalHeight = Math.round(bounds.height);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, logicalWidth < 520 ? 1.5 : 1.75);
      canvas.width = Math.round(logicalWidth * pixelRatio);
      canvas.height = Math.round(logicalHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const mask = document.createElement("canvas");
      mask.width = logicalWidth;
      mask.height = logicalHeight;
      const maskContext = mask.getContext("2d", { willReadFrequently: true });
      if (!maskContext) return;
      maskContext.drawImage(source, 0, 0, logicalWidth, logicalHeight);
      const pixels = maskContext.getImageData(0, 0, logicalWidth, logicalHeight).data;
      const step = logicalWidth < 520 ? 3 : 4;
      const nextParticles: Particle[] = [];

      for (let y = 0; y < logicalHeight; y += step) {
        for (let x = 0; x < logicalWidth; x += step) {
          const maskAlpha = pixels[(y * logicalWidth + x) * 4 + 3];
          if (maskAlpha < 72) continue;
          const seed = (x * 13 + y * 7) % 101;
          const homeX = x + (seed % 3) - 1;
          const homeY = y + ((seed * 3) % 3) - 1;
          const colorPosition = Math.min(oilPalette.length - 1, Math.floor(((x / Math.max(1, logicalWidth)) * .64 + (y / Math.max(1, logicalHeight)) * .36) * oilPalette.length));
          nextParticles.push({
            x: reducedMotion.matches ? homeX : homeX + ((seed % 17) - 8) * 1.4,
            y: reducedMotion.matches ? homeY : homeY + (((seed * 5) % 17) - 8) * 1.1,
            homeX,
            homeY,
            velocityX: 0,
            velocityY: 0,
            phase: seed * .27,
            size: seed % 11 === 0 ? 1.85 : .92 + (seed % 5) * .11,
            alpha: (.62 + (seed % 31) / 100) * (maskAlpha / 255),
            color: oilPalette[colorPosition],
          });
        }
      }

      particles = nextParticles;
      draw(performance.now());
    };

    source.addEventListener("load", rebuild);
    source.src = "/images/storefront/footer-wordmark-mask.svg";

    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(rebuild);
    });
    resizeObserver.observe(canvas);

    const updatePointer = (event: PointerEvent) => {
      if (reducedMotion.matches) return;
      const bounds = canvas.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active = true;
      pointer.pressed = event.buttons > 0 || event.pointerType === "touch";
      pointer.lastSeen = performance.now();
    };
    const releasePointer = () => {
      pointer.pressed = false;
      pointer.lastSeen = performance.now();
    };
    const leavePointer = () => {
      pointer.active = false;
      pointer.pressed = false;
    };
    canvas.addEventListener("pointerdown", updatePointer, { passive: true });
    canvas.addEventListener("pointermove", updatePointer, { passive: true });
    canvas.addEventListener("pointerup", releasePointer, { passive: true });
    canvas.addEventListener("pointercancel", leavePointer, { passive: true });
    canvas.addEventListener("pointerleave", leavePointer, { passive: true });

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      visible = inViewport && document.visibilityState === "visible";
      window.cancelAnimationFrame(animationFrame);
      if (visible) animationFrame = window.requestAnimationFrame(draw);
    }, { rootMargin: "160px 0px", threshold: .01 });
    intersectionObserver.observe(canvas);

    const onVisibilityChange = () => {
      visible = inViewport && document.visibilityState === "visible";
      window.cancelAnimationFrame(animationFrame);
      if (visible) animationFrame = window.requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onMotionChange = () => {
      window.cancelAnimationFrame(animationFrame);
      draw(performance.now());
      if (visible && !reducedMotion.matches) animationFrame = window.requestAnimationFrame(draw);
    };
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      source.removeEventListener("load", rebuild);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionChange);
      canvas.removeEventListener("pointerdown", updatePointer);
      canvas.removeEventListener("pointermove", updatePointer);
      canvas.removeEventListener("pointerup", releasePointer);
      canvas.removeEventListener("pointercancel", leavePointer);
      canvas.removeEventListener("pointerleave", leavePointer);
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(resizeFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="footer-particle-wordmark" aria-hidden="true"/>;
}
