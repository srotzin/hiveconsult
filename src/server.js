import express from 'express';
import cors from 'cors';
import consultRoutes from './routes/consult.js';
import mcpRouter, { TOOL_DEFINITIONS } from './routes/mcp.js';
import { getStats } from './services/stats.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────

app.use(cors({
  exposedHeaders: [
    'X-Payment-Hash',
    'X-Hive-Internal',
    'X-HiveTrust-DID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
}));
app.use(express.json({ limit: '1mb' }));

// ─── Health Check ────────────────────────────────────────────

app.get('/health', (req, res) => {
  const stats = getStats();
  res.json({
    success: true,
    data: {
      service: 'hiveconsult',
      version: '1.0.0',
      status: 'operational',
      description: 'Agent-to-agent reasoning-as-a-service',
      uptime: process.uptime(),
      total_consultations: stats.total_consultations,
      revenue_usdc: stats.revenue_usdc,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// ─── Root Discovery ──────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    service: 'HiveConsult',
    version: '1.0.0',
    description: 'Agent-to-agent reasoning-as-a-service. Structured reasoning, data analysis, decision support, and code/document review.',
    endpoints: {
      health: {
        method: 'GET',
        path: '/health',
        description: 'Service health check'
      },
      reason: {
        method: 'POST',
        path: '/v1/consult/reason',
        description: 'Structured chain-of-thought reasoning',
        pricing: { quick: '$0.01', standard: '$0.05', deep: '$0.25' },
        auth: 'DID + x402 payment'
      },
      analyze: {
        method: 'POST',
        path: '/v1/consult/analyze',
        description: 'Data analysis (trend, anomaly, forecast, comparison)',
        pricing: '$0.05',
        auth: 'DID + x402 payment'
      },
      decide: {
        method: 'POST',
        path: '/v1/consult/decide',
        description: 'Decision support with weighted criteria ranking',
        pricing: '$0.05',
        auth: 'DID + x402 payment'
      },
      review: {
        method: 'POST',
        path: '/v1/consult/review',
        description: 'Code, contract, document, or strategy review',
        pricing: '$0.05',
        auth: 'DID + x402 payment'
      },
      batch: {
        method: 'POST',
        path: '/v1/consult/batch',
        description: 'Batch multiple consultations (max 10)',
        auth: 'DID + x402 payment'
      },
      stats: {
        method: 'GET',
        path: '/v1/consult/stats',
        description: 'Consultation stats and metrics'
      },
      history: {
        method: 'GET',
        path: '/v1/consult/history/:did',
        description: 'Consultation history for an agent'
      },
      mcp: {
        method: 'POST',
        path: '/mcp',
        description: 'JSON-RPC 2.0 MCP endpoint for tool discovery and invocation'
      }
    },
    auth: {
      internal: 'x-hive-internal header bypasses payment',
      external: 'x402 protocol — include X-Payment header with payment proof'
    },
    mcp: {
      endpoint: '/mcp',
      protocol: 'JSON-RPC 2.0',
      methods: ['tools/list', 'tools/call', 'initialize']
    }
  });
});

// ─── AI Plugin Discovery ─────────────────────────────────────

app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.json({
    schema_version: 'v1',
    name_for_human: 'HiveConsult',
    name_for_model: 'hiveconsult',
    description_for_human: 'Agent-to-agent reasoning, analysis, decision support, and review service.',
    description_for_model: 'HiveConsult provides structured reasoning-as-a-service for AI agents. Supports chain-of-thought reasoning at multiple depths, data analysis (trend/anomaly/forecast/comparison), multi-criteria decision support, and code/contract/document/strategy review. All operations require a did:hive: identifier and x402 micropayment.',
    auth: {
      type: 'none',
      instructions: 'Discovery is free. Paid operations require x402 payment via X-Payment header.'
    },
    api: {
      type: 'openapi',
      has_user_authentication: false
    },
    payment: {
      protocol: 'x402',
      currency: 'USDC',
      network: 'base'
    }
  });
});

// ─── Velocity Doctrine ──────────────────────────────────────

