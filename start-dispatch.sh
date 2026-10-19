#!/bin/bash
# Start backend and dispatch center app

# Start backend API server
cd /home/runner/workspace/backend
node index.js &

# Wait for backend to start
sleep 2

# Start dispatch center (React frontend)
cd /home/runner/workspace/apps/dispatch-center
npm run dev
