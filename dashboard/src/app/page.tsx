'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { useStats, getAnalytics } from '@/lib/store';
import type { Stats, ThreatLogEntry } from '@/lib/store';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ff2d55', HIGH: '#ff6b2b', MEDIUM: '#ffd60a', LOW: '#30d158', SAFE: '#30d158'
};

function TimeAgo({ time }: { time: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <span>-</span>;

  const diff = Date.now() - new Date(time).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return <span>just now</span>;
  if (mins < 60) return <span>{mins}m ago</span>;
  if (hours < 24) return <span>{hours}h ago</span>;
  return <span>{days}d ago</span>;
}

export default function OverviewPage() {
  const stats = useStats();
  const analytics = getAnalytics(stats);

  const recentThreats = stats.threatLog.slice(0, 5);
  const topThreatTypes = Object.entries(analytics?.typeCount || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>Security <span className="grad-text">Overview</span></h1>
            <p>Real-time AI prompt security monitoring</p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px',
            background: 'rgba(48,209,88,0.08)',
            border: '1px solid rgba(48,209,88,0.2)',
            borderRadius: 30,
            fontSize: 13, fontWeight: 600, color: 'var(--green)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', animation: 'dot-pulse 2s ease-in-out infinite' }}/>
            Protection Active
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard title="Prompts Scanned" value={stats.promptsScanned} icon="scan" color="blue" description="Total lifetime scans" delay={0} />
        <StatCard title="Threats Found" value={stats.threatsFound} icon="threat" color="red" trend="3 today" trendUp={false} delay={0.05} />
        <StatCard title="Redactions" value={stats.redactions} icon="redact" color="purple" description="Items sanitized" delay={0.1} />
        <StatCard title="Security Score" value={stats.securityScore} icon="shield" color="green" suffix="/100" description="Your safety rating" delay={0.15} />
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Recent Threat Activity */}
        <div className="card" style={{ animation: 'fadeInUp 0.5s ease 0.2s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Recent Activity</div>
            <a href="/threats" style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>View All →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentThreats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)' }}>No threats detected yet</div>
            ) : recentThreats.map((entry, i) => (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                animation: `fadeInUp 0.4s ease ${i * 0.05}s both`,
              }}>
                <div style={{
                  width: 36, height: 36,
                  background: `${RISK_COLORS[entry.riskLevel]}15`,
                  border: `1px solid ${RISK_COLORS[entry.riskLevel]}30`,
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>
                  {entry.riskLevel === 'CRITICAL' ? '🔴' : entry.riskLevel === 'HIGH' ? '🟠' : entry.riskLevel === 'MEDIUM' ? '🟡' : '🟢'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{entry.site}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{entry.threatCount} threat{entry.threatCount !== 1 ? 's' : ''} · {entry.action}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className={`badge badge-${entry.riskLevel.toLowerCase()}`}>{entry.riskLevel}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}><TimeAgo time={entry.time}/></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Threat Types */}
        <div className="card" style={{ animation: 'fadeInUp 0.5s ease 0.25s both' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Top Threat Categories</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topThreatTypes.map(([type, count], i) => {
              const maxCount = topThreatTypes[0]?.[1] || 1;
              const pct = (count / maxCount) * 100;
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{type}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, var(--blue), var(--purple))`,
                      borderRadius: 4,
                      transition: 'width 0.8s ease',
                      animation: `fadeInUp 0.5s ease ${0.1 + i * 0.05}s both`,
                    }}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Risk Breakdown */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Risk Distribution</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {Object.entries(analytics?.riskCount || {}).filter(([k]) => k !== 'SAFE').map(([level, count]) => (
                <div key={level} style={{
                  textAlign: 'center', padding: '10px 6px',
                  background: `${RISK_COLORS[level]}10`,
                  border: `1px solid ${RISK_COLORS[level]}20`,
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: RISK_COLORS[level] }}>{count as number}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: RISK_COLORS[level], textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 2 }}>{level}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Platform Protection Status */}
      <div className="card" style={{ animation: 'fadeInUp 0.5s ease 0.3s both' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Protected AI Platforms</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['ChatGPT', 'Claude', 'Gemini', 'DeepSeek', 'Perplexity', 'Copilot'].map(platform => (
            <div key={platform} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px',
              background: 'rgba(48,209,88,0.05)',
              border: '1px solid rgba(48,209,88,0.2)',
              borderRadius: 10,
              fontSize: 13, fontWeight: 600,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }}/>
              {platform}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
