# APEX — Sim Racing Telemetry Platform

AI-powered telemetry coaching for sim racers.

## Deploy to Netlify (5 minutes)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/apex-racing.git
git push -u origin main
```

### 2. Connect to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git**
2. Pick your repo
3. Build settings (auto-detected):
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
4. Click **Deploy**

### 3. Set environment variables

In Netlify → **Site settings → Environment variables**, add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_GITHUB_REPO` | `your-username/apex-racing` |
| `NEXT_PUBLIC_APP_URL` | `https://your-site.netlify.app` |

That's it — your site is live.

---

## Local development

```bash
# Install dependencies
npm install

# Create local env file
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_GITHUB_REPO

# Start dev server
npm run dev
# → http://localhost:3000
```

---

## Desktop app (.exe)

The GitHub Actions workflow at `.github/workflows/build-desktop.yml` automatically builds a Windows `.exe` installer on every push to `main`.

After the first push, go to **GitHub → Releases** — the `.exe` will appear there.
The download button on your site will automatically find and link to it.

### Build locally

```bash
cd desktop
npm install
npm run tauri:build
# Output: desktop/src-tauri/target/release/bundle/nsis/*.exe
```

**Prerequisites:** Node.js 20, Rust stable (`rustup install stable`), Windows 10/11

---

## Site structure

| Route | Description |
|---|---|
| `/` | Landing page with download button |
| `/download` | Dedicated download page |
| `/dashboard` | Main app dashboard |
| `/telemetry` | Lap file upload and analysis |
| `/academy` | 11 learning modules, 29+ lessons |
| `/tracks` | 7 circuits (Monza, Spa, Silverstone, Nürburgring, Suzuka, Imola, Barcelona) |
| `/cars` | GT3 car database with setup recommendations |
| `/engineer` | AI Race Engineer (powered by Claude) |
| `/sessions` | Uploaded session history |
| `/profile` | Driver XP, levels, ranking |
| `/api/download` | Redirect to latest .exe from GitHub Releases |
| `/api/engineer` | AI coaching endpoint |
| `/api/telemetry/upload` | Telemetry file upload endpoint |
