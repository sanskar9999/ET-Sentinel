# ET Sentinel — Architecture Overview (Hackathon Prototype)

This document outlines the architecture and key features of the **ET Sentinel** business intelligence dashboard prototype, developed for the 2026 ET GenAI Hackathon (Theme 8: AI-Native News Experience).

## 1. Core Concept: Causal Intelligence Over News Noise

The primary innovation of ET Sentinel is the **Causal Intelligence Engine**, which moves beyond simple headline lists to provide users with a "Reasoning Graph" that connects the dots between events.

### The Problem
Traditional news dashboards (like Bloomberg or Reuters) provide a high "information-to-signal" ratio, often overwhelming users with disjointed data points (rate cuts, stock falls, currency fluctuations) without explaining the *causal links*.

### The Solution: ET Sentinel Story Arcs
ET Sentinel uses a graph-based causal model to:
1.  **Cluster** related business news headlines automatically.
2.  **Synthesize** a causal chain (e.g., *Fed Holds Rates → FII Outflow → Rupee Weakness → Tech Sector Decline*).
3.  **Predict** branching "possible futures" using historical context and LLM reasoning.
4.  **Self-Correct** by measuring the accuracy of its predictions as new information arrives.

---

## 2. Technical Architecture

### Frontend (Vite + TypeScript)
-   **Variant Configuration**: The dashboard uses a dedicated `et` variant triggered by `VITE_VARIANT=et`. This hides the original WorldMonitor geopolitical/military noise.
-   **Dashboard Grid**: A custom panel layout prioritized for the Indian market, centered on the **Causal Intelligence** and **India Business** panels.

### Causal Intelligence Engine (`src/services/story-arc-engine.ts`)
-   **Data Storage**: Graph nodes (events) and edges (causal links) are stored locally in **IndexedDB**. This ensures a low-latency experience and provides a training dataset for future "World Models".
-   **LLM Synthesis**: Direct client-side calls to the **Groq API** (using `gpt-oss-120b`) to perform reasoning tasks without backend overhead.
-   **Graph Model**: Nodes include full metadata (reasoning, probability, timeframe) making the data "training-ready".

### Map Visualization (`src/app/panel-layout.ts`)
-   **Centering**: Automatically focuses on India (20.5°N, 78.9°E) at zoom 4.5.
-   **Layer Filtering**: Military-focused layers (GPS Jamming, Bases, Conflict Zones) are disabled in favor of economic layers like **Undersea Cables**, **Trade Routes**, and **Stock Exchanges**.

---

## 3. UI/UX: Design for Impact

### The "Signal over Noise" Principle
The UI has been aggressively stripped of clutter to prioritize the most important signals:
-   **Orange/Amber Theme**: Tailored for the ET brand identity.
-   **Simplified Sidebar**: Removed non-essential monitors, focus only on Core business categories.
-   **Clean Headers**: Stripped "PRO" banners and social widgets to create a premium, distraction-free environment.
-   **Live News**: Swapped international streams for domestic business channels like **ET Now**, **CNBC TV18**, and **NDTV Profit**.

---

## 4. Future Roadmap: From Prototype to World Model

While the current prototype uses LLMs for causal inference, the data architecture is designed for:
1.  **Fine-tuning**: The IndexedDB schema preserves full causal triplets for model training.
2.  **Real-time Alignment**: The self-correction mechanism (Global Accuracy) allows for reinforcement learning from human/real-world feedback.
3.  **Cross-Correlation**: Integrating live stock market data with causal chain updates to quantify "Causal Impact" in monetary terms.

---
*Created for the ET GenAI Hackathon 2026 — Theme 8 Prototype Submission.*
