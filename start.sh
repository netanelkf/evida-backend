#!/bin/bash
# Start backend and wearable app

# Start backend API server
cd /home/runner/workspace/backend
node index.js &

# Wait for backend to start
sleep 2

# Start wearable app (React frontend)
cd /home/runner/workspace/apps/wearable
npm run dev
