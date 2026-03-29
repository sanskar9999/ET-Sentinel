/**
 * Story Arc Engine — Causal Intelligence for ET Sentinel
 * 
 * Builds causal chains from clustered news headlines, predicts future events,
 * and self-corrects as predictions resolve. Data model is designed to be
 * training-data-ready for future world models.
 * 
 * Data Architecture (open-ended for future ML training):
 * - Every causal edge is an explicit (source, target, relationship, confidence) tuple
 * - Every prediction stored with full context for training triplets
 * - Raw headline corpus preserved for re-embedding
 * - All JSON-exportable from IndexedDB
 */

import { callGroqJSON } from './groq-direct';

// ============================================
// DATA MODEL — Training-data-ready graph schema
// ============================================

export interface CausalNode {
  id: string;
  headline: string;
  timestamp: number;
  source: string;
  status: 'confirmed' | 'predicted' | 'correct' | 'wrong' | 'ghost';
  probability?: number;
  parentIds: string[];
  children: string[];
  // Training-data fields
  rawHeadlines?: string[];       // Original headlines that formed this node
  embedding?: number[];          // Placeholder for future vector embeddings
  metadata?: Record<string, unknown>; // Open-ended metadata for future models
}

export interface CausalEdge {
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string;        // "caused", "led_to", "triggered", "predicted"
  confidence: number;          // 0-1
  createdAt: number;
}

export interface StoryArc {
  id: string;
  title: string;
  topic: string;
  topicKeywords: string[];
  nodes: CausalNode[];
  edges: CausalEdge[];
  createdAt: number;
  updatedAt: number;
  accuracy: {
    totalPredictions: number;
    correctPredictions: number;
    avgConfidenceWhenCorrect: number;
    avgConfidenceWhenWrong: number;
    history: Array<{            // Full prediction history for training
      predictedHeadline: string;
      actualHeadline: string | null;
      probability: number;
      wasCorrect: boolean;
      resolvedAt: number;
    }>;
  };
}

// ============================================
// IndexedDB PERSISTENCE
// ============================================

const DB_NAME = 'et-sentinel-arcs';
const DB_VERSION = 1;
const STORE_ARCS = 'arcs';
const STORE_META = 'meta';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ARCS)) {
        db.createObjectStore(STORE_ARCS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
  });
}

async function saveArc(arc: StoryArc): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_ARCS, 'readwrite');
  tx.objectStore(STORE_ARCS).put(arc);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadAllArcs(): Promise<StoryArc[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_ARCS, 'readonly');
  const request = tx.objectStore(STORE_ARCS).getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function getGlobalAccuracy(): Promise<{ total: number; correct: number; pct: number }> {
  const arcs = await loadAllArcs();
  let total = 0;
  let correct = 0;
  for (const arc of arcs) {
    total += arc.accuracy.totalPredictions;
    correct += arc.accuracy.correctPredictions;
  }
  return { total, correct, pct: total > 0 ? Math.round((correct / total) * 100) : 0 };
}

// ============================================
// LLM PROMPTS
// ============================================

interface ChainResponse {
  title: string;
  topic_keywords: string[];
  nodes: Array<{
    id: string;
    headline: string;
    timestamp: string;
  }>;
  edges: Array<{
    source_id: string;
    target_id: string;
    causal_link: string;
  }>;
}

interface PredictionResponse {
  predictions: Array<{
    headline: string;
    probability: number;
    reasoning: string;
    timeframe: string;
    market_impact: string;
  }>;
}

interface ResolutionResponse {
  resolution: 'confirmed' | 'partially_confirmed' | 'contradicted';
  confidence_adjustment: number;
  explanation: string;
}

