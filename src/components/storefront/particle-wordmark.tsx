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
  outline: boolean;
};

type PointerState = {
  x: number;
  y: number;
  active: boolean;
  pressed: boolean;
  lastSeen: number;
};

const oilPalette = [
  [194, 67, 29],
  [230, 99, 29],
  [247, 143, 34],
  [255, 194, 67],
  [255, 232, 158],
] as const;

function drawVideoCover(context: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  if (!videoWidth || !videoHeight || !width || !height) return;

  const videoRatio = videoWidth / videoHeight;
  const destinationRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = videoWidth;
  let sourceHeight = videoHeight;

  if (videoRatio > destinationRatio) {
    sourceWidth = videoHeight * destinationRatio;
    sourceX = (videoWidth - sourceWidth) / 2;
  } else {
    sourceHeight = videoWidth / destinationRatio;
    sourceY = (videoHeight - sourceHeight) / 2;
  }

  context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
}

export function ParticleWordmark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textureVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const textureVideo = textureVideoRef.current;
    if (!canvas || !textureVideo) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const source = new Image();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let particles: Particle[] = [];
    let animationFrame = 0;
    let visible = false;
    let inViewport = false;
    let textureRequested = false;
    let logicalWidth = 0;
    let logicalHeight = 0;
    let lastDrawTime = 0;
    let resizeFrame = 0;
    const pointer: PointerState = { x: 0, y: 0, active: false, pressed: false, lastSeen: 0 };

    const requestTexture = () => {
      if (textureRequested || reducedMotion.matches) return;
      textureVideo.src = textureVideo.dataset.src ?? "";
      textureVideo.load();
      textureRequested = true;
    };

    const syncTexturePlayback = () => {
      if (visible && !reducedMotion.matches) {
        requestTexture();
        void textureVideo.play().catch(() => undefined);
      } else {
        textureVideo.pause();
      }
    };

    const drawParticle = (particle: Particle, size: number) => {
      context.beginPath();
      context.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      context.fill();
    };

    const draw = (time = 0) => {
      const minimumFrameTime = logicalWidth < 520 ? 36 : 29;
      if (!reducedMotion.matches && time - lastDrawTime < minimumFrameTime) {
        if (visible) animationFrame = window.requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = time;
      context.clearRect(0, 0, logicalWidth, logicalHeight);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.filter = "none";

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
      }

      const textureReady = !reducedMotion.matches && textureVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && textureVideo.videoWidth > 0;

      if (textureReady) {
        context.fillStyle = "white";
        for (const particle of particles) {
          const distanceFromWave = Math.abs(particle.homeX - waveCenter);
          const wave = distanceFromWave < 86 ? Math.sin((86 - distanceFromWave) / 86 * Math.PI) : 0;
          const shimmer = .84 + Math.sin(time * .0017 + particle.phase) * .1 + wave * .2;
          context.globalAlpha = Math.min(1, particle.alpha * shimmer);
          drawParticle(particle, particle.size + wave * .34);
        }

        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-in";
        context.filter = "brightness(1.62) saturate(1.3) contrast(1.06)";
        drawVideoCover(context, textureVideo, logicalWidth, logicalHeight);
        context.filter = "none";
        context.globalCompositeOperation = "lighter";
        context.fillStyle = "rgb(255 218 143)";

        for (const particle of particles) {
          const shimmer = .8 + Math.sin(time * .0014 + particle.phase) * .1;
          context.globalAlpha = Math.min(.24, particle.alpha * shimmer * .2);
          drawParticle(particle, particle.size * .82);
        }
      } else {
        context.globalCompositeOperation = "lighter";
        for (const particle of particles) {
          const distanceFromWave = Math.abs(particle.homeX - waveCenter);
          const wave = distanceFromWave < 86 ? Math.sin((86 - distanceFromWave) / 86 * Math.PI) : 0;
          const shimmer = reducedMotion.matches ? 1 : .86 + Math.sin(time * .0017 + particle.phase) * .1 + wave * .24;
          const [red, green, blue] = particle.color;
          context.fillStyle = `rgb(${red} ${green} ${blue})`;
          context.globalAlpha = Math.min(1, particle.alpha * shimmer);
          drawParticle(particle, particle.size + wave * .34);
        }
      }

      context.globalCompositeOperation = "source-over";
      context.fillStyle = "rgb(255 255 255)";
      for (const particle of particles) {
        if (!particle.outline) continue;
        const outlinePulse = reducedMotion.matches ? 1 : .92 + Math.sin(time * .0012 + particle.phase) * .08;
        context.globalAlpha = Math.min(.96, (.82 + particle.alpha * .14) * outlinePulse);
        drawParticle(particle, particle.size + .32);
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.filter = "none";

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
      const edgeRadius = Math.max(2, Math.round(step * 1.35));
      const nextParticles: Particle[] = [];
      const alphaAt = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= logicalWidth || y >= logicalHeight) return 0;
        return pixels[(Math.round(y) * logicalWidth + Math.round(x)) * 4 + 3];
      };

      for (let y = 0; y < logicalHeight; y += step) {
        for (let x = 0; x < logicalWidth; x += step) {
          const maskAlpha = alphaAt(x, y);
          if (maskAlpha < 72) continue;
          const seed = (x * 13 + y * 7) % 101;
          const homeX = x + (seed % 3) - 1;
          const homeY = y + ((seed * 3) % 3) - 1;
          const colorPosition = Math.min(oilPalette.length - 1, Math.floor(((x / Math.max(1, logicalWidth)) * .64 + (y / Math.max(1, logicalHeight)) * .36) * oilPalette.length));
          const outline = [
            [-edgeRadius, 0], [edgeRadius, 0], [0, -edgeRadius], [0, edgeRadius],
            [-edgeRadius, -edgeRadius], [edgeRadius, -edgeRadius], [-edgeRadius, edgeRadius], [edgeRadius, edgeRadius],
          ].some(([offsetX, offsetY]) => alphaAt(x + offsetX, y + offsetY) < 72);

          nextParticles.push({
            x: reducedMotion.matches ? homeX : homeX + ((seed % 17) - 8) * 1.4,
            y: reducedMotion.matches ? homeY : homeY + (((seed * 5) % 17) - 8) * 1.1,
            homeX,
            homeY,
            velocityX: 0,
            velocityY: 0,
            phase: seed * .27,
            size: seed % 11 === 0 ? 1.85 : .92 + (seed % 5) * .11,
            alpha: (.68 + (seed % 29) / 100) * (maskAlpha / 255),
            color: oilPalette[colorPosition],
            outline,
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
      syncTexturePlayback();
      window.cancelAnimationFrame(animationFrame);
      if (visible) animationFrame = window.requestAnimationFrame(draw);
    }, { rootMargin: "160px 0px", threshold: .01 });
    intersectionObserver.observe(canvas);

    const onVisibilityChange = () => {
      visible = inViewport && document.visibilityState === "visible";
      syncTexturePlayback();
      window.cancelAnimationFrame(animationFrame);
      if (visible) animationFrame = window.requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onMotionChange = () => {
      syncTexturePlayback();
      window.cancelAnimationFrame(animationFrame);
      draw(performance.now());
      if (visible && !reducedMotion.matches) animationFrame = window.requestAnimationFrame(draw);
    };
    reducedMotion.addEventListener("change", onMotionChange);

    const onTextureReady = () => draw(performance.now());
    textureVideo.addEventListener("loadeddata", onTextureReady);

    return () => {
      source.removeEventListener("load", rebuild);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionChange);
      textureVideo.removeEventListener("loadeddata", onTextureReady);
      textureVideo.pause();
      textureVideo.removeAttribute("src");
      textureVideo.load();
      canvas.removeEventListener("pointerdown", updatePointer);
      canvas.removeEventListener("pointermove", updatePointer);
      canvas.removeEventListener("pointerup", releasePointer);
      canvas.removeEventListener("pointercancel", leavePointer);
      canvas.removeEventListener("pointerleave", leavePointer);
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(resizeFrame);
    };
  }, []);

  return <>
    <video
      ref={textureVideoRef}
      className="footer-particle-texture-source"
      data-src="/videos/footer-oil-flow.mp4"
      muted
      loop
      playsInline
      preload="none"
      tabIndex={-1}
      aria-hidden="true"
    />
    <canvas ref={canvasRef} className="footer-particle-wordmark" aria-hidden="true"/>
  </>;
}
