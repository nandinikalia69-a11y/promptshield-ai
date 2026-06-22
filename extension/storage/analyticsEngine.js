/**
 * PromptShield AI — Analytics Engine
 * Pure JS analytics computed from raw scan records in chrome.storage.local
 * Zero dependencies, zero network calls.
 */

const AnalyticsEngine = (() => {

  // ─── Threat Type Distribution ───────────────────────────────────────────────
  function getThreatTypeDistribution(scans) {
    const counts = {};
    scans.forEach(scan => {
      (scan.detectedThreats || []).forEach(threat => {
        // Normalize: strip parenthetical detail e.g. "API Key / Secret (OpenAI API Key)" → "API Key"
        const key = (threat.type || 'Unknown')
          .replace(/\s*\(.*?\)/g, '')
          .replace('/ Secret', '')
          .trim();
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  }

  // ─── Risk Level Distribution ────────────────────────────────────────────────
  function getRiskLevelDistribution(scans) {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, SAFE: 0 };
    scans.forEach(s => {
      if (s.riskLevel in counts) counts[s.riskLevel]++;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }

  // ─── Daily Scan Trends (last N days) ───────────────────────────────────────
  function getDailyTrends(scans, days = 7) {
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd   = dayStart + 86400000;

      const dayScans    = scans.filter(s => {
        const t = new Date(s.timestamp).getTime();
        return t >= dayStart && t < dayEnd;
      });
      const threats    = dayScans.reduce((acc, s) => acc + (s.threatCount || 0), 0);
      const redactions = dayScans.reduce((acc, s) => acc + (s.redactionsPerformed || 0), 0);

      result.push({
        label:     d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        scans:     dayScans.length,
        threats,
        redactions,
      });
    }
    return result;
  }

  // ─── Platform Distribution ──────────────────────────────────────────────────
  function getPlatformDistribution(scans) {
    const counts = {};
    scans.forEach(s => {
      const key = s.site || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  }

  // ─── Recent Activity (last N scans) ─────────────────────────────────────────
  function getRecentActivity(scans, limit = 10) {
    return scans.slice(0, limit).map(s => ({
      id:          s.id,
      timestamp:   s.timestamp,
      site:        s.site,
      riskLevel:   s.riskLevel,
      riskScore:   s.riskScore,
      threatCount: s.threatCount || 0,
      threats:     (s.detectedThreats || []).slice(0, 3),
      action:      s.redactionsPerformed > 0 ? 'Redacted' : 'Warned',
      prompt:      s.originalPrompt ? s.originalPrompt.slice(0, 80) + (s.originalPrompt.length > 80 ? '...' : '') : '',
    }));
  }

  // ─── Hourly Activity Heatmap (0–23) ─────────────────────────────────────────
  function getHourlyHeatmap(scans) {
    const hours = Array(24).fill(0);
    scans.forEach(s => {
      const h = new Date(s.timestamp).getHours();
      hours[h]++;
    });
    return hours.map((value, hour) => ({ hour, value }));
  }

  // ─── Summary Metrics ─────────────────────────────────────────────────────────
  function getSummaryMetrics(scans, stats) {
    const recentScans = scans.slice(0, 30);
    const criticalCount = recentScans.filter(s => s.riskLevel === 'CRITICAL').length;
    const highCount     = recentScans.filter(s => s.riskLevel === 'HIGH').length;
    const totalThreats  = recentScans.reduce((a, s) => a + (s.threatCount || 0), 0);
    const totalRed      = recentScans.reduce((a, s) => a + (s.redactionsPerformed || 0), 0);

    const topPlatform   = getPlatformDistribution(scans)[0]?.label || 'N/A';
    const topThreat     = getThreatTypeDistribution(scans)[0]?.label || 'N/A';
    const avgRisk       = scans.length
      ? Math.round(scans.reduce((a, s) => a + (s.riskScore || 0), 0) / scans.length)
      : 0;
    const redactionRate = totalThreats > 0
      ? Math.round((totalRed / totalThreats) * 100)
      : 0;

    return {
      topPlatform,
      topThreat,
      avgRisk,
      redactionRate: `${redactionRate}%`,
      criticalCount,
      highCount,
      recentDetectionRate: recentScans.length
        ? `${Math.round(((criticalCount + highCount) / recentScans.length) * 100)}%`
        : '0%',
    };
  }

  // ─── Full Analytics Bundle ────────────────────────────────────────────────
  function compute(scans, stats) {
    return {
      threatTypes:    getThreatTypeDistribution(scans),
      riskLevels:     getRiskLevelDistribution(scans),
      dailyTrends:    getDailyTrends(scans, 7),
      platforms:      getPlatformDistribution(scans),
      recentActivity: getRecentActivity(scans, 8),
      hourlyHeatmap:  getHourlyHeatmap(scans),
      summary:        getSummaryMetrics(scans, stats),
    };
  }

  return {
    compute,
    getThreatTypeDistribution,
    getRiskLevelDistribution,
    getDailyTrends,
    getPlatformDistribution,
    getRecentActivity,
    getHourlyHeatmap,
    getSummaryMetrics,
  };
})();

if (typeof module !== 'undefined') module.exports = AnalyticsEngine;
