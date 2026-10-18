import pool from '../db/pool.js';

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

async function sendSMS(action) {
  console.log(`[ActionWorker] STUB: Would send SMS to ${action.recipient}`);
  console.log(`[ActionWorker] STUB: Payload: ${JSON.stringify(action.payload_json)}`);
  return true;
}

async function sendWhatsApp(action) {
  console.log(`[ActionWorker] STUB: Would send WhatsApp to ${action.recipient}`);
  console.log(`[ActionWorker] STUB: Payload: ${JSON.stringify(action.payload_json)}`);
  return true;
}

async function sendEmail(action) {
  console.log(`[ActionWorker] STUB: Would send Email to ${action.recipient}`);
  console.log(`[ActionWorker] STUB: Payload: ${JSON.stringify(action.payload_json)}`);
  return true;
}

async function sendPush(action) {
  console.log(`[ActionWorker] STUB: Would send Push notification to ${action.recipient}`);
  console.log(`[ActionWorker] STUB: Payload: ${JSON.stringify(action.payload_json)}`);
  return true;
}

async function initiateCall(action) {
  console.log(`[ActionWorker] STUB: Would initiate call to ${action.recipient}`);
  console.log(`[ActionWorker] STUB: Payload: ${JSON.stringify(action.payload_json)}`);
  return true;
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
