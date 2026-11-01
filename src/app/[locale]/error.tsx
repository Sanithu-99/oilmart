"use client";

export default function StorefrontError({ reset }: { reset(): void }) { return <div className="site-container py-28 text-center"><p className="eyebrow">Something went wrong</p><h1 className="mt-3 font-display text-5xl">We couldn’t load this page.</h1><p className="mt-4 text-muted-foreground">Please try again. Your cart has not been changed.</p><button className="button-primary mt-8" onClick={reset}>Try again</button></div>; }
