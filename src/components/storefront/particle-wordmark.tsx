"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  phase: number;
  size: number;
  alpha: number;
};

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
    let logicalWidth = 0;
    let logicalHeight = 0;
    let lastDrawTime = 0;

    const draw = (time = 0) => {
      if (!reducedMotion.matches && time - lastDrawTime < 30) {
        if (visible) animationFrame = window.requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = time;
      context.clearRect(0, 0, logicalWidth, logicalHeight);
      context.globalCompositeOperation = "screen";

      const waveCenter = reducedMotion.matches ? -1000 : (time * 0.065) % (logicalWidth + 180) - 90;
      for (const particle of particles) {
        const distance = Math.abs(particle.x - waveCenter);
        const wave = distance < 74 ? Math.sin((74 - distance) / 74 * Math.PI) : 0;
        const driftX = reducedMotion.matches ? 0 : Math.sin(time * 0.0012 + particle.phase) * 1.2 + wave * Math.sin(particle.phase) * 9;
        const driftY = reducedMotion.matches ? 0 : Math.cos(time * 0.001 + particle.phase) * .85 - wave * 6;
        const shimmer = reducedMotion.matches ? 1 : .82 + Math.sin(time * 0.0018 + particle.phase) * .18;

        context.beginPath();
        context.fillStyle = `rgb(255 229 167 / ${particle.alpha * shimmer})`;
        context.arc(particle.x + driftX, particle.y + driftY, particle.size + wave * .55, 0, Math.PI * 2);
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
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
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
      const step = logicalWidth < 520 ? 4 : 5;
      const nextParticles: Particle[] = [];

      for (let y = 0; y < logicalHeight; y += step) {
        for (let x = 0; x < logicalWidth; x += step) {
          if (pixels[(y * logicalWidth + x) * 4 + 3] < 96) continue;
          const seed = (x * 13 + y * 7) % 101;
          if (seed % 5 === 0) continue;
          nextParticles.push({
            x: x + (seed % 3) - 1,
            y: y + ((seed * 3) % 3) - 1,
            phase: seed * .27,
            size: seed % 7 === 0 ? 1.35 : .75,
            alpha: .42 + (seed % 43) / 100,
          });
        }
      }

      particles = nextParticles;
      draw(performance.now());
    };

    source.addEventListener("load", rebuild);
    source.src = "/images/storefront/footer-wordmark-mask.svg";

    const resizeObserver = new ResizeObserver(rebuild);
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      window.cancelAnimationFrame(animationFrame);
      if (visible) animationFrame = window.requestAnimationFrame(draw);
    }, { rootMargin: "160px 0px", threshold: .01 });
    intersectionObserver.observe(canvas);

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
      reducedMotion.removeEventListener("change", onMotionChange);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="footer-particle-wordmark" aria-hidden="true"/>;
}
