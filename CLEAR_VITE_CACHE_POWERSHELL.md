# Clear Vite Cache - PowerShell Commands

## Problem
Vite is showing old CSS errors even after fixes. This is a caching issue.

## Solution: Clear Vite Cache

### Step 1: Stop the Dev Server
Press `Ctrl + C` in the terminal where Vite is running.

### Step 2: Clear Vite Cache (PowerShell)

**Correct PowerShell command:**
```powershell
Remove-Item -Recurse -Force node_modules\.vite
```

**Or shorter version:**
```powershell
rm -r -fo node_modules\.vite
```

**Or if the folder doesn't exist, just continue:**
```powershell
# This will work even if folder doesn't exist
if (Test-Path node_modules\.vite) {
    Remove-Item -Recurse -Force node_modules\.vite
}
```

### Step 3: Restart Dev Server

```powershell
npm run dev
```

## Alternative: Full Clean (if still having issues)

```powershell
# Stop dev server first (Ctrl + C)

# Remove Vite cache
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue

# Remove dist folder
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# Restart
npm run dev
```

## Why This Happens

Vite caches compiled CSS and other assets for faster rebuilds. Sometimes it caches old versions with errors. Clearing the cache forces a fresh rebuild.

---

**After clearing cache and restarting, the CSS errors should be gone!** ✅

