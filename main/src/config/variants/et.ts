// ET Sentinel variant — Indian AI-Native Business News Experience
// ET GenAI Hackathon 2026 — Theme 8: AI-Native News Experience
import type { PanelConfig, MapLayers } from '@/types';
import type { VariantConfig } from './base';

// Re-export base config
export * from './base';

// Re-export finance geo (stock exchanges, financial centers for India map)
export * from '../finance-geo';

// Re-export feeds infrastructure
export {
  SOURCE_TIERS,
  getSourceTier,
  SOURCE_TYPES,
  getSourceType,
  getSourcePropagandaRisk,
  type SourceRiskProfile,
  type SourceType,
} from '../feeds';

// ============================================
// ET VARIANT FEEDS — Indian Business & Finance
// ============================================
import type { Feed } from '@/types';
import { rssProxyUrl } from '@/utils';

const rss = rssProxyUrl;

export const FEEDS: Record<string, Feed[]> = {
  // Core Indian Business News
  'india-business': [
    { name: 'ET Markets', url: rss('https://news.google.com/rss/search?q=site:economictimes.indiatimes.com+markets+when:1d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'Mint', url: rss('https://news.google.com/rss/search?q=site:livemint.com+when:1d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'MoneyControl', url: rss('https://news.google.com/rss/search?q=site:moneycontrol.com+when:1d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'Business Standard', url: rss('https://news.google.com/rss/search?q=site:business-standard.com+when:1d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'NDTV Profit', url: rss('https://news.google.com/rss/search?q=site:ndtv.com+profit+OR+business+when:1d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'Financial Express', url: rss('https://news.google.com/rss/search?q=site:financialexpress.com+when:1d&hl=en-IN&gl=IN&ceid=IN:en') },
  ],

  // Indian Stock Market
  markets: [
    { name: 'NSE India', url: rss('https://news.google.com/rss/search?q=(NIFTY+OR+NSE+OR+Sensex+OR+BSE)+stock+market+India+when:1d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'ET Markets Live', url: rss('https://news.google.com/rss/search?q=site:economictimes.indiatimes.com+markets+stock+when:1d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'Zerodha Varsity', url: rss('https://news.google.com/rss/search?q=(NIFTY50+OR+"mutual+fund"+OR+SIP+OR+"stock+market")+India+when:1d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'Reuters India', url: rss('https://news.google.com/rss/search?q=site:reuters.com+India+markets+when:2d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'Bloomberg India', url: rss('https://news.google.com/rss/search?q=site:bloomberg.com+India+when:2d&hl=en-IN&gl=IN&ceid=IN:en') },
  ],

  // Indian Startups & Tech
  'india-tech': [
    { name: 'Inc42', url: rss('https://inc42.com/feed/') },
    { name: 'YourStory', url: rss('https://news.google.com/rss/search?q=site:yourstory.com+when:2d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'Entrackr', url: rss('https://news.google.com/rss/search?q=site:entrackr.com+when:3d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'TechCrunch India', url: rss('https://news.google.com/rss/search?q=site:techcrunch.com+India+when:3d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'India Tech News', url: rss('https://news.google.com/rss/search?q=(India+startup+OR+"Indian+unicorn"+OR+Flipkart+OR+Zomato+OR+Paytm)+when:2d&hl=en-IN&gl=IN&ceid=IN:en') },
  ],

  // RBI, SEBI & Policy
  'india-policy': [
    { name: 'RBI News', url: rss('https://news.google.com/rss/search?q=(RBI+OR+"Reserve+Bank+of+India"+OR+"repo+rate"+OR+"monetary+policy")+when:3d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'SEBI Updates', url: rss('https://news.google.com/rss/search?q=(SEBI+OR+"Securities+and+Exchange+Board")+regulation+when:3d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'India Budget', url: rss('https://news.google.com/rss/search?q=(India+budget+OR+GST+OR+"fiscal+policy"+OR+"Finance+Ministry")+when:3d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'India Trade', url: rss('https://news.google.com/rss/search?q=(India+trade+OR+export+OR+import+OR+tariff+OR+"Make+in+India")+when:3d&hl=en-IN&gl=IN&ceid=IN:en') },
  ],

  // Commodities (India-relevant)
  commodities: [
    { name: 'Gold India', url: rss('https://news.google.com/rss/search?q=(gold+price+India+OR+MCX+gold+OR+"gold+rate")+when:2d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'Oil India', url: rss('https://news.google.com/rss/search?q=(crude+oil+India+OR+OPEC+OR+"fuel+price"+India)+when:2d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'Agri Commodities', url: rss('https://news.google.com/rss/search?q=(India+agriculture+OR+MSP+OR+wheat+OR+rice+OR+sugar)+price+when:3d&hl=en-IN&gl=IN&ceid=IN:en') },
  ],

  // Crypto & Digital Assets India
  crypto: [
    { name: 'Crypto India', url: rss('https://news.google.com/rss/search?q=(crypto+India+OR+bitcoin+India+OR+WazirX+OR+CoinDCX+OR+"digital+rupee")+when:3d&hl=en-IN&gl=IN&ceid=IN:en') },
  ],

  // Global context that impacts India
  'global-impact': [
    { name: 'US Fed Impact', url: rss('https://news.google.com/rss/search?q=("Federal+Reserve"+OR+"interest+rate"+OR+"US+economy")+India+impact+when:3d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'China Trade', url: rss('https://news.google.com/rss/search?q=(China+OR+"US-China")+trade+India+when:3d&hl=en-IN&gl=IN&ceid=IN:en') },
    { name: 'Global Markets', url: rss('https://news.google.com/rss/search?q=("global+markets"+OR+"Wall+Street"+OR+"Asian+markets")+when:1d&hl=en-IN&gl=IN&ceid=IN:en') },
  ],

  // AI & Technology Global (relevant for Indian tech sector)
  ai: [
    { name: 'AI News', url: rss('https://news.google.com/rss/search?q=(OpenAI+OR+Anthropic+OR+Google+AI+OR+"artificial+intelligence")+when:2d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'India AI', url: rss('https://news.google.com/rss/search?q=(India+AI+OR+"Indian+AI"+OR+Infosys+AI+OR+TCS+AI+OR+Wipro+AI)+when:3d&hl=en-IN&gl=IN&ceid=IN:en') },
  ],
};

// ============================================
// ET PANEL CONFIGURATION
// ============================================
export const DEFAULT_PANELS: Record<string, PanelConfig> = {
  map: { name: 'India Business Map', enabled: true, priority: 1 },
  'story-arc': { name: 'Causal Intelligence', enabled: true, priority: 1.1 },
  'live-news': { name: 'Business Headlines', enabled: true, priority: 2 },
  monitors: { name: 'My Monitors', enabled: true, priority: 4 },
};

// ============================================
// ET MAP LAYERS — India-focused financial geography
// ============================================
export const DEFAULT_MAP_LAYERS: MapLayers = {
  gpsJamming: false,
  satellites: false,
  conflicts: false,
  bases: false,
  cables: true,
  pipelines: false,
  hotspots: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: false,
  weather: true,
  economic: true,
  waterways: true,
  outages: true,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  ucdpEvents: false,
  displacement: false,
  climate: false,
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  stockExchanges: true,
  financialCenters: true,
  centralBanks: true,
  commodityHubs: true,
  gulfInvestments: false,
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: true,
  iranAttacks: false,
  ciiChoropleth: false,
  dayNight: false,
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  weatherRadar: false,
  diseaseOutbreaks: false,
};

export const MOBILE_DEFAULT_MAP_LAYERS: MapLayers = {
  gpsJamming: false,
  satellites: false,
  conflicts: false,
  bases: false,
  cables: false,
  pipelines: false,
  hotspots: false,
  ais: false,
  nuclear: false,
  irradiators: false,
  sanctions: false,
  weather: false,
  economic: true,
  waterways: false,
  outages: true,
  cyberThreats: false,
  datacenters: false,
  protests: false,
  flights: false,
  military: false,
  natural: true,
  spaceports: false,
  minerals: false,
  fires: false,
  ucdpEvents: false,
  displacement: false,
  climate: false,
  startupHubs: false,
  cloudRegions: false,
  accelerators: false,
  techHQs: false,
  techEvents: false,
  stockExchanges: true,
  financialCenters: false,
  centralBanks: true,
  commodityHubs: false,
  gulfInvestments: false,
  positiveEvents: false,
  kindness: false,
  happiness: false,
  speciesRecovery: false,
  renewableInstallations: false,
  tradeRoutes: false,
  iranAttacks: false,
  ciiChoropleth: false,
  dayNight: false,
  miningSites: false,
  processingPlants: false,
  commodityPorts: false,
  webcams: false,
  weatherRadar: false,
  diseaseOutbreaks: false,
};

export const VARIANT_CONFIG: VariantConfig = {
  name: 'et',
  description: 'AI-Native Indian Business News Intelligence Dashboard',
  panels: DEFAULT_PANELS,
  mapLayers: DEFAULT_MAP_LAYERS,
  mobileMapLayers: MOBILE_DEFAULT_MAP_LAYERS,
};
