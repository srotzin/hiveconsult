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

// ─── Routes ──────────────────────────────────────────────────

app.use('/v1/consult', consultRoutes);
app.use('/mcp', mcpRouter);

// ─── 404 Handler ─────────────────────────────────────────────

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
      'GET /.well-known/ai-plugin.json'
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
