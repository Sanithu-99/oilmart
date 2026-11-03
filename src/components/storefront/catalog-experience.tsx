"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  MessageCircle,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
  Zap,
} from "lucide-react";

import type { ClientCatalogBrand, ClientCatalogProduct } from "@/features/catalog/queries";
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
  application?: string;
  vehicle?: string;
  grade?: string;
  availability?: string;
  sort?: string;
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

const vehicleOptions = [
  { value: "", label: "Select vehicle type" },
  { value: "motorcycle", label: "Motorcycle 4T" },
  { value: "passenger", label: "Passenger Car" },
  { value: "diesel", label: "Diesel Van & Lorry" },
  { value: "transmission", label: "Gear & ATF" },
  { value: "loose", label: "Loose Oil" },
];

const groupCategories: Record<string, string[]> = {
  engine: ["engine-oils"],
  motorcycle: ["motorcycle-oils"],
  diesel: ["diesel-engine-oils"],
  transmission: ["transmission-fluids", "gear-oils"],
  loose: ["loose-oils"],
};

const vehicleApplications: Record<string, string[]> = {
  motorcycle: ["four-stroke-motorcycles", "two-stroke-motorcycles", "motorcycles", "three-wheelers"],
  passenger: ["passenger-cars", "petrol-engines", "hybrid-vehicles"],
  diesel: ["diesel-engines", "heavy-duty-commercial", "commercial-vehicles", "light-commercial-vehicles"],
};

const vehicleCategories: Record<string, string[]> = {
  motorcycle: ["motorcycle-oils"],
  passenger: ["engine-oils"],
  diesel: ["diesel-engine-oils"],
  transmission: ["transmission-fluids", "gear-oils"],
  loose: ["loose-oils"],
};

const labels = {
  en: {
    eyebrow: "Engineered protection for every engine",
    title: "EVERY DROP MATTERS.",
    body: "Precision-grade lubricants for daily drivers, workshops and fleets. Search live Dehiwala stock by grade, vehicle type or brand.",
    status: "Open Today · Hill St, Dehiwala",
    directions: "1-Tap Directions",
    selector: "Quick Oil Selector",
    vehicle: "Vehicle Type",
    grade: "Preferred Viscosity / Grade",
    anyGrade: "Any grade",
    brands: "Shop trusted brands",
    brandBody: "Live SKU counts update with the current catalogue.",
    search: "Search product, brand, grade or application",
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
    trustPickupBody: "70/5B, Dhammalankara Mawatha, Hill St, Dehiwala",
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
  },
  si: {
    eyebrow: "සජීවී නිෂ්පාදන නාමාවලිය",
    title: "සෑම එන්ජිමකටම නිවැරදි ආරක්ෂාව",
    body: "වාහන වර්ගය, ශ්‍රේණිය හෝ වෙළඳ නාමය අනුව තෙල් සොයා අද තොගය දෙහිවල කණ්ඩායමෙන් තහවුරු කරගන්න.",
    status: "අද විවෘතයි · හිල් වීදිය, දෙහිවල",
    directions: "මාර්ගය බලන්න",
    selector: "ඉක්මන් තෙල් තේරීම",
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
  },
  ta: {
    eyebrow: "நேரடி தயாரிப்புப் பட்டியல்",
    title: "ஒவ்வொரு இயந்திரத்திற்கும் துல்லியமான பாதுகாப்பு",
    body: "வாகன வகை, தரம் அல்லது பிராண்ட் மூலம் எண்ணெயைக் கண்டறிந்து இன்றைய இருப்பை தெஹிவளை குழுவிடம் உறுதிப்படுத்துங்கள்.",
    status: "இன்று திறந்திருக்கும் · ஹில் ஸ்ட்ரீட், தெஹிவளை",
    directions: "வழியைப் பார்க்க",
    selector: "விரைவு எண்ணெய் தேர்வு",
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
  },
} as const;

type DiscoveryCopy = { [Key in keyof typeof labels.en]: string };

function normalize(value: string) {
  return value.toLocaleLowerCase("en").replace(/(\d{1,2})\s*w\s*[- ]?\s*(\d{2})/g, "$1w$2").replace(/[^a-z0-9]+/g, " ").trim();
}

function categoryGroup(category?: string) {
  if (!category) return "all";
  return Object.entries(groupCategories).find(([, slugs]) => slugs.includes(category))?.[0] ?? "all";
}

