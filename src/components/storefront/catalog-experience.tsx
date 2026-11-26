"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  MessageCircle,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
  Zap,
} from "lucide-react";

import type { ClientCatalogBrand, ClientCatalogProduct } from "@/features/catalog/queries";
import { commerceCopy } from "@/lib/i18n/commerce";
import { getBrandLogoPath } from "@/lib/catalog/brand-logos";
import { storeConfig } from "@/lib/config/store";
import { inquiryListWhatsAppUrl, oilMatchWhatsAppUrl, productConfirmationWhatsAppUrl } from "@/lib/contact/whatsapp";
import type { StoreLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { AddToCart } from "./add-to-cart";
import { ViewportVideo } from "./viewport-video";

type InitialFilters = {
  q?: string;
  brand?: string;
  category?: string;
  grade?: string;
  availability?: string;
  section?: string;
};

type CatalogExperienceProps = {
  products: ClientCatalogProduct[];
  brands: ClientCatalogBrand[];
  locale: StoreLocale;
  dictionary: Dictionary;
  initialFilters?: InitialFilters;
  showHero?: boolean;
  syncUrl?: boolean;
};

const groups = [
  { id: "all", label: "All" },
  { id: "engine", label: "Engine Oil" },
  { id: "motorcycle", label: "Motorcycle 4T" },
  { id: "diesel", label: "Diesel Heavy" },
  { id: "transmission", label: "Transmission & Gear" },
  { id: "loose", label: "Loose Oils" },
] as const;

const spotlightCategories = [
  {
    id: "engine",
    title: "Engine Oils",
    eyebrow: "Passenger & petrol",
    description: "Everyday protection for cars, hybrids and light vehicles.",
    image: "/images/storefront/categories/havoline-prods-eco.jpg",
  },
  {
    id: "motorcycle",
    title: "Motorcycle 4T",
    eyebrow: "Two wheels",
    description: "Smooth clutch feel and reliable protection for daily rides.",
    image: "/images/storefront/categories/servo-4t-xtra.png",
  },
  {
    id: "diesel",
    title: "Diesel Heavy",
    eyebrow: "Vans, lorries & fleets",
    description: "Heavy-duty oils selected for work vehicles and commercial use.",
    image: "/images/storefront/categories/castrol-crb-turbomax.png",
  },
  {
    id: "transmission",
    title: "Transmission & Gear",
    eyebrow: "ATF, CVT & manual",
    description: "Fluids for smooth shifts, differentials and gear systems.",
    image: "/images/storefront/categories/castrol-transmax.png",
  },
  {
    id: "loose",
    title: "Loose Oils",
    eyebrow: "Workshop quantities",
    description: "Practical quantities for mechanics, workshops and regular servicing.",
    image: "/images/storefront/categories/shell-spirax-s2g.jpg",
  },
] as const;

const groupCategories: Record<string, string[]> = {
  engine: ["engine-oils"],
  motorcycle: ["motorcycle-oils"],
  diesel: ["diesel-engine-oils"],
  transmission: ["transmission-fluids", "gear-oils"],
  loose: ["loose-oils"],
};

const labels = {
  en: {
    eyebrow: "Oil matched to the way Sri Lanka drives",
    title: "The right oil",
    titleAccent: "for every drive.",
    body: "Find the right grade, see current availability, and order directly from our Dehiwala team.",
    shopStock: "Find your oil",
    askWhatsApp: "Chat with us",
    catalogueProducts: "catalogue products",
    catalogueBrands: "trusted brands",
    status: "Open Today · Hill St, Dehiwala",
    directions: "1-Tap Directions",
    selector: "Quick Oil Selector",
    selectorHint: "Match by vehicle and grade in seconds.",
    selectorAction: "Show {count} products",
    vehicle: "Vehicle Type",
    grade: "Preferred Viscosity / Grade",
    anyGrade: "Any grade",
    brands: "Shop trusted brands",
    brandBody: "Live SKU counts update with the current catalogue.",
    search: "Search product, brand or grade",
    results: "products ready to browse",
    reset: "Clear all",
    allBrands: "All brands",
    inStock: "In stock only",
    anyStock: "All stock",
    newest: "Recommended",
    priceLow: "Price: low to high",
    priceHigh: "Price: high to low",
    empty: "No products match these filters. Try another grade or clear the filters.",
    more: "Show more products",
    quote: "Add to Quick Quote",
    quoted: "Added to Quick Quote",
    whatsapp: "Inquire via WhatsApp",
    request: "Price on Request · Live Stock Available",
    requestUnavailable: "Price on Request · Confirm Stock",
    from: "From",
    trustPickup: "Instant Store Pickup",
    trustPickupBody: "70/5B. Dhammalankara Mawatha, Hill St, Dehiwala-Mount Lavinia 10350, Sri Lanka",
    trustDelivery: "Islandwide Delivery",
    trustDeliveryBody: "Courier dispatch within 24–48 hours after confirmation",
    trustGenuine: "Genuine Product Assurance",
    trustGenuineBody: "Established supplier stock across 28 catalogue brands",
    trayTitle: "Quick Quote",
    trayHint: "Choose 3–5 items for one combined WhatsApp inquiry.",
    traySend: "Send combined list",
    trayMinimum: "Add {count} more",
    performanceKicker: "Protection under pressure",
    performanceTitle: "The right oil keeps hard-working engines moving.",
    performanceBody: "From daily Dehiwala traffic to demanding workshop and fleet use, match the grade to the engine and confirm today's live stock with our team.",
    performanceCta: "Ask us to match your oil",
    performanceProof: "Daily drivers · workshops · fleets",
    spotlightEyebrow: "Start with what you drive",
    spotlightTitle: "What are you protecting?",
    spotlightBody: "Choose a category to jump directly into matching products without searching through the full catalogue.",
    spotlightExplore: "Explore category",
  },
  si: {
    eyebrow: "ස්වාධීන ලිහිසි තෙල් විශේෂඥයින් · දෙහිවල",
    title: "නිවැරදි තෙල්.",
    titleAccent: "දැන්ම.",
    body: "වාහන වර්ගය, ශ්‍රේණිය හෝ වෙළඳ නාමය අනුව තෙල් සොයා අද තොගය දෙහිවල කණ්ඩායමෙන් තහවුරු කරගන්න.",
    shopStock: "සජීවී තොගය බලන්න",
    askWhatsApp: "WhatsApp හරහා අසන්න",
    catalogueProducts: "නාමාවලි නිෂ්පාදන",
    catalogueBrands: "විශ්වාසනීය වෙළඳ නාම",
    status: "අද විවෘතයි · හිල් වීදිය, දෙහිවල",
    directions: "මාර්ගය බලන්න",
    selector: "ඉක්මන් තෙල් තේරීම",
    selectorHint: "වාහනය සහ ශ්‍රේණිය අනුව තත්පර කිහිපයකින් තෝරන්න.",
    selectorAction: "නිෂ්පාදන {count} බලන්න",
    vehicle: "වාහන වර්ගය",
    grade: "කැමති ශ්‍රේණිය",
    anyGrade: "ඕනෑම ශ්‍රේණියක්",
    brands: "විශ්වාසනීය වෙළඳ නාම",
    brandBody: "වර්තමාන නාමාවලිය සමඟ භාණ්ඩ ගණන යාවත්කාලීන වේ.",
    search: "නිෂ්පාදනය, වෙළඳ නාමය හෝ ශ්‍රේණිය සොයන්න",
    results: "නිෂ්පාදන",
    reset: "සියල්ල ඉවත් කරන්න",
    allBrands: "සියලු වෙළඳ නාම",
    inStock: "තොගයේ ඇති දේ පමණි",
    anyStock: "සියලු තොග",
    newest: "නිර්දේශිත",
    priceLow: "මිල: අඩු සිට වැඩි",
    priceHigh: "මිල: වැඩි සිට අඩු",
    empty: "මෙම පෙරහන්වලට ගැළපෙන නිෂ්පාදන නැත.",
    more: "තවත් නිෂ්පාදන",
    quote: "මිල ගණනට එක් කරන්න",
    quoted: "මිල ගණනට එක් කළා",
    whatsapp: "WhatsApp හරහා විමසන්න",
    request: "මිල ඉල්ලීම මත · තොගයේ ඇත",
    requestUnavailable: "මිල ඉල්ලීම මත · තොගය තහවුරු කරන්න",
    from: "සිට",
    trustPickup: "ඉක්මන් වෙළඳසැල් ලබාගැනීම",
    trustPickupBody: "70/5B, ධම්මාලංකාර මාවත, හිල් වීදිය, දෙහිවල",
    trustDelivery: "දිවයින පුරා බෙදාහැරීම",
    trustDeliveryBody: "තහවුරු කිරීමෙන් පසු පැය 24–48 තුළ කුරියර් යැවීම",
    trustGenuine: "ගුණාත්මකභාවය තහවුරුයි",
    trustGenuineBody: "නාමාවලියේ වෙළඳ නාම 28 සඳහා පිළිගත් සැපයුම් තොග",
    trayTitle: "ඉක්මන් මිල ගණන",
    trayHint: "එක් WhatsApp විමසීමකට භාණ්ඩ 3–5 තෝරන්න.",
    traySend: "ලැයිස්තුව යවන්න",
    trayMinimum: "තවත් {count} එක් කරන්න",
    performanceKicker: "පීඩනය යටතේ ආරක්ෂාව",
    performanceTitle: "නිවැරදි තෙල් දැඩිව ක්‍රියා කරන එන්ජින් ඉදිරියට ගෙන යයි.",
    performanceBody: "දෛනික දෙහිවල ගමනාගමනයේ සිට වැඩපොළ සහ වාහන සමූහ භාවිතය දක්වා, නිවැරදි ශ්‍රේණිය තෝරා අද තොගය අපගේ කණ්ඩායමෙන් තහවුරු කරගන්න.",
    performanceCta: "නිවැරදි තෙල් තෝරාගැනීමට අසන්න",
    performanceProof: "දෛනික රියදුරන් · වැඩපොළ · වාහන සමූහ",
    spotlightEyebrow: "ඔබ ධාවනය කරන වාහනයෙන් ආරම්භ කරන්න",
    spotlightTitle: "ඔබ ආරක්ෂා කරන්නේ කුමක්ද?",
    spotlightBody: "සම්පූර්ණ නාමාවලිය පිරික්සීමකින් තොරව ගැළපෙන නිෂ්පාදන වෙත යාමට කාණ්ඩයක් තෝරන්න.",
    spotlightExplore: "කාණ්ඩය බලන්න",
  },
  ta: {
    eyebrow: "சுயாதீன மசகு எண்ணெய் நிபுணர்கள் · தெஹிவளை",
    title: "சரியான எண்ணெய்.",
    titleAccent: "இப்போதே.",
    body: "வாகன வகை, தரம் அல்லது பிராண்ட் மூலம் எண்ணெயைக் கண்டறிந்து இன்றைய இருப்பை தெஹிவளை குழுவிடம் உறுதிப்படுத்துங்கள்.",
    shopStock: "நேரடி இருப்பைப் பார்க்க",
    askWhatsApp: "WhatsApp-ல் கேளுங்கள்",
    catalogueProducts: "பட்டியல் தயாரிப்புகள்",
    catalogueBrands: "நம்பகமான பிராண்டுகள்",
    status: "இன்று திறந்திருக்கும் · ஹில் ஸ்ட்ரீட், தெஹிவளை",
    directions: "வழியைப் பார்க்க",
    selector: "விரைவு எண்ணெய் தேர்வு",
    selectorHint: "வாகனம் மற்றும் தரத்தின் மூலம் சில வினாடிகளில் பொருத்துங்கள்.",
    selectorAction: "{count} தயாரிப்புகளைப் பார்க்க",
    vehicle: "வாகன வகை",
    grade: "விருப்ப பிசுபிசுப்பு / தரம்",
    anyGrade: "எந்த தரமும்",
    brands: "நம்பகமான பிராண்டுகள்",
    brandBody: "தற்போதைய பட்டியலுடன் தயாரிப்பு எண்ணிக்கை புதுப்பிக்கப்படும்.",
    search: "தயாரிப்பு, பிராண்ட் அல்லது தரத்தைத் தேடுங்கள்",
    results: "தயாரிப்புகள்",
    reset: "அனைத்தையும் அழி",
    allBrands: "அனைத்து பிராண்டுகள்",
    inStock: "இருப்பில் உள்ளவை மட்டும்",
    anyStock: "அனைத்து இருப்பும்",
    newest: "பரிந்துரைக்கப்பட்டவை",
    priceLow: "விலை: குறைவு முதல் அதிகம்",
    priceHigh: "விலை: அதிகம் முதல் குறைவு",
    empty: "இந்த வடிகட்டிகளுக்கு தயாரிப்புகள் இல்லை.",
    more: "மேலும் தயாரிப்புகள்",
    quote: "விலைப்பட்டியலில் சேர்",
    quoted: "விலைப்பட்டியலில் சேர்க்கப்பட்டது",
    whatsapp: "WhatsApp மூலம் விசாரிக்கவும்",
    request: "விலை கோரிக்கையின் பேரில் · இருப்பு உள்ளது",
    requestUnavailable: "விலை கோரிக்கையின் பேரில் · இருப்பை உறுதிசெய்யவும்",
    from: "முதல்",
    trustPickup: "உடனடி கடை பெறுதல்",
    trustPickupBody: "70/5B, தம்மாலங்கார மாவத்தை, ஹில் ஸ்ட்ரீட், தெஹிவளை",
    trustDelivery: "இலங்கை முழுவதும் விநியோகம்",
    trustDeliveryBody: "உறுதிப்படுத்திய பின் 24–48 மணி நேரத்தில் கூரியர் அனுப்புதல்",
    trustGenuine: "அசல் தயாரிப்பு உறுதி",
    trustGenuineBody: "28 பட்டியல் பிராண்டுகளுக்கான நிறுவப்பட்ட விநியோக இருப்பு",
    trayTitle: "விரைவு விலைப்பட்டியல்",
    trayHint: "ஒரே WhatsApp விசாரணைக்கு 3–5 பொருட்களைத் தேர்ந்தெடுக்கவும்.",
    traySend: "பட்டியலை அனுப்பவும்",
    trayMinimum: "மேலும் {count} சேர்க்கவும்",
    performanceKicker: "அழுத்தத்திலும் பாதுகாப்பு",
    performanceTitle: "சரியான எண்ணெய் கடினமாக உழைக்கும் இயந்திரங்களை இயக்குகிறது.",
    performanceBody: "தினசரி தெஹிவளை போக்குவரத்து முதல் பணிமனை மற்றும் வாகனப்படை பயன்பாடு வரை, சரியான தரத்தைத் தேர்ந்தெடுத்து இன்றைய இருப்பை எங்கள் குழுவிடம் உறுதிப்படுத்துங்கள்.",
    performanceCta: "சரியான எண்ணெயைத் தேர்ந்தெடுக்க கேளுங்கள்",
    performanceProof: "தினசரி ஓட்டுநர்கள் · பணிமனைகள் · வாகனப்படைகள்",
    spotlightEyebrow: "நீங்கள் ஓட்டுவதிலிருந்து தொடங்குங்கள்",
    spotlightTitle: "நீங்கள் எதைப் பாதுகாக்கிறீர்கள்?",
    spotlightBody: "முழுப் பட்டியலையும் தேடாமல் பொருத்தமான தயாரிப்புகளுக்குச் செல்ல ஒரு வகையைத் தேர்ந்தெடுக்கவும்.",
    spotlightExplore: "வகையைப் பார்க்க",
  },
} as const;

type DiscoveryCopy = { [Key in keyof typeof labels.en]: string };

function normalize(value: string) {
  return value.toLocaleLowerCase("en").replace(/(\d{1,2})\s*w\s*[- ]?\s*(\d{2})/g, "$1w$2").replace(/[^a-z0-9]+/g, " ").trim();
}

function categoryGroup(category?: string) {
  if (!category) return "all";
  return Object.entries(groupCategories).find(([, slugs]) => slugs.includes(category))?.[0] ?? category;
}

function formatLkr(minor: string, locale: StoreLocale) {
  return new Intl.NumberFormat(locale === "en" ? "en-LK" : `${locale}-LK`, {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(minor) / 100);
}

function ProductTile({ product, locale, copy, selected, onToggle }: {
  product: ClientCatalogProduct;
  locale: StoreLocale;
  copy: DiscoveryCopy;
  selected: boolean;
  onToggle(): void;
}) {
  const image = product.images[0];
  const brandLogo = getBrandLogoPath(product.brand?.slug);
  const hasPrice = BigInt(product.priceMinor) > 0n;
  const discounted = hasPrice && BigInt(product.priceMinor) < BigInt(product.standardPriceMinor);
  const badge = [product.grade, product.packSize].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index).join(" · ");
  const whatsappHref = productConfirmationWhatsAppUrl({
    name: product.name,
    brand: product.brand?.name,
    packSize: product.packSize,
  });

  return <article className="discovery-product-card product-card group">
    <Link href={`/${locale}/products/${product.slug}`} className="discovery-product-link">
      <div className="discovery-product-media">
        {badge && <span className="product-grade-badge">{badge}</span>}
        {image ? <Image src={image.url} alt={image.alt} fill sizes="(max-width: 639px) calc(100vw - 42px), (max-width: 1023px) 42vw, 22vw" unoptimized className="discovery-product-image"/> : <div className="product-brand-fallback">{brandLogo ? <Image src={brandLogo} alt={`${product.brand?.name ?? product.category.name} logo`} fill sizes="220px" unoptimized className="product-brand-fallback-logo"/> : <span>{product.brand?.name ?? product.category.name}</span>}</div>}
      </div>
      <div className="discovery-product-copy">
        <p className="discovery-product-brand">{product.brand?.name ?? product.category.name}</p>
        <h3>{product.name}</h3>
        <p className="discovery-product-description">{product.shortDescription}</p>
        <div className="discovery-price-row">
          {hasPrice ? <><strong><span>{copy.from}</span> {formatLkr(product.priceMinor, locale)}</strong>{discounted && <s>{formatLkr(product.standardPriceMinor, locale)}</s>}</> : <strong>{product.inStock ? copy.request : copy.requestUnavailable}</strong>}
        </div>
        <p className="price-change-notice">{commerceCopy(locale).priceNotice}</p>
        <p className={`discovery-stock ${product.inStock ? "is-in" : "is-out"}`}><span/>{product.inStock ? "Live stock available" : "Confirm current stock"}</p>
      </div>
    </Link>
    <div className="discovery-product-actions">
      {hasPrice && product.variantCount > 1 ? <Link className="button-primary" href={`/${locale}/products/${product.slug}`}>{commerceCopy(locale).sizes}</Link> : hasPrice && <AddToCart variantId={product.variant?.id} disabled={!product.inStock} label={product.inStock ? "Add to cart" : "Out of stock"}/>}
      <a className="catalog-whatsapp-button" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={17}/>{copy.whatsapp}</a>
      <button className={`catalog-quote-button ${selected ? "is-selected" : ""}`} type="button" onClick={onToggle} aria-pressed={selected}><span>{selected ? <Check size={16}/> : <ClipboardList size={16}/>}</span>{selected ? copy.quoted : copy.quote}</button>
    </div>
  </article>;
}

function PerformanceFilm({ copy }: { copy: DiscoveryCopy }) {
  return <section className="performance-film" aria-labelledby="performance-film-title">
    <div className="performance-film-media">
      <ViewportVideo src="/videos/track-performance.mp4" poster="/images/storefront/track-performance-poster.jpg" className="performance-film-video"/>
      <span className="performance-film-index">02 / Performance</span>
      <span className="performance-film-caption">Closed-course footage · Visualising protection under load</span>
    </div>
    <div className="performance-film-copy">
      <p>{copy.performanceKicker}</p>
      <h2 id="performance-film-title">{copy.performanceTitle}</h2>
      <span>{copy.performanceBody}</span>
      <small>{copy.performanceProof}</small>
      <a href={oilMatchWhatsAppUrl()} target="_blank" rel="noreferrer"><MessageCircle size={17}/>{copy.performanceCta}<ArrowRight size={16}/></a>
    </div>
  </section>;
}

function categorySpotlightPosition(index: number, activeIndex: number, total: number) {
  let offset = index - activeIndex;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  if (offset === 0) return "is-active";
  if (offset === -1) return "is-prev";
  if (offset === 1) return "is-next";
  if (offset === -2) return "is-prev-far";
  if (offset === 2) return "is-next-far";
  return "is-hidden";
}

function CategorySpotlight({ products, activeIndex, copy, onChange, onChoose }: {
  products: ClientCatalogProduct[];
  activeIndex: number;
  copy: DiscoveryCopy;
  onChange(index: number): void;
  onChoose(group: string): void;
}) {
  const total = spotlightCategories.length;
  const sectionRef = useRef<HTMLElement>(null);
  const swipeStartRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const suppressClickUntilRef = useRef(0);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [interacting, setInteracting] = useState(false);

  function move(direction: number) {
    onChange((activeIndex + direction + total) % total);
  }

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .28 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(motionQuery.matches);
    const updatePageVisibility = () => setPageVisible(document.visibilityState === "visible");
    updateMotionPreference();
    updatePageVisibility();
    motionQuery.addEventListener("change", updateMotionPreference);
    document.addEventListener("visibilitychange", updatePageVisibility);
    return () => {
      motionQuery.removeEventListener("change", updateMotionPreference);
      document.removeEventListener("visibilitychange", updatePageVisibility);
    };
  }, []);

  useEffect(() => {
    if (!inView || !pageVisible || reducedMotion || interacting) return;
    const timer = window.setTimeout(() => onChange((activeIndex + 1) % total), 3250);
    return () => window.clearTimeout(timer);
  }, [activeIndex, inView, interacting, onChange, pageVisible, reducedMotion, total]);

  return <section
    ref={sectionRef}
    className="category-spotlight"
    id="category-spotlight"
    aria-labelledby="category-spotlight-title"
    aria-roledescription="carousel"
    onPointerEnter={(event) => { if (event.pointerType !== "touch") setInteracting(true); }}
    onPointerLeave={(event) => { if (event.pointerType !== "touch") setInteracting(false); }}
    onFocusCapture={() => setInteracting(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
  >
    <div className="site-container">
      <header className="category-spotlight-heading">
        <div><p>{copy.spotlightEyebrow}</p><h2 id="category-spotlight-title">{copy.spotlightTitle}</h2></div>
        <span>{copy.spotlightBody}</span>
      </header>
      <div
        className="category-spotlight-viewport"
        onPointerDown={(event) => {
          if (event.pointerType !== "touch") return;
          swipeStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          setInteracting(true);
        }}
        onPointerUp={(event) => {
          const start = swipeStartRef.current;
          if (!start || event.pointerId !== start.pointerId) return;
          const deltaX = event.clientX - start.x;
          const deltaY = event.clientY - start.y;
          swipeStartRef.current = null;
          setInteracting(false);
          if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
          suppressClickUntilRef.current = performance.now() + 450;
          move(deltaX > 0 ? -1 : 1);
        }}
        onPointerCancel={() => {
          swipeStartRef.current = null;
          setInteracting(false);
        }}
      >
        <div className="category-spotlight-stage">
          {spotlightCategories.map((item, index) => {
            const position = categorySpotlightPosition(index, activeIndex, total);
            const categorySlugs = groupCategories[item.id] ?? [];
            const count = products.filter((product) => categorySlugs.includes(product.category.slug)).length;
            return <button
              type="button"
              className={`category-spotlight-card ${position}`}
              key={item.id}
              onClick={() => {
                if (performance.now() < suppressClickUntilRef.current) return;
                if (index === activeIndex) onChoose(item.id);
                else onChange(index);
              }}
              aria-label={index === activeIndex ? `${copy.spotlightExplore}: ${item.title}` : `Show ${item.title}`}
              aria-pressed={index === activeIndex}
              tabIndex={index === activeIndex ? 0 : -1}
            >
              <span className="category-spotlight-art"><Image src={item.image} alt="" fill sizes="(max-width: 639px) 80vw, 430px"/></span>
              <span className="category-spotlight-shade"/>
              <span className="category-spotlight-copy"><small>{item.eyebrow}</small><strong>{item.title}</strong><em>{item.description}</em><span>{count} products <ArrowRight size={14}/></span></span>
            </button>;
          })}
        </div>
        <button className="spotlight-control spotlight-control-prev" type="button" onClick={() => move(-1)} aria-label="Previous category"><ArrowLeft size={21}/></button>
        <button className="spotlight-control spotlight-control-next" type="button" onClick={() => move(1)} aria-label="Next category"><ArrowRight size={21}/></button>
      </div>
      <div className="spotlight-pagination" aria-label="Choose a category">{spotlightCategories.map((item, index) => <button type="button" className={index === activeIndex ? "active" : ""} onClick={() => onChange(index)} aria-label={`Show ${item.title}`} aria-current={index === activeIndex ? "true" : undefined} key={item.id}/>)}</div>
    </div>
  </section>;
}

function BrandFilterButton({ item, active, duplicate = false, onSelect }: {
  item: ClientCatalogBrand;
  active: boolean;
  duplicate?: boolean;
  onSelect(slug: string): void;
}) {
  const logo = getBrandLogoPath(item.slug, item.logoUrl);
  return <button
    type="button"
    className={`brand-marquee-card ${active ? "active" : ""}`}
    onClick={() => onSelect(item.slug)}
    aria-label={duplicate ? undefined : `Filter by ${item.name}`}
    aria-pressed={duplicate ? undefined : active}
    tabIndex={duplicate ? -1 : 0}
  >
    {logo ? <span className="brand-marquee-logo"><Image src={logo} alt={duplicate ? "" : `${item.name} logo`} fill sizes="150px" unoptimized/></span> : <span className="brand-marquee-name">{item.name}</span>}
    <strong>{item.count}<span>SKUs</span></strong>
  </button>;
}

function BrandFilterRow({ items, activeBrand, reverse = false, onSelect }: {
  items: ClientCatalogBrand[];
  activeBrand: string;
  reverse?: boolean;
  onSelect(slug: string): void;
}) {
  return <div className={`brand-marquee-row${reverse ? " reverse" : ""}`}>
    <div className="brand-marquee-track">
      <div className="brand-marquee-group">{items.map((item) => <BrandFilterButton item={item} active={activeBrand === item.slug} onSelect={onSelect} key={item.slug}/>)}</div>
      <div className="brand-marquee-group" aria-hidden="true">{items.map((item) => <BrandFilterButton item={item} active={activeBrand === item.slug} duplicate onSelect={onSelect} key={`${item.slug}-duplicate`}/>)}</div>
    </div>
  </div>;
}

function BrandFilterMarquee({ brands, activeBrand, onSelect }: {
  brands: ClientCatalogBrand[];
  activeBrand: string;
  onSelect(slug: string): void;
}) {
  const splitAt = Math.ceil(brands.length / 2);
  return <div className="brand-filter-marquee brand-marquee" aria-label="Available brands">
    <BrandFilterRow items={brands.slice(0, splitAt)} activeBrand={activeBrand} onSelect={onSelect}/>
    <BrandFilterRow items={brands.slice(splitAt).reverse()} activeBrand={activeBrand} reverse onSelect={onSelect}/>
  </div>;
}

export function CatalogExperience({ products, brands, locale, dictionary, initialFilters = {}, showHero = false, syncUrl = false }: CatalogExperienceProps) {
  const copy: DiscoveryCopy = labels[locale];
  const [query, setQuery] = useState(initialFilters.q ?? "");
  const deferredQuery = useDeferredValue(query);
  const [group, setGroup] = useState(categoryGroup(initialFilters.category));
  const [brand, setBrand] = useState(initialFilters.brand ?? "");
  const [section, setSection] = useState(initialFilters.section ?? "");
  const commerce = commerceCopy(locale);
  const sectionOptions = [...new Set(products.flatMap((product) => product.catalogueSections))].sort();
  const [grade, setGrade] = useState(initialFilters.grade ?? "");
  const [stock, setStock] = useState(initialFilters.availability === "in" ? "in" : "");
  const [visible, setVisible] = useState(showHero ? 12 : 24);
  const [inquiryIds, setInquiryIds] = useState<string[]>([]);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase("en") === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!syncUrl) return;
    const url = new URL(window.location.href);
    const next: Record<string, string> = { q: query, brand, section, grade, availability: stock, vehicle: "", application: "", sort: "" };
    const category = group === "all" ? "" : groupCategories[group]?.[0] ?? "";
    next.category = category;
    for (const [key, value] of Object.entries(next)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [section, brand, grade, group, query, stock, syncUrl]);

  const gradeOptions = useMemo(() => {
    const values = new Set(products.filter((product) => !section || product.catalogueSections.includes(section)).map((product) => product.grade).filter((value): value is string => Boolean(value)));
    return [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [products, section]);

  const filtered = useMemo(() => {
    const tokens = normalize(deferredQuery).split(" ").filter(Boolean);
    const categorySlugs = groupCategories[group] ?? (group === "all" ? undefined : [group]);
    const result = products.filter((product) => {
      const indexed = `${product.searchText} ${normalize(product.searchText).replace(/ /g, "")}`;
      if (tokens.length && !tokens.every((token) => indexed.includes(token))) return false;
      if (categorySlugs && !categorySlugs.includes(product.category.slug)) return false;
      if (brand && product.brand?.slug !== brand) return false;
      if (section && !product.catalogueSections.includes(section)) return false;
      if (grade && product.grade !== grade) return false;
      if (stock === "in" && !product.inStock) return false;
      return true;
    });
    return result.sort((a, b) => {
      return Number(b.inStock) - Number(a.inStock);
    });
  }, [section, brand, deferredQuery, grade, group, products, stock]);

  const inquiryProducts = inquiryIds.map((id) => products.find((product) => product.id === id)).filter((product): product is ClientCatalogProduct => Boolean(product));
  const minimumRemaining = Math.max(0, 3 - inquiryProducts.length);

  function resetVisible() {
    setVisible(showHero ? 12 : 24);
  }

  function chooseGroup(nextGroup: string) {
    setGroup(nextGroup);
    setSection("");
    resetVisible();
    window.setTimeout(() => document.getElementById("catalog-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function applySelector() {
    setGroup("all");
    resetVisible();
    window.setTimeout(() => document.getElementById("catalog-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function chooseBrand(nextBrand: string) {
    setBrand((current) => current === nextBrand ? "" : nextBrand);
    resetVisible();
    window.setTimeout(() => document.getElementById("catalog-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function toggleInquiry(id: string) {
    setInquiryIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 5 ? [...current, id] : current);
  }

  function clearFilters() {
    setQuery("");
    setGroup("all");
    setBrand("");
    setSection("");
    setGrade("");
    setStock("");
    resetVisible();
  }

  return <>
    {showHero && <section className="discovery-hero">
      <div className="site-container">
        <div className="discovery-hero-shell">
          <div className="discovery-hero-frame">
            <div className="discovery-hero-video-shell" aria-hidden="true">
              <ViewportVideo
                src="/videos/hero-supercar.mp4"
                poster="/images/storefront/hero-supercar-poster.jpg"
                className="discovery-hero-video"
                playbackRate={.7}
                introPlaybackRate={.48}
                introDuration={3.4}
              />
            </div>
            <div className="discovery-hero-grid">
              <div className="discovery-hero-copy">
                <p className="discovery-eyebrow">{copy.eyebrow.replace("313", String(products.length))}</p>
                <h1><span>{copy.title}</span><em>{copy.titleAccent}</em></h1>
                <p className="discovery-hero-body">{copy.body}</p>
                <div className="hero-conversion-actions">
                  <a className="halo-action halo-action-primary" href="#catalog-grid"><span>{copy.shopStock}</span><ArrowRight size={16}/></a>
                  <a className="halo-action halo-action-secondary" href={oilMatchWhatsAppUrl()} target="_blank" rel="noreferrer"><MessageCircle size={17}/><span>{copy.askWhatsApp}</span></a>
                </div>
              </div>
            </div>
          </div>
          <div className="quick-selector-card" id="quick-oil-selector">
            <div className="quick-selector-heading"><div><h2>{copy.selector}</h2></div><p>{commerce.selectorHint}</p><a className="selector-location" href={storeConfig.mapsUrl} target="_blank" rel="noreferrer"><span className="status-dot"/><span>{copy.status}</span><strong><MapPin size={13}/>{copy.directions}</strong></a></div>
            <label><span>{commerce.category}</span><div className="selector-control"><select value={section} onChange={(event) => { setSection(event.target.value); setGroup("all"); setGrade(""); }}><option value="">{commerce.allCategories}</option>{sectionOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown size={17}/></div></label>
            <label><span>{copy.grade}</span><div className="selector-control"><select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="">{copy.anyGrade}</option>{gradeOptions.map((item) => <option value={item} key={item}>{item}</option>)}</select><ChevronDown size={17}/></div></label>
            <button type="button" onClick={applySelector}><span>{copy.selectorAction.replace("{count}", String(products.length))}</span><ArrowRight size={17}/></button>
          </div>
        </div>
      </div>
    </section>}

    {showHero
      ? <CategorySpotlight products={products} activeIndex={spotlightIndex} copy={copy} onChange={setSpotlightIndex} onChoose={chooseGroup}/>
      : <nav className="category-pill-rail" aria-label="Product categories"><div className="site-container"><div className="category-pill-scroll">{groups.map((item) => <button key={item.id} type="button" className={group === item.id ? "active" : ""} onClick={() => chooseGroup(item.id)}>{item.label}</button>)}</div></div></nav>}

    <section className="discovery-catalog" id="catalog-filters">
      <div className="site-container">
        {!showHero && <header className="catalog-discovery-heading"><p className="discovery-eyebrow">{copy.eyebrow.replace("313", String(products.length))}</p><h1>{dictionary.catalog.title}</h1><p>{dictionary.catalog.body}</p></header>}

        <section className="brand-filter-section" id="brands" aria-labelledby="brand-filter-title">
          <div className="brand-filter-heading"><div><p>Trusted catalogue</p><h2 id="brand-filter-title">{copy.brands}</h2></div><span>{copy.brandBody}</span><button type="button" className={`brand-filter-all-control ${brand === "" ? "active" : ""}`} onClick={() => chooseBrand("")}><ShoppingBag size={19}/><span>{copy.allBrands}</span><strong>{products.length}</strong></button></div>
          <BrandFilterMarquee brands={brands} activeBrand={brand} onSelect={chooseBrand}/>
        </section>

        <section className="catalog-trust-bar" aria-label="Store service promises">
          <article><Zap/><div><strong>{copy.trustPickup}</strong><span>{copy.trustPickupBody}</span></div></article>
          <article><Truck/><div><strong>{copy.trustDelivery}</strong><span>{copy.trustDeliveryBody}</span></div></article>
          <article><ShieldCheck/><div><strong>{copy.trustGenuine}</strong><span>{copy.trustGenuineBody}</span></div></article>
        </section>

        <div className="instant-filter-bar">
          <label className="instant-search"><Search size={19}/><input ref={searchInput} name="q" value={query} onChange={(event) => { setQuery(event.target.value); resetVisible(); }} placeholder={dictionary.catalog.search} aria-label={dictionary.catalog.search} autoComplete="off"/>{query && <button type="button" aria-label={dictionary.catalog.clear} onClick={() => { setQuery(""); resetVisible(); searchInput.current?.focus(); }}><X size={16}/></button>}<kbd>⌘ K</kbd></label>
          <label className="instant-select"><span className="sr-only">Brand</span><select name="brand" value={brand} onChange={(event) => { setBrand(event.target.value); resetVisible(); }}><option value="">{copy.allBrands}</option>{brands.map((item) => <option value={item.slug} key={item.slug}>{item.name} ({item.count})</option>)}</select><ChevronDown size={15}/></label>
          <label className="instant-select"><span className="sr-only">Availability</span><select name="availability" value={stock} onChange={(event) => { setStock(event.target.value); resetVisible(); }}><option value="">{copy.anyStock}</option><option value="in">{copy.inStock}</option></select><ChevronDown size={15}/></label>
          <label className="instant-select"><span className="sr-only">{commerce.category}</span><select value={section} onChange={(event) => { setSection(event.target.value); setGroup("all"); resetVisible(); }}><option value="">{commerce.allCategories}</option>{sectionOptions.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={15}/></label>
        </div>

        <div className="catalog-result-heading" id="catalog-grid"><div><strong>{filtered.length}</strong><span>{copy.results}</span></div>{(query || group !== "all" || brand || section || grade || stock) && <button type="button" onClick={clearFilters}><X size={15}/>{copy.reset}</button>}</div>

        {filtered.length ? <><div className="discovery-product-grid">{filtered.slice(0, Math.min(8, visible)).map((product) => <ProductTile key={product.id} product={product} locale={locale} copy={copy} selected={inquiryIds.includes(product.id)} onToggle={() => toggleInquiry(product.id)}/>)}{showHero && filtered.length >= 8 && <PerformanceFilm copy={copy}/>} {filtered.slice(8, visible).map((product) => <ProductTile key={product.id} product={product} locale={locale} copy={copy} selected={inquiryIds.includes(product.id)} onToggle={() => toggleInquiry(product.id)}/>)}</div>{visible < filtered.length && <button className="catalog-load-more" type="button" onClick={() => setVisible((current) => current + 24)}>{copy.more}<span>{Math.min(24, filtered.length - visible)}</span></button>}</> : <div className="catalog-empty"><Search size={30}/><p>{copy.empty}</p><button type="button" onClick={clearFilters}>{copy.reset}</button></div>}
      </div>
    </section>

    {inquiryProducts.length > 0 && <aside className="quick-quote-tray" aria-label={copy.trayTitle} aria-live="polite">
      <div className="quick-quote-summary"><span className="quick-quote-count">{inquiryProducts.length}/5</span><div><strong>{copy.trayTitle}</strong><small>{copy.trayHint}</small></div></div>
      <div className="quick-quote-items">{inquiryProducts.map((product) => <button type="button" onClick={() => toggleInquiry(product.id)} key={product.id} title={`Remove ${product.name}`}><span>{product.brand?.name ?? product.category.name}</span><X size={13}/></button>)}</div>
      {minimumRemaining > 0 ? <button type="button" className="quick-quote-send" disabled>{copy.trayMinimum.replace("{count}", String(minimumRemaining))}</button> : <a className="quick-quote-send" href={inquiryListWhatsAppUrl(inquiryProducts.map((product) => ({ name: product.name, packSize: product.packSize })))} target="_blank" rel="noreferrer"><MessageCircle size={17}/>{copy.traySend}</a>}
    </aside>}
  </>;
}
