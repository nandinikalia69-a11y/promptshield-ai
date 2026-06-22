/**
 * PromptShield AI — Detection Engine
 * Modular sensitive data detection system
 */

const DetectionEngine = (() => {

  // ─── Detector Modules ──────────────────────────────────────────────────────

  const EmailDetector = {
    name: 'Email Address',
    category: 'PII',
    severity: 'MEDIUM',
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    detect(text) {
      const matches = [...text.matchAll(this.pattern)];
      return matches.map(m => ({
        type: this.name,
        category: this.category,
        severity: this.severity,
        value: m[0],
        index: m.index,
        description: 'Email address can identify individuals and violate privacy regulations (GDPR, CCPA).',
        recommendation: 'Replace with [EMAIL REDACTED] or use an anonymized identifier.'
      }));
    }
  };

  const PhoneDetector = {
    name: 'Phone Number',
    category: 'PII',
    severity: 'MEDIUM',
    pattern: /(?:\+?(\d{1,3})[\s\-.]?)?\(?(\d{3,4})\)?[\s\-.]?(\d{3,4})[\s\-.]?(\d{3,6})\b/g,
    detect(text) {
      const matches = [...text.matchAll(this.pattern)];
      return matches.filter(m => m[0].replace(/\D/g, '').length >= 10).map(m => ({
        type: this.name,
        category: this.category,
        severity: this.severity,
        value: m[0],
        index: m.index,
        description: 'Phone numbers are personally identifiable information (PII) protected under privacy laws.',
        recommendation: 'Replace with [PHONE REDACTED] or anonymize the number.'
      }));
    }
  };

  const APIKeyDetector = {
    name: 'API Key / Secret',
    category: 'CREDENTIAL',
    severity: 'CRITICAL',
    patterns: [
      { label: 'OpenAI API Key',    re: /sk-[a-zA-Z0-9]{20,60}/g },
      { label: 'OpenAI Project Key',re: /sk-proj-[a-zA-Z0-9\-_]{20,80}/g },
      { label: 'AWS Access Key',    re: /AKIA[0-9A-Z]{16}/g },
      { label: 'AWS Secret Key',    re: /(?:aws.?secret|AWS_SECRET[_\s]*(?:ACCESS)?[_\s]*KEY)\s*[:=]\s*['"]?([A-Za-z0-9\/+=]{40})['"]?/gi },
      { label: 'GitHub Token',      re: /ghp_[a-zA-Z0-9]{36}/g },
      { label: 'GitHub OAuth',      re: /gho_[a-zA-Z0-9]{36}/g },
      { label: 'Stripe Key',        re: /sk_(?:live|test)_[a-zA-Z0-9]{24,}/g },
      { label: 'Stripe Pub Key',    re: /pk_(?:live|test)_[a-zA-Z0-9]{24,}/g },
      { label: 'Google API Key',    re: /AIza[0-9A-Za-z\-_]{35}/g },
      { label: 'Firebase Key',      re: /AAAA[A-Za-z0-9_\-]{7}:[A-Za-z0-9_\-]{140}/g },
      { label: 'Slack Token',       re: /xox[baprs]-[0-9A-Za-z]{10,48}/g },
      { label: 'Generic API Token', re: /(?:api[_\s\-]?key|apikey|api[_\s\-]?token|access[_\s\-]?token)\s*[:=]\s*['"]?(?!\[)([a-zA-Z0-9_\-]{16,})/gi },
      { label: 'Bearer Token',      re: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g },
      { label: 'Anthropic Key',     re: /sk-ant-[a-zA-Z0-9\-_]{20,80}/g },
    ],
    detect(text) {
      const results = [];
      for (const p of this.patterns) {
        const matches = [...text.matchAll(p.re)];
        for (const m of matches) {
          results.push({
            type: `${this.name} (${p.label})`,
            category: this.category,
            severity: this.severity,
            value: m[0].substring(0, 40) + (m[0].length > 40 ? '...' : ''),
            index: m.index,
            description: `${p.label} detected. Exposing this to AI systems could compromise your infrastructure, cloud resources, or accounts.`,
            recommendation: 'Remove immediately. Rotate the key and replace with [API KEY REDACTED].'
          });
        }
      }
      return results;
    }
  };

  const PasswordDetector = {
    name: 'Password / Secret',
    category: 'CREDENTIAL',
    severity: 'CRITICAL',
    patterns: [
      /(?:password|passwd|pwd|secret|passphrase)\s*[:=]\s*['"]?(?!\[)([^\s'"]{4,})/gi,
      /(?:db_pass|database_password|mysql_password|pg_password)\s*[:=]\s*['"]?(?!\[)([^\s'"]{4,})/gi,
    ],
    detect(text) {
      const results = [];
      for (const re of this.patterns) {
        const matches = [...text.matchAll(re)];
        for (const m of matches) {
          results.push({
            type: this.name,
            category: this.category,
            severity: this.severity,
            value: m[0].substring(0, 30) + '...',
            index: m.index,
            description: 'Password or secret credential detected in plaintext. This is extremely dangerous to share with AI systems.',
            recommendation: 'Never share passwords with AI tools. Replace with [PASSWORD REDACTED].'
          });
        }
      }
      return results;
    }
  };

  const SourceCodeDetector = {
    name: 'Source Code',
    category: 'PROPRIETARY',
    severity: 'HIGH',
    patterns: [
      /(?:function\s+\w+\s*\(|class\s+\w+\s*(?:extends\s+\w+\s*)?\{|const\s+\w+\s*=\s*(?:async\s*)?\()/g,
      /(?:import\s+(?:\{[^}]+\}|\w+)\s+from\s+['"][^'"]+['"])/g,
      /(?:def\s+\w+\s*\([^)]*\)\s*(?:->.*)?:)/g,
      /(?:#include\s+[<"][^>"]+[>"])/g,
      /(?:SELECT\s+[\w\s,*]+\s+FROM\s+\w+)/gi,
      /(?:public\s+(?:static\s+)?(?:void|int|String|bool)\s+\w+\s*\()/g,
    ],
    detect(text) {
      const results = [];
      let found = false;
      for (const re of this.patterns) {
        if (re.test(text)) { found = true; break; }
      }
      if (found) {
        results.push({
          type: this.name,
          category: this.category,
          severity: this.severity,
          value: text.substring(0, 60) + '...',
          index: 0,
          description: 'Source code detected. Sharing proprietary code with public AI services may violate IP agreements and expose business logic.',
          recommendation: 'Review your company IP policy before sharing code with public AI tools.'
        });
      }
      return results;
    }
  };

  const FinancialDetector = {
    name: 'Financial Data',
    category: 'FINANCIAL',
    severity: 'HIGH',
    patterns: [
      { label: 'Credit Card Number', re: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g },
      { label: 'Aadhaar Number',     re: /\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b/g },
      { label: 'PAN Card',           re: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g },
      { label: 'SSN',                re: /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g },
      { label: 'IBAN',               re: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}(?:[A-Z0-9]?){0,16}\b/g },
      { label: 'CVV',                re: /\bcvv\s*[:=]?\s*\d{3,4}\b/gi },
    ],
    detect(text) {
      const results = [];
      for (const p of this.patterns) {
        const matches = [...text.matchAll(p.re)];
        for (const m of matches) {
          results.push({
            type: `Financial Data (${p.label})`,
            category: this.category,
            severity: this.severity,
            value: m[0],
            index: m.index,
            description: `${p.label} detected. Financial identifiers are protected under PCI-DSS, RBI guidelines, and privacy laws.`,
            recommendation: `Replace ${p.label} with [${p.label.toUpperCase().replace(/ /g,'_')} REDACTED].`
          });
        }
      }
      return results;
    }
  };

  const URLSecretDetector = {
    name: 'URL with Secret',
    category: 'CREDENTIAL',
    severity: 'HIGH',
    pattern: /https?:\/\/[^/\s]*:[^@\s]*@[^\s]*/g,
    detect(text) {
      const matches = [...text.matchAll(this.pattern)];
      return matches.map(m => ({
        type: this.name,
        category: this.category,
        severity: this.severity,
        value: m[0].substring(0, 50) + '...',
        index: m.index,
        description: 'URL contains embedded credentials (username:password). Sharing this exposes server access.',
        recommendation: 'Remove credentials from URL before sharing. Use [URL WITH CREDENTIALS REDACTED].'
      }));
    }
  };

  const PrivateKeyDetector = {
    name: 'Private Key / Certificate',
    category: 'CREDENTIAL',
    severity: 'CRITICAL',
    patterns: [
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
      /-----BEGIN CERTIFICATE-----/g,
    ],
    detect(text) {
      const results = [];
      for (const re of this.patterns) {
        if (re.test(text)) {
          results.push({
            type: this.name,
            category: this.category,
            severity: this.severity,
            value: '-----BEGIN PRIVATE KEY-----...',
            index: 0,
            description: 'Cryptographic private key or certificate detected. Exposing private keys can lead to complete system compromise.',
            recommendation: 'NEVER share private keys with AI tools. Remove immediately.'
          });
          break;
        }
      }
      return results;
    }
  };

  const IPAddressDetector = {
    name: 'Internal IP / Host',
    category: 'INFRASTRUCTURE',
    severity: 'LOW',
    pattern: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g,
    detect(text) {
      const matches = [...text.matchAll(this.pattern)];
      return matches.map(m => ({
        type: this.name,
        category: this.category,
        severity: this.severity,
        value: m[0],
        index: m.index,
        description: 'Internal/private IP address detected. Sharing network topology can aid attackers.',
        recommendation: 'Replace with [INTERNAL IP REDACTED] if not necessary for context.'
      }));
    }
  };

  // ─── All Detectors ──────────────────────────────────────────────────────────

  const ALL_DETECTORS = [
    PrivateKeyDetector,
    APIKeyDetector,
    PasswordDetector,
    FinancialDetector,
    URLSecretDetector,
    EmailDetector,
    PhoneDetector,
    SourceCodeDetector,
    IPAddressDetector,
  ];

  // ─── Public API ─────────────────────────────────────────────────────────────

  function analyze(text) {
    if (!text || text.trim().length === 0) {
      return { threats: [], rawText: text };
    }
    const threats = [];
    for (const detector of ALL_DETECTORS) {
      try {
        const found = detector.detect(text);
        threats.push(...found);
      } catch (e) {
        console.warn(`[PromptShield] Detector error (${detector.name}):`, e);
      }
    }
    // Deduplicate by value+type and filter out already redacted placeholders
    const seen = new Set();
    const unique = threats.filter(t => {
      if (t.value && /\[[A-Z0-9_\s]*REDACTED\]/i.test(t.value)) {
        return false;
      }
      const key = `${t.type}:${t.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { threats: unique, rawText: text };
  }

  return { analyze, ALL_DETECTORS };
})();

// Export for both content script and popup contexts
if (typeof module !== 'undefined') {
  module.exports = DetectionEngine;
}
