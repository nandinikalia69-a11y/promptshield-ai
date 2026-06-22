/**
 * PromptShield AI — Content Script
 * Injects floating security indicator and intercepts AI platform prompts
 */

(function () {
  'use strict';

  // Detect which AI platform we're on
  const PLATFORM_MAP = {
    'chatgpt.com': 'ChatGPT',
    'chat.openai.com': 'ChatGPT',
    'claude.ai': 'Claude',
    'gemini.google.com': 'Gemini',
    'chat.deepseek.com': 'DeepSeek',
    'perplexity.ai': 'Perplexity',
    'copilot.microsoft.com': 'Copilot',
  };

  const hostname = window.location.hostname;
  const platformName = Object.entries(PLATFORM_MAP).find(([k]) => hostname.includes(k))?.[1] || 'AI Tool';

  let floatingIndicator = null;
  let lastScanResult = null;
  let debounceTimer = null;

  // ─── Floating Indicator ────────────────────────────────────────────────────

  let activeTooltip = null;
  function showTooltip(message) {
    if (activeTooltip) {
      activeTooltip.remove();
    }
    const tooltip = document.createElement('div');
    tooltip.className = 'ps-tooltip';
    tooltip.textContent = message;
    
    // Position it above the indicator
    const rect = floatingIndicator.getBoundingClientRect();
    tooltip.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    tooltip.style.right = `${window.innerWidth - rect.right}px`;
    
    document.body.appendChild(tooltip);
    activeTooltip = tooltip;
    
    setTimeout(() => {
      tooltip.style.opacity = '0';
      tooltip.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        if (tooltip.parentNode) tooltip.remove();
        if (activeTooltip === tooltip) activeTooltip = null;
      }, 300);
    }, 3000);
  }

  function setPromptText(text) {
    const el = findPromptElement();
    if (el) {
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, text);
        } else {
          el.value = text;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        el.textContent = text;
        el.innerText = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return true;
    }
    return false;
  }

  function sanitizeInPlace() {
    const text = getPromptText();
    if (!text || text.trim().length === 0) {
      showTooltip('Prompt is empty');
      return;
    }
    
    try {
      const { sanitized, redactionCount } = RedactionEngine.sanitize(text);
      if (redactionCount === 0) {
        showTooltip('✅ Prompt is already secure!');
        return;
      }
      
      setPromptText(sanitized);
      showTooltip(`🛡️ Redacted ${redactionCount} sensitive item(s)!`);
      
      // Re-scan immediately
      scanCurrentPrompt();
    } catch (e) {
      console.warn('[PromptShield] In-place sanitize error:', e);
      showTooltip('❌ Sanitization failed');
    }
  }

  function createFloatingIndicator() {
    if (floatingIndicator) return;

    floatingIndicator = document.createElement('div');
    floatingIndicator.id = 'promptshield-indicator';
    floatingIndicator.innerHTML = `
      <div class="ps-indicator-main" style="display: flex; align-items: center; gap: 8px;">
        <div class="ps-shield-icon">🛡️</div>
        <div class="ps-status-text">SAFE</div>
      </div>
      <div class="ps-separator" style="width: 1px; height: 16px; background: rgba(255,255,255,0.15); display: none;"></div>
      <button class="ps-sanitize-action-btn" style="display: none; background: linear-gradient(135deg, #00d4ff, #7b2ff7); border: none; color: #fff; padding: 4px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; white-space: nowrap; font-family: inherit;">
        ⚡ Sanitize
      </button>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #promptshield-indicator {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.2), 0 4px 24px rgba(0,0,0,0.4);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: ps-float 3s ease-in-out infinite;
      }
      #promptshield-indicator:hover {
        transform: scale(1.03);
        box-shadow: 0 0 30px rgba(0, 212, 255, 0.4), 0 4px 24px rgba(0,0,0,0.4);
      }
      .ps-indicator-main {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ps-shield-icon {
        font-size: 20px;
        animation: ps-pulse 2s ease-in-out infinite;
      }
      .ps-status-text {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: #30d158;
        text-transform: uppercase;
      }
      #promptshield-indicator.ps-warning .ps-status-text { color: #ffd60a; }
      #promptshield-indicator.ps-danger .ps-status-text { color: #ff2d55; }
      #promptshield-indicator.ps-critical .ps-status-text { color: #ff2d55; animation: ps-blink 0.5s ease-in-out infinite; }
      .ps-sanitize-action-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 0 12px rgba(0, 212, 255, 0.5);
      }
      .ps-sanitize-action-btn:active {
        transform: scale(0.95);
      }
      @keyframes ps-float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
      }
      @keyframes ps-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
      }
      @keyframes ps-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .ps-tooltip {
        position: fixed;
        z-index: 999998;
        padding: 10px 14px;
        background: rgba(0,0,0,0.92);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px;
        font-weight: 600;
        color: #fff;
        max-width: 220px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.5);
        animation: ps-fadeIn 0.2s ease;
      }
      @keyframes ps-fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(floatingIndicator);

    const mainEl = floatingIndicator.querySelector('.ps-indicator-main');
    mainEl.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    });

    const sanitizeBtn = floatingIndicator.querySelector('.ps-sanitize-action-btn');
    sanitizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sanitizeInPlace();
    });
  }

  function updateIndicator(riskLevel, threatCount) {
    if (!floatingIndicator) return;
    const statusEl = floatingIndicator.querySelector('.ps-status-text');
    const separatorEl = floatingIndicator.querySelector('.ps-separator');
    const sanitizeBtn = floatingIndicator.querySelector('.ps-sanitize-action-btn');
    
    floatingIndicator.className = '';
    floatingIndicator.id = 'promptshield-indicator';

    if (riskLevel === 'SAFE' || threatCount === 0) {
      statusEl.textContent = 'SAFE';
      statusEl.style.color = '#30d158';
      if (separatorEl) separatorEl.style.display = 'none';
      if (sanitizeBtn) sanitizeBtn.style.display = 'none';
    } else {
      if (riskLevel === 'LOW') {
        statusEl.textContent = `${threatCount} LOW`;
        statusEl.style.color = '#30d158';
      } else if (riskLevel === 'MEDIUM') {
        statusEl.textContent = `${threatCount} RISK`;
        floatingIndicator.classList.add('ps-warning');
      } else if (riskLevel === 'HIGH') {
        statusEl.textContent = `${threatCount} HIGH`;
        floatingIndicator.classList.add('ps-danger');
      } else if (riskLevel === 'CRITICAL') {
        statusEl.textContent = `CRITICAL!`;
        floatingIndicator.classList.add('ps-critical');
      }
      
      if (separatorEl) separatorEl.style.display = 'block';
      if (sanitizeBtn) sanitizeBtn.style.display = 'block';
    }
  }

  // ─── Prompt Detection ──────────────────────────────────────────────────────

  function findPromptElement() {
    const selectors = [
      '#prompt-textarea', // ChatGPT
      '.ProseMirror', // Claude & ChatGPT
      'rich-textarea [contenteditable="true"]', // Gemini
      'div[contenteditable="true"][aria-label*="prompt" i]', // Gemini/others
      'div[contenteditable="true"][aria-label*="message" i]', // Claude/others
      'div[contenteditable="true"][placeholder*="prompt" i]',
      'div[contenteditable="true"][placeholder*="message" i]',
      '[contenteditable="true"][class*="prompt" i]',
      '[contenteditable="true"][class*="editor" i]',
      '[contenteditable="true"][class*="input" i]',
      '[data-slate-editor="true"]',
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="ask" i]',
      'textarea[class*="prompt" i]',
      'textarea[class*="input" i]',
      'textarea[class*="editor" i]',
      'div[contenteditable="true"]',
      'textarea'
    ];

    for (const sel of selectors) {
      try {
        const elements = document.querySelectorAll(sel);
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
            return el;
          }
        }
      } catch (err) {
        // Ignore selector errors
      }
    }
    return null;
  }

  function getPromptText() {
    const el = findPromptElement();
    if (el) {
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        return el.value || '';
      } else {
        return el.innerText || el.textContent || '';
      }
    }
    return '';
  }

  function scanCurrentPrompt() {
    const text = getPromptText();
    if (!text || text.trim().length < 5) {
      updateIndicator('SAFE', 0);
      return;
    }

    try {
      const { threats } = DetectionEngine.analyze(text);
      const risk = RiskEngine.calculate(threats);
      lastScanResult = { threats, risk, text };

      updateIndicator(risk.level, risk.threatCount);

      // Send to background for stats tracking
      chrome.runtime.sendMessage({
        type: 'SCAN_COMPLETE',
        data: {
          site: platformName,
          originalPrompt: text,
          sanitizedPrompt: text,
          riskLevel: risk.level,
          riskScore: risk.score,
          threatCount: risk.threatCount,
          detectedThreats: threats.map(t => ({
            type: t.type,
            severity: t.severity,
            value: t.value ? t.value.slice(0, 40) + '...' : '',
          })),
          redactionsPerformed: 0,
        }
      });
    } catch (e) {
      console.warn('[PromptShield] Scan error:', e);
    }
  }

  // ─── Observe Prompt Input ──────────────────────────────────────────────────

  function observePromptInput() {
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scanCurrentPrompt, 800);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Also listen to input events
    document.addEventListener('input', (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'textarea' || e.target.contentEditable === 'true') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(scanCurrentPrompt, 600);
      }
    }, true);
  }

  // ─── Message Listener ──────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PROMPT') {
      sendResponse({ text: getPromptText(), platform: platformName });
    }
    if (message.type === 'SET_PROMPT') {
      const success = setPromptText(message.text);
      sendResponse({ success });
    }
    if (message.type === 'GET_LAST_SCAN') {
      sendResponse(lastScanResult || null);
    }
    return true;
  });

  // ─── Window Message Bridge (For local Next.js dashboard) ────────────────────
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    if (event.data?.type === 'PS_GET_DATA') {
      chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
        window.postMessage({ type: 'PS_DATA_RESPONSE', data: response }, '*');
      });
    }
    
    if (event.data?.type === 'PS_CLEAR_DATA') {
      chrome.runtime.sendMessage({ type: 'RESET_STATS' }, () => {
        window.postMessage({ type: 'PS_CLEAR_RESPONSE', success: true }, '*');
      });
    }
  });

  // ─── Init ──────────────────────────────────────────────────────────────────

  function init() {
    // Skip floating UI widgets and mutation observers on local dashboard / localhost
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return;
    }
    chrome.storage.local.get('settings', (data) => {
      if (data.settings?.showFloatingIndicator !== false) {
        createFloatingIndicator();
        observePromptInput();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }

})();
