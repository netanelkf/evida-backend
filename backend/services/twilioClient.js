// Thin wrapper around Twilio so actionWorker.js doesn't construct its own
// client, and so "not configured" is handled in exactly one place.
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

const isConfigured = Boolean(accountSid && authToken && fromNumber);

let client = null;
if (isConfigured) {
  client = twilio(accountSid, authToken);
} else {
  console.warn(
    '[Twilio] Not configured — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and ' +
    'TWILIO_FROM_NUMBER must all be set. SMS/WhatsApp/call actions will be ' +
    'marked FAILED (not silently "sent") until these are set.'
  );
}

export { client, isConfigured, fromNumber, whatsappFrom };
