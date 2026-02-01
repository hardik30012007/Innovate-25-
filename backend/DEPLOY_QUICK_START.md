# Quick Start: Deploy to Fly.io

## 1. Install Fly.io CLI
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

## 2. Login
```bash
fly auth login
```

## 3. Deploy
```bash
cd "D:\git\Innovate 25'\Innovate-25-\backend"
fly launch
fly secrets set GEMINI_API_KEY="your-api-key-here"
fly deploy
```

## 4. Your Backend URL
```
https://urbangreen-delhi-backend.fly.dev
```

## 5. Update Frontend
Point your frontend API calls to the Fly.io URL above.

---

**Full Guide:** See `FLY_DEPLOYMENT.md` for detailed instructions.
