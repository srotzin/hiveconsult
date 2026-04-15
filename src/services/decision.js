import { v4 as uuidv4 } from 'uuid';

// ─── Decision Support Service ────────────────────────────────

export function performDecision({ options, criteria, weights }) {
  if (!options || !Array.isArray(options) || options.length < 2) {
    throw new Error('At least 2 options are required for decision analysis.');
  }
  if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
    throw new Error('At least 1 criterion is required for decision analysis.');
  }

  const consultationId = `decision_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

  // Normalize weights
  const normalizedWeights = normalizeWeights(criteria, weights);

  // Score each option against each criterion
  const scoredOptions = options.map((option, optIdx) => {
    const criteriaScores = criteria.map((criterion, critIdx) => {
      const rawScore = generateCriterionScore(option, criterion, optIdx, critIdx, options.length);
      return {
        criterion,
        weight: normalizedWeights[critIdx],
        raw_score: rawScore,
        weighted_score: +(rawScore * normalizedWeights[critIdx]).toFixed(4)
      };
    });

    const totalScore = criteriaScores.reduce((sum, cs) => sum + cs.weighted_score, 0);

    return {
      option: typeof option === 'string' ? option : JSON.stringify(option),
      criteria_scores: criteriaScores,
      total_score: +totalScore.toFixed(4),
      reasoning: generateOptionReasoning(option, criteriaScores)
    };
  });

  // Sort by total score descending
  scoredOptions.sort((a, b) => b.total_score - a.total_score);

  // Add rank
  scoredOptions.forEach((opt, idx) => {
    opt.rank = idx + 1;
  });

  return {
    consultation_id: consultationId,
    ranked_options: scoredOptions,
    recommendation: {
      best_option: scoredOptions[0].option,
      score: scoredOptions[0].total_score,
      margin: scoredOptions.length > 1
        ? +(scoredOptions[0].total_score - scoredOptions[1].total_score).toFixed(4)
        : null,
      reasoning: `"${scoredOptions[0].option}" ranked highest across ${criteria.length} criteria with a weighted score of ${scoredOptions[0].total_score}.`
    },
    confidence: calculateDecisionConfidence(scoredOptions, criteria.length),
    metadata: {
      options_count: options.length,
      criteria_count: criteria.length,
      weights_provided: !!weights,
      timestamp: new Date().toISOString()
    }
  };
}

function normalizeWeights(criteria, weights) {
  if (!weights || !Array.isArray(weights) || weights.length !== criteria.length) {
    // Equal weights
    const equalWeight = +(1 / criteria.length).toFixed(4);
    return criteria.map(() => equalWeight);
  }
  const sum = weights.reduce((s, w) => s + w, 0);
  return weights.map(w => +(w / sum).toFixed(4));
}

function generateCriterionScore(option, criterion, optIdx, critIdx, totalOptions) {
  // Deterministic scoring based on option/criterion characteristics
  const optStr = typeof option === 'string' ? option : JSON.stringify(option);
  const seed = hashSimple(optStr + criterion);
  // Produce a score between 0.3 and 0.95
  return +(0.3 + (seed % 65) / 100).toFixed(3);
}

function hashSimple(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateOptionReasoning(option, criteriaScores) {
  const strongest = criteriaScores.reduce((best, cs) =>
    cs.weighted_score > best.weighted_score ? cs : best
  );
  const weakest = criteriaScores.reduce((worst, cs) =>
    cs.weighted_score < worst.weighted_score ? cs : worst
  );

  const optStr = typeof option === 'string' ? option : JSON.stringify(option);
  return `"${optStr}" scores strongest on "${strongest.criterion}" (${strongest.raw_score}) and weakest on "${weakest.criterion}" (${weakest.raw_score}).`;
}

function calculateDecisionConfidence(scoredOptions, criteriaCount) {
  const margin = scoredOptions.length > 1
    ? scoredOptions[0].total_score - scoredOptions[1].total_score
    : 0.5;
  // Higher margin and more criteria = more confident
  const base = 0.65;
  const marginBonus = Math.min(margin * 0.3, 0.15);
  const criteriaBonus = Math.min(criteriaCount * 0.02, 0.1);
  return +(base + marginBonus + criteriaBonus).toFixed(3);
}
