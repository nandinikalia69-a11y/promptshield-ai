/**
 * PromptShield AI — Redaction Engine
 * Smart prompt sanitization and rewriting
 */

const RedactionEngine = (() => {

  const REDACTION_MAP = [
    // Credentials (highest priority)
    { pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, replacement: '[PRIVATE KEY REDACTED]' },
    { pattern: /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g, replacement: '[CERTIFICATE REDACTED]' },
    { pattern: /sk-proj-[a-zA-Z0-9\-_]{20,80}/g, replacement: '[OPENAI_PROJECT_KEY_REDACTED]' },
    { pattern: /sk-[a-zA-Z0-9]{20,60}/g, replacement: '[OPENAI_API_KEY_REDACTED]' },
    { pattern: /sk-ant-[a-zA-Z0-9\-_]{20,80}/g, replacement: '[ANTHROPIC_KEY_REDACTED]' },
    { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[AWS_ACCESS_KEY_REDACTED]' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/g, replacement: '[GITHUB_TOKEN_REDACTED]' },
    { pattern: /gho_[a-zA-Z0-9]{36}/g, replacement: '[GITHUB_OAUTH_REDACTED]' },
    { pattern: /sk_(?:live|test)_[a-zA-Z0-9]{24,}/g, replacement: '[STRIPE_SECRET_KEY_REDACTED]' },
    { pattern: /pk_(?:live|test)_[a-zA-Z0-9]{24,}/g, replacement: '[STRIPE_PUBLIC_KEY_REDACTED]' },
    { pattern: /AIza[0-9A-Za-z\-_]{35}/g, replacement: '[GOOGLE_API_KEY_REDACTED]' },
    { pattern: /xox[baprs]-[0-9A-Za-z]{10,48}/g, replacement: '[SLACK_TOKEN_REDACTED]' },
    { pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, replacement: 'Bearer [TOKEN_REDACTED]' },
    // Passwords
    { pattern: /(?:password|passwd|pwd|secret|passphrase)\s*[:=]\s*['"]?([^\s'"]{4,})['"]?/gi, replacement: (m) => m.replace(/(?<=[:=]\s*['"]?)([^\s'"]{4,})(?=['"]?)/i, '[PASSWORD_REDACTED]') },
    // URLs with credentials
    { pattern: /https?:\/\/[^/\s]*:[^@\s]*@[^\s]*/g, replacement: '[URL_WITH_CREDENTIALS_REDACTED]' },
    // Financial
    { pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g, replacement: '[CREDIT_CARD_REDACTED]' },
    { pattern: /\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b/g, replacement: '[AADHAAR_REDACTED]' },
    { pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, replacement: '[PAN_REDACTED]' },
    { pattern: /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g, replacement: '[SSN_REDACTED]' },
    { pattern: /\bcvv\s*[:=]?\s*\d{3,4}\b/gi, replacement: 'CVV: [CVV_REDACTED]' },
    // PII
    { pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
    { pattern: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g, replacement: '[INTERNAL_IP_REDACTED]' },
    // Generic API tokens
    { pattern: /(?:api[_\s\-]?key|apikey|api[_\s\-]?token|access[_\s\-]?token)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{16,})['"]?/gi, replacement: (m) => m.replace(/(?<=[:=]\s*['"]?)([a-zA-Z0-9_\-]{16,})(?=['"]?)/i, '[API_TOKEN_REDACTED]') },
  ];

  function sanitize(text) {
    if (!text) return { sanitized: text, redactionCount: 0, changes: [] };
    let result = text;
    let redactionCount = 0;
    const changes = [];

    for (const rule of REDACTION_MAP) {
      const original = result;
      try {
        if (typeof rule.replacement === 'function') {
          result = result.replace(rule.pattern, rule.replacement);
        } else {
          result = result.replace(rule.pattern, rule.replacement);
        }
        if (result !== original) {
          redactionCount++;
          changes.push({ pattern: rule.pattern.source.substring(0, 30), replacement: typeof rule.replacement === 'string' ? rule.replacement : '[REDACTED]' });
        }
      } catch (e) {
        console.warn('[PromptShield] Redaction rule error:', e);
      }
    }

    // Sanitize phone numbers last (to avoid false positives with card numbers etc.)
    const phonePattern = /(?:\+?(\d{1,3})[\s\-.]?)?\(?(\d{3,4})\)?[\s\-.]?(\d{3,4})[\s\-.]?(\d{3,6})\b/g;
    const prevResult = result;
    result = result.replace(phonePattern, (m) => {
      const digits = m.replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 15) {
        redactionCount++;
        return '[PHONE_REDACTED]';
      }
      return m;
    });

    return {
      sanitized: result,
      redactionCount: result !== text ? redactionCount : 0,
      wasModified: result !== text,
      changes,
    };
  }

  function rewrite(text, threats) {
    const { sanitized } = sanitize(text);
    // Additional context-aware rewriting
    let rewritten = sanitized;

    // Make rewritten prompt more professional
    rewritten = rewritten
      .replace(/\[EMAIL_REDACTED\]/g, '[EMAIL REDACTED]')
      .replace(/\[PHONE_REDACTED\]/g, '[PHONE REDACTED]')
      .replace(/\[API_TOKEN_REDACTED\]/g, '[API TOKEN REDACTED]')
      .replace(/\[CREDIT_CARD_REDACTED\]/g, '[CREDIT CARD REDACTED]')
      .replace(/\[PASSWORD_REDACTED\]/g, '[PASSWORD REDACTED]');

    return {
      original: text,
      rewritten,
      threatCount: threats.length,
      isSafe: rewritten === text,
    };
  }

  function diff(original, sanitized) {
    // Create a simple side-by-side diff
    const origLines = original.split('\n');
    const sanLines = sanitized.split('\n');
    const diffs = [];

    const maxLines = Math.max(origLines.length, sanLines.length);
    for (let i = 0; i < maxLines; i++) {
      const o = origLines[i] || '';
      const s = sanLines[i] || '';
      diffs.push({ original: o, sanitized: s, changed: o !== s });
    }
    return diffs;
  }

  return { sanitize, rewrite, diff };
})();

if (typeof module !== 'undefined') {
  module.exports = RedactionEngine;
}
