/**
 * PromptShield AI — Popup Controller
 * Full UI logic for the extension popup
 */

(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────────────────────
  let currentThreats = [];
  let currentRisk = null;
  let sanitizedText = '';
  let originalText = '';

  // ─── DOM Refs ───────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  const promptInput    = $('prompt-input');
  const scanBtn        = $('scan-btn');
  const clearBtn       = $('clear-btn');
  const fetchBtn       = $('fetch-btn');
  const scanningOverlay= $('scanning-overlay');
  const riskCard       = $('risk-card');
  const aiExplanation  = $('ai-explanation');
  const safeResult     = $('safe-result');
  const aiExpText      = $('ai-exp-text');
  const gaugeFill      = $('gauge-fill');
  const gaugeScore     = $('gauge-score');
  const riskBadge      = $('risk-level-badge');
  const statusDot      = $('status-dot');
  const statThreats    = $('stat-threats');
  const statCritical   = $('stat-critical');
  const statHigh       = $('stat-high');
  const threatsList    = $('threats-list');
  const threatsEmpty   = $('threats-empty');
  const redactContent  = $('redact-content');
  const redactEmpty    = $('redact-empty');
  const diffOriginal   = $('diff-original');
  const diffSanitized  = $('diff-sanitized');
  const redactCountBadge = $('redact-count-badge');
  const sanitizeBtn    = $('sanitize-btn');
  const injectBtn      = $('inject-btn');
  const injectRow      = $('inject-row');
  const quickActionsRow = $('quick-actions-row');
  const quickCopyBtn   = $('quick-copy-btn');
  const quickInjectBtn = $('quick-inject-btn');
  const tipsList       = $('tips-list');
  const dashboardBtn   = $('dashboard-btn');
  const toast          = $('toast');

  // Session stat refs
  const sessionScanned    = $('session-scanned');
  const sessionThreats    = $('session-threats');
  const sessionRedactions = $('session-redactions');
  const sessionScore      = $('session-score');

  // ─── Init ───────────────────────────────────────────────────────────────────
  function init() {
    initPopupCanvas();
    setupTabs();
    setupEventListeners();
    loadSessionStats();
    loadDefaultTips();
    injectGaugeDefs();
    loadLastScanFromTab();
  }

  // ─── SVG Gauge Gradient ─────────────────────────────────────────────────────
  function injectGaugeDefs() {
    const svg = document.querySelector('.risk-gauge');
    if (!svg) return;
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00d4ff"/>
        <stop offset="100%" stop-color="#7b2ff7"/>
      </linearGradient>`;
    svg.prepend(defs);
  }

  // ─── Tabs ───────────────────────────────────────────────────────────────────
  function setupTabs() {
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        $('tab-' + tab.dataset.tab).classList.add('active');
      });
    });
  }

  // ─── Events ─────────────────────────────────────────────────────────────────
  function setupEventListeners() {
    scanBtn.addEventListener('click', runScan);
    clearBtn.addEventListener('click', clearAll);
    fetchBtn.addEventListener('click', fetchFromTab);
    sanitizeBtn.addEventListener('click', copySanitized);
    injectBtn?.addEventListener('click', injectToTab);
    quickCopyBtn?.addEventListener('click', copySanitized);
    quickInjectBtn?.addEventListener('click', injectToTab);
    dashboardBtn.addEventListener('click', openDashboard);

    promptInput.addEventListener('input', () => {
      if (promptInput.value.trim().length > 10) {
        scanBtn.classList.add('scan-pulse');
      }
    });
  }

  // ─── Fetch Prompt from Active Tab ──────────────────────────────────────────
  function fetchFromTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return showToast('No active tab found');

      chrome.tabs.sendMessage(tab.id, { type: 'GET_PROMPT' }, (resp) => {
        if (chrome.runtime.lastError || !resp) {
          showToast('⚠️ Not an AI platform tab');
          return;
        }
        if (resp.text && resp.text.trim()) {
          promptInput.value = resp.text;
          showToast(`✅ Fetched from ${resp.platform || 'tab'}`);
          runScan();
        } else {
          showToast('ℹ️ No prompt text found in tab');
        }
      });
    });
  }

  // ─── Load last scan from tab ────────────────────────────────────────────────
  function loadLastScanFromTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'GET_LAST_SCAN' }, (resp) => {
        if (chrome.runtime.lastError || !resp) return;
        if (resp && resp.text) {
          try {
            const { threats } = DetectionEngine.analyze(resp.text);
            const risk = RiskEngine.calculate(threats);
            const { sanitized, redactionCount } = RedactionEngine.sanitize(resp.text);

            currentThreats = threats;
            currentRisk = risk;
            promptInput.value = resp.text || '';
            originalText = resp.text || '';
            sanitizedText = sanitized;

            renderResults(threats, risk);
            updateRedactTab(resp.text, sanitized, redactionCount, threats);
            updateTipsTab(risk);
            loadSessionStats();
          } catch (e) {
            console.error('[PromptShield] Failed loading last scan from tab:', e);
          }
        }
      });
    });
  }

  // ─── Main Scan ──────────────────────────────────────────────────────────────
  function runScan() {
    const text = promptInput.value.trim();
    if (!text) { showToast('⚠️ Please enter or fetch a prompt first'); return; }

    // Show scanning state
    hideResults();
    scanningOverlay.classList.remove('hidden');
    scanBtn.disabled = true;
    scanBtn.innerHTML = '<div class="scan-spinner" style="width:16px;height:16px;margin:0"></div> Scanning...';

    setTimeout(() => {
      try {
        const { threats } = DetectionEngine.analyze(text);
        const risk = RiskEngine.calculate(threats);
        const { sanitized, redactionCount } = RedactionEngine.sanitize(text);

        currentThreats = threats;
        currentRisk = risk;
        originalText = text;
        sanitizedText = sanitized;

        // Report to background — full scan record for dashboard
        chrome.runtime.sendMessage({
          type: 'SCAN_COMPLETE',
          data: {
            site:                currentSiteName(),
            originalPrompt:      text,
            sanitizedPrompt:     sanitized,
            riskLevel:           risk.level,
            riskScore:           risk.score,
            threatCount:         risk.threatCount,
            detectedThreats:     threats.map(t => ({
              type:     t.type,
              severity: t.severity,
              value:    t.value ? t.value.slice(0, 40) + '...' : '',
            })),
            redactionsPerformed: redactionCount,
          }
        });

        scanningOverlay.classList.add('hidden');
        scanBtn.disabled = false;
        scanBtn.innerHTML = '<span class="btn-icon">🔍</span><span>Scan Prompt</span>';
        scanBtn.classList.remove('scan-pulse');

        renderResults(threats, risk);
        updateRedactTab(text, sanitized, redactionCount, threats);
        updateTipsTab(risk);
        loadSessionStats();

      } catch (e) {
        console.error('[PromptShield] Scan failed:', e);
        scanningOverlay.classList.add('hidden');
        scanBtn.disabled = false;
        scanBtn.innerHTML = '<span class="btn-icon">🔍</span><span>Scan Prompt</span>';
        showToast('❌ Scan failed. Check console.');
      }
    }, 900); // Simulate processing for effect
  }

  // ─── Render Results ─────────────────────────────────────────────────────────
  function renderResults(threats, risk) {
    // Update status dot
    const dotMap = { SAFE: 'safe', LOW: 'safe', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger' };
    statusDot.className = 'status-dot ' + (dotMap[risk.level] || 'safe');

    // Show quick actions row
    if (quickActionsRow) {
      quickActionsRow.classList.remove('hidden');
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url || '';
        const isAI = ['chatgpt', 'chat.openai', 'claude.ai', 'gemini.google', 'deepseek', 'perplexity', 'copilot'].some(s => url.includes(s));
        if (isAI && quickInjectBtn && quickCopyBtn) {
          quickInjectBtn.style.display = 'flex';
          quickCopyBtn.style.flex = '1';
        } else if (quickInjectBtn && quickCopyBtn) {
          quickInjectBtn.style.display = 'none';
          quickCopyBtn.style.flex = '1';
        }
      });
    }

    if (threats.length === 0) {
      safeResult.classList.remove('hidden');
      riskCard.classList.add('hidden');
      aiExplanation.classList.add('hidden');
      return;
    }

    // Animate risk score gauge
    animateGauge(risk.score, risk.level);

    // Risk card
    riskCard.className = 'risk-card risk-' + risk.level.toLowerCase();
    riskCard.classList.remove('hidden');

    const badgeClass = risk.level.toLowerCase();
    riskBadge.className = 'risk-badge ' + badgeClass;
    riskBadge.textContent = risk.level;

    animateNumber(statThreats, 0, risk.threatCount, 600);
    animateNumber(statCritical, 0, risk.breakdown.critical, 600);
    animateNumber(statHigh, 0, risk.breakdown.high, 600);

    // AI Explanation
    const explanation = RiskEngine.getAIExplanation(threats, risk.level);
    aiExplanation.classList.remove('hidden');
    typewriterEffect(aiExpText, explanation, 18);

    // Threats Tab
    renderThreats(threats);
  }

  function hideResults() {
    riskCard.classList.add('hidden');
    aiExplanation.classList.add('hidden');
    safeResult.classList.add('hidden');
    quickActionsRow?.classList.add('hidden');
  }

  // ─── Gauge Animation ────────────────────────────────────────────────────────
  function animateGauge(score, level) {
    const circumference = 251;
    const offset = circumference - (score / 100) * circumference;

    // Set color
    const colors = {
      SAFE: '#30d158', LOW: '#30d158', MEDIUM: '#ffd60a',
      HIGH: '#ff6b2b', CRITICAL: '#ff2d55'
    };

    gaugeFill.style.stroke = colors[level] || '#00d4ff';
    gaugeFill.style.strokeDashoffset = circumference; // reset

    requestAnimationFrame(() => {
      setTimeout(() => {
        gaugeFill.style.strokeDashoffset = offset;
        animateNumber(gaugeScore, 0, score, 800);
      }, 50);
    });
  }

  // ─── Animate Counter ────────────────────────────────────────────────────────
  function animateNumber(el, from, to, duration) {
    const start = performance.now();
    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  // ─── Typewriter Effect ──────────────────────────────────────────────────────
  let typewriterTimer = null;
  function typewriterEffect(el, text, speed = 10) {
    if (typewriterTimer) clearInterval(typewriterTimer);
    el.textContent = '';
    let i = 0;
    typewriterTimer = setInterval(() => {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
      } else {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
      }
    }, speed);
  }

  // ─── Render Threats Tab ─────────────────────────────────────────────────────
  function renderThreats(threats) {
    if (!threats || threats.length === 0) {
      threatsEmpty.classList.remove('hidden');
      threatsList.classList.add('hidden');
      return;
    }

    threatsEmpty.classList.add('hidden');
    threatsList.classList.remove('hidden');
    threatsList.innerHTML = '';

    // Sort by severity
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const sorted = [...threats].sort((a, b) => (order[a.severity] || 99) - (order[b.severity] || 99));

    sorted.forEach((threat, idx) => {
      const card = document.createElement('div');
      card.className = `threat-card sev-${threat.severity.toLowerCase()}`;
      card.style.animationDelay = `${idx * 0.05}s`;
      card.innerHTML = `
        <div class="threat-top">
          <div class="threat-name">${escHtml(threat.type)}</div>
          <div class="threat-sev ${threat.severity.toLowerCase()}">${threat.severity}</div>
        </div>
        <div class="threat-value">${escHtml(threat.value || '')}</div>
        <div class="threat-desc">${escHtml(threat.description || '')}</div>
      `;
      threatsList.appendChild(card);
    });
  }

  // ─── Redact Tab ─────────────────────────────────────────────────────────────
  function updateRedactTab(original, sanitized, redactionCount, threats) {
    if (!original) {
      redactEmpty.classList.remove('hidden');
      redactContent.classList.add('hidden');
      return;
    }

    redactEmpty.classList.add('hidden');
    redactContent.classList.remove('hidden');

    if (redactionCount === 0) {
      redactCountBadge.textContent = `Safe (0 items redacted)`;
      redactCountBadge.style.background = 'rgba(48,209,88,0.1)';
      redactCountBadge.style.borderColor = 'rgba(48,209,88,0.3)';
      redactCountBadge.style.color = 'var(--green)';
    } else {
      redactCountBadge.textContent = `${redactionCount} item${redactionCount !== 1 ? 's' : ''} redacted`;
      redactCountBadge.style.background = 'rgba(0,212,255,0.1)';
      redactCountBadge.style.borderColor = 'rgba(0,212,255,0.25)';
      redactCountBadge.style.color = 'var(--blue)';
    }

    // Highlight redacted tokens in sanitized view
    diffOriginal.textContent = original;
    diffSanitized.innerHTML = redactionCount === 0 ? escHtml(sanitized) : highlightRedacted(sanitized);

    // Show inject button if on an AI tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';
      const isAI = ['chatgpt', 'chat.openai', 'claude.ai', 'gemini.google', 'deepseek', 'perplexity', 'copilot'].some(s => url.includes(s));
      if (isAI) {
        injectRow?.classList.remove('hidden');
      } else {
        injectRow?.classList.add('hidden');
      }
    });
  }

  function highlightRedacted(text) {
    return escHtml(text).replace(
      /(\[[\w\s]+REDACTED\])/g,
      '<span class="diff-redacted">$1</span>'
    );
  }

  // ─── Tips Tab ───────────────────────────────────────────────────────────────
  function updateTipsTab(risk) {
    tipsList.innerHTML = '';
    const tips = risk.securityTips || getDefaultTips();
    tips.forEach((tip, idx) => {
      const el = document.createElement('div');
      el.className = 'tip-item';
      el.style.animationDelay = `${idx * 0.08}s`;
      el.textContent = tip;
      tipsList.appendChild(el);
    });
  }

  function loadDefaultTips() {
    tipsList.innerHTML = '';
    getDefaultTips().forEach((tip, idx) => {
      const el = document.createElement('div');
      el.className = 'tip-item';
      el.style.animationDelay = `${idx * 0.08}s`;
      el.textContent = tip;
      tipsList.appendChild(el);
    });
  }

  function getDefaultTips() {
    return [
      '🔑 Never share API keys, passwords, or tokens with public AI tools.',
      '📧 Anonymize emails and names before sharing customer data with AI.',
      '🏢 Review your organization\'s AI usage policy before submitting code.',
      '🔄 Rotate credentials if you accidentally share them with any AI tool.',
    ];
  }

  // ─── Session Stats ──────────────────────────────────────────────────────────
  function loadSessionStats() {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (data) => {
      if (chrome.runtime.lastError || !data) return;
      const stats = data.stats || data; // handle both getAll() and old format
      if (sessionScanned)    animateNumber(sessionScanned,    0, stats.totalScanned    || stats.promptsScanned  || 0, 400);
      if (sessionThreats)    animateNumber(sessionThreats,    0, stats.totalThreats    || stats.threatsFound    || 0, 400);
      if (sessionRedactions) animateNumber(sessionRedactions, 0, stats.totalRedactions || stats.redactions      || 0, 400);
      if (sessionScore)      animateNumber(sessionScore,      0, stats.securityScore   ?? 100, 600);
    });
  }

  // ─── Actions ────────────────────────────────────────────────────────────────
  function copySanitized() {
    if (!sanitizedText) return;
    navigator.clipboard.writeText(sanitizedText).then(() => {
      showToast('✅ Sanitized prompt copied!');
      loadSessionStats();
    });
  }

  function injectToTab() {
    if (!sanitizedText) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'SET_PROMPT', text: sanitizedText }, (resp) => {
        if (resp?.success) showToast('✅ Safe prompt injected into tab!');
        else showToast('⚠️ Could not inject — try copying instead');
      });
    });
  }

  function openDashboard() {
    // Send message to background which opens the tab with chrome.runtime.getURL
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    window.close(); // Close popup
  }

  function currentSiteName() {
    // Try to detect site from active tab URL at scan time
    try {
      // This runs synchronously — we rely on background.js to also detect from sender.tab
      return 'Manual Scan';
    } catch { return 'Unknown'; }
  }

  function clearAll() {
    promptInput.value = '';
    hideResults();
    currentThreats = [];
    currentRisk = null;
    sanitizedText = '';
    originalText = '';
    statusDot.className = 'status-dot safe';
    showToast('🗑️ Cleared');
  }

  // ─── Popup Particle Mesh Background ─────────────────────────────────────────
  function initPopupCanvas() {
    const canvas = $('popup-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set popup boundaries matching popup width/height
    canvas.width = 400;
    canvas.height = 620;

    const particles = Array.from({ length: 32 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.5 + 0.4,
      color: Math.random() > 0.5 ? '#00d4ff' : '#7b2ff7',
      life: 0,
      maxLife: Math.random() * 300 + 200
    }));

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Reset if lifetime or boundary exceeded
        if (p.life > p.maxLife || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          Object.assign(p, {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            life: 0,
            maxLife: Math.random() * 300 + 200
          });
        }

        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.22;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });

      // Draw connecting mesh lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 60) {
            const alpha = (1 - dist / 60) * 0.08;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(frame);
    }
    frame();
  }

  // ─── Utilities ───────────────────────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  let toastTimer;
  function showToast(msg) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
  }

  // ─── Start ───────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

})();
