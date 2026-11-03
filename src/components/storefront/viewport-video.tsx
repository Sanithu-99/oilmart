"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ViewportVideoProps = {
  src: string;
  poster: string;
  className?: string;
  controls?: boolean;
  playbackRate?: number;
};

export function ViewportVideo({ src, poster, className, controls = false, playbackRate = 1 }: ViewportVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);
  const loadedRef = useRef(false);
  const manuallyPausedRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const source = sourceRef.current;
    if (!video || !source || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.defaultPlaybackRate = playbackRate;
    video.playbackRate = playbackRate;

    const loadVideo = () => {
      if (loadedRef.current) return;
      source.src = source.dataset.src ?? "";
      video.load();
      loadedRef.current = true;
    };

    const playVideo = () => {
      if (manuallyPausedRef.current) return;
      loadVideo();
      void video.play().catch(() => setPlaying(false));
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
  }, [playbackRate]);

  function togglePlayback() {
    const video = videoRef.current;
    const source = sourceRef.current;
    if (!video || !source) return;

    if (!loadedRef.current) {
      source.src = source.dataset.src ?? "";
      video.load();
      loadedRef.current = true;
    }

    if (video.paused) {
      manuallyPausedRef.current = false;
      void video.play();
    } else {
      manuallyPausedRef.current = true;
      video.pause();
    }
  }

  return <>
    <video
      ref={videoRef}
      className={className}
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      tabIndex={-1}
      aria-hidden="true"
      onLoadedMetadata={(event) => { event.currentTarget.defaultPlaybackRate = playbackRate; event.currentTarget.playbackRate = playbackRate; }}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
    >
      <source ref={sourceRef} data-src={src} type="video/mp4"/>
    </video>
    {controls && <button className="viewport-video-control" type="button" onClick={togglePlayback} aria-label={playing ? "Pause background video" : "Play background video"}>
      {playing ? <Pause size={13}/> : <Play size={13}/>}<span>{playing ? "Pause" : "Play"}</span>
    </button>}
  </>;
}
