# Platform Deployment & Update Guide

> ⚠️ **STALE — ARCHIVED.** This document is kept for reference and is no longer
> maintained. It may describe a version of the product or its infrastructure that
> no longer exists. **Verify against the code before trusting anything here.**
> Current documentation lives in `documentation/`.



This guide explains how to install and update the TempoApp platform on a Node.js web server (cPanel/Passenger).

---

## 1. Initial Installation (Live Version)

Follow these steps to set up the live version (e.g., `livebetterlife.tempoapp.ro`) for the first time.

### A. Local Preparation
1.  On your computer, run the production build command:
    ```bash
    npm run build:prod
    ```

rmdir /s /q .next & rmdir /s /q out & npm run build:demo
rmdir /s /q .next & rmdir /s /q out & npm run build:prod

2.  Create a **ZIP file** containing the following (ensure "Hidden Items" are visible in Windows):
    *   📁 `.next` (Hidden folder)
    *   📁 `public`
    *   📄 `package.json`
    *   📄 `package-lock.json`
    *   📄 `next.config.js`
    *   📄 `server.js`
    *   📄 `.env.live`

### B. Server Setup
1.  **Clean Folder**: Delete any old files in the server's application root.
2.  **Upload & Extract**: Upload your ZIP file via File Manager and extract it.
3.  **Rename Env**: Rename `.env.live` to exactly `.env` on the server.
4.  **Node.js Config**:
    *   Go to **Setup Node.js App** in cPanel.
    *   Set **Application mode** to `production`.
    *   Set **Application startup file** to `server.js`.
    *   Add Environment Variable: `NEXT_PUBLIC_APP_ENV` = `production`.

### C. Dependencies
1.  Open the **Terminal** in cPanel.
2.  Activate the environment (copy the command from the top of the Node.js setup screen).
3.  Run:
    ```bash
    npm install --production
    ```
4.  Click **Restart** in the Node.js setup tool.

---

## 2. Performing Updates (The 1-Minute Update)

Once the platform is installed, you don't need to re-upload everything for simple code changes.

1.  **Build**: Run `npm run build:prod` on your computer.
2.  **Zip**: Create a ZIP containing **only** the `.next` folder.
3.  **Upload**: Upload this ZIP to the server.
4.  **Extract**: Extract and **Overwrite** the existing `.next` folder.
5.  **Restart**: Click **Restart** in the cPanel Node.js tool.

---

## 3. Troubleshooting

*   **Page not loading?** Check the `logs/passenger.log` file.
*   **Permissions Error?** If `npm install` fails, delete the physical `node_modules` folder on the server first; the server prefers to manage this itself.
*   **Still seeing the old version?** Delete `index.html` from the root folder if it exists; it blocks the Node.js app.


## 4. updating

New commands                                                                                                 
  - npm run package — build with .env.live + clean + bundle → dist/tempo-app-live-YYYYMMDD-HHmm.tar              - npm run package:demo — same, with .env.demo
  - npm run package:gzip — live build, outputs .tar.gz (~16% smaller; saves upload time)                       
  
  Additional flags (node scripts/build-prod.js --flag)
  - --env=demo / --env=live — pick the env file
  - --gzip — produce .tar.gz
  - --with-modules — bundle node_modules/ too (skip cPanel's "Run NPM Install")
  - --skip-build — re-package an existing .next without rebuilding
  - --out=my.tar — custom output filename

  What goes into the bundle (533 entries, forward-slash Linux paths, POSIX ustar format)
  - .next/ (runtime output, with cache/ and trace/ pruned)
  - public/ (including your 149 MB of tutorial videos)
  - package.json, package-lock.json
  - next.config.js, server.js