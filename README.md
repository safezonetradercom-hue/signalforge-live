# SignalForge Pro Dashboard

Professional-style responsive market-analysis dashboard with pattern detection, EMA 9/21, RSI 14, CALL/PUT/WAIT bias, market countdown, watchlist, paper P&L totals, paper trade ledger, and basic demo settings.

## Start locally
Requires Node.js 18+.
1. Extract this ZIP.
2. Open a terminal in this folder.
3. Run `npm start`.
4. Open `http://localhost:8787`.

The Node.js backend proxies public read-only BiQuote Forex OHLC candles and saves simulated paper trades in `server/data.json`.

## Deploying
GitHub Pages can host the static files only; it cannot run the Node.js API. To use the paper-trading ledger and admin settings, deploy the whole project to a Node.js hosting service.

## Critical limitations
- Paper trades are simulated records. They are not sent to a broker; P&L is not real profit/loss.
- No secured production admin login is included. Do not expose this demo admin API publicly as-is. Add authentication, authorization, secure database, rate limits and audit logging before public use.
- The included data feed is for real-market Forex, subject to provider availability/rate limits.
- Quotex OTC data is not included. Quotex does not publish an official public developer API; only connect a verified, authorized read-only OTC provider. Never substitute real Forex prices for OTC prices.
- This is not a guaranteed signal service. Patterns can fail; the score is a rule-match score, not probability of winning. No real trades are executed.


## Expanded assets
The dashboard now lists 40+ real-market FX crosses/majors and selected metals/crypto symbols, plus a broad list of OTC-labeled pairs in the selector. OTC symbols are display-only until a verified read-only OTC feed is configured; do not treat them as live or analyze real Forex data as OTC.

Branding update: The website header now displays `HRIDOY TRADER` in English.
