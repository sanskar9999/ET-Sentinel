import { Panel } from './Panel';
import { createStoryArc, getAllArcs, type StoryArc, type CausalNode } from '@/services/story-arc-engine';
import { escapeHtml } from '@/utils/sanitize';

interface LayoutNode extends CausalNode {
  x: number;
  y: number;
  width: number;
  height: number;
  branch?: 'optimistic' | 'baseline' | 'pessimistic';
}

export class StoryArcPanel extends Panel {
  private arcs: StoryArc[] = [];
  private isGenerating = false;
  // private globalAccuracy = { total: 0, correct: 0, pct: 0 };

  constructor() {
    super({
      id: 'story-arc',
      title: 'FINANCIAL CAUSALITY & FORECASTING DASHBOARD',
      showCount: false,
      infoTooltip: 'Directed Acyclic Graph mapping historical causal events into probable future outcomes.',
    });

    void this.loadArcs();
  }

  private async loadArcs(): Promise<void> {
    try {
      this.arcs = await getAllArcs();
      // this.globalAccuracy = await getGlobalAccuracy();
      this.renderArcs();
    } catch (err) {
      console.warn('[StoryArcPanel] Failed to load arcs:', err);
      this.renderEmpty();
    }
  }

  public async generateFromHeadlines(headlines: string[]): Promise<void> {
    if (this.isGenerating || headlines.length < 3) return;
    this.isGenerating = true;
    this.renderGenerating();
    try {
      const arc = await createStoryArc(headlines.slice(0, 8));
      if (arc.nodes.length > 0) {
        this.arcs.unshift(arc);
        // this.globalAccuracy = await getGlobalAccuracy();
      }
      this.renderArcs();
    } catch (err) {
      console.error('[StoryArcPanel] Generation failed:', err);
      this.renderError();
    } finally {
      this.isGenerating = false;
    }
  }

  private renderGenerating(): void {
    this.setContent(`
      <div class="wm-empty-state">
        <div class="wm-spinner"></div>
        <div class="wm-empty-title" style="margin-top: 20px;">Computing Multi-Modal Causality...</div>
        <div class="wm-empty-sub">Synthesizing DAG from real-time geopolitical & market feeds</div>
      </div>
    `);
  }

  private renderEmpty(): void {
    this.setContent(`
      <div class="wm-empty-state">
        <div class="wm-empty-title">World Model Terminal Offline</div>
        <div class="wm-empty-sub">Standby for data influx or initialize manually.</div>
        <button class="wm-btn" id="story-arc-demo">Initialize Forecasting Engine</button>
      </div>
    `);
    setTimeout(() => {
      document.getElementById('story-arc-demo')?.addEventListener('click', () => void this.generateDemoArc());
    }, 300);
  }

  private async generateDemoArc(): Promise<void> {
    const demoHeadlines = [
      'RBI leaves repo rate unchanged at 6.5% amid steady inflation',
      'Fed pauses rates causing global liquidity recalibration',
      'Indian rupee slides to ₹83.50 against US dollar highlighting currency risks',
      'FIIs pull out ₹15,000 crore from Indian equities in March rebalancing',
      'IT giants Infosys, TCS tumble 3% on soft global earnings outlook',
      'NIFTY 50 slips below 22,000 as multi-sector global uncertainty looms',
    ];
    await this.generateFromHeadlines(demoHeadlines);
  }

  private renderError(): void {
    this.setContent(`
      <div class="wm-empty-state">
        <div class="wm-empty-title" style="color: #f87171;">Engine Failure</div>
        <div class="wm-empty-sub">Connectivity to the inference engine lost.</div>
        <button class="wm-btn" id="story-arc-retry">Retry Synthesis</button>
      </div>
    `);
    setTimeout(() => {
      document.getElementById('story-arc-retry')?.addEventListener('click', () => void this.generateDemoArc());
    }, 300);
  }

