# 🐛 Debugging Guide

## ⚠️ CRITICAL: Check Environment FIRST!

**Before debugging ANY issue, run:**

```bash
node check-environment.cjs
```

This will tell you if you're debugging **dev** or **production**.

---

## 🌍 Environment Overview

### Development (Local)
- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:3002`
- **Supabase**: `https://kclnrglcnfvfhkexizxl.supabase.co`
- **Purpose**: Local testing, development

### Production (Live)
- **Frontend**: `https://grapplay.vercel.app`
- **Backend**: `https://grapplay-backend.onrender.com`
- **Supabase**: `https://vbfxwlhmgyvafskyukxa.supabase.co`
- **Purpose**: Live user-facing application

---

## 🔍 How to Debug Production Issues

### Step 1: Identify the Environment
```bash
node check-environment.cjs
```

If it shows **DEVELOPMENT**, you're looking at the wrong environment!

### Step 2: Check Production Logs

#### Frontend (Vercel)
1. Go to https://vercel.com/dashboard
2. Select `grapplay` project
3. Click **Deployments** → Latest deployment
4. Click **View Function Logs**

#### Backend (Render)
1. Go to https://dashboard.render.com
2. Select `grapplay-backend` service
3. Click **Logs** tab
4. Filter by time range

### Step 3: Check Production Supabase

1. Go to https://supabase.com/dashboard
2. Select **production project** (vbfxwlhmgyvafskyukxa)
3. Check:
   - **Database** → `drills` table
   - **Storage** → `raw_videos_v2` bucket
   - **Logs** → Recent errors

---

## 🛠️ Common Issues & Solutions

### Issue: "Files not found in storage"

**Check which environment:**
```bash
node check-environment.cjs
```

**If showing DEV**: You're checking the wrong database!
- Local dev storage is separate from production
- Files uploaded to production won't appear in dev

**Solution**: Check production Supabase dashboard directly

---

### Issue: "Backend returns 400 error"

**Likely causes:**
1. Storage bucket not public
2. File doesn't exist
3. Wrong Supabase credentials

**Debug steps:**
1. Check Render backend logs (not local logs!)
2. Verify Supabase bucket is public
3. Check environment variables in Render dashboard

---

## 📋 Debugging Checklist

When user reports an issue:

- [ ] Ask: "Is this in production or local dev?"
- [ ] Run `node check-environment.cjs` to verify
- [ ] Check **production** logs (Vercel + Render)
- [ ] Check **production** Supabase dashboard
- [ ] Do NOT check local dev unless issue is local

---

## 🚨 Red Flags

**You're debugging the wrong environment if:**
- ✗ Local storage has 0 files but user says they uploaded
- ✗ Local database has old data but user just created new content
- ✗ Backend logs show activity but local server isn't running

**Solution**: Switch to production debugging!

---

## 📞 Quick Reference

| What | Dev | Production |
|------|-----|------------|
| Frontend | localhost:5173 | grapplay.vercel.app |
| Backend | localhost:3002 | grapplay-backend.onrender.com |
| Supabase | kclnrglcnfvfhkexizxl | vbfxwlhmgyvafskyukxa |
| Logs | Terminal | Vercel/Render Dashboard |

---

## 💡 Best Practices

1. **Always run `check-environment.cjs` first**
2. **Ask user which environment** they're using
3. **Check production dashboards** for production issues
4. **Don't assume** local = production
5. **Verify environment** before making changes
