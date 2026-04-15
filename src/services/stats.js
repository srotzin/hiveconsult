// ─── In-Memory Stats Tracking ────────────────────────────────

const consultations = [];
const revenueByDomain = new Map();
const consultationsByDepth = { quick: 0, standard: 0, deep: 0 };
const consultationsByType = { reason: 0, analyze: 0, decide: 0, review: 0 };

const PRICING = {
  quick: 0.01,
  standard: 0.05,
  deep: 0.25
};

// ─── Record ──────────────────────────────────────────────────

export function recordConsultation({ consultation_id, did, type, domain, depth, cost_usdc, confidence }) {
  const record = {
    consultation_id,
    did,
    type,
    domain: domain || 'general',
    depth: depth || 'standard',
    cost_usdc: cost_usdc || 0,
    confidence: confidence || 0,
    timestamp: new Date().toISOString()
  };

  consultations.push(record);

  // Track by depth
  if (consultationsByDepth[record.depth] !== undefined) {
    consultationsByDepth[record.depth]++;
  }

  // Track by type
  if (consultationsByType[record.type] !== undefined) {
    consultationsByType[record.type]++;
  }

  // Track revenue by domain
  const currentDomainRevenue = revenueByDomain.get(record.domain) || 0;
  revenueByDomain.set(record.domain, +(currentDomainRevenue + record.cost_usdc).toFixed(4));

  return record;
}

// ─── Query ───────────────────────────────────────────────────

export function getStats() {
  const totalRevenue = consultations.reduce((sum, c) => sum + c.cost_usdc, 0);
  const totalConfidence = consultations.reduce((sum, c) => sum + c.confidence, 0);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const consultationsToday = consultations.filter(c => new Date(c.timestamp) >= todayStart).length;

  // Top domains by consultation count
  const domainCounts = {};
  for (const c of consultations) {
    domainCounts[c.domain] = (domainCounts[c.domain] || 0) + 1;
  }
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => ({ domain, count }));

  return {
    total_consultations: consultations.length,
    revenue_usdc: +totalRevenue.toFixed(4),
    avg_confidence: consultations.length > 0 ? +(totalConfidence / consultations.length).toFixed(3) : 0,
    consultations_today: consultationsToday,
    top_domains: topDomains,
    by_depth: { ...consultationsByDepth },
    by_type: { ...consultationsByType },
    pricing: { ...PRICING }
  };
}

export function getHistoryForDid(did) {
  return consultations
    .filter(c => c.did === did)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export { PRICING };