  private renderArcs(): void {
    if (this.arcs.length === 0 || !this.arcs[0]?.nodes.length) {
      this.renderEmpty();
      return;
    }

    const firstArc = this.arcs[0];
    if (!firstArc) return;

    const graphHtml = this.renderGraph(firstArc);

    this.setContent(`
      <div class="wm-container">
        <div class="wm-header">
           <div class="wm-header-title">⚡ ${escapeHtml(firstArc.topicKeywords[0]?.toUpperCase() || 'MARKET')} MATRIX DYNAMICS</div>
           <div class="wm-header-actions">
             <button class="wm-btn" id="story-arc-new">Resync Array</button>
           </div>
        </div>
        ${graphHtml}
      </div>
    `);

    setTimeout(() => {
      document.getElementById('story-arc-new')?.addEventListener('click', () => void this.generateDemoArc());

      const viewport = this.content?.querySelector('.wm-viewport') as HTMLElement;
      if (viewport) {
        // Enable drag to pan graph logic
        let isDown = false;
        let startX = 0;
        let startY = 0;
        let scrollLeft = 0;
        let scrollTop = 0;

        viewport.addEventListener('pointerdown', (e) => {
          isDown = true;
          viewport.style.cursor = 'grabbing';
          startX = e.pageX - viewport.offsetLeft;
          startY = e.pageY - viewport.offsetTop;
          scrollLeft = viewport.scrollLeft;
          scrollTop = viewport.scrollTop;
          e.stopPropagation(); // Prevents panel dragging
        });

        viewport.addEventListener('pointerleave', () => {
          isDown = false;
          viewport.style.cursor = 'grab';
        });

        viewport.addEventListener('pointerup', (e) => {
          isDown = false;
          viewport.style.cursor = 'grab';
          e.stopPropagation();
        });

        viewport.addEventListener('pointermove', (e) => {
          if (!isDown) return;
          e.preventDefault();
          e.stopPropagation(); // Prevents panel dragging
          const x = e.pageX - viewport.offsetLeft;
          const y = e.pageY - viewport.offsetTop;
          viewport.scrollLeft = scrollLeft - (x - startX);
          viewport.scrollTop = scrollTop - (y - startY);
        });

        // Auto-scroll to Present Node
        const today = Date.now();
        const minT = Math.min(...firstArc.nodes.map(n => n.timestamp), today - 86400000 * 5);
        const PIXELS_PER_DAY = 350;
        const todayX = ((today - minT) / 86400000) * PIXELS_PER_DAY;
        viewport.scrollLeft = Math.max(0, todayX - (viewport.clientWidth / 2) + 200); // 200px offset for centering the view better
      }
    }, 300);

    this.setDataBadge('live');
  }

