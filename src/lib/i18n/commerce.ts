import type { StoreLocale } from "./config";

const en = {
  priceNotice: "Prices are subject to change.",
  stockNotice: "Payment will be requested and processed only after the shop confirms stock availability and your final total.",
  sizes: "Choose size", category: "Catalogue section", allCategories: "All catalogue sections",
  selectorHint: "Browse the inventory by category and grade.",
  decrease: "Decrease quantity", increase: "Increase quantity", quantity: "Quantity",
  loose: "Sold by the litre. The price shown is per litre.",
  memberTerms: "Approved loyalty customers receive the loyalty price for cash or bank transfer. Card estimates add 4% to the loyalty-priced items.",
  paymentMethod: "Preferred payment method", cash: "Cash", bank: "Bank transfer", card: "Card (estimate only)",
  surcharge: "Card adjustment on loyalty items (4%)", estimate: "Estimated total", paymentUnavailable: "Online payment is not enabled yet. The shop will confirm available payment options after checking stock.",
  requestQuote: "Request a quotation", preorder: "Request pre-order approval", requests: "Quotations & pre-orders",
  quotePolicy: "The shop owner sets the quotation fee for your vehicle or request and confirms it with you before payment.",
  preorderPolicy: "A pre-order is a request for shop approval. It does not reserve stock or take payment.",
  name: "Name", phone: "Mobile number", vehicle: "Vehicle or customer reference", notes: "What do you need?",
  submit: "Send request", sending: "Sending…", received: "Request received. Keep this reference:",
  failed: "We could not save your request. Check your details and try again.",
  accepted: "I understand that the shop must approve this request and confirm any fee before payment.",
  history: "Your recent requests", noRequests: "You have no quotation or pre-order requests yet.",
  fee: "Owner-set quotation fee", awaitingFee: "Fee to be confirmed by the owner", noCharge: "No payment has been collected.",
};
type Copy = { [K in keyof typeof en]: string };
const si: Copy = {
  priceNotice: "මිල ගණන් වෙනස් විය හැක.", stockNotice: "වෙළඳසැල තොගය සහ අවසාන මුදල තහවුරු කළ පසු පමණක් ගෙවීම ඉල්ලා සකස් කරනු ලැබේ.",
  sizes: "ප්‍රමාණය තෝරන්න", category: "නාමාවලි අංශය", allCategories: "සියලු නාමාවලි අංශ", selectorHint: "ප්‍රවර්ගය සහ ශ්‍රේණිය අනුව තොගය බලන්න.",
  decrease: "ප්‍රමාණය අඩු කරන්න", increase: "ප්‍රමාණය වැඩි කරන්න", quantity: "ප්‍රමාණය", loose: "ලීටරයට විකුණනු ලැබේ. පෙන්වන මිල ලීටරයක් සඳහාය.",
  memberTerms: "අනුමත සාමාජිකයන්ට මුදල් හෝ බැංකු හුවමාරු සඳහා සාමාජික මිල හිමිවේ. කාඩ්පත් ඇස්තමේන්තුවේ සාමාජික මිල සහිත භාණ්ඩ සඳහා 4%ක් එකතු වේ.",
  paymentMethod: "කැමති ගෙවීම් ක්‍රමය", cash: "මුදල්", bank: "බැංකු හුවමාරුව", card: "කාඩ්පත (ඇස්තමේන්තුව පමණි)", surcharge: "සාමාජික භාණ්ඩ සඳහා කාඩ්පත් එකතුව (4%)", estimate: "ඇස්තමේන්තුගත එකතුව", paymentUnavailable: "අන්තර්ජාල ගෙවීම් තවම සක්‍රිය නැත. තොගය පරීක්ෂා කිරීමෙන් පසු වෙළඳසැල ගෙවීම් ක්‍රම තහවුරු කරනු ඇත.",
  requestQuote: "මිල ගණනක් ඉල්ලන්න", preorder: "පෙර ඇණවුමට අනුමැතිය ඉල්ලන්න", requests: "මිල ගණන් සහ පෙර ඇණවුම්", quotePolicy: "හිමිකරු ඔබගේ වාහනය හෝ ඉල්ලීම අනුව මිල ගණන් ගාස්තුව සකසා ගෙවීමට පෙර දන්වනු ඇත.", preorderPolicy: "පෙර ඇණවුමක් වෙළඳසැලේ අනුමැතිය සඳහා ඉල්ලීමකි. තොග වෙන් කිරීමක් හෝ ගෙවීමක් සිදු නොවේ.",
  name: "නම", phone: "ජංගම දුරකථන අංකය", vehicle: "වාහනය හෝ පාරිභෝගික යොමුව", notes: "ඔබට අවශ්‍ය දේ", submit: "ඉල්ලීම යවන්න", sending: "යවමින්…", received: "ඉල්ලීම ලැබුණි. මෙම යොමු අංකය තබාගන්න:", failed: "ඉල්ලීම සුරැකිය නොහැක. තොරතුරු පරීක්ෂා කර නැවත උත්සාහ කරන්න.", accepted: "ගෙවීමට පෙර වෙළඳසැල මෙම ඉල්ලීම අනුමත කර ගාස්තුව තහවුරු කළ යුතු බව මම දනිමි.", history: "ඔබගේ මෑත ඉල්ලීම්", noRequests: "තවම ඉල්ලීම් නැත.", fee: "හිමිකරු නියම කළ ගාස්තුව", awaitingFee: "හිමිකරු ගාස්තුව තහවුරු කළ යුතුය", noCharge: "ගෙවීමක් අය කර නැත.",
};
const ta: Copy = {
  priceNotice: "விலைகள் மாற்றத்திற்கு உட்பட்டவை.", stockNotice: "கடை இருப்பையும் இறுதித் தொகையையும் உறுதிப்படுத்திய பின்னரே கட்டணம் கோரப்பட்டுச் செயலாக்கப்படும்.",
  sizes: "அளவைத் தேர்ந்தெடுக்கவும்", category: "பட்டியல் பிரிவு", allCategories: "அனைத்துப் பட்டியல் பிரிவுகள்", selectorHint: "வகை மற்றும் தரம் மூலம் இருப்பைப் பாருங்கள்.", decrease: "அளவைக் குறைக்கவும்", increase: "அளவை அதிகரிக்கவும்", quantity: "அளவு", loose: "லீட்டர் கணக்கில் விற்கப்படுகிறது. காட்டப்படும் விலை ஒரு லீட்டருக்கானது.",
  memberTerms: "அங்கீகரிக்கப்பட்ட உறுப்பினர்களுக்கு பணம் அல்லது வங்கிப் பரிமாற்றத்தில் உறுப்பினர் விலை கிடைக்கும். அட்டை மதிப்பீட்டில் உறுப்பினர் விலையுள்ள பொருட்களுக்கு 4% சேர்க்கப்படும்.", paymentMethod: "விருப்பமான கட்டண முறை", cash: "பணம்", bank: "வங்கிப் பரிமாற்றம்", card: "அட்டை (மதிப்பீடு மட்டும்)", surcharge: "உறுப்பினர் பொருட்களுக்கான அட்டைக் கட்டணம் (4%)", estimate: "மதிப்பிடப்பட்ட மொத்தம்", paymentUnavailable: "இணையக் கட்டணம் இன்னும் செயல்படுத்தப்படவில்லை. இருப்பைப் பார்த்தபின் கடை கட்டண முறைகளை உறுதிப்படுத்தும்.",
  requestQuote: "விலைமதிப்பீடு கோரவும்", preorder: "முன்பதிவு அனுமதி கோரவும்", requests: "விலைமதிப்பீடுகள் மற்றும் முன்பதிவுகள்", quotePolicy: "உங்கள் வாகனம் அல்லது கோரிக்கைக்கான விலைமதிப்பீட்டுக் கட்டணத்தை உரிமையாளர் நிர்ணயித்து, பணம் செலுத்தும் முன் தெரிவிப்பார்.", preorderPolicy: "முன்பதிவு என்பது கடையின் அனுமதிக்கான கோரிக்கை. இருப்பு ஒதுக்கப்படாது; பணம் பெறப்படாது.", name: "பெயர்", phone: "கைபேசி எண்", vehicle: "வாகனம் அல்லது வாடிக்கையாளர் குறிப்பு", notes: "உங்களுக்கு என்ன தேவை?", submit: "கோரிக்கையை அனுப்பவும்", sending: "அனுப்பப்படுகிறது…", received: "கோரிக்கை பெறப்பட்டது. இந்தக் குறிப்பை வைத்திருக்கவும்:", failed: "கோரிக்கையைச் சேமிக்க முடியவில்லை. விவரங்களைச் சரிபார்த்து மீண்டும் முயலவும்.", accepted: "பணம் செலுத்தும் முன் கடை இந்தக் கோரிக்கையை அங்கீகரித்து கட்டணத்தை உறுதிப்படுத்த வேண்டும் என்பதை அறிவேன்.", history: "உங்கள் சமீபத்திய கோரிக்கைகள்", noRequests: "உங்களிடம் இன்னும் கோரிக்கைகள் இல்லை.", fee: "உரிமையாளர் நிர்ணயித்த கட்டணம்", awaitingFee: "உரிமையாளர் கட்டணத்தை உறுதிப்படுத்த வேண்டும்", noCharge: "பணம் எதுவும் பெறப்படவில்லை.",
};
export function commerceCopy(locale: string): Copy { return ({ en, si, ta })[locale as StoreLocale] ?? en; }
