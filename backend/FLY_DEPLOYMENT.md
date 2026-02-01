# Fly.io Deployment Guide for UrbanGreen Delhi Backend

## Prerequisites

1. **Install Fly.io CLI**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   
   # Or download from: https://fly.io/docs/hands-on/install-flyctl/
   ```

2. **Sign up / Login to Fly.io**
   ```bash
   fly auth signup
   # OR
   fly auth login
   ```

## Deployment Steps

### 1. Navigate to Backend Directory
```bash
cd "D:\git\Innovate 25'\Innovate-25-\backend"
```

### 2. Launch the App (First Time)
```bash
fly launch
```

**When prompted:**
- App name: `urbangreen-delhi-backend` (or choose your own)
- Region: Select `sin` (Singapore - closest to India)
- Would you like to set up a Postgresql database? **No**
- Would you like to set up an Upstash Redis database? **No**
- Would you like to deploy now? **No** (we need to set secrets first)

### 3. Set Environment Variables (Secrets)
```bash
# Set your Gemini API key
fly secrets set GEMINI_API_KEY="your-actual-api-key-here"
```

### 4. Deploy the Application
```bash
fly deploy
```

### 5. Check Deployment Status
```bash
# View app status
fly status

# View logs
fly logs

# Open app in browser
fly open
```

### 6. Get Your Backend URL
After deployment, your backend will be available at:
```
https://urbangreen-delhi-backend.fly.dev
```

## Update Frontend to Use Fly.io Backend

Update your frontend API calls to point to:
```javascript
const API_BASE_URL = 'https://urbangreen-delhi-backend.fly.dev';
```

## Useful Commands

```bash
# View app dashboard
fly dashboard

# Scale app (if needed)
fly scale count 1

# Restart app
fly apps restart urbangreen-delhi-backend

# SSH into the running app
fly ssh console

# View metrics
fly metrics

# Destroy app (if needed)
fly apps destroy urbangreen-delhi-backend
```

## Troubleshooting

### If deployment fails:

1. **Check logs:**
   ```bash
   fly logs
   ```

2. **Verify secrets are set:**
   ```bash
   fly secrets list
   ```

3. **Test locally first:**
   ```bash
   docker build -t test-backend .
   docker run -p 8080:8080 -e GEMINI_API_KEY="your-key" test-backend
   ```

### Common Issues:

- **Port binding**: Fly.io sets `PORT` environment variable automatically
- **Memory issues**: Increase memory in `fly.toml` if needed
- **Build failures**: Check Dockerfile and requirements.txt

## Cost Information

- **Free tier**: 3 shared-cpu-1x 256mb VMs
- **Auto-stop**: App stops when idle (free tier)
- **Auto-start**: App starts on first request

## Monitoring

- Dashboard: https://fly.io/dashboard
- Metrics: `fly metrics`
- Logs: `fly logs --app urbangreen-delhi-backend`

## Environment Variables

The following secrets should be set:
- `GEMINI_API_KEY` - Your Google Gemini API key

## Notes

- The app uses Gunicorn with 2 workers
- Timeout set to 120 seconds for AI processing
- Health check endpoint: `/`
- Auto-scaling enabled (min 0, auto-start on request)
