import Link from "next/link";

export default function ProductNotFound() { return <div className="site-container py-28 text-center"><p className="eyebrow">404</p><h1 className="mt-3 font-display text-5xl">Product not found</h1><p className="mt-4 text-muted-foreground">This product is unavailable or no longer published.</p><Link className="button-primary mt-8" href="/en/products">Browse products</Link></div>; }
