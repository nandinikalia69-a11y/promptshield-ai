/**
 * PromptShield AI — Risk Engine
 * Calculates composite risk score and level from detected threats
 */

const RiskEngine = (() => {

  const SEVERITY_WEIGHTS = {
    CRITICAL: 35,
    HIGH:     20,
    MEDIUM:   10,
    LOW:       3,
  };

  const RISK_LEVELS = [
    { level: 'CRITICAL', min: 75, color: '#ff2d55', glow: '#ff2d5580', emoji: '🔴' },
    { level: 'HIGH',     min: 50, color: '#ff6b2b', glow: '#ff6b2b80', emoji: '🟠' },
    { level: 'MEDIUM',   min: 25, color: '#ffd60a', glow: '#ffd60a80', emoji: '🟡' },
    { level: 'LOW',      min: 1,  color: '#30d158', glow: '#30d15880', emoji: '🟢' },
    { level: 'SAFE',     min: 0,  color: '#30d158', glow: '#30d15880', emoji: '✅' },
  ];

  const RISK_EXPLANATIONS = {
    CRITICAL: 'Your prompt contains critically sensitive data that could compromise security, expose credentials, or violate compliance regulations. Do not submit without redaction.',
    HIGH: 'Your prompt contains high-risk sensitive information including proprietary data or financial identifiers. Review and sanitize before submission.',
    MEDIUM: 'Your prompt contains personally identifiable information (PII). Consider anonymizing before sharing with public AI tools.',
    LOW: 'Minor sensitive content detected. Low risk but consider best practices.',
    SAFE: 'No sensitive data detected. Your prompt appears safe to submit.',
  };

  const CATEGORY_DESCRIPTIONS = {
    CREDENTIAL: 'Credential exposure can lead to unauthorized account access and data breaches.',
    PII: 'Personal data is protected under GDPR, CCPA, and other privacy regulations.',
    FINANCIAL: 'Financial data is regulated under PCI-DSS and various national laws.',
    PROPRIETARY: 'Proprietary code or trade secrets may violate IP agreements.',
    INFRASTRUCTURE: 'Infrastructure details can aid threat actors in targeted attacks.',
  };

  function calculate(threats) {
    if (!threats || threats.length === 0) {
      return buildResult(0, [], '');
    }

    // Weighted score calculation
    let rawScore = 0;
    const criticalCount = threats.filter(t => t.severity === 'CRITICAL').length;
    const highCount = threats.filter(t => t.severity === 'HIGH').length;
    const mediumCount = threats.filter(t => t.severity === 'MEDIUM').length;
    const lowCount = threats.filter(t => t.severity === 'LOW').length;

    rawScore += criticalCount * SEVERITY_WEIGHTS.CRITICAL;
    rawScore += highCount * SEVERITY_WEIGHTS.HIGH;
    rawScore += mediumCount * SEVERITY_WEIGHTS.MEDIUM;
    rawScore += lowCount * SEVERITY_WEIGHTS.LOW;

    // Diminishing returns for many threats of same type
    const uniqueCategories = new Set(threats.map(t => t.category)).size;
    const diversityBonus = uniqueCategories * 5;
    rawScore += diversityBonus;

    const score = Math.min(100, rawScore);

    return buildResult(score, threats, generateSummary(threats));
  }

  function buildResult(score, threats, summary) {
    const level = RISK_LEVELS.find(l => score >= l.min) || RISK_LEVELS[RISK_LEVELS.length - 1];
    const recommendations = generateRecommendations(threats);
    const securityTips = generateTips(threats);

    return {
      score: Math.round(score),
      level: level.level,
      color: level.color,
      glow: level.glow,
      emoji: level.emoji,
      explanation: RISK_EXPLANATIONS[level.level],
      summary,
      recommendations,
      securityTips,
      breakdown: {
        critical: threats.filter(t => t.severity === 'CRITICAL').length,
        high: threats.filter(t => t.severity === 'HIGH').length,
        medium: threats.filter(t => t.severity === 'MEDIUM').length,
        low: threats.filter(t => t.severity === 'LOW').length,
      },
      categories: [...new Set(threats.map(t => t.category))],
      threatCount: threats.length,
    };
  }

  function generateSummary(threats) {
    if (threats.length === 0) return 'No threats detected.';
    const types = [...new Set(threats.map(t => t.type))];
    if (types.length === 1) return `Detected: ${types[0]}`;
    if (types.length <= 3) return `Detected: ${types.join(', ')}`;
    return `Detected ${threats.length} threats across ${types.length} categories including ${types.slice(0,2).join(', ')}, and more.`;
  }

  function generateRecommendations(threats) {
    const recs = new Set();
    threats.forEach(t => {
      if (t.recommendation) recs.add(t.recommendation);
    });
    const categories = [...new Set(threats.map(t => t.category))];
    categories.forEach(cat => {
      if (CATEGORY_DESCRIPTIONS[cat]) recs.add(CATEGORY_DESCRIPTIONS[cat]);
    });
    return [...recs].slice(0, 5);
  }

  function generateTips(threats) {
    const allTips = [
      '🔑 Use environment variables instead of hardcoding API keys.',
      '🛡️ Enable 2FA on all accounts associated with detected credentials.',
      '📋 Use pseudonymized data when testing AI tools with real datasets.',
      '🔒 Review your company\'s AI usage policy before sharing proprietary code.',
      '🔄 Rotate any credentials that may have been accidentally exposed.',
      '📊 Use synthetic data for AI experiments instead of real customer data.',
      '🌐 Consider using on-premise or enterprise AI solutions for sensitive work.',
      '📝 Always review AI-generated content before using in production.',
      '⚡ Set up secret scanning in your CI/CD pipeline to catch leaks early.',
      '🏢 Establish an AI security policy in your organization.',
    ];

    const categories = [...new Set(threats.map(t => t.category))];
    const tips = [];

    if (categories.includes('CREDENTIAL')) {
      tips.push(allTips[0], allTips[1], allTips[4]);
    }
    if (categories.includes('PII')) {
      tips.push(allTips[2], allTips[5]);
    }
    if (categories.includes('PROPRIETARY')) {
      tips.push(allTips[3], allTips[6]);
    }
    if (tips.length < 3) {
      tips.push(...allTips.filter(t => !tips.includes(t)).slice(0, 3 - tips.length));
    }

    return [...new Set(tips)].slice(0, 4);
  }

  function getAIExplanation(threats, riskLevel) {
    if (threats.length === 0) {
      return 'Your prompt appears safe. No sensitive data patterns were detected. You can submit this prompt with confidence.';
    }

    const critical = threats.filter(t => t.severity === 'CRITICAL');
    const high = threats.filter(t => t.severity === 'HIGH');

    let explanation = '';

    if (critical.length > 0) {
      const critTypes = critical.map(t => t.type).join(', ');
      explanation += `⚠️ CRITICAL ALERT: Your prompt contains ${critTypes}. `;
      explanation += 'If submitted to a public AI platform, this sensitive data could be:\n';
      explanation += '• Stored in AI training logs and used to train future models\n';
      explanation += '• Accessible to platform employees for quality review\n';
      explanation += '• Potentially exposed in data breaches\n';
      explanation += '• Used by threat actors if intercepted\n\n';
    }

    if (high.length > 0) {
      const highTypes = high.map(t => t.type).join(', ');
      explanation += `🔴 HIGH RISK: Detected ${highTypes}. `;
      explanation += 'This information could violate regulatory compliance requirements.\n\n';
    }

    explanation += '✅ RECOMMENDED ACTION: Use the Sanitize button to redact all sensitive data before submitting your prompt.';

    return explanation;
  }

  return { calculate, getAIExplanation, RISK_LEVELS, SEVERITY_WEIGHTS };
})();

if (typeof module !== 'undefined') {
  module.exports = RiskEngine;
}