function matchesVehicle(product: ClientCatalogProduct, vehicle: string) {
  if (!vehicle) return true;
  const categoryMatch = vehicleCategories[vehicle]?.includes(product.category.slug) ?? false;
  const applicationMatch = product.applications.some((application) => vehicleApplications[vehicle]?.includes(application.slug));
  return categoryMatch || applicationMatch;
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
    sku: product.sku,
    brand: product.brand?.name,
    packSize: product.packSize,
  });

  return <article className="discovery-product-card product-card group">
    <Link href={`/${locale}/products/${product.slug}`} className="discovery-product-link">
      <div className="discovery-product-media">
        {badge && <span className="product-grade-badge">{badge}</span>}
        {image ? <Image src={image.url} alt={image.alt} fill sizes="(max-width: 639px) calc(100vw - 42px), (max-width: 1023px) 42vw, 22vw" className="discovery-product-image"/> : <div className="product-brand-fallback">{brandLogo ? <Image src={brandLogo} alt={`${product.brand?.name ?? product.category.name} logo`} fill sizes="220px" unoptimized className="product-brand-fallback-logo"/> : <span>{product.brand?.name ?? product.category.name}</span>}</div>}
      </div>
      <div className="discovery-product-copy">
        <p className="discovery-product-brand">{product.brand?.name ?? product.category.name}</p>
        <h3>{product.name}</h3>
        <p className="discovery-product-description">{product.shortDescription}</p>
        <div className="discovery-price-row">
          {hasPrice ? <><strong><span>{copy.from}</span> {formatLkr(product.priceMinor, locale)}</strong>{discounted && <s>{formatLkr(product.standardPriceMinor, locale)}</s>}</> : <strong>{product.inStock ? copy.request : copy.requestUnavailable}</strong>}
        </div>
        <p className={`discovery-stock ${product.inStock ? "is-in" : "is-out"}`}><span/>{product.inStock ? "Live stock available" : "Confirm current stock"}</p>
      </div>
    </Link>
    <div className="discovery-product-actions">
      {hasPrice && <AddToCart variantId={product.variant?.id} disabled={!product.inStock} label={product.inStock ? "Add to cart" : "Out of stock"}/>}
      <a className="catalog-whatsapp-button" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={17}/>{copy.whatsapp}</a>
      <button className={`catalog-quote-button ${selected ? "is-selected" : ""}`} type="button" onClick={onToggle} aria-pressed={selected}><span>{selected ? <Check size={16}/> : <ClipboardList size={16}/>}</span>{selected ? copy.quoted : copy.quote}</button>
    </div>
  </article>;
}

