#!/bin/bash
cd /workspace/backend && node server.js &
cd /workspace/frontend && npx vite --host 0.0.0.0 --port 5173