app.get('/.well-known/hive-pulse.json', (req, res) => {
  const stats = getStats();
  res.json({
    service: 'HiveConsult',
    role: 'AI consultation marketplace — expert agent consultations with USDC billing',
    consultation_count: stats.total_consultations,
    revenue_usdc: stats.revenue_usdc,
    consultations_today: stats.consultations_today,
    timestamp: new Date().toISOString()
  });
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
`# HiveConsult — AI consultation marketplace
# Autonomous agents welcome. Consultations available at /v1/consult/*

User-agent: *
Allow: /
Allow: /.well-known/
Allow: /v1/consult/

# Agent discovery
# Service: HiveConsult
# Protocol: x402 + DID
# Consultations: reason, analyze, decide, review
`
  );
});

app.get('/.well-known/ai.json', (req, res) => {
  res.json({
    service: 'HiveConsult',
    description: 'AI consultation marketplace — structured reasoning, analysis, decision support, and review services for autonomous agents with USDC micropayments.',
    url: `${req.protocol}://${req.get('host')}`,
    endpoints: {
      discovery: '/',
      health: '/health',
      consult: '/v1/consult',
      mcp: '/mcp'
    },
    auth: {
      protocol: 'x402',
      currency: 'USDC',
      identity: 'did:hive:'
    },
    capabilities: ['reasoning', 'analysis', 'decision-support', 'review']
  });
});

// ─── Routes ──────────────────────────────────────────────────

app.use('/v1/consult', consultRoutes);
app.use('/mcp', mcpRouter);

// ─── A2A Discovery ──────────────────────────────────────────────────────────
app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    schemaVersion: '1.0',
    name: 'hiveconsult',
    description: 'Hive Consult — agent advisory and consultation marketplace',
    version: '1.0.0',
    url: 'https://hiveconsult.onrender.com',
    payment: {
      scheme: 'x402', protocol: 'x402', network: 'base',
      currency: 'USDC', asset: 'USDC',
      address:   '0x15184bf50b3d3f52b60434f8942b7d52f2eb436e',
      recipient: '0x15184bf50b3d3f52b60434f8942b7d52f2eb436e',
      treasury:  'Monroe (W1)',
      rails: [
        {chain:'base',     asset:'USDC', address:'0x15184bf50b3d3f52b60434f8942b7d52f2eb436e'},
        {chain:'base',     asset:'USDT', address:'0x15184bf50b3d3f52b60434f8942b7d52f2eb436e'},
        {chain:'ethereum', asset:'USDT', address:'0x15184bf50b3d3f52b60434f8942b7d52f2eb436e'},
        {chain:'solana',   asset:'USDC', address:'B1N61cuL35fhskWz5dw8XqDyP6LWi3ZWmq8CNA9L3FVn'},
        {chain:'solana',   asset:'USDT', address:'B1N61cuL35fhskWz5dw8XqDyP6LWi3ZWmq8CNA9L3FVn'},
      ],
    },
    extensions: {
      hive_pricing: {
        currency: 'USDC', network: 'base', model: 'per_call',
        first_call_free: true, loyalty_threshold: 6,
        loyalty_message: 'Every 6th paid call is free',
        treasury: '0x15184bf50b3d3f52b60434f8942b7d52f2eb436e',
        treasury_codename: 'Monroe (W1)',
      },
    },
    bogo: {
      first_call_free: true, loyalty_threshold: 6,
      pitch: "Pay this once, your 6th paid call is on the house. New here? Add header 'x-hive-did' to claim your first call free.",
      claim_with: 'x-hive-did header',
    },
  });
});

// ─── 404 Handler ─────────────────────────────────────────────


app.get('/.well-known/agent-card.json', (req, res) => res.json({
  protocolVersion: '0.3.0',
  name: 'hiveconsult',
  description: "HiveConsult — agent advisory and recommendation surface.",
  url: 'https://hiveconsult.onrender.com',
  version: '1.0.0',
  provider: { organization: 'Hive Civilization', url: 'https://hiveagentiq.com' },
  capabilities: { streaming: false, pushNotifications: false },
  defaultInputModes: ['application/json'],
  defaultOutputModes: ['application/json'],
  authentication: { schemes: ['x402', 'api-key'] },
  payment: {
    protocol: 'x402', currency: 'USDC', network: 'base',
    address: '0x15184bf50b3d3f52b60434f8942b7d52f2eb436e'
  },
  extensions: {
    hive_pricing: {
      currency: 'USDC', network: 'base', model: 'per_call',
      first_call_free: true, loyalty_threshold: 6,
      loyalty_message: 'Every 6th paid call is free'
    }
  },
  bogo: {
    first_call_free: true, loyalty_threshold: 6,
    pitch: "Pay this once, your 6th paid call is on the house. New here? Add header 'x-hive-did' to claim your first call free.",
    claim_with: 'x-hive-did header'
  }
}));

