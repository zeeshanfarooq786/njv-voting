# NJV voting — Google Sheet backend (keep the React UI)

The frontend design does not change. Votes, logins, sessions, and candidate photos go to Google Sheets + Drive.

## 1. Create the Sheet

1. Open [Google Sheets](https://sheets.google.com) → Blank spreadsheet.
2. Name it `NJV Votes 2026`.
3. **Extensions → Apps Script**.
4. Delete any code in `Code.gs`.
5. Paste the full contents of `google-apps-script/Code.gs` from this project.
6. Save.
7. In the editor, choose function **`setup`** → **Run**.
8. Approve Google permissions (Sheets + Drive).
9. Confirm the spreadsheet now has tabs: Users, Candidates, Votes, Sessions, Events, Settings, Tokens.

## 2. Deploy the web app

1. **Deploy → New deployment → Web app**.
2. Execute as: **Me**.
3. Who has access: **Anyone**.
4. **Deploy** → copy the URL (`https://script.google.com/macros/s/.../exec`).

If you edit `Code.gs` later, **Deploy → Manage deployments → Edit → New version**.

## 3. Point the React app at that URL

In `frontend/.env`:

```
VITE_SHEETS_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Restart Vite (`npm run dev` in `frontend`).

## 4. Logins (same as before)

- Admin: `admin@njv.edu.pk` / `admin12345`
- Teacher: `teacher@njv.edu.pk` / `teacher12345`

Change these in the **Users** tab (password column is SHA-256; easiest is to run `setup` only once, then add teachers from the admin UI).

## 5. Lab PCs

On your PC: `cd frontend` → `npm run build`. Host `frontend/dist` on Netlify Drop or GitHub Pages. Every lab browser opens that https link. Head PC can also open the Google Sheet for a raw vote log.

No PHP on lab machines.
