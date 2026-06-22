'use client';

import React from 'react';
import { Search, ShieldAlert, Scissors, ShieldCheck, HelpCircle, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'purple' | 'green' | 'red' | 'yellow';
  suffix?: string;
  description?: string;
  delay?: number;
}

const COLOR_MAP = {
  blue:   { border: 'rgba(0,212,255,0.25)',  glow: 'rgba(0,212,255,0.08)',   text: '#00d4ff',  bg: 'rgba(0,212,255,0.08)' },
  purple: { border: 'rgba(123,47,247,0.3)',  glow: 'rgba(123,47,247,0.08)',  text: '#7b2ff7',  bg: 'rgba(123,47,247,0.08)' },
  green:  { border: 'rgba(48,209,88,0.25)',  glow: 'rgba(48,209,88,0.08)',   text: '#30d158',  bg: 'rgba(48,209,88,0.08)' },
  red:    { border: 'rgba(255,45,85,0.25)',  glow: 'rgba(255,45,85,0.08)',   text: '#ff2d55',  bg: 'rgba(255,45,85,0.08)' },
  yellow: { border: 'rgba(255,214,10,0.25)', glow: 'rgba(255,214,10,0.08)',  text: '#ffd60a',  bg: 'rgba(255,214,10,0.08)' },
};

const ICON_MAP: Record<string, LucideIcon> = {
  scan: Search,
  threat: ShieldAlert,
  redact: Scissors,
  shield: ShieldCheck,
};

export default function StatCard({ title, value, icon, trend, trendUp, color = 'blue', suffix = '', description, delay = 0 }: StatCardProps) {
  const c = COLOR_MAP[color];
  const IconComponent = ICON_MAP[icon] || HelpCircle;

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${c.border}`,
      borderRadius: 16,
      padding: '20px 22px',
      transition: 'all var(--transition)',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'default',
      boxShadow: `0 4px 20px rgba(0,0,0,0.15), 0 0 25px ${c.glow}`,
      animation: `fadeInUp 0.5s ease ${delay}s both`,
      backdropFilter: 'blur(10px)',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 30px rgba(0,0,0,0.25), 0 0 35px ${c.glow}, inset 0 0 12px ${c.glow}`;
      (e.currentTarget as HTMLDivElement).style.borderColor = c.text;
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.transform = '';
      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px rgba(0,0,0,0.15), 0 0 25px ${c.glow}`;
      (e.currentTarget as HTMLDivElement).style.borderColor = c.border;
    }}>
      {/* Top gradient bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${c.text}, transparent)`,
        borderRadius: '16px 16px 0 0',
      }}/>

      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80,
        background: `radial-gradient(circle, ${c.bg}, transparent 70%)`,
        borderRadius: '50%',
        pointerEvents: 'none',
      }}/>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>{title}</div>
        <div style={{
          width: 36, height: 36,
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: c.text,
          boxShadow: `inset 0 0 8px ${c.glow}`,
        }}>
          <IconComponent size={16} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 6 }}>
        <div style={{
          fontSize: 34,
          fontWeight: 950,
          lineHeight: 1,
          color: c.text,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-1px',
          textShadow: `0 0 20px ${c.glow}`,
        }}>
          {value}{suffix}
        </div>
      </div>

      {(trend || description) && (
        <div style={{ 
          fontSize: 11, 
          color: trendUp === undefined ? 'var(--text-3)' : (trendUp ? 'var(--green)' : 'var(--red)'), 
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          {trend && <span>{trendUp ? '↑' : '↓'} {trend}</span>}
          {description && <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{description}</span>}
        </div>
      )}
    </div>
  );
}