app.get('/.well-known/ap2.json', (req, res) => res.json({
  ap2_version: '1.0',
  agent: 'hiveconsult',
  payment_methods: ['x402-usdc-base'],
  treasury: '0x15184bf50b3d3f52b60434f8942b7d52f2eb436e',
  bogo: { first_call_free: true, loyalty_threshold: 6, claim_with: 'x-hive-did header' }
}));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Not found: ${req.method} ${req.path}`,
    available_endpoints: [
      'GET /',
      'GET /health',
      'POST /v1/consult/reason',
      'POST /v1/consult/analyze',
      'POST /v1/consult/decide',
      'POST /v1/consult/review',
      'POST /v1/consult/batch',
      'GET /v1/consult/stats',
      'GET /v1/consult/history/:did',
      'POST /mcp',
      'GET /.well-known/ai-plugin.json',
      'GET /.well-known/hive-pulse.json',
      'GET /.well-known/ai.json',
      'GET /robots.txt'
    ]
  });
});

// ─── Error Handler ───────────────────────────────────────────

app.use((err, req, res, _next) => {
  console.error(`[HiveConsult] Error:`, err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error.',
    ...(process.env.NODE_ENV !== 'production' && { detail: err.message })
  });
});

// ─── Start ───────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[HiveConsult] Reasoning-as-a-service running on port ${PORT}`);
  console.log(`[HiveConsult] MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`[HiveConsult] Discovery: http://localhost:${PORT}/`);
});

export default app;

// ─── HiveAI Revenue Endpoint ─────────────────────────────────────────────────
// POST /v1/consult/ai/brief  ($0.08/call — premium strategic intelligence)
const _HIVEAI_URL   = 'https://hive-ai-1.onrender.com/v1/chat/completions';
const _HIVEAI_MODEL = 'meta-llama/llama-3.1-8b-instruct';
const _HIVEAI_KEY   = process.env.HIVE_INTERNAL_KEY || 'hive_internal_125e04e071e8829be631ea0216dd4a0c9b707975fcecaf8c62c6a2ab43327d46';

app.post('/v1/consult/ai/brief', async (req, res) => {
  const { question, context = '', domain = 'strategy', agent_did } = req.body || {};
  if (!question) {
    return res.status(400).json({ success: false, error: 'question required' });
  }
  try {
    const system = 'You are HiveConsult — the senior strategic advisor for autonomous agents. You have deep expertise across DeFi, agent networks, trust systems, compliance, and capital allocation. Answer directly, as a seasoned operator who has seen what works. 3-4 sentences max.';
    const user = `Domain: ${domain}. ${context ? `Context: ${context}. ` : ''}Question: ${question}`;

    let brief;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      const aiRes = await fetch(_HIVEAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_HIVEAI_KEY}` },
        body: JSON.stringify({ model: _HIVEAI_MODEL, max_tokens: 200, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await aiRes.json();
      brief = data?.choices?.[0]?.message?.content?.trim() || null;
    } catch (_) { brief = null; }

    return res.json({
      success: true,
      brief: brief || `Strategic assessment for "${question}" in domain ${domain}: The highest-leverage action is typically the one that compounds network position rather than depletes it. Consult HiveCapital for allocation, HiveTrust for counterparty risk, and HiveLaw for contract enforcement before committing.`,
      domain,
      agent_did: agent_did || null,
      source: brief ? 'hiveai' : 'fallback',
      price_usdc: 0.08,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    return res.json({ success: true, brief: 'Strategic brief temporarily unavailable. Try HiveForge /v1/consult/ai/brief as fallback.', price_usdc: 0.08, _fallback: true });
  }
});