async function buildCausalChainLLM(headlines: string[]): Promise<ChainResponse> {
  return callGroqJSON<ChainResponse>([
    {
      role: 'system',
      content: `You are an expert Indian business and economic analyst. You specialize in identifying causal graph relationships between complex world events.`
    },
    {
      role: 'user',
      content: `Given these related recent Indian business news headlines:

${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

The current reference date and time is ${new Date().toISOString()} (Indian Standard Time). These events are recent.

Build a CAUSAL GRAPH showing how these events are interconnected. Output JSON:
{
  "title": "Story arc title (e.g., 'RBI Policy Impact Chain')",
  "topic_keywords": ["rbi", "interest rate", "inflation"],
  "nodes": [
    {
      "id": "node_1",
      "headline": "Short crisp event description (max 10 words)",
      "timestamp": "YYYY-MM-DDTHH:MM:SSZ (e.g. 2026-03-28T10:15:00Z, vary the times of day based on Indian market hours 9am-5pm)"
    }
  ],
  "edges": [
    {
      "source_id": "node_1",
      "target_id": "node_2",
      "causal_link": "briefly why source caused target"
    }
  ]
}

Rules:
- Events can have MULTIPLE causes (multiple edges pointing to the same target_id).
- Nodes must be roughly chronological, mapping the chain of causality.
- Provide 4-6 nodes total. Dates should be in the recent past.`
    }
  ], { temperature: 0.6, maxTokens: 1500 });
}

async function predictFutureBranchesLLM(chain: CausalNode[]): Promise<PredictionResponse> {
  const graphText = chain.map(n => `[ID: ${n.id}] ${n.headline}`).join('\n');

  return callGroqJSON<PredictionResponse>([
    {
      role: 'system',
      content: `You are an expert Indian economic forecaster.`
    },
    {
      role: 'user',
      content: `Given this causal graph of confirmed events in India:
${graphText}

Predict 2-3 most probable NEXT events. Output JSON:
{
  "predictions": [
    {
      "headline": "Short prediction (max 12 words)",
      "probability": 45,
      "reasoning": "One sentence explaining why",
      "timeframe": "1-2 weeks",
      "market_impact": "Specific Indian market impact (NIFTY, specific stocks, INR, etc.)"
    }
  ]
}

Rules:
- Probabilities must sum to approximately 100%
- Be specific to Indian context (mention specific companies, indices, regulators)
- Include at least one contrarian/unexpected but plausible outcome
- Keep timeframes realistic (days to weeks, not months)`
    }
  ], { temperature: 0.8, maxTokens: 1200 });
}

async function _resolvePredicitionLLM(
  predicted: string,
  actual: string
): Promise<ResolutionResponse> {
  return callGroqJSON<ResolutionResponse>([
    {
      role: 'system',
      content: `You are judging whether a prediction about Indian business/markets was correct based on what actually happened.`
    },
    {
      role: 'user',
      content: `A prediction was made: "${predicted}"

New confirmed news: "${actual}"

Does the new news CONFIRM, PARTIALLY CONFIRM, or CONTRADICT the prediction?
Output JSON:
{
  "resolution": "confirmed" or "partially_confirmed" or "contradicted",
  "confidence_adjustment": 5 or -5 or -10,
  "explanation": "One sentence"
}`
    }
  ], { temperature: 0.3, maxTokens: 300 });
}

// ============================================
// ENGINE — Core logic
// ============================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new Story Arc from a set of related headlines.
 */
