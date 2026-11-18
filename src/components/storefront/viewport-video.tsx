"use client";

import { useEffect, useRef } from "react";

type ViewportVideoProps = {
  src: string;
  poster: string;
  className?: string;
  playbackRate?: number;
  introPlaybackRate?: number;
  introDuration?: number;
};

function resolvePlaybackRate(currentTime: number, playbackRate: number, introPlaybackRate: number, introDuration: number) {
  if (introDuration <= 0 || introPlaybackRate === playbackRate || currentTime >= introDuration) return playbackRate;
  const progress = Math.max(0, Math.min(1, currentTime / introDuration));
  const easedProgress = progress * progress * (3 - 2 * progress);
  return introPlaybackRate + (playbackRate - introPlaybackRate) * easedProgress;
}

export function ViewportVideo({
  src,
  poster,
  className,
  playbackRate = 1,
  introPlaybackRate = playbackRate,
  introDuration = 0,
}: ViewportVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    const source = sourceRef.current;
    if (!video || !source || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.defaultPlaybackRate = playbackRate;
    video.playbackRate = resolvePlaybackRate(video.currentTime, playbackRate, introPlaybackRate, introDuration);

    const loadVideo = () => {
      if (loadedRef.current) return;
      source.src = source.dataset.src ?? "";
      video.load();
      loadedRef.current = true;
    };

    const playVideo = () => {
      loadVideo();
      void video.play().catch(() => undefined);
    };

    if (!("IntersectionObserver" in window)) {
      playVideo();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries[0]?.isIntersecting ?? false;
      if (visible) playVideo();
      else video.pause();
    }, { rootMargin: "300px 0px", threshold: 0.01 });

    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [introDuration, introPlaybackRate, playbackRate]);

  return <video
      ref={videoRef}
      className={className}
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      tabIndex={-1}
      aria-hidden="true"
      onLoadedMetadata={(event) => {
        event.currentTarget.defaultPlaybackRate = playbackRate;
        event.currentTarget.playbackRate = resolvePlaybackRate(event.currentTarget.currentTime, playbackRate, introPlaybackRate, introDuration);
      }}
      onTimeUpdate={(event) => {
        event.currentTarget.playbackRate = resolvePlaybackRate(event.currentTarget.currentTime, playbackRate, introPlaybackRate, introDuration);
      }}
    >
      <source ref={sourceRef} data-src={src} type="video/mp4"/>
    </video>;
}
