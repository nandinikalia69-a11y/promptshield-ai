/**
 * PromptShield AI — Storage Manager
 * Single source of truth: chrome.storage.local
 *
 * Keys:
 *   ps_scans  → Array<ScanRecord>  (capped at MAX_SCANS)
 *   ps_stats  → StatsObject
 */

const StorageManager = (() => {

  const SCANS_KEY  = 'ps_scans';
  const STATS_KEY  = 'ps_stats';
  const MAX_SCANS  = 500;

  // ─── Default Stats ──────────────────────────────────────────────────────────
  const DEFAULT_STATS = {
    totalScanned:   0,
    totalThreats:   0,
    highRiskCount:  0,
    totalRedactions:0,
    securityScore:  100,
    lastUpdated:    null,
  };

  // ─── Generate ID ────────────────────────────────────────────────────────────
  function genId() {
    return `ps_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // ─── Save a scan record ─────────────────────────────────────────────────────
  function saveScan(data) {
    return new Promise((resolve) => {
      chrome.storage.local.get([SCANS_KEY, STATS_KEY], (stored) => {
        const scans = stored[SCANS_KEY] || [];
        const stats = stored[STATS_KEY] || { ...DEFAULT_STATS };

        // Build full scan record
        const record = {
          id:                  data.id || genId(),
          timestamp:           data.timestamp || new Date().toISOString(),
          site:                data.site || 'Unknown',
          url:                 data.url || '',
          originalPrompt:      data.originalPrompt || '',
          sanitizedPrompt:     data.sanitizedPrompt || '',
          riskScore:           data.riskScore || 0,
          riskLevel:           data.riskLevel || 'SAFE',
          detectedThreats:     data.detectedThreats || [],
          redactionsPerformed: data.redactionsPerformed || 0,
          threatCount:         data.detectedThreats ? data.detectedThreats.length : 0,
        };

        // Determine if we should update the last scan (collapsing rapid updates from typing)
        let isUpdate = false;
        if (scans.length > 0) {
          const last = scans[0];
          const timeDiff = Date.now() - new Date(last.timestamp).getTime();
          if (last.site === record.site && timeDiff < 12000) {
            isUpdate = true;
          }
        }

        if (isUpdate) {
          const last = scans[0];
          // Revert old stats contributions of the previous version of this scan
          stats.totalThreats -= last.threatCount;
          stats.highRiskCount -= (last.riskLevel === 'CRITICAL' || last.riskLevel === 'HIGH') ? 1 : 0;
          stats.totalRedactions -= last.redactionsPerformed;

          // Merge: reuse original scan ID and original start timestamp
          record.id = last.id;
          record.timestamp = last.timestamp;
          
          // Retain redaction details if the new scan was passive (which doesn't redact text on page)
          if (record.redactionsPerformed === 0 && last.redactionsPerformed > 0) {
            record.redactionsPerformed = last.redactionsPerformed;
            record.sanitizedPrompt = last.sanitizedPrompt;
          }
          
          scans[0] = record;
        } else {
          scans.unshift(record);
          if (scans.length > MAX_SCANS) scans.length = MAX_SCANS;
          stats.totalScanned += 1;
        }

        // Update aggregate stats
        stats.totalThreats    += record.threatCount;
        stats.highRiskCount   += (record.riskLevel === 'CRITICAL' || record.riskLevel === 'HIGH') ? 1 : 0;
        stats.totalRedactions += record.redactionsPerformed;
        stats.securityScore    = computeSecurityScore(scans);
        stats.lastUpdated      = new Date().toISOString();

        chrome.storage.local.set({ [SCANS_KEY]: scans, [STATS_KEY]: stats }, () => {
          resolve({ record, stats });
        });
      });
    });
  }

  // ─── Get all scans ──────────────────────────────────────────────────────────
  function getScans() {
    return new Promise((resolve) => {
      chrome.storage.local.get([SCANS_KEY], (stored) => {
        resolve(stored[SCANS_KEY] || []);
      });
    });
  }

  // ─── Get stats ──────────────────────────────────────────────────────────────
  function getStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STATS_KEY], (stored) => {
        resolve(stored[STATS_KEY] || { ...DEFAULT_STATS });
      });
    });
  }

  // ─── Get all data at once ───────────────────────────────────────────────────
  function getAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get([SCANS_KEY, STATS_KEY], (stored) => {
        resolve({
          scans: stored[SCANS_KEY] || [],
          stats: stored[STATS_KEY] || { ...DEFAULT_STATS },
        });
      });
    });
  }

  // ─── Clear all data ─────────────────────────────────────────────────────────
  function clearAll() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([SCANS_KEY, STATS_KEY], resolve);
    });
  }

  // ─── Security Score (rolling) ───────────────────────────────────────────────
  function computeSecurityScore(scans) {
    if (!scans || scans.length === 0) return 100;
    const recent = scans.slice(0, 20);
    const dangerousCount = recent.filter(
      s => s.riskLevel === 'CRITICAL' || s.riskLevel === 'HIGH'
    ).length;
    const redactedCount = recent.filter(s => s.redactionsPerformed > 0).length;
    // Penalize dangerous prompts, reward redactions
    const baseScore = 100 - (dangerousCount / recent.length) * 60;
    const bonus = (redactedCount / Math.max(1, dangerousCount)) * 10;
    return Math.round(Math.max(0, Math.min(100, baseScore + bonus)));
  }

  // ─── Initialize with defaults ───────────────────────────────────────────────
  function init() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STATS_KEY], (stored) => {
        if (!stored[STATS_KEY]) {
          chrome.storage.local.set({ [STATS_KEY]: { ...DEFAULT_STATS } }, resolve);
        } else {
          resolve();
        }
      });
    });
  }

  return { saveScan, getScans, getStats, getAll, clearAll, init, genId, SCANS_KEY, STATS_KEY };
})();

// ES module export for background.js (service_worker type: module)
export { StorageManager };
// CommonJS fallback (popup/dashboard scripts)
if (typeof module !== 'undefined') module.exports = StorageManager;
