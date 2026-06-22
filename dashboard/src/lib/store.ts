/**
 * PromptShield AI — Data Store (localStorage)
 * Centralized data access layer for the dashboard
 */

import { useState, useEffect } from 'react';

export interface ThreatLogEntry {
  id: number;
  time: string;
  site: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  riskScore: number;
  threatCount: number;
  threats: Array<{ type: string; severity: string }>;
  action: string;
}

export interface Stats {
  promptsScanned: number;
  threatsFound: number;
  redactions: number;
  securityScore: number;
  threatLog: ThreatLogEntry[];
}

// Seed data for demo purposes
const SEED_DATA: Stats = {
  promptsScanned: 142,
  threatsFound: 38,
  redactions: 24,
  securityScore: 73,
  threatLog: [
    { id: 1, time: new Date(Date.now() - 300000).toISOString(), site: 'ChatGPT', riskLevel: 'CRITICAL', riskScore: 92, threatCount: 3, threats: [{ type: 'API Key', severity: 'CRITICAL' }, { type: 'Email', severity: 'MEDIUM' }], action: 'Redacted' },
    { id: 2, time: new Date(Date.now() - 900000).toISOString(), site: 'Claude', riskLevel: 'HIGH', riskScore: 68, threatCount: 2, threats: [{ type: 'Source Code', severity: 'HIGH' }, { type: 'Internal IP', severity: 'LOW' }], action: 'Warned' },
    { id: 3, time: new Date(Date.now() - 1800000).toISOString(), site: 'Gemini', riskLevel: 'MEDIUM', riskScore: 42, threatCount: 1, threats: [{ type: 'Email Address', severity: 'MEDIUM' }], action: 'Redacted' },
    { id: 4, time: new Date(Date.now() - 3600000).toISOString(), site: 'ChatGPT', riskLevel: 'CRITICAL', riskScore: 88, threatCount: 2, threats: [{ type: 'AWS Access Key', severity: 'CRITICAL' }], action: 'Redacted' },
    { id: 5, time: new Date(Date.now() - 7200000).toISOString(), site: 'Perplexity', riskLevel: 'LOW', riskScore: 15, threatCount: 1, threats: [{ type: 'Internal IP', severity: 'LOW' }], action: 'Warned' },
    { id: 6, time: new Date(Date.now() - 10800000).toISOString(), site: 'DeepSeek', riskLevel: 'HIGH', riskScore: 74, threatCount: 2, threats: [{ type: 'Password', severity: 'CRITICAL' }, { type: 'Email', severity: 'MEDIUM' }], action: 'Redacted' },
    { id: 7, time: new Date(Date.now() - 86400000).toISOString(), site: 'Claude', riskLevel: 'MEDIUM', riskScore: 35, threatCount: 1, threats: [{ type: 'Phone Number', severity: 'MEDIUM' }], action: 'Warned' },
    { id: 8, time: new Date(Date.now() - 172800000).toISOString(), site: 'ChatGPT', riskLevel: 'CRITICAL', riskScore: 95, threatCount: 4, threats: [{ type: 'Private Key', severity: 'CRITICAL' }, { type: 'AWS Key', severity: 'CRITICAL' }], action: 'Redacted' },
  ],
};

function getStats(): Stats {
  if (typeof window === 'undefined') return SEED_DATA;
  try {
    const raw = localStorage.getItem('promptshield_stats');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Stats>;
      // Merge with seed to ensure demo data
      return {
        promptsScanned: Math.max(parsed.promptsScanned || 0, SEED_DATA.promptsScanned),
        threatsFound: Math.max(parsed.threatsFound || 0, SEED_DATA.threatsFound),
        redactions: Math.max(parsed.redactions || 0, SEED_DATA.redactions),
        securityScore: parsed.securityScore ?? SEED_DATA.securityScore,
        threatLog: parsed.threatLog?.length ? [...parsed.threatLog, ...SEED_DATA.threatLog].slice(0, 100) : SEED_DATA.threatLog,
      };
    }
  } catch {}
  return SEED_DATA;
}

function saveStats(stats: Stats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('promptshield_stats', JSON.stringify(stats));
  } catch {}
}

// Analytics data computed from threat log
function getAnalytics(stats: Stats) {
  const log = stats.threatLog;

  // Threat type distribution
  const typeCount: Record<string, number> = {};
  log.forEach(entry => {
    entry.threats.forEach(t => {
      const key = t.type.split('(')[0].trim();
      typeCount[key] = (typeCount[key] || 0) + 1;
    });
  });

  // Risk level distribution
  const riskCount = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, SAFE: 0 };
  log.forEach(e => { riskCount[e.riskLevel] = (riskCount[e.riskLevel] || 0) + 1; });

  // Daily trend (last 7 days)
  const dailyTrend: Record<string, number> = {};
  const days = 7;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyTrend[key] = 0;
  }
  log.forEach(e => {
    const d = new Date(e.time);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (key in dailyTrend) dailyTrend[key]++;
  });

  // Platform distribution
  const platformCount: Record<string, number> = {};
  log.forEach(e => {
    platformCount[e.site] = (platformCount[e.site] || 0) + 1;
  });

  return { typeCount, riskCount, dailyTrend, platformCount };
}

export function useStats(): Stats {
  const [stats, setStats] = useState<Stats>(SEED_DATA);

  useEffect(() => {
    setStats(getStats());
    if (typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PS_DATA_RESPONSE' && event.data.data) {
        const extData = event.data.data;
        const scans = extData.scans || [];
        const extStats = extData.stats || {};
        
        const mappedStats: Stats = {
          promptsScanned: extStats.totalScanned || scans.length || 0,
          threatsFound: extStats.totalThreats || 0,
          redactions: extStats.totalRedactions || 0,
          securityScore: extStats.securityScore ?? 100,
          threatLog: scans.map((s: any) => ({
            id: s.id,
            time: s.timestamp,
            site: s.site,
            riskLevel: s.riskLevel,
            riskScore: s.riskScore,
            threatCount: s.threatCount || 0,
            threats: s.detectedThreats || [],
            action: s.redactionsPerformed > 0 ? 'Redacted' : 'Warned'
          }))
        };
        
        localStorage.setItem('promptshield_stats', JSON.stringify(mappedStats));
        setStats(mappedStats);
      }
    };

    window.addEventListener('message', handleMessage);
    // Request fresh data from extension
    window.postMessage({ type: 'PS_GET_DATA' }, '*');

    // Sync across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'promptshield_stats' && e.newValue) {
        try {
          setStats(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return stats;
}

export { getStats, saveStats, getAnalytics, SEED_DATA };
