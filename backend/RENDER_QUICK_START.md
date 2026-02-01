# Quick Deploy to Render

## 1. Go to Render
https://render.com → Sign up with GitHub

## 2. Create Web Service
- Click **"New +"** → **"Web Service"**
- Connect repository: `rnjn777/Innovate-25-`
- Root Directory: `backend`

## 3. Settings
- **Name**: `urbangreen-delhi-backend`
- **Region**: `Singapore`
- **Branch**: `main`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`

## 4. Environment Variable
- **Key**: `GEMINI_API_KEY`
- **Value**: Your Gemini API key

## 5. Deploy
Click **"Create Web Service"** → Wait for deployment

## 6. Your URL
```
https://urbangreen-delhi-backend.onrender.com
```

---

**⚠️ Free Tier Note:** App sleeps after 15 min inactivity. First request takes 30-60 seconds.

**Full Guide:** See `RENDER_DEPLOYMENT.md`
