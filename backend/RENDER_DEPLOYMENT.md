# Render Deployment Guide for UrbanGreen Delhi Backend

## Prerequisites
- GitHub account with your code pushed
- Render account (free): https://render.com

## Deployment Steps

### 1. Sign Up / Login to Render
Go to https://render.com and sign up with your GitHub account.

### 2. Create New Web Service

1. Click **"New +"** button → Select **"Web Service"**
2. Connect your GitHub repository: `rnjn777/Innovate-25-`
3. Select the repository

### 3. Configure the Service

Fill in the following settings:

**Basic Settings:**
- **Name**: `urbangreen-delhi-backend`
- **Region**: `Singapore` (closest to India)
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Python 3`

**Build Settings:**
- **Build Command**: 
  ```bash
  pip install -r requirements.txt
  ```

- **Start Command**:
  ```bash
  gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
  ```

**Instance Settings:**
- **Instance Type**: `Free` (select the free tier)

### 4. Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add the following:
- **Key**: `GEMINI_API_KEY`
- **Value**: `your-actual-gemini-api-key-here`

### 5. Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Start your application

### 6. Get Your Backend URL

After deployment completes, your backend will be available at:
```
https://urbangreen-delhi-backend.onrender.com
```

## Update Frontend

Update your frontend API calls to use the Render URL:
```javascript
const API_BASE_URL = 'https://urbangreen-delhi-backend.onrender.com';
```

## Important Notes

### Free Tier Limitations:
- ⚠️ **Spins down after 15 minutes of inactivity**
- ⚠️ **First request after spin-down takes 30-60 seconds** (cold start)
- ✅ Automatic deploys on git push
- ✅ 750 hours/month free

### Auto-Deploy:
- Every push to `main` branch triggers automatic deployment
- No manual deployment needed after initial setup

## Monitoring

### View Logs:
1. Go to your service dashboard
2. Click **"Logs"** tab
3. View real-time logs

### Check Status:
- Dashboard shows deployment status
- Green = Running
- Yellow = Building
- Red = Failed

## Troubleshooting

### Build Fails:
1. Check logs in Render dashboard
2. Verify `requirements.txt` is correct
3. Ensure `Procfile` exists in backend directory

### App Not Starting:
1. Check environment variables are set
2. Verify start command is correct
3. Check logs for errors

### Cold Start Issues:
- First request after inactivity takes time
- Consider upgrading to paid tier for always-on service
- Or use a service like UptimeRobot to ping your app every 14 minutes

## Useful Commands

### Manual Deploy:
1. Go to service dashboard
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

### View Environment Variables:
1. Service dashboard → **"Environment"** tab

### Restart Service:
1. Service dashboard → **"Manual Deploy"** → **"Clear build cache & deploy"**

## Cost Information

**Free Tier:**
- 750 hours/month
- Spins down after 15 minutes inactivity
- 512 MB RAM
- Shared CPU

**Paid Tier** (if needed later):
- $7/month for always-on
- More RAM and CPU options

## Next Steps

1. ✅ Deploy backend on Render
2. ✅ Get your backend URL
3. ✅ Update frontend to use Render URL
4. ✅ Push frontend changes to trigger Netlify deploy
5. ✅ Test the complete application

## Alternative: Keep Backend Awake

To prevent cold starts on free tier, use a service like:
- **UptimeRobot** (free): Ping your backend every 5 minutes
- **Cron-job.org** (free): Schedule HTTP requests

Add a health check endpoint (already exists at `/`):
```
https://urbangreen-delhi-backend.onrender.com/
```

---

**That's it!** Your backend will be live on Render with automatic deployments. 🚀
