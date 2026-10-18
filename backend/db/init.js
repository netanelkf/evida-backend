import pool from './pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initIncidentDatabase() {
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    console.log('[Database] Incident tables initialized successfully');
    return true;
  } catch (error) {
    console.error('[Database] Error initializing tables:', error.message);
    return false;
  } finally {
    client.release();
  }
}
