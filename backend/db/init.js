import pool from './pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Splits the schema file into individual statements. Running the whole file
// as one query means Postgres treats it as a single implicit transaction —
// one failing statement (e.g. a leftover legacy table conflicting with a
// constraint) rolls back every statement in the file, including unrelated
// ones that would otherwise have succeeded. Running them one at a time means
// a single bad statement only skips itself.
function splitStatements(sql) {
  // Strip "-- ..." comments line by line first. A naive split on ";" alone
  // breaks if a comment contains a literal semicolon (this file has one:
  // "-- (generic multi-brand table; Fitbit OAuth uses this today)"), which
  // merges the comment's tail into the next real statement and fails it.
  const withoutComments = sql
    .split('\n')
    .map(line => {
      const idx = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');

  return withoutComments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export async function initIncidentDatabase() {
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const statements = splitStatements(schema);

    let failures = 0;
    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (error) {
        failures++;
        console.error(`[Database] Statement failed, continuing with the rest: ${error.message}`);
        console.error(`[Database]   -> ${statement.slice(0, 120).replace(/\s+/g, ' ')}...`);
      }
    }

    if (failures > 0) {
      console.warn(`[Database] Schema init finished with ${failures} failing statement(s) out of ${statements.length} — see above`);
    } else {
      console.log('[Database] Incident tables initialized successfully');
    }
    return failures === 0;
  } finally {
    client.release();
  }
}
