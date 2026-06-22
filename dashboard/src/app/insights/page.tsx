'use client';

import { useEffect, useState } from 'react';
import { useStats, getAnalytics, Stats } from '@/lib/store';

interface Insight {
  icon: string;
  title: string;
  body: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  action?: string;
}

function generateInsights(stats: Stats, analytics: ReturnType<typeof getAnalytics>): Insight[] {
  const insights: Insight[] = [];
  const { typeCount, riskCount, platformCount } = analytics;

  // Critical threats
  if (riskCount.CRITICAL > 0) {
    insights.push({
      icon: '🔴',
      title: 'Critical Credential Exposure Detected',
      body: `You have ${riskCount.CRITICAL} critical-level scans in your history. These likely contain API keys, passwords, or private keys being shared with public AI tools. This poses an immediate security risk — rotate any exposed credentials immediately.`,
      severity: 'critical',
      action: 'Review Critical Threats',
    });
  }

  // API key patterns
  if (typeCount['API Key / Secret'] > 0 || typeCount['Password / Secret'] > 0) {
    insights.push({
      icon: '🔑',
      title: 'Credential Leakage Pattern Identified',
      body: `Your scans show a pattern of sharing credentials with AI tools. ${(typeCount['API Key / Secret'] || 0) + (typeCount['Password / Secret'] || 0)} credential-related threats detected. Consider using environment variable managers like HashiCorp Vault or AWS Secrets Manager.`,
      severity: 'critical',
      action: 'Set Up Secret Management',
    });
  }

  // PII patterns
  const piiCount = (typeCount['Email Address'] || 0) + (typeCount['Phone Number'] || 0);
  if (piiCount > 0) {
    insights.push({
      icon: '👤',
      title: 'Personal Data (PII) Being Shared',
      body: `${piiCount} instances of personal data (emails, phone numbers) were detected in your prompts. Under GDPR Article 9, sharing customer PII with non-compliant AI vendors requires explicit consent and data processing agreements.`,
      severity: 'warning',
      action: 'Review GDPR Obligations',
    });
  }

  // Top platform
  const topPlatform = Object.entries(platformCount).sort((a,b) => b[1]-a[1])[0];
  if (topPlatform) {
    insights.push({
      icon: '🤖',
      title: `${topPlatform[0]} is Your Most-Used AI Platform`,
      body: `${topPlatform[0]} accounts for ${Math.round(topPlatform[1] / Math.max(1, stats.promptsScanned) * 100)}% of your scans. Ensure you have reviewed ${topPlatform[0]}'s data retention and privacy policies. Consider enterprise plans with enhanced data privacy guarantees.`,
      severity: 'info',
    });
  }

  // Source code
  if (typeCount['Source Code'] > 0) {
    insights.push({
      icon: '💻',
      title: 'Proprietary Code Being Analyzed by Public AI',
      body: `Source code was detected in ${typeCount['Source Code']} scans. Review your company's IP policy. Many organizations explicitly prohibit sharing unreleased code with public AI services. Consider using on-premise alternatives like GitHub Copilot Enterprise.`,
      severity: 'warning',
      action: 'Review IP Policy',
    });
  }

  // Good posture
  if (stats.securityScore >= 80) {
    insights.push({
      icon: '✅',
      title: 'Strong Security Posture Maintained',
      body: `Your security score of ${stats.securityScore}/100 indicates excellent prompt hygiene. You're successfully redacting sensitive data before submitting to AI tools. Keep up the great work and consider sharing these best practices with your team.`,
      severity: 'success',
    });
  } else if (stats.securityScore < 50) {
    insights.push({
      icon: '⚠️',
      title: 'Security Score Needs Improvement',
      body: `Your security score of ${stats.securityScore}/100 is below the recommended threshold. Enable the auto-redaction feature and consider implementing a pre-submission review workflow for all AI prompts containing sensitive keywords.`,
      severity: 'warning',
      action: 'Enable Auto-Redaction',
    });
  }

  // Tips
  insights.push({
    icon: '💡',
    title: 'Best Practice: Use Synthetic Data for AI Testing',
    body: 'Replace real customer data with synthetic datasets when testing AI features. Tools like Faker.js, Mimesis, or Tonic.ai can generate realistic but fake data that eliminates PII exposure risk entirely.',
    severity: 'info',
  });

  insights.push({
    icon: '🔄',
    title: 'Schedule Regular Credential Rotation',
    body: 'Even if credentials haven\'t been exposed, regular rotation reduces your attack surface. Set up automated 90-day rotation for all API keys and access tokens used in AI workflows.',
    severity: 'info',
  });

  return insights.slice(0, 6);
}

const SEV_STYLES: Record<string, { border: string; bg: string; badge: string; badgeText: string }> = {
  critical: { border: 'rgba(255,45,85,0.3)',  bg: 'rgba(255,45,85,0.05)',  badge: 'rgba(255,45,85,0.15)',  badgeText: '#ff2d55' },
  warning:  { border: 'rgba(255,214,10,0.3)', bg: 'rgba(255,214,10,0.04)', badge: 'rgba(255,214,10,0.15)', badgeText: '#ffd60a' },
  info:     { border: 'rgba(0,212,255,0.2)',   bg: 'rgba(0,212,255,0.03)',  badge: 'rgba(0,212,255,0.15)',  badgeText: '#00d4ff' },
  success:  { border: 'rgba(48,209,88,0.25)', bg: 'rgba(48,209,88,0.04)',  badge: 'rgba(48,209,88,0.15)',  badgeText: '#30d158' },
};

export default function InsightsPage() {
  const stats = useStats();
  const analytics = getAnalytics(stats);
  const insights = generateInsights(stats, analytics);

  return (
    <div className="page">
      <div className="page-header">
        <h1>AI Security <span className="grad-text">Insights</span></h1>
        <p>Personalized security analysis based on your prompt history</p>
      </div>

      {/* AI Bot Header */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, animation: 'fadeInUp 0.5s ease both' }}>
        <div style={{
          width: 52, height: 52,
          background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(123,47,247,0.2))',
          border: '1px solid rgba(0,212,255,0.3)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, flexShrink: 0,
        }}>🤖</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>PromptShield AI Security Analyst</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            I've analyzed your prompt history and security patterns. Here are personalized insights and recommendations to improve your AI security posture.
          </div>
        </div>
      </div>

      {/* Insights Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {insights.map((insight, i) => {
          const s = SEV_STYLES[insight.severity];
          return (
            <div key={i} style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: 14,
              padding: '20px 22px',
              transition: 'all 0.2s',
              animation: `fadeInUp 0.5s ease ${i * 0.07}s both`,
              cursor: 'default',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'none'}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{insight.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{insight.title}</div>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: 20, fontSize: 10,
                      fontWeight: 800, letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                      background: s.badge, color: s.badgeText,
                      flexShrink: 0,
                    }}>{insight.severity}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: insight.action ? 14 : 0 }}>
                    {insight.body}
                  </p>
                  {insight.action && (
                    <button style={{
                      padding: '7px 16px',
                      background: s.badge, border: `1px solid ${s.border}`,
                      borderRadius: 8, color: s.badgeText,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'var(--font-inter)',
                      transition: 'all 0.2s',
                    }}>
                      → {insight.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
