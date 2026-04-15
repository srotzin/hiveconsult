import { Router } from 'express';
import { performReasoning } from '../services/reasoning.js';
import { performAnalysis } from '../services/analysis.js';
import { performDecision } from '../services/decision.js';
import { performReview } from '../services/review.js';
import { recordConsultation, PRICING } from '../services/stats.js';

const router = Router();

// ─── MCP Tool Definitions ────────────────────────────────────

const TOOL_DEFINITIONS = [
  {
    name: 'hiveconsult_reason',
    description: 'Submit a question or problem for structured chain-of-thought reasoning. Returns step-by-step analysis with confidence score and recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'Agent DID (did:hive:...)' },
        question: { type: 'string', description: 'The question or problem to reason about' },
        context: { type: 'string', description: 'Optional additional context' },
        reasoning_depth: { type: 'string', enum: ['quick', 'standard', 'deep'], description: 'Depth of reasoning. quick=$0.01, standard=$0.05, deep=$0.25' },
        domain: { type: 'string', description: 'Optional domain for specialized reasoning' }
      },
      required: ['did', 'question']
    }
  },
  {
    name: 'hiveconsult_analyze',
    description: 'Analyze data for trends, anomalies, forecasts, or comparisons. Returns structured findings with confidence scores.',
    inputSchema: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'Agent DID (did:hive:...)' },
        data: { description: 'Data to analyze (array, object, or value)' },
        analysis_type: { type: 'string', enum: ['trend', 'anomaly', 'forecast', 'comparison'], description: 'Type of analysis to perform' }
      },
      required: ['did', 'data']
    }
  },
  {
    name: 'hiveconsult_decide',
    description: 'Decision support: rank options against weighted criteria. Returns scored and ranked options with reasoning.',
    inputSchema: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'Agent DID (did:hive:...)' },
        options: { type: 'array', items: { type: 'string' }, description: 'Options to evaluate (minimum 2)' },
        criteria: { type: 'array', items: { type: 'string' }, description: 'Criteria to evaluate against' },
        weights: { type: 'array', items: { type: 'number' }, description: 'Optional weights for criteria (must match criteria length)' }
      },
      required: ['did', 'options', 'criteria']
    }
  },
  {
    name: 'hiveconsult_review',
    description: 'Review code, contracts, documents, or strategies. Returns issues, recommendations, and risk score.',
    inputSchema: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'Agent DID (did:hive:...)' },
        content: { type: 'string', description: 'Content to review' },
        review_type: { type: 'string', enum: ['code', 'contract', 'document', 'strategy'], description: 'Type of review' }
      },
      required: ['did', 'content']
    }
  }
];

// ─── JSON-RPC 2.0 Handler ────────────────────────────────────

router.post('/', (req, res) => {
  const { jsonrpc, id, method, params } = req.body;

  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32600, message: 'Invalid Request. Expected JSON-RPC 2.0.' }
    });
  }

  switch (method) {
    case 'tools/list':
      return res.json({
        jsonrpc: '2.0',
        id,
        result: { tools: TOOL_DEFINITIONS }
      });

    case 'tools/call':
      return handleToolCall(id, params, res);

    case 'initialize':
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'hiveconsult',
            version: '1.0.0'
          }
        }
      });

    default:
      return res.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      });
  }
});

// ─── Tool Call Dispatcher ────────────────────────────────────

function handleToolCall(id, params, res) {
  const { name, arguments: args } = params || {};

  if (!name || !args) {
    return res.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32602, message: 'Invalid params. Required: name, arguments.' }
    });
  }

  try {
    let result;
    let type;
    let cost;

    switch (name) {
      case 'hiveconsult_reason': {
        const depth = args.reasoning_depth || 'standard';
        cost = PRICING[depth] || PRICING.standard;
        type = 'reason';
        result = performReasoning({
          question: args.question,
          context: args.context,
          reasoning_depth: depth,
          domain: args.domain
        });
        break;
      }
      case 'hiveconsult_analyze':
        cost = 0.05;
        type = 'analyze';
        result = performAnalysis({
          data: args.data,
          analysis_type: args.analysis_type,
          did: args.did
        });
        break;

      case 'hiveconsult_decide':
        cost = 0.05;
        type = 'decide';
        result = performDecision({
          options: args.options,
          criteria: args.criteria,
          weights: args.weights
        });
        break;

      case 'hiveconsult_review':
        cost = 0.05;
        type = 'review';
        result = performReview({
          content: args.content,
          review_type: args.review_type
        });
        break;

      default:
        return res.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: `Unknown tool: ${name}` }
        });
    }

    // Record stats
    recordConsultation({
      consultation_id: result.consultation_id,
      did: args.did || 'did:hive:mcp_client',
      type,
      domain: args.domain || args.analysis_type || args.review_type || 'general',
      depth: args.reasoning_depth || 'standard',
      cost_usdc: cost,
      confidence: result.confidence || 0.75
    });

    result.cost_usdc = cost;

    return res.json({
      jsonrpc: '2.0',
      id,
      result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    });
  } catch (err) {
    return res.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: err.message }
    });
  }
}

export default router;
export { TOOL_DEFINITIONS };
