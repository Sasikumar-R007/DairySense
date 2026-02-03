# Assets Folder Placement Guide

## Current Issue
Images are not displaying on the landing page because the assets folder is not in the correct location.

## Solution

### Step 1: Copy Assets to Public Folder

The assets folder needs to be in `frontend/public/assests/` (note: keep the spelling as `assests` to match your current code).

**Current location:** `assests/` (root of project)  
**Required location:** `frontend/public/assests/`

### Step 2: Copy Files

Copy all image files from:
```
assests/
```

To:
```
frontend/public/assests/
```

### Step 3: Files to Copy

- `image 1.avif`
- `image 2 removebg.png`
- `image 2.jpeg`
- `image 3 removebg.png`
- `image 3.jpeg`
- `image 4 removebg.png`
- `image 4.jpeg`
- `image 5.jpeg`

### Step 4: Verify

After copying, your folder structure should be:
```
frontend/
  public/
    assests/
      image 1.avif
      image 2 removebg.png
      image 2.jpeg
      image 3 removebg.png
      image 3.jpeg
      image 4 removebg.png
      image 4.jpeg
      image 5.jpeg
```

### Step 5: Restart Dev Server

After copying files, restart your Vite dev server:
```powershell
# Stop server (Ctrl+C)
npm run dev
```

## Why This Location?

In Vite, files in the `public/` folder are served at the root URL. So:
- File: `frontend/public/assests/image 4 removebg.png`
- URL: `/assests/image 4 removebg.png`

This matches the paths used in your code: `/assests/image 4 removebg.png`

---

**After copying the assets folder, images should display correctly!** ✅

