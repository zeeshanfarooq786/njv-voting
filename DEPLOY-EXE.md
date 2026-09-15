# Build the lab EXE (on YOUR PC only)

Lab PCs never install Node or npm. You build once here, then copy the `.exe`.

## Once on your computer

1. `frontend/.env` must contain `VITE_SHEETS_URL=...`
2. Internet on while building (so the Sheet URL is baked in).

```bat
cd "D:\Vote Casting"
npm install
cd frontend
npm install
cd ..
npm run pack
```

The file appears in `release\NJV Voting-1.0.0.exe` (portable — no installer).

## On each lab PC

1. Copy that `.exe` (USB is fine).
2. Double-click. No Node, no Chrome required.
3. The PC **must be online**. If not, the app shows: *Please connect this PC to the internet to continue.*

Votes still go to Google Sheets. Offline voting is not possible.
