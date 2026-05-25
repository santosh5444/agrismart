# AgriSmart: AI-Powered vegetable Marketplace

A smart agriculture platform for Andhra Pradesh that connects farmers directly with consumers using AI-driven price predictions and location-based search.

## 🚀 Features
- **AI Price Prediction**: Uses Random Forest ML model to predict vegetable prices based on 3-year historical data and seasonal yields.
- **Farmer Portal**: List crops with quantity, district, and contact info.
- **Consumer Search**: Integrated map search for local vegetables with live farmer contact details and lat/lon coordinates.
- **Weather-Aware Recommendations**: Intelligent scoring based on seasonal peak yields.
- **System Monitoring**: Accuracy (MAE) and training metrics viewable in settings.

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Leaflet (Maps), Lucide Icons.
- **Backend**: Python, FastAPI, Pandas, Scikit-learn, joblib.
- **Auth**: JWT & bcrypt (file-based persistence).

## 🏃 Getting Started
1. Run `start_backend.bat` to launch the FastAPI server (Port 8000).
2. Run `start_frontend.bat` to launch the Vite dev server (Port 5173).
3. Open `http://localhost:5173` in your browser.

## Deployment Notes
- The frontend is a single-page app, so route refreshes like `/farmer/details` or `/home` must rewrite back to `index.html`.
- This repo now includes `vercel.json` and `frontend/vercel.json` for Vercel, plus `frontend/public/_redirects` for Netlify-style static hosting.
- After deploying new frontend changes, refreshes on app routes should no longer return `404 NOT_FOUND`.

---
*Created for the Digital Transparency Initiative (DTI).*
