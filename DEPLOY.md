# Deployment Guide - Sales Coach AI

## Quick Start - Render.com (Recommended)

### Prerequisites
- GitHub account with your code pushed
- Render.com account (free)
- Twilio account configured
- Supabase project set up

---

## Step 1: Push to GitHub

```bash
cd /Users/omerzano/Downloads/עבודה/Sales\ Coach
git add .
git commit -m "Prepare for deployment"
git push origin main
```

---

## Step 2: Create Render Web Service

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `salescoach-api` |
| **Region** | Frankfurt (EU Central) |
| **Branch** | `main` |
| **Root Directory** | (leave empty) |
| **Runtime** | Node |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (or Starter for production) |

---

## Step 3: Add Environment Variables

In Render dashboard → Environment → Add the following:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5050` |
| `SUPABASE_URL` | `https://ofrnqqvujueivirduyqv.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | (your service role key) |
| `TWILIO_ACCOUNT_SID` | (from Twilio console) |
| `TWILIO_AUTH_TOKEN` | (from Twilio console) |
| `TWILIO_TWIML_APP_SID` | (from Twilio console) |
| `TWILIO_PHONE_NUMBER` | (your Twilio phone number) |
| `OPENAI_API_KEY` | (your OpenAI key) |
| `SONIOX_API_KEY` | (your Soniox key) |

---

## Step 4: Configure Twilio Webhooks

After deployment, copy your Render URL (e.g., `https://salescoach-api.onrender.com`)

1. Go to **Twilio Console** → **Phone Numbers** → Your number
2. Set Voice webhook: `https://salescoach-api.onrender.com/voice`
3. Set Status callback: `https://salescoach-api.onrender.com/voice/status`

4. Go to **TwiML Apps** → Your app
5. Set Voice URL: `https://salescoach-api.onrender.com/voice`

---

## Step 5: Update Frontend Config

After deployment, update the frontend to use production API:

In `client/vite.config.ts`, the proxy already handles this for development.
For production, the frontend is served from the same server, so no changes needed.

---

## Alternative: Railway.app

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select your repository
4. Railway auto-detects Node.js
5. Add environment variables in Settings → Variables
6. Deploy!

Railway provides:
- Automatic HTTPS
- Custom domains
- Better uptime (paid plan)

---

## Verify Deployment

After deployment:

1. Visit `https://your-app.onrender.com` - should see the app
2. Check `/api/system/health` - should return `{"status": "ok"}`
3. Test login with your Supabase credentials
4. Make a test call to verify Twilio integration

---

## Troubleshooting

### App won't start
- Check Render logs for errors
- Verify all environment variables are set
- Make sure `npm run build` succeeds locally

### Twilio calls fail
- Verify webhook URLs use HTTPS
- Check Twilio debugger for errors
- Ensure ngrok is NOT running (conflicts with production)

### Database errors
- Verify Supabase URL and key are correct
- Check RLS policies allow your operations

---

## Monitoring

- **Render Dashboard**: View logs, metrics, and deployment history
- **Twilio Debugger**: Monitor call logs and webhook failures
- **Supabase Dashboard**: Monitor database queries and auth

---

## Costs (Estimated)

| Service | Free Tier | Paid |
|---------|-----------|------|
| Render | 750 hrs/month (spins down after inactivity) | $7/mo (Starter) |
| Twilio | Trial credits | Pay as you go |
| Supabase | 500MB DB, 2GB storage | $25/mo (Pro) |
| OpenAI | None | Pay as you go |

For production use, consider:
- Render Starter plan ($7/mo) - no spin-down
- Custom domain with SSL
