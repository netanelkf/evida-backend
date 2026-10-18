import pool from '../db/pool.js';
import { client as twilioClient, isConfigured as twilioConfigured, fromNumber, whatsappFrom } from './twilioClient.js';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [60, 120, 300];

let workerInterval = null;

async function processActions() {
  try {
    const result = await pool.query(
      `SELECT * FROM sos_actions
       WHERE status = 'PENDING'
       AND next_attempt_at <= NOW()
       ORDER BY created_at
       LIMIT 10`
    );

    const actions = result.rows;

    if (actions.length === 0) {
      return;
    }

    console.log(`[ActionWorker] Processing ${actions.length} pending actions`);

    for (const action of actions) {
      await processAction(action);
    }
  } catch (error) {
    console.error('[ActionWorker] Error processing actions:', error.message);
  }
}

async function processAction(action) {
  try {
    const success = await sendNotification(action);

    if (success) {
      await pool.query(
        `UPDATE sos_actions SET status = 'SENT', attempts = attempts + 1 WHERE id = $1`,
        [action.id]
      );
      console.log(`[ActionWorker] Action ${action.id} sent successfully`);
    } else {
      throw new Error('Send failed');
    }
  } catch (error) {
    const newAttempts = action.attempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      await pool.query(
        `UPDATE sos_actions SET status = 'FAILED', attempts = $1 WHERE id = $2`,
        [newAttempts, action.id]
      );
      console.log(`[ActionWorker] Action ${action.id} failed after ${newAttempts} attempts`);
    } else {
      const delaySeconds = RETRY_DELAYS[newAttempts - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      await pool.query(
        `UPDATE sos_actions
         SET attempts = $1, next_attempt_at = NOW() + INTERVAL '${delaySeconds} seconds'
         WHERE id = $2`,
        [newAttempts, action.id]
      );
      console.log(`[ActionWorker] Action ${action.id} will retry in ${delaySeconds}s (attempt ${newAttempts})`);
    }
  }
}

async function sendNotification(action) {
  console.log(`[ActionWorker] Processing action: ${action.action_type} via ${action.channel} to ${action.recipient}`);

  switch (action.channel) {
    case 'SMS':
      return await sendSMS(action);
    case 'WHATSAPP':
      return await sendWhatsApp(action);
    case 'EMAIL':
      return await sendEmail(action);
    case 'PUSH':
      return await sendPush(action);
    case 'PHONE':
      return await initiateCall(action);
    default:
      console.log(`[ActionWorker] Unknown channel: ${action.channel}`);
      return true;
  }
}

function actionMessage(action) {
  const payload = typeof action.payload_json === 'string' ? JSON.parse(action.payload_json) : action.payload_json;
  return payload?.message || 'eVida: se detectó una alerta. Revisa la app para más detalles.';
}

async function sendSMS(action) {
  if (!twilioConfigured) {
    console.error(`[ActionWorker] Twilio not configured — cannot send real SMS to ${action.recipient}`);
    return false;
  }
  try {
    const result = await twilioClient.messages.create({
      to: action.recipient,
      from: fromNumber,
      body: actionMessage(action)
    });
    console.log(`[ActionWorker] SMS sent to ${action.recipient} (sid ${result.sid}, status ${result.status})`);
    return true;
  } catch (error) {
    console.error(`[ActionWorker] SMS to ${action.recipient} failed:`, error.message);
    return false;
  }
}

async function sendWhatsApp(action) {
  if (!twilioConfigured || !whatsappFrom) {
    console.error(`[ActionWorker] Twilio WhatsApp not configured (needs TWILIO_WHATSAPP_FROM) — cannot send to ${action.recipient}`);
    return false;
  }
  try {
    const result = await twilioClient.messages.create({
      to: `whatsapp:${action.recipient}`,
      from: `whatsapp:${whatsappFrom}`,
      body: actionMessage(action)
    });
    console.log(`[ActionWorker] WhatsApp sent to ${action.recipient} (sid ${result.sid}, status ${result.status})`);
    return true;
  } catch (error) {
    console.error(`[ActionWorker] WhatsApp to ${action.recipient} failed:`, error.message);
    return false;
  }
}

// No email service connected yet (would need something like SendGrid) —
// still a stub, deliberately. Left honest rather than silently "succeeding"
// is the goal, but nothing currently creates EMAIL actions, so this is low
// priority until a real use needs it.
async function sendEmail(action) {
  console.error(`[ActionWorker] Email not implemented yet — cannot send to ${action.recipient}`);
  return false;
}

// NOTIFY_OPERATOR actions use PUSH to mean "make sure dispatch sees this" —
// today that happens via the live, auto-refreshing incident list in the
// operator console, not a phone push notification (no mobile push
// infrastructure exists yet). Left as a no-op success rather than a failure
// so operator-facing alerts don't pile up as FAILED for a channel nobody
// has asked to build yet.
async function sendPush(action) {
  console.log(`[ActionWorker] No push infrastructure yet — relying on the live operator console for ${action.recipient}`);
  return true;
}

async function initiateCall(action) {
  if (!twilioConfigured) {
    console.error(`[ActionWorker] Twilio not configured — cannot place real call to ${action.recipient}`);
    return false;
  }
  try {
    const message = actionMessage(action);
    const twiml = `<Response><Say language="es-MX">${escapeTwiml(message)}</Say></Response>`;
    const result = await twilioClient.calls.create({
      to: action.recipient,
      from: fromNumber,
      twiml
    });
    console.log(`[ActionWorker] Call placed to ${action.recipient} (sid ${result.sid}, status ${result.status})`);
    return true;
  } catch (error) {
    console.error(`[ActionWorker] Call to ${action.recipient} failed:`, error.message);
    return false;
  }
}

function escapeTwiml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function startWorker(intervalMs = 5000) {
  if (workerInterval) {
    console.log('[ActionWorker] Worker already running');
    return;
  }

  console.log(`[ActionWorker] Starting worker with ${intervalMs}ms interval`);
  workerInterval = setInterval(processActions, intervalMs);

  processActions();
}

export function stopWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[ActionWorker] Worker stopped');
  }
}
