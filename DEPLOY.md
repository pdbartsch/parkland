# Deployment Guide

## Prerequisites
- Google Cloud SDK installed
- Authenticated with Google Cloud

## Steps

1. **Authenticate** (if needed)
   If you see an authentication error, run:
   ```bash
   gcloud auth login
   ```

2. **Deploy**
   Run the following command to deploy the application:
   ```bash
   gcloud app deploy
   ```

3. **Browse**
   Once deployed, view your app:
   ```bash
   gcloud app browse
   ```

## Configuration Changes
- Updated `app.yaml` to use Python 3.11 runtime.
- Added `gunicorn` to `requirements.txt` as the entrypoint server.
- Configured static file serving in `app.yaml`.
