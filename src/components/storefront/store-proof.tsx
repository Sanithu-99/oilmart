import { ExternalLink, MapPin, ShieldCheck } from "lucide-react";

import { storeConfig } from "@/lib/config/store";
import type { StoreLocale } from "@/lib/i18n/config";

const copy = {
  en: {
    eyebrow: "A real shop, not just a website",
    title: "Buy with a local team behind every order.",
    body: "Visit Saranankara Oil Mart in Dehiwala, call the same team that prepares your order, or check the live Google listing before you travel.",
    listing: "Live Google business listing",
    photoTitle: "Current store photos",
    photoBody: "Browse customer and business photos on the live listing to recognise the shop before arrival.",
    photos: "View store photos & directions",
  },
  si: {
    eyebrow: "වෙබ් අඩවියක් පමණක් නොවන සැබෑ වෙළඳසැලක්",
    title: "සෑම ඇණවුමක් පිටුපසම දේශීය කණ්ඩායමක්.",
    body: "දෙහිවල වෙළඳසැලට පැමිණෙන්න, ඇණවුම සකසන කණ්ඩායම අමතන්න, නැතහොත් පිටත් වීමට පෙර සජීවී Google ලැයිස්තුව බලන්න.",
    listing: "සජීවී Google ව්‍යාපාර ලැයිස්තුව",
    photoTitle: "වෙළඳසැලේ වත්මන් ඡායාරූප",
    photoBody: "පැමිණීමට පෙර වෙළඳසැල හඳුනාගැනීමට සජීවී ලැයිස්තුවේ ඡායාරූප බලන්න.",
    photos: "ඡායාරූප සහ මාර්ගය බලන්න",
  },
  ta: {
    eyebrow: "இணையதளம் மட்டுமல்ல, உண்மையான கடை",
    title: "ஒவ்வொரு ஆர்டருக்கும் பின்னால் உள்ளூர் குழு உள்ளது.",
    body: "தெஹிவளை கடைக்கு வாருங்கள், உங்கள் ஆர்டரைத் தயாரிக்கும் குழுவை அழையுங்கள் அல்லது பயணத்திற்கு முன் நேரடி Google பட்டியலைப் பாருங்கள்.",
    listing: "நேரடி Google வணிகப் பட்டியல்",
    photoTitle: "தற்போதைய கடை படங்கள்",
    photoBody: "வருவதற்கு முன் கடையை அடையாளம் காண நேரடி பட்டியலில் உள்ள படங்களைப் பாருங்கள்.",
    photos: "படங்கள் மற்றும் வழிகளைப் பார்க்கவும்",
  },
} as const;

const mapEmbedUrl = "https://www.google.com/maps?q=70%2F5B%20Dhammalankara%20Mawatha%2C%20Hill%20St%2C%20Dehiwala-Mount%20Lavinia%2010350%2C%20Sri%20Lanka&output=embed";

export function StoreProof({ locale }: { locale: StoreLocale }) {
  const text = copy[locale];
  const address = `${storeConfig.address.line1}, ${storeConfig.address.line2}, ${storeConfig.address.city} ${storeConfig.address.postalCode}`;

  return <section className="store-proof" aria-labelledby="store-proof-title">
    <div className="site-container store-proof-shell">
      <div className="store-proof-heading"><p>{text.eyebrow}</p><h2 id="store-proof-title">{text.title}</h2><span>{text.body}</span></div>
      <div className="store-proof-grid">
        <div className="store-proof-map"><iframe src={mapEmbedUrl} title={`Google map for ${storeConfig.name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><a href={storeConfig.mapsUrl} target="_blank" rel="noreferrer"><MapPin size={17}/><span><strong>{storeConfig.name}</strong><small>{address}</small></span><ExternalLink size={15}/></a></div>
        <div className="store-proof-content"><div className="store-proof-live"><span/><strong>{text.listing}</strong></div><article><ShieldCheck/><div><h3>{text.photoTitle}</h3><p>{text.photoBody}</p><a href={storeConfig.mapsUrl} target="_blank" rel="noreferrer">{text.photos}<ExternalLink size={14}/></a></div></article></div>
      </div>
    </div>
  </section>;
}
