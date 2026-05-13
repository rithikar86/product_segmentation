# VoltStream

A clean rontend/ and ackend/ project split for VoltStream.

## Overview

- rontend/ contains the Next.js UI and client-side code.
- ackend/ contains the Python Flask backend, analytics modules, and database.
- The frontend communicates with the backend via http://localhost:5000/api/.
- The backend reads SMTP configuration from ackend/.env.

## Local Startup

Open two terminals.

### Terminal 1 � Backend

`powershell
cd backend
python backend.py
`

The backend starts on http://localhost:5000.

### Terminal 2 � Frontend

`powershell
cd frontend
npm install
npm run dev
`

The frontend starts on http://localhost:3000.

## Data Ingestion and Analytics

- Frontend uploads transaction datasets to `/api/upload`.
- Backend ingests CSV/Excel sales data with Pandas, stores transactions in MongoDB, and runs RFM segmentation.
- The dashboard displays customer segment distribution, top products by segment, and live RFM customer profiles.

## Important Files

- ackend/backend.py � Flask backend entrypoint.
- ackend/.env � local SMTP configuration file.
- rontend/app/api/notify/route.ts � Next.js email bridge.
- rontend/app/simulator/page.tsx � simulator page with VoltStream branding.

## Notes

- Keep ackend/.env private.
- rontend/ and ackend/ can be deployed separately.
- The user interface uses the VoltStream dark theme with electric blue and amber accents.
