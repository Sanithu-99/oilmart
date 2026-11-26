import "server-only";
import { getEnv } from "@/lib/env";

export function smsGatewayReady() {
  const env = getEnv();
  return env.SMS_PROVIDER === "sms-gate" && Boolean(env.SMS_GATE_URL && env.SMS_GATE_TOKEN && env.SMS_GATE_DEVICE_ID);
}

/** SMSGate private/device API. An acknowledgement is queued, never proof of delivery. */
export async function sendPhoneOtp(phone: string, code: string, challengeId: string) {
  const env = getEnv();
  if (!smsGatewayReady()) return false;
  const base = new URL(env.SMS_GATE_URL!);
  const local = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(base.hostname);
  if ((!local && base.protocol !== "https:") || base.username || base.password || base.search || base.hash) throw new Error("SMS gateway needs a secure configured endpoint.");
  // Public cloud plaintext is unsuitable for OTPs; use the private endpoint.
  if (base.hostname === "api.sms-gate.app") throw new Error("Configure a private SMS gateway for verification messages.");
  const endpoint = `${base.toString().replace(/\/$/, "")}/messages`;
  const response = await fetch(endpoint, { method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000), headers: { "content-type": "application/json", authorization: `Bearer ${env.SMS_GATE_TOKEN}` }, body: JSON.stringify({ id: challengeId, textMessage: { text: `Saranankara Oil Mart verification code: ${code}. Expires in 10 minutes. Do not share this code.` }, phoneNumbers: [phone], ...(env.SMS_GATE_DEVICE_ID ? { deviceId: env.SMS_GATE_DEVICE_ID } : {}), ...(env.SMS_GATE_SIM_NUMBER ? { simNumber: env.SMS_GATE_SIM_NUMBER } : {}), ttl: 600, withDeliveryReport: true }) });
  if (!response.ok) throw new Error("SMS gateway could not accept the message. Try again later.");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string" || "state" in body && ["Failed", "Cancelled"].includes(String(body.state))) throw new Error("SMS gateway could not accept the message. Try again later.");
  return true;
}
