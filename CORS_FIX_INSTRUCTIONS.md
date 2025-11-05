# 🔧 CORS Fix Instructions

## 🚨 Current Issue

Your frontend at `https://docubridge-intership.vercel.app` cannot communicate with your backend at `https://docubridge-intership-1.onrender.com` because of CORS (Cross-Origin Resource Sharing) policy.

## ✅ Solution: Update Backend CORS Settings

### Step 1: Go to Render Dashboard
1. Visit: https://dashboard.render.com
2. Log in to your account
3. Find your backend service (likely named `docubridge-backend` or `docubridge-intership-1`)

### Step 2: Update Environment Variables
1. Click on your backend service
2. Go to the **"Environment"** tab
3. Find the `CORS_ORIGINS` environment variable
4. **Update it** to include your Vercel frontend URL:

```
CORS_ORIGINS=https://docubridge-intership.vercel.app
```

**OR** if you want to allow multiple origins (including localhost for development):

```
CORS_ORIGINS=https://docubridge-intership.vercel.app,http://localhost:3000
```

### Step 3: Save and Redeploy
1. Click **"Save Changes"**
2. Render will automatically redeploy your backend
3. Wait 2-5 minutes for the redeploy to complete

### Step 4: Verify
1. Try uploading a file again on your Vercel frontend
2. Check the browser console - CORS errors should be gone
3. The app should work! 🎉

## 📝 Alternative: Update Frontend API URL

Make sure your Vercel frontend has the correct backend URL:

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Check that `REACT_APP_API_URL` is set to:
   ```
   https://docubridge-intership-1.onrender.com
   ```
5. If it's missing or wrong, add/update it
6. Redeploy the frontend

## ✅ Both fixes applied?

Your app should now work end-to-end:
- ✅ Frontend deployed on Vercel
- ✅ Backend deployed on Render
- ✅ CORS configured correctly
- ✅ Frontend API URL points to backend

Test it out! 🚀


