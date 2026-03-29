# ET Sentinel: AI-Native Business Intelligence
**Theme 8: AI-Native News Experience (ET Gen AI Hackathon)**
*Business News in 2026, Reimagined.*

![ET Sentinel Dashboard Overview](./paper/dashboard_verification_1774726670514.png)

## 🛑 The Problem: The End of the Static Article
Business news today is still delivered like it's 2005—static text articles, one-size-fits-all homepages, and a rigid format. Readers are forced to piece together complex macroeconomic shifts and policy changes from disjointed headlines. Connecting the dots between local regulations and global supply chain disruptions is left entirely to the user.

## 🚀 The Solution: ET Sentinel
The **ET Sentinel** breaks the static news mold. We built a platform that replaces traditional article reading with a fluid, predictive, and interactive interface dedicated to tracking the actual pulse of the market. Our aim was to build something that makes people say, *"I can't go back to reading news the old way."*

## 🧠 Core Feature: The Causal Intelligence Engine (Story Arc Tracker)
At the heart of the ET Sentinel lies the **Causal Intelligence Engine**. Instead of isolated articles, we present the interactive **Story Arc Tracker**. 

When a sudden commodity price shock hits or a new RBI policy is introduced, our engine builds a complete, interactive visual narrative:
* **Chronological Event Chains:** Maps out cause-and-effect links based on real-time news data.
* **Sentiment Shifts:** Contrarian perspectives are surfaced directly on the timeline.
* **Probability Forecasting:** Using the Groq LLM API, the engine generates *predictive timelines*, exploring probability-weighted "what to watch next" scenarios.

## 🌍 Immersive 3D Visualization
The dashboard features an interactive 3D globe (centered on India) in a balanced 50/50 split with the intelligence feeds. It visually tracks:
* Financial Hubs
* Stock Exchanges (BSE/NSE)
* Central Banks
* Commodity Hubs and Trade Routes

## 🏃‍♂️ How to Run Locally

### Prerequisites
* Node.js (v18+)
* Groq API Key (for the Causal Intelligence Engine)

### Installation
1. Navigate to the frontend directory:
   ```bash
   cd worldmonitor/worldmonitor-main
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment Setup:
   Create a `.env.local` file in the `worldmonitor-main` directory with the following variables:
   ```env
   VITE_GROQ_API_KEY=your_groq_api_key_here
   VITE_VARIANT=et
   ```
4. Start the development server:
   ```bash
   npm run dev:et
   ```
5. Open your browser and navigate to `http://localhost:5173`.
