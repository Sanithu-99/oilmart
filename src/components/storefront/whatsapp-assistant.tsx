import { ArrowUpRight, MessageCircle, Sparkles } from "lucide-react";

import { oilMatchWhatsAppUrl } from "@/lib/contact/whatsapp";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function WhatsAppAssistant({ dictionary }: { dictionary: Dictionary }) {
  return <details className="whatsapp-assistant">
    <summary aria-label={dictionary.assistant.label}>
      <span className="whatsapp-assistant-trigger-icon" aria-hidden="true"><MessageCircle size={22}/></span>
      <span><strong>{dictionary.assistant.label}</strong><small>{dictionary.assistant.status}</small></span>
    </summary>
    <div className="whatsapp-assistant-panel">
      <span className="whatsapp-assistant-kicker"><Sparkles size={14}/>{dictionary.assistant.label}</span>
      <h2>{dictionary.assistant.title}</h2>
      <p>{dictionary.assistant.body}</p>
      <a href={oilMatchWhatsAppUrl()} target="_blank" rel="noreferrer">
        <MessageCircle size={18}/><span>{dictionary.assistant.action}</span><ArrowUpRight size={16}/>
      </a>
      <small>{dictionary.assistant.status}</small>
    </div>
  </details>;
}
