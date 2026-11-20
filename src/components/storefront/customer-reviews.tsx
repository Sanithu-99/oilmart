import Image from "next/image";
import { ArrowUpRight, PenLine, Star } from "lucide-react";

import { storeConfig } from "@/lib/config/store";
import type { StoreLocale } from "@/lib/i18n/config";

const copy = {
  en: {
    eyebrow: "Customer reviews",
    title: "A local reputation built one visit at a time.",
    body: "Read independent feedback before you order, then share your own experience after visiting our Dehiwala store.",
    quote: "An efficient motor oil retailer.",
    author: "Rikaz Sheriff",
    attribution: "Public Google-linked review",
    date: "11 May 2017",
    viewReview: "View source",
    liveTitle: "See the latest feedback",
    liveBody: "Ratings and new comments can change. Open our live Google listing for the most current, unedited customer feedback.",
    liveAction: "Read all Google reviews",
    shareTitle: "Already bought from us?",
    shareBody: "Your honest review helps drivers, riders and workshop teams choose a dependable local lubricant shop.",
    shareAction: "Share your experience",
  },
  si: {
    eyebrow: "පාරිභෝගික සමාලෝචන",
    title: "එක් එක් පැමිණීමෙන් ගොඩනැඟුණු දේශීය විශ්වාසය.",
    body: "ඇණවුම් කිරීමට පෙර ස්වාධීන අදහස් කියවා, දෙහිවල වෙළඳසැලට පැමිණීමෙන් පසු ඔබගේ අත්දැකීම බෙදාගන්න.",
    quote: "An efficient motor oil retailer.",
    author: "Rikaz Sheriff",
    attribution: "පොදු Google-සම්බන්ධිත සමාලෝචනය",
    date: "2017 මැයි 11",
    viewReview: "මූලාශ්‍රය බලන්න",
    liveTitle: "නවතම අදහස් බලන්න",
    liveBody: "ඇගයීම් සහ අදහස් වෙනස් විය හැක. නවතම, සංස්කරණය නොකළ අදහස් සඳහා සජීවී Google ලැයිස්තුව විවෘත කරන්න.",
    liveAction: "Google සමාලෝචන බලන්න",
    shareTitle: "අපෙන් මිලදී ගෙන තිබේද?",
    shareBody: "ඔබගේ අවංක අදහස රියදුරන්ට සහ වැඩමුළු කණ්ඩායම්වලට විශ්වාසදායක දේශීය වෙළඳසැලක් තෝරාගැනීමට උපකාරී වේ.",
    shareAction: "ඔබගේ අත්දැකීම බෙදාගන්න",
  },
  ta: {
    eyebrow: "வாடிக்கையாளர் மதிப்புரைகள்",
    title: "ஒவ்வொரு வருகையிலும் உருவான உள்ளூர் நம்பிக்கை.",
    body: "ஆர்டர் செய்வதற்கு முன் சுயாதீன கருத்துகளைப் படியுங்கள்; தெஹிவளை கடைக்கு வந்த பிறகு உங்கள் அனுபவத்தையும் பகிருங்கள்.",
    quote: "An efficient motor oil retailer.",
    author: "Rikaz Sheriff",
    attribution: "பொது Google-இணைக்கப்பட்ட மதிப்புரை",
    date: "11 மே 2017",
    viewReview: "மூலத்தைப் பார்க்கவும்",
    liveTitle: "சமீபத்திய கருத்துகளைப் பாருங்கள்",
    liveBody: "மதிப்பீடுகளும் புதிய கருத்துகளும் மாறலாம். சமீபத்திய, திருத்தப்படாத கருத்துகளுக்கு நேரடி Google பட்டியலைத் திறக்கவும்.",
    liveAction: "Google மதிப்புரைகளைப் படிக்கவும்",
    shareTitle: "எங்களிடம் வாங்கியுள்ளீர்களா?",
    shareBody: "உங்கள் நேர்மையான மதிப்புரை ஓட்டுநர்களும் பணிமனை குழுக்களும் நம்பகமான உள்ளூர் கடையைத் தேர்ந்தெடுக்க உதவும்.",
    shareAction: "உங்கள் அனுபவத்தைப் பகிருங்கள்",
  },
} as const;

export function CustomerReviews({ locale }: { locale: StoreLocale }) {
  const text = copy[locale];

  return <section className="customer-reviews" id="reviews" aria-labelledby="customer-reviews-title">
    <div className="site-container customer-reviews-shell">
      <header className="customer-reviews-heading">
        <p>{text.eyebrow}</p>
        <h2 id="customer-reviews-title">{text.title}</h2>
        <span>{text.body}</span>
      </header>
      <div className="customer-reviews-grid">
        <blockquote className="customer-review-featured">
          <header className="google-review-header">
            <span className="google-review-avatar" aria-hidden="true">RS</span>
            <span className="google-review-person"><strong>{text.author}</strong><small>{text.date}</small></span>
            <span className="google-review-brand" aria-label="Google review"><Image src="/images/brands/google-g.svg" alt="" width={30} height={30}/><strong>Google</strong></span>
          </header>
          <p>“{text.quote}”</p>
          <footer><span>{text.attribution}</span><a href={storeConfig.mapsUrl} target="_blank" rel="noreferrer">{text.viewReview}<ArrowUpRight aria-hidden="true"/></a></footer>
        </blockquote>
        <article className="customer-review-action">
          <div className="customer-review-action-icon"><Star aria-hidden="true"/></div>
          <div><h3>{text.liveTitle}</h3><p>{text.liveBody}</p></div>
          <a href={storeConfig.mapsUrl} target="_blank" rel="noreferrer">{text.liveAction}<ArrowUpRight aria-hidden="true"/></a>
        </article>
        <article className="customer-review-action">
          <div className="customer-review-action-icon"><PenLine aria-hidden="true"/></div>
          <div><h3>{text.shareTitle}</h3><p>{text.shareBody}</p></div>
          <a href={storeConfig.mapsUrl} target="_blank" rel="noreferrer">{text.shareAction}<ArrowUpRight aria-hidden="true"/></a>
        </article>
      </div>
    </div>
  </section>;
}