function PerformanceFilm({ copy }: { copy: DiscoveryCopy }) {
  return <section className="performance-film" aria-labelledby="performance-film-title">
    <div className="performance-film-media">
      <ViewportVideo src="/videos/track-performance.mp4" poster="/images/storefront/track-performance-poster.jpg" className="performance-film-video" controls/>
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

export function CatalogExperience({ products, brands, locale, dictionary, initialFilters = {}, showHero = false, syncUrl = false }: CatalogExperienceProps) {
  const copy: DiscoveryCopy = labels[locale];
  const [query, setQuery] = useState(initialFilters.q ?? "");
  const deferredQuery = useDeferredValue(query);
  const [group, setGroup] = useState(categoryGroup(initialFilters.category));
  const [brand, setBrand] = useState(initialFilters.brand ?? "");
  const [vehicle, setVehicle] = useState(initialFilters.vehicle ?? "");
  const [application, setApplication] = useState(initialFilters.application ?? "");
  const [grade, setGrade] = useState(initialFilters.grade ?? "");
  const [stock, setStock] = useState(initialFilters.availability === "in" ? "in" : "");
  const [sort, setSort] = useState(initialFilters.sort ?? "recommended");
  const [visible, setVisible] = useState(24);
  const [inquiryIds, setInquiryIds] = useState<string[]>([]);
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
    const next: Record<string, string> = { q: query, brand, vehicle, application, grade, availability: stock, sort: sort === "recommended" ? "" : sort };
    const category = group === "all" ? "" : groupCategories[group]?.[0] ?? "";
    next.category = category;
    for (const [key, value] of Object.entries(next)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [application, brand, grade, group, query, sort, stock, syncUrl, vehicle]);

  const gradeOptions = useMemo(() => {
    const values = new Set(products.filter((product) => matchesVehicle(product, vehicle)).map((product) => product.grade).filter((value): value is string => Boolean(value)));
    return [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [products, vehicle]);

  const filtered = useMemo(() => {
    const tokens = normalize(deferredQuery).split(" ").filter(Boolean);
    const categorySlugs = groupCategories[group];
    const result = products.filter((product) => {
      const indexed = `${product.searchText} ${normalize(product.searchText).replace(/ /g, "")}`;
      if (tokens.length && !tokens.every((token) => indexed.includes(token))) return false;
      if (categorySlugs && !categorySlugs.includes(product.category.slug)) return false;
      if (brand && product.brand?.slug !== brand) return false;
      if (!matchesVehicle(product, vehicle)) return false;
      if (application && !product.applications.some((item) => item.slug === application)) return false;
      if (grade && product.grade !== grade) return false;
      if (stock === "in" && !product.inStock) return false;
      return true;
    });
    return result.sort((a, b) => {
      if (sort === "price-asc") return Number(BigInt(a.priceMinor) - BigInt(b.priceMinor));
      if (sort === "price-desc") return Number(BigInt(b.priceMinor) - BigInt(a.priceMinor));
      return Number(b.inStock) - Number(a.inStock);
    });
  }, [application, brand, deferredQuery, grade, group, products, sort, stock, vehicle]);

  const inquiryProducts = inquiryIds.map((id) => products.find((product) => product.id === id)).filter((product): product is ClientCatalogProduct => Boolean(product));
  const minimumRemaining = Math.max(0, 3 - inquiryProducts.length);

  function resetVisible() {
    setVisible(24);
  }

  function chooseGroup(nextGroup: string) {
    setGroup(nextGroup);
    setVehicle("");
    setApplication("");
    resetVisible();
    window.setTimeout(() => document.getElementById("catalog-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function applySelector() {
    const nextGroup = vehicle === "transmission" ? "transmission" : vehicle === "loose" ? "loose" : vehicle === "motorcycle" ? "motorcycle" : vehicle === "diesel" ? "diesel" : vehicle === "passenger" ? "engine" : group;
    setGroup(nextGroup);
    setApplication("");
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
    setVehicle("");
    setApplication("");
    setGrade("");
    setStock("");
    setSort("recommended");
    resetVisible();
  }

  const heroTitleWords = copy.title.trim().split(/\s+/);
  const heroTitleAccent = heroTitleWords.pop() ?? "";
  const heroTitleLead = heroTitleWords.join(" ");

  return <>
    {showHero && <section className="discovery-hero">
      <div className="discovery-hero-video-shell" aria-hidden="true">
        <ViewportVideo src="/videos/hero-oil-pour.mp4" poster="/images/storefront/hero-oil-pour-poster.jpg" className="discovery-hero-video"/>
      </div>
      <div className="site-container discovery-hero-grid">
        <div className="discovery-hero-copy">
          <p className="discovery-eyebrow"><Sparkles size={14}/>{copy.eyebrow.replace("313", String(products.length))}</p>
          <h1><span>{heroTitleLead}</span>{" "}<em>{heroTitleAccent}</em></h1>
          <p className="discovery-hero-body">{copy.body}</p>
          <a className="store-status-pill" href={storeConfig.mapsUrl} target="_blank" rel="noreferrer"><span className="status-dot"/><span>{copy.status}</span><strong>{copy.directions}<ArrowRight size={14}/></strong></a>
        </div>
        <p className="discovery-footage-note">Real workshop footage <span>01 / Oil service</span></p>
        <div className="quick-selector-card" id="quick-oil-selector">
          <div className="quick-selector-heading"><div><span>01</span><h2>{copy.selector}</h2></div><p>{products.length} live products</p></div>
          <label><span>{copy.vehicle}</span><div className="selector-control"><select value={vehicle} onChange={(event) => { setVehicle(event.target.value); setGrade(""); }}><option value="">{vehicleOptions[0].label}</option>{vehicleOptions.slice(1).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={17}/></div></label>
          <label><span>{copy.grade}</span><div className="selector-control"><select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="">{copy.anyGrade}</option>{gradeOptions.map((item) => <option value={item} key={item}>{item}</option>)}</select><ChevronDown size={17}/></div></label>
          <button type="button" onClick={applySelector}>Filter {products.length} Products<ArrowRight size={18}/></button>
        </div>
      </div>
    </section>}

    <nav className="category-pill-rail" aria-label="Product categories"><div className="site-container"><div className="category-pill-scroll">{groups.map((item) => <button key={item.id} type="button" className={group === item.id ? "active" : ""} onClick={() => chooseGroup(item.id)}>{item.label}</button>)}</div></div></nav>

    <section className="discovery-catalog" id="catalog-filters">
      <div className="site-container">
        {!showHero && <header className="catalog-discovery-heading"><p className="discovery-eyebrow">{copy.eyebrow.replace("313", String(products.length))}</p><h1>{dictionary.catalog.title}</h1><p>{dictionary.catalog.body}</p></header>}

        <section className="brand-filter-section" id="brands" aria-labelledby="brand-filter-title">
          <div className="brand-filter-heading"><div><p>Trusted catalogue</p><h2 id="brand-filter-title">{copy.brands}</h2></div><span>{copy.brandBody}</span></div>
          <div className="brand-filter-rail">
            <button type="button" className={`brand-filter-card ${brand === "" ? "active" : ""}`} onClick={() => { setBrand(""); resetVisible(); }}><span className="brand-filter-all"><ShoppingBag size={22}/>{copy.allBrands}</span><strong>{products.length}</strong></button>
            {brands.slice(0, 12).map((item) => {
              const logo = getBrandLogoPath(item.slug, item.logoUrl);
              return <button type="button" key={item.slug} className={`brand-filter-card ${brand === item.slug ? "active" : ""}`} onClick={() => { setBrand((current) => current === item.slug ? "" : item.slug); resetVisible(); }} aria-pressed={brand === item.slug}>{logo ? <span className="brand-filter-logo"><Image src={logo} alt={`${item.name} logo`} fill sizes="150px" unoptimized/></span> : <span className="brand-filter-name">{item.name}</span>}<strong>{item.count} SKUs</strong></button>;
            })}
          </div>
        </section>

        <section className="catalog-trust-bar" aria-label="Store service promises">
          <article><Zap/><div><strong>{copy.trustPickup}</strong><span>{copy.trustPickupBody}</span></div></article>
          <article><Truck/><div><strong>{copy.trustDelivery}</strong><span>{copy.trustDeliveryBody}</span></div></article>
          <article><ShieldCheck/><div><strong>{copy.trustGenuine}</strong><span>{copy.trustGenuineBody}</span></div></article>
        </section>

        <div className="instant-filter-bar">
          <label className="instant-search"><Search size={19}/><input ref={searchInput} name="q" value={query} onChange={(event) => { setQuery(event.target.value); resetVisible(); }} placeholder={copy.search} autoComplete="off"/><kbd>⌘ K</kbd></label>
          <label className="instant-select"><span className="sr-only">Brand</span><select name="brand" value={brand} onChange={(event) => { setBrand(event.target.value); resetVisible(); }}><option value="">{copy.allBrands}</option>{brands.map((item) => <option value={item.slug} key={item.slug}>{item.name} ({item.count})</option>)}</select><ChevronDown size={15}/></label>
          <label className="instant-select"><span className="sr-only">Availability</span><select name="availability" value={stock} onChange={(event) => { setStock(event.target.value); resetVisible(); }}><option value="">{copy.anyStock}</option><option value="in">{copy.inStock}</option></select><ChevronDown size={15}/></label>
          <label className="instant-select"><span className="sr-only">Sort</span><select value={sort} onChange={(event) => { setSort(event.target.value); resetVisible(); }}><option value="recommended">{copy.newest}</option><option value="price-asc">{copy.priceLow}</option><option value="price-desc">{copy.priceHigh}</option></select><ChevronDown size={15}/></label>
        </div>

        <div className="catalog-result-heading" id="catalog-grid"><div><strong>{filtered.length}</strong><span>{copy.results}</span></div>{(query || group !== "all" || brand || vehicle || application || grade || stock || sort !== "recommended") && <button type="button" onClick={clearFilters}><X size={15}/>{copy.reset}</button>}</div>

        {filtered.length ? <><div className="discovery-product-grid">{filtered.slice(0, Math.min(8, visible)).map((product) => <ProductTile key={product.id} product={product} locale={locale} copy={copy} selected={inquiryIds.includes(product.id)} onToggle={() => toggleInquiry(product.id)}/>)}{showHero && filtered.length >= 8 && <PerformanceFilm copy={copy}/>} {filtered.slice(8, visible).map((product) => <ProductTile key={product.id} product={product} locale={locale} copy={copy} selected={inquiryIds.includes(product.id)} onToggle={() => toggleInquiry(product.id)}/>)}</div>{visible < filtered.length && <button className="catalog-load-more" type="button" onClick={() => setVisible((current) => current + 24)}>{copy.more}<span>{Math.min(24, filtered.length - visible)}</span></button>}</> : <div className="catalog-empty"><Search size={30}/><p>{copy.empty}</p><button type="button" onClick={clearFilters}>{copy.reset}</button></div>}
      </div>
    </section>

    {inquiryProducts.length > 0 && <aside className="quick-quote-tray" aria-label={copy.trayTitle} aria-live="polite">
      <div className="quick-quote-summary"><span className="quick-quote-count">{inquiryProducts.length}/5</span><div><strong>{copy.trayTitle}</strong><small>{copy.trayHint}</small></div></div>
      <div className="quick-quote-items">{inquiryProducts.map((product) => <button type="button" onClick={() => toggleInquiry(product.id)} key={product.id} title={`Remove ${product.name}`}><span>{product.brand?.name ?? product.category.name}</span><X size={13}/></button>)}</div>
      {minimumRemaining > 0 ? <button type="button" className="quick-quote-send" disabled>{copy.trayMinimum.replace("{count}", String(minimumRemaining))}</button> : <a className="quick-quote-send" href={inquiryListWhatsAppUrl(inquiryProducts.map((product) => ({ name: product.name, packSize: product.packSize, sku: product.sku })))} target="_blank" rel="noreferrer"><MessageCircle size={17}/>{copy.traySend}</a>}
    </aside>}
  </>;
}