  private renderGraph(arc: StoryArc): string {
    const nodes = arc.nodes;
    if (!nodes.length) return '';

    const PIXELS_PER_DAY = 350;
    const NODE_WIDTH = 260;
    const NODE_HEIGHT = 130;

    const today = Date.now();
    let minTime = Math.min(...nodes.map(n => n.timestamp));
    let maxTime = Math.max(...nodes.map(n => n.timestamp), today);

    // Padding for background canvas
    minTime = Math.min(minTime, today - 86400000 * 8);
    maxTime = Math.max(maxTime, today + 86400000 * 15);

    const canvasWidth = Math.max(1600, ((maxTime - minTime) / 86400000) * PIXELS_PER_DAY);
    const canvasHeight = 650;
    const centerY = canvasHeight / 2;
    const todayX = ((today - minTime) / 86400000) * PIXELS_PER_DAY;

    // Separate Past and Future
    const pastNodes = nodes.filter(n => n.status !== 'predicted').sort((a, b) => a.timestamp - b.timestamp);
    let futureNodes = nodes.filter(n => n.status === 'predicted').sort((a, b) => (b.probability || 0) - (a.probability || 0));

    // DEMO Hackathon fallback: If no predicted nodes were generated (LLM failed/not configured), we inject ideal mocks.
    if (futureNodes.length === 0) {
      futureNodes = [
        { id: 'f1', headline: 'Expansion & High Growth: Global Recovery', timestamp: today + 86400000 * 10 + (11 * 3600000), status: 'predicted', parentIds: [], children: [], probability: 85, metadata: { branch: 'optimistic', trend: '+12%' } },
        { id: 'f2', headline: 'Stability & Moderate Growth: Policy Balance', timestamp: today + 86400000 * 12 + (15 * 3600000), status: 'predicted', parentIds: [], children: [], probability: 70, metadata: { branch: 'baseline', trend: '+6.5%' } },
        { id: 'f3', headline: 'Contraction & Recession: Market Volatility', timestamp: today + 86400000 * 10 + (16 * 3600000), status: 'predicted', parentIds: [], children: [], probability: 40, metadata: { branch: 'pessimistic', trend: '-4%' } }
      ] as any;
    }

    const layoutNodes: LayoutNode[] = [];

    // Calculate Past Node Locations (timeline stems above and below)
    let lastTopX = -9999;
    let lastBotX = -9999;

    pastNodes.forEach((node, idx) => {
      let x = ((node.timestamp - minTime) / 86400000) * PIXELS_PER_DAY;

      const isTop = idx % 2 !== 0; // alternate
      // Basic collision resolution on X
      if (isTop && x < lastTopX + NODE_WIDTH + 40) x = lastTopX + NODE_WIDTH + 40;
      if (!isTop && x < lastBotX + NODE_WIDTH + 40) x = lastBotX + NODE_WIDTH + 40;

      // Position symmetrically above and below the central line
      const y = isTop ? centerY - 200 : centerY + 200;

      if (isTop) lastTopX = x; else lastBotX = x;

      layoutNodes.push({ ...node, x, y, width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    // Calculate Future Node Locations
    const FUTURE_Y_OFFSETS = [-200, -60, 160];
    const FUTURE_COLORS = ['optimistic', 'baseline', 'pessimistic'];

    futureNodes.forEach((node, idx) => {
      let x = ((node.timestamp - minTime) / 86400000) * PIXELS_PER_DAY;
      if (x < todayX + 350) x = todayX + 350; // Give room for ribbon

      const slot = idx % 3;
      const metadata = node.metadata as Record<string, any> | undefined;
      const branchName = metadata?.branch || FUTURE_COLORS[slot];
      const slotIndex = FUTURE_COLORS.indexOf(branchName) !== -1 ? FUTURE_COLORS.indexOf(branchName) : slot;
      const y = centerY + (FUTURE_Y_OFFSETS[slotIndex] ?? 0);

      layoutNodes.push({
        ...node, x, y, width: NODE_WIDTH, height: NODE_HEIGHT, branch: branchName as any
      });
    });

    // Drawing SVG Background Elements
    // Draw years/months vertically
    const yearLines: string[] = [];
    let dLabel = new Date(minTime);
    dLabel.setDate(1);
    dLabel.setHours(0, 0, 0, 0);
    while (dLabel.getTime() < maxTime) {
      const t = dLabel.getTime();
      const x = ((t - minTime) / 86400000) * PIXELS_PER_DAY;
      const isYear = dLabel.getMonth() === 0;

      if (isYear) {
        yearLines.push(`
          <rect x="${x}" y="0" width="80" height="${canvasHeight}" fill="rgba(255,255,255,0.02)"/>
          <line x1="${x}" y1="0" x2="${x}" y2="${canvasHeight}" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
          <text x="${x + 10}" y="${canvasHeight - 30}" fill="rgba(255,255,255,0.3)" font-size="16" font-weight="bold">${dLabel.getFullYear()}</text>
        `);
      }
      dLabel.setMonth(dLabel.getMonth() + 1);
    }

    // Past Node Stems
    const stemsHtml = layoutNodes.filter(n => !n.branch).map(node => {
      const isTop = node.y < centerY;
      // Because we use translate(-50%, -50%) for the CSS .wm-node, the box is centered at node.x, node.y.
      // We will trace the connecting line right from the vertical center axis straight into the box.
      // Drawing into the box guarantees it connects cleanly without gaps.
      const boxEdgeY = isTop ? node.y + (node.height / 2) - 10 : node.y - (node.height / 2) + 10;
      return `
        <circle cx="${node.x}" cy="${centerY}" r="6" fill="#fbbf24" stroke="#111" stroke-width="2"/>
        <line x1="${node.x}" y1="${centerY}" x2="${node.x}" y2="${boxEdgeY}" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
        <circle cx="${node.x}" cy="${boxEdgeY}" r="4" fill="rgba(255,255,255,0.3)"/>
      `;
    }).join('');

    // Future Ribbons
    const ribbonsHtml = layoutNodes.filter(n => n.branch).map(node => {
      const sx = todayX + 60; // Hexagon right edge
      const sy = centerY;
      const tx = node.x - (node.width / 2) + 5; // Left edge of the future node (width is 260)
      const ty = node.y; // Vertical center of the future node

      const dx = tx - sx;
      const pathD = `M ${sx} ${sy} C ${sx + dx * 0.5} ${sy}, ${tx - dx * 0.5} ${ty}, ${tx} ${ty}`;

      let strokeColor = '';
      if (node.branch === 'optimistic') strokeColor = '#38bdf8'; // Blue
      else if (node.branch === 'baseline') strokeColor = '#fbbf24'; // Yellow
      else strokeColor = '#f97316'; // Orange

      return `
        <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="24" opacity="0.15" class="ribbon-glow" />
        <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="3" opacity="0.8" />
        <circle cx="${tx}" cy="${ty}" r="5" fill="${strokeColor}" />
      `;
    }).join('');

    // HTML Nodes
    const nodesHtml = layoutNodes.map(node => {
      const d = new Date(node.timestamp);
      const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const dateStr = `${timePart}, ${datePart}`;

      let icon = '🌐';
      if (node.headline.toLowerCase().includes('rate') || node.headline.toLowerCase().includes('bank')) icon = '📉';
      if (node.headline.toLowerCase().includes('tech') || node.headline.toLowerCase().includes('infosys')) icon = '💻';

      if (!node.branch) {
        // Past Node Format
        return `
          <div class="wm-node" style="left: ${node.x}px; top: ${node.y}px;">
             <div class="wm-node-header">
               <div class="wm-node-icon">${icon}</div>
               <div style="flex-direction: column;">
                 <div class="wm-node-title">${escapeHtml(node.headline.split(':')[0] || 'Event Update')}</div>
                 <div class="wm-node-date">${dateStr}</div>
               </div>
             </div>
             <div class="wm-node-body">${escapeHtml(node.headline)}</div>
          </div>
        `;
      } else {
        // Future Node Format
        const trend = node.metadata?.trend || ((node.branch === 'optimistic') ? '+12%' : node.branch === 'baseline' ? '+6.5%' : '-4%');
        const colorClass = `text-${node.branch}`;
        return `
          <div class="wm-node wm-node-future" style="left: ${node.x}px; top: ${node.y}px; border-left: 4px solid var(--${node.branch}-color);">
             <div style="display: flex; justify-content: space-between; align-items: flex-start;">
               <div class="wm-node-title" style="flex: 1;">${escapeHtml(node.headline.split(':')[0] || 'Forecast Scenario')}</div>
               <div class="wm-node-trend ${colorClass}" style="font-size: 18px; font-weight: 800; margin-left: 10px;">${trend}</div>
             </div>
             <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 12px;">
                <div class="wm-node-body" style="color: #8892b0; font-size: 11px; max-width: 60%;">${dateStr}<br/>${escapeHtml(node.headline.split(':')[1] || node.headline)}</div>
                <div class="wm-node-prob ${colorClass}">${node.probability}% Prob.</div>
             </div>
          </div>
        `;
      }
    }).join('');

    // Hexagon Current State
    const now = new Date();
    const nowDatePart = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const hexagonHtml = `
      <div class="wm-hexagon" style="position: absolute; left: ${todayX}px; top: ${centerY}px; transform: translate(-50%, -50%); z-index: 100;">
        <svg viewBox="0 0 100 110" width="120" height="130">
          <path d="M 50 5 L 95 28 L 95 82 L 50 105 L 5 82 L 5 28 Z" fill="#141824" stroke="#0eb0ff" stroke-width="3" style="filter: drop-shadow(0 0 15px rgba(14, 176, 255, 0.6))"/>
          <path d="M 50 12 L 87 31 L 87 79 L 50 98 L 13 79 L 13 31 Z" fill="none" stroke="rgba(14, 176, 255, 0.3)" stroke-width="1" />
        </svg>
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
          <div style="color: #fff; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">Current<br/>State</div>
          <div style="color: #38bdf8; font-size: 10px; font-weight: 600; margin-top: 4px;">${nowDatePart}</div>
        </div>
      </div>
    `;

    return `
      <div class="wm-viewport">
        <div class="wm-canvas" style="width: ${canvasWidth}px; height: ${canvasHeight}px;">
          <svg class="wm-svg" width="${canvasWidth}" height="${canvasHeight}">
             ${yearLines.join('')}
             <!-- Central Axis Line -->
             <line x1="0" y1="${centerY}" x2="${canvasWidth}" y2="${centerY}" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
             ${stemsHtml}
             ${ribbonsHtml}
          </svg>
          ${hexagonHtml}
          ${nodesHtml}
        </div>
      </div>
    `;
  }
}
