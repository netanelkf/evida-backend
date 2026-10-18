#!/bin/bash

echo "Starting eVida Life360 Health API v2.0 (Sandbox)"
echo "================================================"

cd sandbox_refactor/backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the backend API on port 5000 for webview
PORT=5000 node index.js
