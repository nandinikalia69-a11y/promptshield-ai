'use client';

import { useEffect, useState } from 'react';
import { useStats } from '@/lib/store';
import type { ThreatLogEntry } from '@/lib/store';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ff2d55', HIGH: '#ff6b2b', MEDIUM: '#ffd60a', LOW: '#30d158', SAFE: '#30d158'
};

const FILTERS = ['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function ThreatsPage() {
  const stats = useStats();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 8;

  const log = stats.threatLog;

  const filtered = log.filter(e => {
    const matchFilter = filter === 'All' || e.riskLevel === filter;
    const matchSearch = search === '' || e.site.toLowerCase().includes(search.toLowerCase()) || e.threats.some(t => t.type.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Threat <span className="grad-text">Logs</span></h1>
        <p>Complete history of detected threats and actions taken</p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search threats, platforms..."
            style={{
              width: '100%', paddingLeft: 38, paddingRight: 14, paddingTop: 10, paddingBottom: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text)',
              fontSize: 13,
              fontFamily: 'var(--font-inter)',
              outline: 'none',
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(0); }} style={{
              padding: '7px 14px',
              borderRadius: 20,
              border: `1px solid ${filter === f ? RISK_COLORS[f] || 'rgba(0,212,255,0.4)' : 'var(--border)'}`,
              background: filter === f ? `${RISK_COLORS[f] || '#00d4ff'}15` : 'transparent',
              color: filter === f ? (RISK_COLORS[f] || 'var(--blue)') : 'var(--text-3)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
              transition: 'all 0.2s',
            }}>
              {f}
            </button>
          ))}
        </div>

        {/* Count */}
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 'auto' }}>
          {filtered.length} entries
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', animation: 'fadeInUp 0.5s ease both' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                {['Time', 'Platform', 'Risk Level', 'Score', 'Threats', 'Action'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                    No threats match your filters
                  </td>
                </tr>
              ) : paged.map((entry, i) => (
                <tr key={entry.id} style={{
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.15s',
                  animation: `fadeInUp 0.3s ease ${i * 0.03}s both`,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {formatTime(entry.time)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>
                    {entry.site}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge badge-${entry.riskLevel.toLowerCase()}`}>
                      {entry.riskLevel}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 60, height: 6,
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: 3, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${entry.riskScore}%`, height: '100%',
                          background: RISK_COLORS[entry.riskLevel],
                          borderRadius: 3,
                        }}/>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: RISK_COLORS[entry.riskLevel] }}>{entry.riskScore}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-2)' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {entry.threats.slice(0, 2).map((t, ti) => (
                        <span key={ti} style={{
                          padding: '2px 8px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border)',
                          borderRadius: 20,
                          fontSize: 11,
                        }}>{t.type.split(' (')[0]}</span>
                      ))}
                      {entry.threats.length > 2 && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 4px' }}>+{entry.threats.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 11, fontWeight: 700,
                      background: entry.action === 'Redacted' ? 'rgba(48,209,88,0.1)' : 'rgba(255,214,10,0.1)',
                      color: entry.action === 'Redacted' ? 'var(--green)' : 'var(--yellow)',
                      border: `1px solid ${entry.action === 'Redacted' ? 'rgba(48,209,88,0.2)' : 'rgba(255,214,10,0.2)'}`,
                    }}>
                      {entry.action === 'Redacted' ? '✂️ ' : '⚠️ '}{entry.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '16px',
            borderTop: '1px solid var(--border)',
          }}>
            <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: page === 0 ? 'var(--text-3)' : 'var(--text)',
              cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'var(--font-inter)',
            }}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Page {page+1} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page === totalPages-1} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: page === totalPages-1 ? 'var(--text-3)' : 'var(--text)',
              cursor: page === totalPages-1 ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'var(--font-inter)',
            }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
