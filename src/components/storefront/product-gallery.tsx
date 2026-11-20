"use client";

import Image from "next/image";
import { useState } from "react";

type GalleryImage = {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
};

export function ProductGallery({ images, fallbackLogo, fallbackName }: { images: GalleryImage[]; fallbackLogo?: string | null; fallbackName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, Math.max(0, images.length - 1));
  const activeImage = images[safeIndex];

  return <div className="product-gallery" aria-label={`${fallbackName} product photos`}>
    <div className="product-gallery-main group">
      {activeImage
        ? <Image src={activeImage.url} alt={activeImage.alt} fill loading="eager" fetchPriority="high" sizes="(max-width: 1024px) 100vw, 55vw" unoptimized className="product-gallery-active-image"/>
        : <div className="product-brand-fallback product-brand-fallback-detail">{fallbackLogo ? <Image src={fallbackLogo} alt={`${fallbackName} logo`} fill sizes="(max-width: 1024px) 70vw, 36vw" unoptimized className="product-brand-fallback-logo"/> : <span>{fallbackName}</span>}</div>}
      {images.length > 1 && <span className="product-gallery-counter" aria-live="polite">{safeIndex + 1} / {images.length}</span>}
    </div>
    {images.length > 1 && <div className="product-gallery-thumbnails" role="group" aria-label="Choose a product photo">{images.map((image, index) => <button key={`${image.url}-${index}`} type="button" className={index === safeIndex ? "is-active" : ""} onClick={() => setActiveIndex(index)} aria-label={`Show image ${index + 1}: ${image.alt}`} aria-pressed={index === safeIndex}><Image src={image.url} alt="" width={112} height={88} unoptimized/></button>)}</div>}
  </div>;
}
