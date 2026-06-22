/**
 * PromptShield AI — Dashboard Controller
 *
 * Communication Architecture:
 * ┌─────────────────────────────────────────────────────────┐
 * │  chrome.storage.local (SINGLE SOURCE OF TRUTH)          │
 * │    ps_scans: ScanRecord[]                               │
 * │    ps_stats: StatsObject                                │
 * └────────────┬────────────────────────────────────────────┘
 *              │ chrome.storage.onChanged (live updates)
 *              ▼
 * ┌─────────────────────────────────────────────────────────┐
 * │  dashboard.js (this file)                               │
 * │  - reads storage on load                                │
 * │  - listens for changes → auto re-renders               │
 * │  - computes analytics via AnalyticsEngine               │
 * │  - renders Chart.js charts                              │
 * └─────────────────────────────────────────────────────────┘
 */

(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────────────────────
  let allScans  = [];
  let stats     = {};
  let analytics = {};
  let charts    = {};
  let currentSection  = 'overview';
  let currentFilter   = 'All';
  let currentSearch   = '';
  let currentPage     = 0;
  const PAGE_SIZE     = 10;

  // ─── DOM Refs ───────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  // ─── Colour map ─────────────────────────────────────────────────────────────
  const RISK_COLORS = {
    CRITICAL: '#ff2d55', HIGH: '#ff6b2b', MEDIUM: '#ffd60a', LOW: '#30d158', SAFE: '#30d158'
  };
  const CHART_COLORS = ['#00d4ff','#7b2ff7','#30d158','#ffd60a','#ff6b2b','#ff2d55','#5e5ce6','#ff9f0a'];

  const COMPLIANCE_DATA = [
    { name:'GDPR',     icon:'🇪🇺', color:'#00d4ff', score:82, status:'Ready',       desc:'General Data Protection Regulation — PII & email/phone redaction.',
      checks:['PII Detection Active','Email Auto-Redaction','Phone Number Detection','Data Minimization','DPO Notification Workflow','Formal DPIA'],
      done:[true,true,true,true,false,false] },
    { name:'PCI-DSS',  icon:'💳', color:'#30d158', score:88, status:'Ready',       desc:'Payment Card Industry — Credit card & CVV detection.',
      checks:['Credit Card Detection','CVV Redaction','Card Data Masking','Access Logging','Penetration Testing','QSA Certification'],
      done:[true,true,true,true,false,false] },
    { name:'HIPAA',    icon:'🏥', color:'#ffd60a', score:55, status:'In Progress', desc:'Health Insurance Portability — PHI and healthcare data protection.',
      checks:['PHI Detection','Access Controls','Audit Controls','BAA with AI Vendors','Minimum Necessary Standard','Risk Assessment'],
      done:[true,true,true,false,false,false] },
    { name:'SOC 2',    icon:'🏛️', color:'#7b2ff7', score:65, status:'In Progress', desc:'Service Organization Control 2 — Security & availability.',
      checks:['Access Control Logging','Threat Detection','Incident Response','Change Management','Third-Party Risk','Annual Audit'],
      done:[true,true,false,false,false,false] },
    { name:'ISO 27001', icon:'🔐', color:'#ff6b2b', score:40, status:'Planning',    desc:'International information security management standard.',
      checks:['Risk Assessment','Asset Management','Incident Management','Business Continuity','ISMS Implementation','Certification Audit'],
      done:[true,false,false,false,false,false] },
    { name:'NIST CSF', icon:'🇺🇸', color:'#5e5ce6', score:70, status:'In Progress', desc:'NIST Cybersecurity Framework — Identify, Protect, Detect, Respond, Recover.',
      checks:['Identify: Asset Inventory','Protect: Access Control','Detect: Anomaly Detection','Respond: Incident Plan','Recover: BCP','Framework Audit'],
      done:[true,true,true,false,false,false] },
  ];

  const STATUS_STYLE = {
    'Ready':       { bg:'rgba(48,209,88,.12)',  color:'#30d158' },
    'In Progress': { bg:'rgba(255,214,10,.10)', color:'#ffd60a' },
    'Planning':    { bg:'rgba(255,107,43,.12)', color:'#ff6b2b' },
  };

  const PLATFORM_CONFIG = [
    { name:'ChatGPT',    url:'chatgpt.com' },
    { name:'Claude',     url:'claude.ai' },
    { name:'Gemini',     url:'gemini.google.com' },
    { name:'DeepSeek',   url:'deepseek.com' },
    { name:'Perplexity', url:'perplexity.ai' },
    { name:'Copilot',    url:'copilot.microsoft.com' },
  ];

  // ─── INIT ───────────────────────────────────────────────────────────────────
  function init() {
    initParticles();
    setupNavigation();
    setupEventListeners();
    renderCompliance();
    renderPlatforms();
    loadData();
    listenForChanges();
  }

  // ─── LOAD DATA FROM chrome.storage.local ────────────────────────────────────
  function loadData() {
    StorageManager.getAll().then(({ scans, stats: s }) => {
      allScans = scans;
      stats    = s;
      analytics = AnalyticsEngine.compute(scans, s);
      renderAll();
    });
  }

  // ─── LIVE SYNC: chrome.storage.onChanged ────────────────────────────────────
  // This fires whenever the extension writes a new scan to storage.
  // Dashboard auto-updates WITHOUT needing a refresh.
  function listenForChanges() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes[StorageManager.SCANS_KEY] || changes[StorageManager.STATS_KEY]) {
        loadData();
        showToast('🔄 Dashboard updated with new data');
        pulseUpdateIndicator();
      }
    });
  }

  // ─── RENDER ALL ─────────────────────────────────────────────────────────────
  function renderAll() {
    renderStatCards();
    renderOverview();
    renderThreatTable();
    renderCharts();
    updateLastUpdated();
    updateSecurityStatus();
  }

  // ─── STAT CARDS ─────────────────────────────────────────────────────────────
  function renderStatCards() {
    animateCount($('s-total-scanned'), stats.totalScanned || 0);
    animateCount($('s-total-threats'), stats.totalThreats || 0);
    animateCount($('s-high-risk'),     stats.highRiskCount || 0);
    animateCount($('s-redactions'),    stats.totalRedactions || 0);
    animateCount($('s-score'),         stats.securityScore ?? 100);
  }

  // ─── OVERVIEW ───────────────────────────────────────────────────────────────
  function renderOverview() {
    renderRecentActivity();
    renderThreatBars();
    renderRiskPills();
    renderPlatformCounts();
  }

  function renderRecentActivity() {
    const container = $('recent-activity');
    const recent = analytics.recentActivity || [];
    if (recent.length === 0) {
      container.innerHTML = `<div class="empty-state">🛡️<br/>No scans yet.<br/><small>Open a prompt on ChatGPT, Claude, or Gemini and scan it.</small></div>`;
      return;
    }
    container.innerHTML = recent.map((item, i) => `
      <div class="activity-item" style="animation-delay:${i * 0.04}s">
        <div class="activity-dot" style="background:${RISK_COLORS[item.riskLevel]}15;border:1px solid ${RISK_COLORS[item.riskLevel]}30">
          ${item.riskLevel === 'CRITICAL' ? '🔴' : item.riskLevel === 'HIGH' ? '🟠' : item.riskLevel === 'MEDIUM' ? '🟡' : '🟢'}
        </div>
        <div class="activity-info">
          <div class="activity-site">${esc(item.site)}</div>
          <div class="activity-meta">${item.threatCount} threat${item.threatCount !== 1 ? 's' : ''} · ${esc(item.action)}</div>
        </div>
        <div class="activity-right">
          <span class="badge badge-${item.riskLevel.toLowerCase()}">${item.riskLevel}</span>
          <div class="activity-time">${timeAgo(item.timestamp)}</div>
        </div>
      </div>
    `).join('');
  }

  function renderThreatBars() {
    const container = $('threat-bars');
    const types = (analytics.threatTypes || []).slice(0, 6);
    if (types.length === 0) {
      container.innerHTML = `<div class="empty-state">📊<br/>No threat data yet.</div>`;
      return;
    }
    const max = types[0].value;
    container.innerHTML = types.map(({ label, value }) => `
      <div class="threat-bar-item">
        <div class="threat-bar-top">
          <span class="threat-bar-label">${esc(label)}</span>
          <span class="threat-bar-count">${value}</span>
        </div>
        <div class="threat-bar-track">
          <div class="threat-bar-fill" style="width:${(value / max * 100).toFixed(1)}%"></div>
        </div>
      </div>
    `).join('');
  }

  function renderRiskPills() {
    const container = $('risk-pills');
    const map = { CRITICAL: RISK_COLORS.CRITICAL, HIGH: RISK_COLORS.HIGH, MEDIUM: RISK_COLORS.MEDIUM, LOW: RISK_COLORS.LOW };
    const dist = {};
    (analytics.riskLevels || []).forEach(({ label, value }) => { dist[label] = value; });
    container.innerHTML = Object.entries(map).map(([level, color]) => `
      <div class="risk-pill" style="background:${color}10;border-color:${color}25">
        <div class="risk-pill-val" style="color:${color}">${dist[level] || 0}</div>
        <div class="risk-pill-lbl" style="color:${color}">${level}</div>
      </div>
    `).join('');
  }

  function renderPlatformCounts() {
    const container = $('platform-grid');
    const platformMap = {};
    (analytics.platforms || []).forEach(({ label, value }) => { platformMap[label] = value; });
    container.innerHTML = PLATFORM_CONFIG.map(p => {
      const count = platformMap[p.name] || 0;
      return `
        <div class="platform-pill">
          <div class="platform-dot"></div>
          <span>${p.name}</span>
          ${count > 0 ? `<span class="platform-count">${count} scan${count !== 1 ? 's' : ''}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  // ─── THREAT TABLE ────────────────────────────────────────────────────────────
  function renderThreatTable() {
    const filtered = allScans.filter(s => {
      const matchFilter = currentFilter === 'All' || s.riskLevel === currentFilter;
      const q = currentSearch.toLowerCase();
      const matchSearch = !q ||
        (s.site || '').toLowerCase().includes(q) ||
        (s.originalPrompt || '').toLowerCase().includes(q) ||
        (s.detectedThreats || []).some(t => (t.type || '').toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });

    $('table-count').textContent = `${filtered.length} entries`;
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (currentPage >= totalPages) currentPage = Math.max(0, totalPages - 1);
    const paged = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    const tbody = $('threat-tbody');
    if (paged.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No entries match your filters.</td></tr>`;
    } else {
      tbody.innerHTML = paged.map((s, i) => {
        const color = RISK_COLORS[s.riskLevel] || '#4a5580';
        const threats = (s.detectedThreats || []).slice(0, 2);
        return `
          <tr style="animation:fadeInUp .3s ease ${i * 0.03}s both">
            <td style="white-space:nowrap">${formatDate(s.timestamp)}</td>
            <td style="font-weight:700;color:var(--text)">${esc(s.site || '–')}</td>
            <td><span class="badge badge-${s.riskLevel.toLowerCase()}">${s.riskLevel}</span></td>
            <td>
              <div class="score-bar-wrap">
                <div class="score-bar"><div class="score-bar-fill" style="width:${s.riskScore}%;background:${color}"></div></div>
                <span style="font-size:11px;font-weight:700;color:${color}">${s.riskScore}</span>
              </div>
            </td>
            <td>
              ${threats.map(t => `<span style="display:inline-flex;padding:2px 7px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:20px;font-size:10px;margin-right:4px;margin-bottom:2px">${esc(t.type.split('(')[0].trim())}</span>`).join('')}
              ${s.detectedThreats.length > 2 ? `<span style="font-size:10px;color:var(--text3)">+${s.detectedThreats.length - 2}</span>` : ''}
            </td>
            <td><div class="prompt-preview" title="${esc(s.originalPrompt || '')}">${esc((s.originalPrompt || '').slice(0, 60) + (s.originalPrompt?.length > 60 ? '…' : ''))}</div></td>
            <td><span class="${s.redactionsPerformed > 0 ? 'action-redacted' : 'action-warned'}">${s.redactionsPerformed > 0 ? '✂️ Redacted' : '⚠️ Warned'}</span></td>
          </tr>
        `;
      }).join('');
    }

    // Pagination
    const pagination = $('pagination');
    if (totalPages <= 1) { pagination.innerHTML = ''; return; }
    pagination.innerHTML = `
      <button class="page-btn" id="pg-prev" ${currentPage === 0 ? 'disabled' : ''}>← Prev</button>
      <span class="page-info">Page ${currentPage + 1} of ${totalPages}</span>
      <button class="page-btn" id="pg-next" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Next →</button>
    `;
    $('pg-prev')?.addEventListener('click', () => { currentPage--; renderThreatTable(); });
    $('pg-next')?.addEventListener('click', () => { currentPage++; renderThreatTable(); });
  }

  // ─── CHARTS ─────────────────────────────────────────────────────────────────
  function renderCharts() {
    destroyCharts();

    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8b9cc8', font: { family: 'Inter', size: 11 }, padding: 14 } }
      },
    };
    const gridColor = 'rgba(255,255,255,0.05)';
    const tickColor = '#4a5580';

    // 1. Threat Types Donut
    const ttData = (analytics.threatTypes || []).slice(0, 8);
    if (ttData.length > 0) {
      charts.threatTypes = new Chart($('chart-threat-types'), {
        type: 'doughnut',
        data: {
          labels: ttData.map(d => d.label),
          datasets: [{
            data: ttData.map(d => d.value),
            backgroundColor: CHART_COLORS.slice(0, ttData.length).map(c => c + '70'),
            borderColor: CHART_COLORS.slice(0, ttData.length),
            borderWidth: 2, hoverOffset: 8,
          }],
        },
        options: { ...chartDefaults, cutout: '62%',
          plugins: { ...chartDefaults.plugins, legend: { ...chartDefaults.plugins.legend, position: 'right' } }
        },
      });
    }

    // 2. Risk Levels Bar
    const rl = analytics.riskLevels || [];
    const rlLabels = ['CRITICAL','HIGH','MEDIUM','LOW'];
    const rlColors = [RISK_COLORS.CRITICAL, RISK_COLORS.HIGH, RISK_COLORS.MEDIUM, RISK_COLORS.LOW];
    const rlMap = {}; rl.forEach(r => { rlMap[r.label] = r.value; });
    charts.riskLevels = new Chart($('chart-risk-levels'), {
      type: 'bar',
      data: {
        labels: rlLabels,
        datasets: [{
          label: 'Scans',
          data: rlLabels.map(l => rlMap[l] || 0),
          backgroundColor: rlColors.map(c => c + '40'),
          borderColor: rlColors,
          borderWidth: 2, borderRadius: 6, borderSkipped: false,
        }],
      },
      options: {
        ...chartDefaults,
        scales: {
          x: { grid: { display: false }, ticks: { color: tickColor, font: { family: 'Inter' } } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'Inter' }, stepSize: 1 }, beginAtZero: true },
        },
        plugins: { ...chartDefaults.plugins, legend: { display: false } },
      },
    });

    // 3. Daily Trends Line
    const dt = analytics.dailyTrends || [];
    charts.dailyTrends = new Chart($('chart-daily-trends'), {
      type: 'line',
      data: {
        labels: dt.map(d => d.label),
        datasets: [
          {
            label: 'Threats',
            data: dt.map(d => d.threats),
            borderColor: '#ff2d55', backgroundColor: 'rgba(255,45,85,0.07)',
            borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#ff2d55',
            fill: true, tension: 0.4,
          },
          {
            label: 'Scans',
            data: dt.map(d => d.scans),
            borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.05)',
            borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#00d4ff',
            fill: true, tension: 0.4,
          },
          {
            label: 'Redactions',
            data: dt.map(d => d.redactions),
            borderColor: '#30d158', backgroundColor: 'rgba(48,209,88,0.05)',
            borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#30d158',
            fill: true, tension: 0.4,
          },
        ],
      },
      options: {
        ...chartDefaults,
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'Inter' } } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'Inter' }, stepSize: 1 }, beginAtZero: true },
        },
      },
    });

    // 4. Platform Pie
    const plat = analytics.platforms || [];
    if (plat.length > 0) {
      charts.platforms = new Chart($('chart-platforms'), {
        type: 'doughnut',
        data: {
          labels: plat.map(p => p.label),
          datasets: [{
            data: plat.map(p => p.value),
            backgroundColor: CHART_COLORS.slice(0, plat.length).map(c => c + '80'),
            borderColor: CHART_COLORS.slice(0, plat.length),
            borderWidth: 2,
          }],
        },
        options: { ...chartDefaults, cutout: '55%',
          plugins: { ...chartDefaults.plugins, legend: { ...chartDefaults.plugins.legend, position: 'right' } }
        },
      });
    }
  }

  function destroyCharts() {
    Object.values(charts).forEach(c => { try { c.destroy(); } catch {} });
    charts = {};
  }

  // ─── COMPLIANCE ─────────────────────────────────────────────────────────────
  function renderCompliance() {
    const grid = $('compliance-grid');
    grid.innerHTML = COMPLIANCE_DATA.map(fw => {
      const ss = STATUS_STYLE[fw.status] || STATUS_STYLE['Planning'];
      const doneCount = fw.done.filter(Boolean).length;
      return `
        <div class="compliance-card" style="border:1px solid ${fw.color}20;box-shadow:0 0 24px ${fw.color}08">
          <div class="cc-top-bar" style="background:linear-gradient(90deg,${fw.color},transparent)"></div>
          <div class="cc-head">
            <div class="cc-name-row">
              <span class="cc-icon">${fw.icon}</span>
              <div>
                <div class="cc-name">${fw.name}</div>
                <div class="cc-checks">${doneCount}/${fw.checks.length} checks</div>
              </div>
            </div>
            <span class="cc-status" style="background:${ss.bg};color:${ss.color}">
              ${fw.status === 'Ready' ? '✅' : fw.status === 'In Progress' ? '⏳' : '📋'} ${fw.status}
            </span>
          </div>
          <p class="cc-desc">${fw.desc}</p>
          <div class="cc-score-row">
            <span class="cc-score-label">Readiness Score</span>
            <span class="cc-score-val" style="color:${fw.color}">${fw.score}%</span>
          </div>
          <div class="cc-bar-track">
            <div class="cc-bar-fill" style="width:${fw.score}%;background:linear-gradient(90deg,${fw.color}80,${fw.color})"></div>
          </div>
          <div class="cc-checklist">
            ${fw.checks.map((check, i) => `
              <div class="cc-check">
                <div class="cc-check-box" style="background:${fw.done[i] ? fw.color + '20' : 'rgba(255,255,255,.04)'};border:1px solid ${fw.done[i] ? fw.color + '40' : 'rgba(255,255,255,.1)'}">
                  <span style="color:${fw.done[i] ? fw.color : 'var(--text3)'}">${fw.done[i] ? '✓' : '○'}</span>
                </div>
                <span class="cc-check-label" style="color:${fw.done[i] ? 'var(--text)' : 'var(--text3)'}; font-weight:${fw.done[i] ? 600 : 400}">${check}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderPlatforms() {
    const grid = $('platform-grid');
    grid.innerHTML = PLATFORM_CONFIG.map(p => `
      <div class="platform-pill">
        <div class="platform-dot"></div>
        <span>${p.name}</span>
      </div>
    `).join('');
  }

  // ─── SECURITY STATUS ─────────────────────────────────────────────────────────
  function updateSecurityStatus() {
    const score = stats.securityScore ?? 100;
    const pill = $('security-status');
    const text = $('security-status-text');
    pill.className = 'status-pill';
    if (score >= 80) { pill.classList.add('safe'); text.textContent = 'Protected'; }
    else if (score >= 50) { pill.classList.add('warn'); text.textContent = 'At Risk'; }
    else { pill.classList.add('danger'); text.textContent = 'Critical'; }
  }

  function updateLastUpdated() {
    const el = $('last-updated');
    if (stats.lastUpdated) {
      el.textContent = `Updated ${timeAgo(stats.lastUpdated)}`;
    } else {
      el.textContent = 'No data yet';
    }
  }

  function pulseUpdateIndicator() {
    const dot = document.querySelector('.live-dot');
    if (!dot) return;
    dot.style.transform = 'scale(2)';
    setTimeout(() => { dot.style.transform = ''; }, 300);
  }

  // ─── NAVIGATION ─────────────────────────────────────────────────────────────
  function setupNavigation() {
    $$('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection(item.dataset.section);
      });
    });
    // Card "View All" links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-section]');
      if (link && link.classList.contains('card-link')) {
        e.preventDefault();
        switchSection(link.dataset.section);
      }
    });
  }

  function switchSection(name) {
    currentSection = name;
    // Update nav
    $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.section === name));
    // Update sections
    $$('.section').forEach(sec => sec.classList.toggle('active', sec.id === `section-${name}`));
    // Update header
    const titles = {
      overview:   ['Security <span class="grad">Overview</span>', 'Real-time AI prompt security monitoring · Chrome Storage Sync'],
      threats:    ['Threat <span class="grad">Logs</span>',       'Complete history of detected threats · Live from chrome.storage.local'],
      charts:     ['Analytics <span class="grad">&amp; Charts</span>', 'Visual breakdown of your security posture'],
      compliance: ['Compliance <span class="grad">Center</span>', 'Regulatory readiness across GDPR, SOC2, HIPAA, PCI-DSS, ISO 27001, NIST CSF'],
    };
    const [title, sub] = titles[name] || titles.overview;
    $('section-title').innerHTML = title;
    $('section-sub').textContent = sub;
    // Re-render charts when switching to that tab (canvas sizing fix)
    if (name === 'charts') { destroyCharts(); renderCharts(); }
  }

  // ─── EVENTS ─────────────────────────────────────────────────────────────────
  function setupEventListeners() {
    $('refresh-btn').addEventListener('click', () => { loadData(); showToast('🔄 Refreshed'); });

    $('clear-btn').addEventListener('click', () => {
      if (!confirm('Clear ALL PromptShield data? This cannot be undone.')) return;
      StorageManager.clearAll().then(() => {
        allScans = []; stats = {}; analytics = {};
        renderAll();
        showToast('🗑️ All data cleared');
      });
    });

    $('search-input').addEventListener('input', (e) => {
      currentSearch = e.target.value;
      currentPage = 0;
      renderThreatTable();
    });

    $$('.fpill').forEach(pill => {
      pill.addEventListener('click', () => {
        $$('.fpill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.dataset.filter;
        currentPage = 0;
        renderThreatTable();
      });
    });
  }

  // ─── ANIMATED COUNTER ───────────────────────────────────────────────────────
  function animateCount(el, target) {
    if (!el) return;
    const current = parseInt(el.textContent, 10) || 0;
    if (current === target) return;
    const duration = 700;
    const start = performance.now();
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(current + (target - current) * eased);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  // ─── PARTICLES ───────────────────────────────────────────────────────────────
  function initParticles() {
    const canvas = $('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const particles = Array.from({ length: 85 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - .5) * 0.35, vy: (Math.random() - .5) * 0.35,
      r: Math.random() * 1.5 + .3,
      color: Math.random() > .5 ? '#00d4ff' : '#7b2ff7',
      life: 0, maxLife: Math.random() * 300 + 200,
    }));

    (function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw nodes
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life++;
        if (p.life > p.maxLife || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          Object.assign(p, { x: Math.random()*canvas.width, y: Math.random()*canvas.height, life: 0, maxLife: Math.random()*300+200 });
        }
        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * .35;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });

      // Draw connecting mesh lines
      const maxDistance = 110;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.08;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
            ctx.lineWidth = 0.55;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(frame);
    })();
  }

  // ─── UTILITIES ───────────────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function timeAgo(iso) {
    if (!iso) return '–';
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  function formatDate(iso) {
    if (!iso) return '–';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  let toastTimer;
  function showToast(msg) {
    clearTimeout(toastTimer);
    const t = $('toast');
    t.textContent = msg; t.classList.remove('hidden');
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2800);
  }

  // ─── START ───────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

})();
