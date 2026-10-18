// Express app setup
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler, rateLimitMiddleware } from './middleware/index.js';

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.APP_URL
    : '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(rateLimitMiddleware);

app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

app.use('/api', routes);

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>eVida Life360 Health API v2.0</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 800px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .logo {
      width: 60px;
      height: 60px;
      background: #0ea5e9;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo svg { width: 36px; height: 36px; fill: white; }
    h1 { font-size: 28px; color: #0f172a; }
    .version {
      display: inline-block;
      background: #22c55e;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-left: 8px;
    }
    .status {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .status-dot {
      width: 12px;
      height: 12px;
      background: #22c55e;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    h2 { font-size: 18px; color: #475569; margin-bottom: 16px; }
    .endpoints {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    .endpoint {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      transition: all 0.2s;
    }
    .endpoint:hover {
      background: #f0f9ff;
      border-color: #0ea5e9;
    }
    .endpoint-name { font-weight: 600; color: #0f172a; }
    .endpoint-path { font-size: 13px; color: #64748b; font-family: monospace; }
    .features {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .feature {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #475569;
    }
    .feature svg { width: 20px; height: 20px; fill: #22c55e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      </div>
      <div>
        <h1>eVida Life360 Health API <span class="version">v2.0</span></h1>
      </div>
    </div>

    <div class="status">
      <div class="status-dot"></div>
      <span style="color: #166534; font-weight: 500;">API is running - Sandbox Architecture Active</span>
    </div>

    <h2>API Endpoints</h2>
    <div class="endpoints">
      <div class="endpoint">
        <div class="endpoint-name">Authentication</div>
        <div class="endpoint-path">/api/auth</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-name">Users</div>
        <div class="endpoint-path">/api/users</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-name">Caregivers</div>
        <div class="endpoint-path">/api/caregivers</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-name">Devices</div>
        <div class="endpoint-path">/api/devices</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-name">ROOK (400+ Devices)</div>
        <div class="endpoint-path">/api/rook</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-name">Vitals</div>
        <div class="endpoint-path">/api/vitals</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-name">Alerts</div>
        <div class="endpoint-path">/api/alerts</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-name">Incidents</div>
        <div class="endpoint-path">/api/incidents</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-name">Health Score</div>
        <div class="endpoint-path">/api/health-score</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-name">Subscriptions</div>
        <div class="endpoint-path">/api/subscriptions</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-name">Dispatch</div>
        <div class="endpoint-path">/api/dispatch</div>
      </div>
      <div class="endpoint">
        <div class="endpoint-name">Notifications</div>
        <div class="endpoint-path">/api/notifications</div>
      </div>
    </div>

    <div class="features">
      <h2>New in v2.0</h2>
      <div class="feature-grid">
        <div class="feature">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span>Health Score (0-100)</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span>Caregiver System</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span>Alert Engine</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span>Incident Workflow</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span>ROOK Integration</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span>Subscription Tiers</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span>Stripe Webhooks</span>
        </div>
        <div class="feature">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span>15 Database Tables</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `);
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use(errorHandler);

export default app;
