# 🌀 CycloneSight
### AI-Powered Cyclone Impact & Infrastructure Vulnerability Forecaster
*Pre-Landfall Action for the Bay of Bengal & Coastal APAC*

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Built with: Google GenAI](https://img.shields.io/badge/Built%20With-Google%20GenAI-blueviolet)](https://github.com/google-gemini/generative-ai-js)
[![Vite + React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%208-cyan)](https://vitejs.dev)

---

## 📌 Mission
Disaster management in coastal APAC has historically focused on **post-landfall rescue and relief**. **CycloneSight shifts disaster response from post-landfall recovery to pre-landfall action**:
1. **Physical Compound Hazard Simulation**: Inverted-barometer + wind-stress storm surge, USDA SCS Curve Number direct runoff ponding, and Right-Front-Quadrant (RFQ) asymmetric wind field.
2. **Cascading Infrastructure Vulnerability**: Tracks how flooded substations cut power to hospitals lacking backup generators and how submerged causeways sever emergency lifelines.
3. **Parametric Insurance Liquidity**: Monte Carlo uncertainty simulation ($N=500$) estimating probability of trigger exceedance, calculating needed emergency pre-positioning cash transfers ($) at $T-36\text{h}$.
4. **Multilingual Gemini Early Warnings**: Generates audience-tailored operational advisories in English and authentic local languages (Bengali, Odia, Hindi, Tamil, Telugu, Burmese) with human review approval gates.

---

## 🏗️ Architecture

```mermaid
graph TD
    subgraph UI ["Frontend (React 19 + Tailwind CSS)"]
        TopBar["TopBar & Alert Ladder Stage (T-72h to T-0h)"]
        ScenEngine["Scenario Engine & What-If Parameter Sliders"]
        MapLibre["Leaflet Dark Matter Inundation & Asset Map"]
        Tabs["Tabs: Risk Ranking | Cascade Graph | Advisories | Insurance | Ask AI | SitRep"]
    end

    subgraph Backend ["Server & Simulation Engine (Node.js Express)"]
        SimEngine["Simulation Engine (server/simulation-engine.ts)"]
        SurgeMod["Hydrological Bathtub Surge (server/hazard/surge.ts)"]
        RunoffMod["SCS Curve Number Runoff (server/hazard/runoff.ts)"]
        WindMod["Holland Parametric Wind & RFQ Asymmetry (server/hazard/wind.ts)"]
        VulnerMod["Cascade Graph & SPOF Identifier (server/hazard/vulnerability.ts)"]
        InsurMod["Monte Carlo Parametric Insurance (server/hazard/insurance.ts)"]
    end

    subgraph External ["Data & AI Integrations"]
        Gemini["Google Gemini API (@google/genai SDK)"]
        GEE["Google Earth Engine (SRTM, WorldPop, WorldCover)"]
        MockProv["MockTerrainProvider (Offline Replica)"]
        OpenMeteo["Open-Meteo Live Forecast API"]
        Overpass["OpenStreetMap Overpass API"]
        Dispatch["Early-Warning Dispatch (DRY_RUN / Resend / Telegram / SMS)"]
    end

    ScenEngine -->|What-If Parameters| SimEngine
    SimEngine --> SurgeMod
    SimEngine --> RunoffMod
    SimEngine --> WindMod
    SimEngine --> VulnerMod
    SimEngine --> InsurMod

    SimEngine -->|Terrain & Assets| MockProv
    SimEngine -.->|Optional Live Credentials| GEE
    SimEngine -->|Live Weather Sync| OpenMeteo

    MapLibre -->|Map Viewport Screenshot| Gemini
    Tabs -->|Advisories & Grounded Q&A| Gemini
    Tabs -->|Human Review Authorization| Dispatch
```

---

## 🚀 Quickstart: Zero-Credential Mock Mode

CycloneSight runs fully offline with **zero credentials needed** out of the box!

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests verifying physics equations & cascading logic
npm test

# 3. Start full-stack development server on port 3000
npm run dev
```

Visit `http://localhost:3000`. The application will immediately load the **Super Cyclone Amphan 2020** replay in the Sundarbans Delta with simulated bathtub storm surge, rainfall ponding, and infrastructure cascades.

---

## 🔑 Live API Configuration (Optional)

Configure your `.env` file (copied from `.env.example`):

### 1. Google Gemini AI API
To activate live multimodal satellite reasoning, localized advisory translation, and grounded Q&A:
```env
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-3.8-flash"
```

### 2. Google Earth Engine (GEE)
To query live SRTM 30m DEM, ESA WorldCover, WorldPop, and GPM IMERG:
```env
TERRAIN_PROVIDER="gee"
GEE_SERVICE_ACCOUNT="your-service-account@project.iam.gserviceaccount.com"
GEE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
*(When `TERRAIN_PROVIDER="mock"` is set or GEE credentials are not provided, CycloneSight automatically utilizes the verified high-resolution offline replica dataset).*

### 3. Early-Warning Dispatch Channels
Advisories are **DRY_RUN by default** (`DRY_RUN="true"`), logging and printing simulated Telegram, SMS, and Email payloads.
To activate live dispatch:
```env
DRY_RUN="false"
RESEND_API_KEY="re_..."
TELEGRAM_BOT_TOKEN="123456:ABC-DEF..."
TELEGRAM_CHAT_ID="@your_channel"
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_FROM="+1234567890"
```

---

## 🔬 Scientific Methodology & Model Formulations

### 1. Storm Surge & Coastal Inundation
- **Inverted Barometer Effect**: Hydrostatic sea surface rise $\Delta \eta_p \approx 0.0102 \times (1013 - P_c)$ meters.
- **Wind Stress & Bathymetry**: Calibrated for the northern Bay of Bengal's shallow continental shelf slope ($0.0012 - 0.0022$).
- **Inland Attenuation**: Water level attenuates inland at $0.4\text{ m/km}$ (user-adjustable) due to bottom friction and coastal mangrove buffers.
- **Bathtub Inundation**: Computes inundation depth per cell: $D = \max(0, H_{surge} - Z_{elev})$ with hydrological connectivity checks.

### 2. Rainfall Flooding & SCS Curve Number
- **Direct Runoff**: $Q = \frac{(P - I_a)^2}{P - I_a + S}$ where $S = \frac{25400}{CN} - 254$ and $I_a = 0.2 S$.
- **Antecedent Soil Moisture**: Adapts across AMC I (Dry), AMC II (Normal), and AMC III (Monsoon saturated).
- **Tide-Locking Compound Bonus**: If surge exceeds $0.6\text{m}$ simultaneously with rainfall $>80\text{mm}$, riverine drainage is blocked by high tidal water, compounding flood ponding non-linearly.

### 3. Asymmetric Wind Field & Asset Vulnerability
- **Holland Parametric Profile**: Computes radial wind decay from the eye.
- **Right-Front Quadrant (RFQ) Amplification**: Northern Hemisphere cyclonic rotation adds constructively to forward translation speed on the storm's right flank.
- **Kaplan & DeMaria Post-Landfall Decay**: $V(t) = V_{landfall} \cdot \exp(-\alpha t)$ over rough coastal terrain.

### 4. Cascading Infrastructure Vulnerability & SPOF
- **Power Grid Dependency**: When a $132\text{kV}$ or $33\text{kV}$ substation floods ($>0.25\text{m}$) or fails from extreme wind, connected hospitals lacking elevated backup generators register an operational cascade failure.
- **Road Lifelines**: Arterial roads overtopped by $>0.35\text{m}$ water are flagged impassable, cutting road transit to emergency medical centers.
- **Single Point of Failure (SPOF)**: Flagged for critical substations or highways whose failure knocks out multiple downstream healthcare/shelter facilities.

---

## ⏱️ 2-Minute Demo Script for Judges

1. **Launch**: Open `http://localhost:3000`. Notice the top alert banner: *"Decision-support prototype. Follow official IMD/NDMA guidance."*
2. **One-Click Walkthrough**: Click **"Run Demo"** in the top bar.
   - **Step 1**: Observes Super Cyclone Amphan replay loaded at $T-24\text{h}$ to landfall.
   - **Step 2**: Highlights the $3.8\text{m}$ coastal storm surge layer and the Right-Front Quadrant wind asymmetry over South 24 Parganas.
   - **Step 3**: Jumps to the **Cascade Graph** tab. Shows **Kakdwip 132kV Substation** inundated, which causes an operational blackout cascade at **Kakdwip Sub-Divisional Hospital** because it lacks a registered elevated backup generator!
   - **Step 4**: Opens the **Advisories** tab. Clicks **"Generate Early-Warning Advisory"** to watch Gemini formulate a pre-landfall directive with lead-time action deadlines in English and Bengali.
   - **Step 5**: Opens the **Review & Approve** modal. Enter an authorizing magistrate name and click **"Authorize & Dispatch"**. View the logged record in the **Dispatch Audit** tab.
3. **What-If Experimentation**: Move the **Landfall Tide Level** slider to $2.5\text{m}$ (Spring Tide) or shift the track $+25\text{km}$ along the coast. Watch inundation depths and vulnerable assets update dynamically in near-real-time.
4. **Multimodal Map Vision**: Click **"Analyze Map View with Gemini AI"** to capture a live viewport screenshot and receive Gemini's remote-sensing geomorphological observations and model agreement evaluation.
5. **SitRep Export**: Click **"SitRep"** to generate a clean, print-ready pre-landfall intelligence brief.
