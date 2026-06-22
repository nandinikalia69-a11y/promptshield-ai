'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BarChart3, 
  ShieldAlert, 
  Cpu, 
  FileCheck, 
  Shield 
} from 'lucide-react';

const NAV = [
  { href: '/',            label: 'Overview',     icon: LayoutDashboard },
  { href: '/analytics',  label: 'Analytics',    icon: BarChart3 },
  { href: '/threats',    label: 'Threat Logs',  icon: ShieldAlert },
  { href: '/insights',   label: 'Insights',     icon: Cpu },
  { href: '/compliance', label: 'Compliance',   icon: FileCheck },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      width: 'var(--sidebar-w)',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      padding: '20px 0',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(123,47,247,0.15))',
            border: '1px solid rgba(0,212,255,0.3)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0,212,255,0.2), inset 0 0 10px rgba(123,47,247,0.15)',
          }}>
            <Shield size={18} color="#00d4ff" style={{ filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.4))' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1, letterSpacing: '0.3px' }}>
              Prompt<span style={{ background: 'linear-gradient(90deg,#00d4ff,#7b2ff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Shield</span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: 3 }}>Security Panel</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '24px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '0 8px 6px', marginBottom: 2 }}>
          Main Monitor
        </div>
        {NAV.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? '#f0f4ff' : 'var(--text-2)',
                background: active ? 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(123,47,247,0.08))' : 'transparent',
                border: active ? '1px solid rgba(0,212,255,0.25)' : '1px solid transparent',
                boxShadow: active ? '0 0 15px rgba(0,212,255,0.05)' : 'none',
                transition: 'all var(--transition)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLDivElement).style.color = '#f0f4ff';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid transparent';
                  (e.currentTarget as HTMLDivElement).style.color = 'var(--text-2)';
                }
              }}>
                {active && <div style={{
                  position: 'absolute',
                  left: 0, top: 0, bottom: 0,
                  width: 3,
                  background: 'linear-gradient(180deg, #00d4ff, #7b2ff7)',
                  borderRadius: '0 2px 2px 0',
                  boxShadow: '0 0 8px #00d4ff',
                }}/>}
                <Icon size={16} style={{ 
                  color: active ? '#00d4ff' : 'var(--text-3)',
                  filter: active ? 'drop-shadow(0 0 3px rgba(0,212,255,0.5))' : 'none',
                  transition: 'color var(--transition)' 
                }} />
                <span style={{ letterSpacing: '0.2px' }}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          padding: '12px',
          background: 'rgba(0,212,255,0.02)',
          border: '1px solid rgba(0,212,255,0.1)',
          borderRadius: 10,
          textAlign: 'center',
          boxShadow: 'inset 0 0 10px rgba(0,212,255,0.02)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue)', letterSpacing: '0.5px', marginBottom: 2 }}>v1.1.0 — Enterprise</div>
          <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.5px' }}>ZERO-TRUST PROMPT FIREWALL</div>
        </div>
      </div>
    </aside>
  );
}
