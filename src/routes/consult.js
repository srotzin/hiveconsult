import { Router } from 'express';
import { requireDID } from '../middleware/auth.js';
import { requirePayment } from '../middleware/x402.js';
import { performReasoning } from '../services/reasoning.js';
import { performAnalysis } from '../services/analysis.js';
import { performDecision } from '../services/decision.js';
import { performReview } from '../services/review.js';
import { recordConsultation, getStats, getHistoryForDid, PRICING } from '../services/stats.js';

const router = Router();

// ─── POST /v1/consult/reason ─────────────────────────────────

router.post('/reason', requireDID, (req, res, next) => {
  const depth = req.body.reasoning_depth || 'standard';
  const price = PRICING[depth] || PRICING.standard;
  requirePayment(price, `Reasoning (${depth})`)(req, res, next);
}, async (req, res) => {
  try {
    const { question, context, reasoning_depth, domain } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, error: 'Field "question" is required.' });
    }

    const validDepths = ['quick', 'standard', 'deep'];
    const depth = reasoning_depth || 'standard';
    if (!validDepths.includes(depth)) {
      return res.status(400).json({
        success: false,
        error: `Invalid reasoning_depth: "${depth}". Valid values: ${validDepths.join(', ')}`
      });
    }

    const result = performReasoning({ question, context, reasoning_depth: depth, domain });
    const cost = req.costUsdc ?? PRICING[depth];

    recordConsultation({
      consultation_id: result.consultation_id,
      did: req.agentDid,
      type: 'reason',
      domain: domain || 'general',
      depth,
      cost_usdc: cost,
      confidence: result.confidence
    });

    result.cost_usdc = cost;

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /v1/consult/analyze ────────────────────────────────

router.post('/analyze', requireDID, requirePayment(0.05, 'Data Analysis'), async (req, res) => {
  try {
    const { data, analysis_type } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, error: 'Field "data" is required.' });
    }

    const result = performAnalysis({ data, analysis_type, did: req.agentDid });
    const cost = req.costUsdc ?? 0.05;

    recordConsultation({
      consultation_id: result.consultation_id,
      did: req.agentDid,
      type: 'analyze',
      domain: analysis_type || 'trend',
      depth: 'standard',
      cost_usdc: cost,
      confidence: result.confidence
    });

    result.cost_usdc = cost;

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('Invalid analysis_type')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /v1/consult/decide ─────────────────────────────────

router.post('/decide', requireDID, requirePayment(0.05, 'Decision Support'), async (req, res) => {
  try {
    const { options, criteria, weights } = req.body;
    if (!options || !criteria) {
      return res.status(400).json({ success: false, error: 'Fields "options" and "criteria" are required.' });
    }

    const result = performDecision({ options, criteria, weights });
    const cost = req.costUsdc ?? 0.05;

    recordConsultation({
      consultation_id: result.consultation_id,
      did: req.agentDid,
      type: 'decide',
      domain: 'decision_support',
      depth: 'standard',
      cost_usdc: cost,
      confidence: result.confidence
    });

    result.cost_usdc = cost;

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('required')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /v1/consult/review ─────────────────────────────────

router.post('/review', requireDID, requirePayment(0.05, 'Review'), async (req, res) => {
  try {
    const { content, review_type } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: 'Field "content" is required.' });
    }

    const result = performReview({ content, review_type });
    const cost = req.costUsdc ?? 0.05;

    recordConsultation({
      consultation_id: result.consultation_id,
      did: req.agentDid,
      type: 'review',
      domain: review_type || 'code',
      depth: 'standard',
      cost_usdc: cost,
      confidence: 0.8
    });

    result.cost_usdc = cost;

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('Invalid review_type')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /v1/consult/batch ──────────────────────────────────

router.post('/batch', requireDID, requirePayment(0.01, 'Batch Consultation'), async (req, res) => {
  try {
    const { consultations } = req.body;
    if (!consultations || !Array.isArray(consultations) || consultations.length === 0) {
      return res.status(400).json({ success: false, error: 'Field "consultations" must be a non-empty array.' });
    }

    if (consultations.length > 10) {
      return res.status(400).json({ success: false, error: 'Maximum 10 consultations per batch.' });
    }

    const results = [];
    let totalCost = 0;

    for (const consultation of consultations) {
      try {
        let result;
        let cost = 0;

        switch (consultation.type) {
          case 'reason': {
            const depth = consultation.reasoning_depth || 'standard';
            cost = PRICING[depth] || PRICING.standard;
            result = performReasoning({
              question: consultation.question,
              context: consultation.context,
              reasoning_depth: depth,
              domain: consultation.domain
            });
            break;
          }
          case 'analyze':
            cost = 0.05;
            result = performAnalysis({
              data: consultation.data,
              analysis_type: consultation.analysis_type,
              did: req.agentDid
            });
            break;
          case 'decide':
            cost = 0.05;
            result = performDecision({
              options: consultation.options,
              criteria: consultation.criteria,
              weights: consultation.weights
            });
            break;
          case 'review':
            cost = 0.05;
            result = performReview({
              content: consultation.content,
              review_type: consultation.review_type
            });
            break;
          default:
            results.push({ error: `Unknown consultation type: ${consultation.type}` });
            continue;
        }

        totalCost += cost;
        result.cost_usdc = cost;

        recordConsultation({
          consultation_id: result.consultation_id,
          did: req.agentDid,
          type: consultation.type,
          domain: consultation.domain || 'general',
          depth: consultation.reasoning_depth || 'standard',
          cost_usdc: cost,
          confidence: result.confidence || 0.75
        });

        results.push({ success: true, data: result });
      } catch (err) {
        results.push({ success: false, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        results,
        total_consultations: results.length,
        total_cost_usdc: +totalCost.toFixed(4)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /v1/consult/stats ───────────────────────────────────

router.get('/stats', (req, res) => {
  const stats = getStats();
  return res.status(200).json({ success: true, data: stats });
});

// ─── GET /v1/consult/history/:did ────────────────────────────

router.get('/history/:did', (req, res) => {
  const { did } = req.params;
  if (!did.startsWith('did:hive:')) {
    return res.status(400).json({ success: false, error: 'Invalid DID format. Must start with did:hive:' });
  }

  const history = getHistoryForDid(did);
  return res.status(200).json({
    success: true,
    data: {
      did,
      total: history.length,
      consultations: history
    }
  });
});

export default router;
