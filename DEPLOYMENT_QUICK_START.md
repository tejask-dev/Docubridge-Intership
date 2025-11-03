# 🚀 Quick Deployment Checklist

## 1️⃣ Push to GitHub
```bash
git add .
git commit -m "Production-ready: Mobile responsive, AI chat, chart generation"
git push origin master  # or main
```

## 2️⃣ Deploy Backend (Render)

### Go to: https://dashboard.render.com

**Create Web Service:**
- Connect GitHub repo: `tejask-dev/Docubridge-Intership`
- **Root Directory**: `Backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: 
  ```bash
  mkdir -p uploads charts logs && gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 app:app
  ```

**Environment Variables:**
```
OPENROUTER_API_KEY=your-key-here
FLASK_SECRET_KEY=your-32-char-secret-key
FLASK_ENV=production
FLASK_DEBUG=False
CORS_ORIGINS=https://your-app.vercel.app
PYTHON_VERSION=3.9.18
```

**After deployment, note your backend URL:**
```
https://your-backend.onrender.com
```

## 3️⃣ Deploy Frontend (Vercel)

### Go to: https://vercel.com/dashboard

**Import Project:**
- Connect GitHub repo
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `build`

**Environment Variable:**
```
REACT_APP_API_URL=https://your-backend.onrender.com
```

**After deployment, note your frontend URL:**
```
https://your-app.vercel.app
```

## 4️⃣ Update CORS

Go back to Render → Your backend service → Environment:
- Update `CORS_ORIGINS` with your Vercel URL
- Save (auto-redeploys)

## 5️⃣ Test

1. Visit Vercel URL
2. Upload a file
3. Test AI chat
4. Generate charts

## ✅ Done!

Your app is live! 🎉

**Backend:** https://your-backend.onrender.com  
**Frontend:** https://your-app.vercel.app

---

See `DEPLOYMENT.md` for detailed instructions.

