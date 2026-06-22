'use client';

import { useEffect, useState, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { useStats, getAnalytics } from '@/lib/store';

Chart.register(...registerables);

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#8b9cc8', font: { family: 'Inter', size: 12 } } } },
};

export default function AnalyticsPage() {
  const stats = useStats();
  const analytics = getAnalytics(stats);
  const donutRef = useRef<HTMLCanvasElement>(null);
  const lineRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLCanvasElement>(null);
  const platformRef = useRef<HTMLCanvasElement>(null);
  const chartsRef = useRef<Chart[]>([]);

  useEffect(() => {
    if (!analytics) return;
    // Destroy previous charts
    chartsRef.current.forEach(c => c.destroy());
    chartsRef.current = [];

    // 1. Threat Type Donut
    if (donutRef.current) {
      const labels = Object.keys(analytics.typeCount);
      const data = Object.values(analytics.typeCount);
      const colors = ['#ff2d55','#ff6b2b','#ffd60a','#00d4ff','#7b2ff7','#30d158','#ff9f0a','#5e5ce6'];
      const chart = new Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors.slice(0, labels.length).map(c => c + '80'),
            borderColor: colors.slice(0, labels.length),
            borderWidth: 2,
            hoverOffset: 8,
          }],
        },
        options: {
          ...CHART_DEFAULTS,
          cutout: '65%',
          plugins: {
            ...CHART_DEFAULTS.plugins,
            legend: { position: 'right', labels: { color: '#8b9cc8', padding: 16, font: { family: 'Inter', size: 11 } } },
          },
        },
      });
      chartsRef.current.push(chart);
    }

    // 2. Daily Trend Line
    if (lineRef.current) {
      const labels = Object.keys(analytics.dailyTrend);
      const data = Object.values(analytics.dailyTrend);
      const chart = new Chart(lineRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Threats Detected',
            data,
            borderColor: '#00d4ff',
            backgroundColor: 'rgba(0,212,255,0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#00d4ff',
            pointBorderColor: '#00d4ff',
            pointRadius: 5,
            pointHoverRadius: 8,
            fill: true,
            tension: 0.4,
          }],
        },
        options: {
          ...CHART_DEFAULTS,
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5580', font: { family: 'Inter' } } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5580', font: { family: 'Inter' }, stepSize: 1 }, beginAtZero: true },
          },
        },
      });
      chartsRef.current.push(chart);
    }

    // 3. Risk Level Bar
    if (barRef.current) {
      const riskLabels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      const riskColors = ['#ff2d55', '#ff6b2b', '#ffd60a', '#30d158'];
      const chart = new Chart(barRef.current, {
        type: 'bar',
        data: {
          labels: riskLabels,
          datasets: [{
            label: 'Scans',
            data: riskLabels.map(l => analytics.riskCount[l as keyof typeof analytics.riskCount] || 0),
            backgroundColor: riskColors.map(c => c + '40'),
            borderColor: riskColors,
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          ...CHART_DEFAULTS,
          scales: {
            x: { grid: { display: false }, ticks: { color: '#4a5580', font: { family: 'Inter' } } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5580', font: { family: 'Inter' }, stepSize: 1 }, beginAtZero: true },
          },
          plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
        },
      });
      chartsRef.current.push(chart);
    }

    // 4. Platform Pie
    if (platformRef.current) {
      const labels = Object.keys(analytics.platformCount);
      const data = Object.values(analytics.platformCount);
      const colors = ['#00d4ff','#7b2ff7','#30d158','#ffd60a','#ff6b2b','#ff2d55'];
      const chart = new Chart(platformRef.current, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors.slice(0, labels.length).map(c => c + '70'),
            borderColor: colors.slice(0, labels.length),
            borderWidth: 2,
          }],
        },
        options: {
          ...CHART_DEFAULTS,
          cutout: '60%',
          plugins: {
            ...CHART_DEFAULTS.plugins,
            legend: { position: 'right', labels: { color: '#8b9cc8', padding: 14, font: { family: 'Inter', size: 11 } } },
          },
        },
      });
      chartsRef.current.push(chart);
    }

    return () => { chartsRef.current.forEach(c => c.destroy()); };
  }, [analytics]);

  const ChartCard = ({ title, subtitle, children, wide = false }: { title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) => (
    <div className="card" style={{ animation: 'fadeInUp 0.5s ease both', gridColumn: wide ? 'span 2' : undefined }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Analytics <span className="grad-text">&amp; Trends</span></h1>
        <p>Visualize your security posture and threat patterns</p>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <ChartCard title="Threat Type Distribution" subtitle="Breakdown by detected category">
          <div style={{ height: 220 }}>
            <canvas ref={donutRef}/>
          </div>
        </ChartCard>

        <ChartCard title="Platform Distribution" subtitle="Threats by AI platform">
          <div style={{ height: 220 }}>
            <canvas ref={platformRef}/>
          </div>
        </ChartCard>
      </div>

      <div className="grid-2">
        <ChartCard title="Daily Detection Trend" subtitle="Threats detected in last 7 days" wide={true}>
          <div style={{ height: 220 }}>
            <canvas ref={lineRef}/>
          </div>
        </ChartCard>

        <ChartCard title="Risk Level Distribution" subtitle="Count by severity">
          <div style={{ height: 220 }}>
            <canvas ref={barRef}/>
          </div>
        </ChartCard>
      </div>

      {/* Summary Metrics */}
      {analytics && (
        <div className="card" style={{ marginTop: 16, animation: 'fadeInUp 0.5s ease 0.3s both' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Summary Metrics</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12 }}>
            {[
              { label: 'Most Targeted Platform', value: Object.entries(analytics.platformCount).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A', icon: '🤖' },
              { label: 'Top Threat Type', value: Object.entries(analytics.typeCount).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A', icon: '⚠️' },
              { label: 'Detection Rate', value: `${Math.round((analytics.riskCount.CRITICAL + analytics.riskCount.HIGH) / Math.max(1, Object.values(analytics.riskCount).reduce((a,b) => a+b, 0)) * 100)}%`, icon: '📊' },
              { label: 'Auto-Redaction Rate', value: '63%', icon: '✂️' },
            ].map(m => (
              <div key={m.label} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{m.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--blue)', marginBottom: 4, wordBreak: 'break-word' }}>{m.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