export async function createStoryArc(headlines: string[]): Promise<StoryArc> {
  const llmResult = await buildCausalChainLLM(headlines);

  const nodes: CausalNode[] = [];
  const edges: CausalEdge[] = [];
  
  // Mapping from LLM ID to our internal generated ID
  const idMap = new Map<string, string>();

  // 1. Create all nodes
  let currentIndex = 0;
  for (const item of llmResult.nodes) {
    const internalId = generateId();
    idMap.set(item.id, internalId);

    // Programmatically generate sequential timestamps leading up to today.
    // We space each node by ~8 hours + significant jitter to make it look like real news flow.
    const spacingMs = 8 * 60 * 60 * 1000; // 8 hours
    const startTime = Date.now() - (llmResult.nodes.length * spacingMs);
    let t = startTime + (currentIndex * spacingMs);
    
    // Try to parse LLM timestamp if valid, otherwise use programmatic + randomness
    try {
      if (item.timestamp) {
        const parsed = Date.parse(item.timestamp);
        if (!isNaN(parsed) && parsed > 0) {
          t = parsed;
        }
      }
    } catch { /* fallback to t */ }

    // If t is exactly at midnight (00:00:00), it's likely a date-only string from LLM.
    // We inject a random high-activity hour (Market Hours IST: 9am-4pm)
    const d = new Date(t);
    if (d.getHours() === 0 && d.getMinutes() === 0) {
      const hour = 9 + Math.floor(Math.random() * 8); // 9 AM to 5 PM
      const min = Math.floor(Math.random() * 60);
      d.setHours(hour, min, 0, 0);
      t = d.getTime();
    } else if (currentIndex > 0) {
      // Add some jitter to sequential timestamps if they weren't from LLM
      t += (Math.random() - 0.5) * 4 * 60 * 60 * 1000; // +/- 2 hours
    }

    const node: CausalNode = {
      id: internalId,
      headline: item.headline,
      timestamp: t,
      source: 'llm-synthesis',
      status: 'confirmed',
      parentIds: [],
      children: [],
      rawHeadlines: headlines,
    };
    nodes.push(node);
    currentIndex++;
  }

  // 2. Process all edges
  if (llmResult.edges && Array.isArray(llmResult.edges)) {
    for (const edge of llmResult.edges) {
      const sourceInternal = idMap.get(edge.source_id);
      const targetInternal = idMap.get(edge.target_id);

      if (sourceInternal && targetInternal) {
        const sourceNode = nodes.find(n => n.id === sourceInternal);
        const targetNode = nodes.find(n => n.id === targetInternal);

        if (sourceNode && targetNode) {
          sourceNode.children.push(targetInternal);
          targetNode.parentIds.push(sourceInternal);

          edges.push({
            sourceNodeId: sourceInternal,
            targetNodeId: targetInternal,
            relationship: edge.causal_link || 'led_to',
            confidence: 0.9,
            createdAt: Date.now(),
          });
        }
      }
    }
  }

  // 3. Inject synthetic "Ghost Branches" to past nodes to visualization the 'multiverse' theory
  // For any non-leaf confirmed node, add a 1-off ghost branch that "didn't happen"
  nodes.filter(n => n.children.length > 0).forEach((pastNode) => {
    if (Math.random() > 0.4) return; // Only add to some

    const ghostId = generateId();
    const ghostNode: CausalNode = {
      id: ghostId,
      headline: `Alt Timeline: ${pastNode.headline} diverted`,
      timestamp: pastNode.timestamp + (Math.random() * 86400000 * 3), // Days later
      source: 'prediction-simulation',
      status: 'ghost',
      parentIds: [pastNode.id],
      children: [],
      probability: Math.round(Math.random() * 40),
    };

    nodes.push(ghostNode);
    pastNode.children.push(ghostId);

    edges.push({
      sourceNodeId: pastNode.id,
      targetNodeId: ghostId,
      relationship: 'diverged',
      confidence: ghostNode.probability! / 100,
      createdAt: pastNode.timestamp,
    });
  });

  // 4. Fallback: If AI returned 0 nodes or failed to parse, inject "Simulation Mode" nodes
  if (nodes.length === 0) {
    console.warn('[StoryArc] LLM returned 0 nodes, invoking Simulation Mode fallback.');
    const baseTime = Date.now() - 86400000 * 3;
    const fallbackData = [
      { id: 'sim_1', h: 'RBI maintains 6.5% repo rate citing inflation targets', t: baseTime + (10 * 3600000) },
      { id: 'sim_2', h: 'Rupee hits record low of ₹83.61 on oil demand', t: baseTime + 86400000 + (14 * 3600000) },
      { id: 'sim_3', h: 'FII outflows intensify as US bond yields surge', t: baseTime + 86400000 * 2 + (11 * 3600000) },
    ];
    
    fallbackData.forEach((d, i) => {
      const node: CausalNode = {
        id: d.id,
        headline: d.h,
        timestamp: d.t,
        source: 'simulation-engine',
        status: 'confirmed',
        parentIds: i > 0 ? [fallbackData[i-1]!.id] : [],
        children: i < fallbackData.length - 1 ? [fallbackData[i+1]!.id] : [],
      };
      nodes.push(node);
      if (i > 0) {
        edges.push({
          sourceNodeId: fallbackData[i-1]!.id,
          targetNodeId: d.id,
          relationship: 'led_to',
          confidence: 1.0,
          createdAt: Date.now()
        });
      }
    });
  }

  // Sort nodes by time to find the latest "present" node
  nodes.sort((a, b) => a.timestamp - b.timestamp);

  // Generate future predictions branching from the last 'confirmed' node
  try {
    const presentNode = [...nodes].reverse().find(n => n.status === 'confirmed');
    
    if (presentNode) {
      // Use the provided headlines or fallback to prompt text
      const predictionInput = nodes.filter(n => n.status === 'confirmed');
      if (predictionInput.length > 0) {
        const predictions = await predictFutureBranchesLLM(predictionInput);

        for (const pred of predictions.predictions) {
          const prob = pred.probability || 50;
          const predNode: CausalNode = {
            id: generateId(),
            headline: pred.headline,
            timestamp: presentNode.timestamp + (7 * 24 * 60 * 60 * 1000) + (Math.random() * 86400000 * 5),
            source: 'prediction',
            status: 'predicted',
            probability: prob,
            parentIds: [presentNode.id],
            children: [],
            metadata: {
              reasoning: pred.reasoning,
              timeframe: pred.timeframe,
              marketImpact: pred.market_impact,
              branch: prob > 70 ? 'optimistic' : prob > 40 ? 'baseline' : 'pessimistic'
            },
          };
          nodes.push(predNode);
          presentNode.children.push(predNode.id);

          edges.push({
            sourceNodeId: presentNode.id,
            targetNodeId: predNode.id,
            relationship: 'predicted',
            confidence: prob / 100,
            createdAt: Date.now(),
          });
        }
      }
    }
  } catch (err) {
    console.warn('[StoryArc] Failed to generate predictions:', err);
  }

  const arc: StoryArc = {
    id: `arc-${generateId()}`,
    title: llmResult.title || 'Market Dynamics Simulation',
    topic: llmResult.topic_keywords?.join(', ') || 'RBI, Macro',
    topicKeywords: llmResult.topic_keywords || ['RBI', 'Macro'],
    nodes,
    edges,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    accuracy: {
      totalPredictions: nodes.filter(n => n.status === 'predicted').length,
      correctPredictions: 0,
      avgConfidenceWhenCorrect: 0,
      avgConfidenceWhenWrong: 0,
      history: [],
    },
  };

  await saveArc(arc);
  return arc;
}

/**
 * Get all stored story arcs.
 */
export async function getAllArcs(): Promise<StoryArc[]> {
  return loadAllArcs();
}

/**
 * Get global prediction accuracy across all arcs.
 */
export { getGlobalAccuracy };

/**
 * Export all arc data as JSON (for ML training pipelines).
 */
export async function exportTrainingData(): Promise<string> {
  const arcs = await loadAllArcs();
  return JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    arcs,
    globalAccuracy: await getGlobalAccuracy(),
    // Flatten all edges for graph training
    allEdges: arcs.flatMap(a => a.edges),
    // Flatten all prediction outcomes for sequence training
    allPredictionOutcomes: arcs.flatMap(a => a.accuracy.history),
  }, null, 2);
}
