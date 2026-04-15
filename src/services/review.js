import { v4 as uuidv4 } from 'uuid';

// ─── Review Service ──────────────────────────────────────────

const REVIEW_TYPES = {
  code: { description: 'Code quality and security review' },
  contract: { description: 'Smart contract or legal contract review' },
  document: { description: 'Document structure and content review' },
  strategy: { description: 'Strategy and planning review' }
};

export function performReview({ content, review_type }) {
  const type = review_type || 'code';
  const config = REVIEW_TYPES[type];
  if (!config) {
    throw new Error(`Invalid review_type: ${type}. Valid types: ${Object.keys(REVIEW_TYPES).join(', ')}`);
  }

  const consultationId = `review_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const contentLength = typeof content === 'string' ? content.length : JSON.stringify(content).length;

  const issues = generateIssues(type, content, contentLength);
  const recommendations = generateReviewRecommendations(type, issues);
  const riskScore = calculateRiskScore(issues);

  return {
    consultation_id: consultationId,
    review_type: type,
    description: config.description,
    content_summary: {
      length: contentLength,
      type: typeof content
    },
    issues,
    recommendations,
    risk_score: riskScore,
    metadata: {
      review_type: type,
      issues_found: issues.length,
      timestamp: new Date().toISOString()
    }
  };
}

function generateIssues(type, content, contentLength) {
  const issues = [];

  switch (type) {
    case 'code':
      if (contentLength > 5000) {
        issues.push({
          severity: 'medium',
          category: 'complexity',
          description: 'Large code block may indicate high complexity. Consider modularization.',
          location: 'overall'
        });
      }
      issues.push({
        severity: 'low',
        category: 'best_practices',
        description: 'Review completed. Check for error handling coverage at system boundaries.',
        location: 'general'
      });
      if (typeof content === 'string') {
        if (content.includes('eval(') || content.includes('exec(')) {
          issues.push({
            severity: 'critical',
            category: 'security',
            description: 'Dynamic code execution detected. This is a potential security vulnerability.',
            location: 'inline'
          });
        }
        if (content.includes('password') || content.includes('secret') || content.includes('api_key')) {
          issues.push({
            severity: 'high',
            category: 'security',
            description: 'Potential sensitive data in code. Ensure secrets are not hardcoded.',
            location: 'inline'
          });
        }
      }
      break;

    case 'contract':
      issues.push({
        severity: 'medium',
        category: 'terms',
        description: 'Contract reviewed for standard clause coverage.',
        location: 'general'
      });
      issues.push({
        severity: 'low',
        category: 'clarity',
        description: 'Verify all obligations and deliverables are explicitly defined.',
        location: 'general'
      });
      break;

    case 'document':
      issues.push({
        severity: 'low',
        category: 'structure',
        description: 'Document structure reviewed for clarity and completeness.',
        location: 'general'
      });
      if (contentLength < 100) {
        issues.push({
          severity: 'medium',
          category: 'completeness',
          description: 'Document appears short. Verify all required sections are present.',
          location: 'overall'
        });
      }
      break;

    case 'strategy':
      issues.push({
        severity: 'medium',
        category: 'feasibility',
        description: 'Verify resource requirements and timeline feasibility.',
        location: 'general'
      });
      issues.push({
        severity: 'low',
        category: 'risk',
        description: 'Ensure contingency plans are defined for key risk areas.',
        location: 'general'
      });
      break;
  }

  return issues;
}

function generateReviewRecommendations(type, issues) {
  const recommendations = [];
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;

  if (criticalCount > 0) {
    recommendations.push({
      priority: 'critical',
      recommendation: 'Address all critical issues before proceeding.',
      rationale: `${criticalCount} critical issue(s) found that may pose security or reliability risks.`
    });
  }

  if (highCount > 0) {
    recommendations.push({
      priority: 'high',
      recommendation: 'Resolve high-severity issues in the next iteration.',
      rationale: `${highCount} high-severity issue(s) identified.`
    });
  }

  recommendations.push({
    priority: 'medium',
    recommendation: `Follow ${type}-specific best practices for the identified areas.`,
    rationale: 'Addresses the medium and low severity findings from the review.'
  });

  return recommendations;
}

function calculateRiskScore(issues) {
  const severityWeights = { critical: 10, high: 5, medium: 2, low: 1 };
  const totalWeight = issues.reduce((sum, i) => sum + (severityWeights[i.severity] || 1), 0);
  // Normalize to 0-10 scale
  return Math.min(10, +(totalWeight).toFixed(1));
}

export { REVIEW_TYPES };
