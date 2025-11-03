# 🚀 Deployment Guide: DocuBridge AI

Complete deployment guide for deploying DocuBridge AI to production using **Render** (Backend) and **Vercel** (Frontend).

---

## 📋 Prerequisites

1. **GitHub Account**: Code should be pushed to GitHub
2. **Render Account**: Sign up at [render.com](https://render.com) (free tier available)
3. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) (free tier available)
4. **OpenRouter API Key**: Get from [openrouter.ai](https://openrouter.ai)

---

## 🔧 Step 1: Push Code to GitHub

### 1.1 Initialize Git (if not already done)
```bash
# Navigate to project root
cd DOCUBRIDGE-1

# Initialize git (if needed)
git init

# Add remote (replace with your repo URL)
git remote add origin https://github.com/tejask-dev/Docubridge-Intership.git
```

### 1.2 Commit and Push
```bash
# Add all files
git add .

# Commit
git commit -m "Production-ready deployment: Full mobile responsiveness, AI chat, chart generation"

# Push to main branch
git push -u origin master
# OR if your default branch is main:
git push -u origin main
```

---

## 🖥️ Step 2: Deploy Backend to Render

### 2.1 Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository:
   - Click **"Connect GitHub"**
   - Authorize Render
   - Select `tejask-dev/Docubridge-Intership` repository

### 2.2 Configure Backend Service

**Basic Settings:**
- **Name**: `docubridge-backend` (or your preferred name)
- **Environment**: `Python 3`
- **Region**: Choose closest to your users (e.g., `Oregon (US West)`)
- **Branch**: `master` or `main`
- **Root Directory**: `Backend`

**Build Settings:**
- **Build Command**: 
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**: 
  ```bash
  gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 app:app
  ```

### 2.3 Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add:

```
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
FLASK_SECRET_KEY=your-super-secret-key-minimum-32-characters-long
FLASK_ENV=production
FLASK_DEBUG=False
CORS_ORIGINS=https://your-vercel-app.vercel.app,https://your-vercel-app.vercel.app
PYTHON_VERSION=3.9.18
```

**Important Notes:**
- Replace `OPENROUTER_API_KEY` with your actual API key
- Generate a strong `FLASK_SECRET_KEY` (32+ characters, random)
- Replace `CORS_ORIGINS` with your Vercel frontend URL (we'll update this after frontend deployment)

### 2.4 Create Persistent Disk (for file uploads)

1. In Render dashboard, go to **"Disks"** tab
2. Click **"Create Disk"**
3. **Name**: `docubridge-storage`
4. **Mount Path**: `/opt/render/project/src/uploads`
5. **Size**: 1 GB (free tier) or more if needed

**Update Start Command** to create directories:
```bash
mkdir -p uploads charts logs && gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 app:app
```

### 2.5 Deploy

1. Click **"Create Web Service"**
2. Wait for build to complete (5-10 minutes)
3. Note your backend URL: `https://docubridge-backend.onrender.com` (or your custom domain)

### 2.6 Test Backend

Visit: `https://your-backend-url.onrender.com/health`

Should return: `{"status": "healthy", "timestamp": "..."}`

---

## 🌐 Step 3: Deploy Frontend to Vercel

### 3.1 Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import `tejask-dev/Docubridge-Intership` repository
4. Click **"Import"**

### 3.2 Configure Frontend

**Project Settings:**
- **Framework Preset**: `Create React App` (or auto-detected)
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `build`

**Environment Variables:**
Click **"Environment Variables"** and add:

```
REACT_APP_API_URL=https://your-backend-url.onrender.com
```

**Important:** Replace with your actual Render backend URL from Step 2.5

### 3.3 Advanced Settings (Optional)

**Under "Settings" → "General":**
- **Node.js Version**: `18.x` or `20.x`
- **Install Command**: `npm install`
- **Build Command**: `npm run build`
- **Output Directory**: `build`

**Redirects/Rewrites:**
Vercel will auto-detect the `vercel.json` file and use it.

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait for build (2-5 minutes)
3. Your app will be live at: `https://your-app.vercel.app`

---

## 🔄 Step 4: Update CORS Settings

### 4.1 Update Backend CORS

1. Go back to Render Dashboard
2. Navigate to your backend service
3. Go to **"Environment"** tab
4. Update `CORS_ORIGINS` environment variable:

```
CORS_ORIGINS=https://your-vercel-app.vercel.app,https://your-vercel-app.vercel.app
```

5. **Save Changes** (this will trigger a redeploy)

### 4.2 Verify CORS

After redeploy, test API connection from frontend. Check browser console for CORS errors.

---

## ✅ Step 5: Verify Deployment

### 5.1 Test Frontend
1. Visit your Vercel URL
2. Try uploading a file
3. Test AI chat functionality
4. Verify chart generation

### 5.2 Test Backend
```bash
# Health check
curl https://your-backend.onrender.com/health

# Should return: {"status": "healthy", ...}
```

### 5.3 Monitor Logs

**Render (Backend):**
- Go to your service → **"Logs"** tab
- Monitor for errors

**Vercel (Frontend):**
- Go to your project → **"Deployments"** → Click deployment → **"Functions"** or **"Logs"**

---

## 🔐 Step 6: Custom Domains (Optional)

### 6.1 Backend Custom Domain (Render)

1. In Render dashboard → Your service → **"Settings"**
2. Scroll to **"Custom Domains"**
3. Click **"Add Custom Domain"**
4. Enter your domain (e.g., `api.docubridge.com`)
5. Update DNS records as instructed

### 6.2 Frontend Custom Domain (Vercel)

1. In Vercel dashboard → Your project → **"Settings"** → **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `docubridge.com`)
4. Update DNS records as instructed
5. Update `REACT_APP_API_URL` to use custom backend domain

---

## 🐛 Troubleshooting

### Backend Issues

**Build Fails:**
- Check `requirements.txt` is correct
- Verify Python version (3.9.18 recommended)
- Check Render logs for specific errors

**Service Won't Start:**
- Verify `gunicorn` is in `requirements.txt`
- Check start command uses `$PORT` (not hardcoded port)
- Verify environment variables are set

**CORS Errors:**
- Ensure `CORS_ORIGINS` includes your Vercel URL (with `https://`)
- No trailing slashes in CORS_ORIGINS
- Redeploy after changing CORS settings

**File Upload Issues:**
- Verify disk is mounted correctly
- Check `uploads/` directory has write permissions
- Ensure disk has enough space

### Frontend Issues

**Build Fails:**
- Check Node.js version (18+ required)
- Verify all dependencies in `package.json`
- Check Vercel build logs for specific errors

**API Connection Fails:**
- Verify `REACT_APP_API_URL` is correct
- Check backend is running (visit `/health` endpoint)
- Verify CORS settings on backend
- Check browser console for specific errors

**Blank Page:**
- Check browser console for errors
- Verify build completed successfully
- Check `vercel.json` configuration

---

## 📊 Step 7: Monitoring & Maintenance

### 7.1 Set Up Monitoring

**Render:**
- Built-in metrics dashboard
- Set up email alerts for downtime
- Monitor disk usage

**Vercel:**
- Analytics dashboard (paid feature)
- Error tracking with Sentry (optional)
- Monitor build times

### 7.2 Auto-Deployments

Both services support automatic deployments:
- **Render**: Auto-deploys on push to connected branch
- **Vercel**: Auto-deploys on push to main/master branch

### 7.3 Update Environment Variables

**Render:**
- Go to service → **"Environment"** tab
- Click **"Add Environment Variable"** or edit existing
- Changes trigger automatic redeploy

**Vercel:**
- Go to project → **"Settings"** → **"Environment Variables"**
- Add/update variables
- Redeploy manually or wait for next push

---

## 💰 Cost Estimation

### Free Tier Limits

**Render (Free Tier):**
- 750 hours/month (enough for 1 service running 24/7)
- 512 MB RAM
- Spins down after 15 minutes of inactivity
- 1 GB disk space

**Vercel (Free Tier):**
- Unlimited deployments
- 100 GB bandwidth/month
- Serverless functions (generous limits)
- No credit card required

**Upgrade Needed If:**
- Backend needs to stay awake (no spin-down)
- More than 1 GB disk space
- More than 512 MB RAM
- Custom domain with SSL

---

## 📝 Quick Reference

### Backend URL
```
https://your-backend-name.onrender.com
```

### Frontend URL
```
https://your-app-name.vercel.app
```

### Key Endpoints
- Health: `GET /health`
- Upload: `POST /upload`
- AI Chat: `POST /ai_chat`
- Charts: `GET /get_chart/:id`

### Environment Variables Needed

**Backend (Render):**
- `OPENROUTER_API_KEY`
- `FLASK_SECRET_KEY`
- `FLASK_ENV=production`
- `CORS_ORIGINS`

**Frontend (Vercel):**
- `REACT_APP_API_URL`

---

## 🎉 Success!

Your DocuBridge AI application is now live! Share your Vercel URL with users.

**Next Steps:**
- Set up custom domains
- Configure monitoring/alerts
- Optimize performance
- Add analytics tracking

---

## 📞 Support

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Issues**: [GitHub Issues](https://github.com/tejask-dev/Docubridge-Intership/issues)

