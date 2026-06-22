'use client';

const FRAMEWORKS = [
  {
    name: 'GDPR',
    icon: '🇪🇺',
    status: 'Ready',
    score: 82,
    color: '#00d4ff',
    description: 'General Data Protection Regulation. Protects EU citizens\' personal data.',
    checks: [
      { label: 'PII Detection Active', done: true },
      { label: 'Email Auto-Redaction', done: true },
      { label: 'Phone Number Detection', done: true },
      { label: 'Data Minimization', done: true },
      { label: 'DPO Notification Workflow', done: false },
      { label: 'Formal DPIA Completed', done: false },
    ],
  },
  {
    name: 'SOC 2',
    icon: '🏛️',
    status: 'In Progress',
    score: 65,
    color: '#7b2ff7',
    description: 'Service Organization Control 2. Security, availability, and confidentiality.',
    checks: [
      { label: 'Access Control Logging', done: true },
      { label: 'Threat Detection', done: true },
      { label: 'Incident Response', done: false },
      { label: 'Change Management', done: false },
      { label: 'Third-Party Risk Assessment', done: false },
      { label: 'Annual Audit', done: false },
    ],
  },
  {
    name: 'HIPAA',
    icon: '🏥',
    status: 'In Progress',
    score: 55,
    color: '#ffd60a',
    description: 'Health Insurance Portability and Accountability Act. Protects health data.',
    checks: [
      { label: 'PHI Detection', done: true },
      { label: 'Access Controls', done: true },
      { label: 'Audit Controls', done: true },
      { label: 'BAA with AI Vendors', done: false },
      { label: 'Minimum Necessary Standard', done: false },
      { label: 'Risk Assessment Complete', done: false },
    ],
  },
  {
    name: 'PCI-DSS',
    icon: '💳',
    status: 'Ready',
    score: 88,
    color: '#30d158',
    description: 'Payment Card Industry Data Security Standard.',
    checks: [
      { label: 'Credit Card Detection', done: true },
      { label: 'CVV Auto-Redaction', done: true },
      { label: 'Card Data Masking', done: true },
      { label: 'Access Logging', done: true },
      { label: 'Penetration Testing', done: false },
      { label: 'QSA Certification', done: false },
    ],
  },
  {
    name: 'ISO 27001',
    icon: '🔐',
    status: 'Planning',
    score: 40,
    color: '#ff6b2b',
    description: 'International standard for information security management.',
    checks: [
      { label: 'Risk Assessment', done: true },
      { label: 'Asset Management', done: false },
      { label: 'Incident Management', done: false },
      { label: 'Business Continuity', done: false },
      { label: 'ISMS Implementation', done: false },
      { label: 'Certification Audit', done: false },
    ],
  },
  {
    name: 'NIST CSF',
    icon: '🇺🇸',
    status: 'In Progress',
    score: 70,
    color: '#5e5ce6',
    description: 'NIST Cybersecurity Framework. Identify, Protect, Detect, Respond, Recover.',
    checks: [
      { label: 'Identify: Asset Inventory', done: true },
      { label: 'Protect: Access Control', done: true },
      { label: 'Detect: Anomaly Detection', done: true },
      { label: 'Respond: Incident Plan', done: false },
      { label: 'Recover: Business Continuity', done: false },
      { label: 'Framework Audit', done: false },
    ],
  },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'Ready':       { bg: 'rgba(48,209,88,0.12)',  color: '#30d158' },
  'In Progress': { bg: 'rgba(255,214,10,0.10)', color: '#ffd60a' },
  'Planning':    { bg: 'rgba(255,107,43,0.12)', color: '#ff6b2b' },
};

export default function CompliancePage() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>Compliance <span className="grad-text">Center</span></h1>
        <p>AI security compliance readiness across major regulatory frameworks</p>
      </div>

      {/* Summary Banner */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap', animation: 'fadeInUp 0.5s ease both' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>🛡️ Compliance Overview</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            PromptShield AI's detection and redaction features directly support multiple regulatory compliance requirements. 
            Indicators below show readiness for AI-related data security obligations. Full compliance requires additional organizational and procedural measures.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {[{ label: 'Frameworks', val: FRAMEWORKS.length }, { label: 'Ready', val: FRAMEWORKS.filter(f => f.status === 'Ready').length }, { label: 'Avg Score', val: Math.round(FRAMEWORKS.reduce((a,f) => a+f.score,0)/FRAMEWORKS.length) + '%' }].map(m => (
            <div key={m.label} style={{ textAlign: 'center', padding: '12px 20px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--blue)' }}>{m.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Framework Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px,1fr))', gap: 16 }}>
        {FRAMEWORKS.map((fw, i) => {
          const statusStyle = STATUS_STYLE[fw.status] || STATUS_STYLE['Planning'];
          const doneCount = fw.checks.filter(c => c.done).length;
          return (
            <div key={fw.name} className="card" style={{
              animation: `fadeInUp 0.5s ease ${i * 0.07}s both`,
              borderColor: `${fw.color}25`,
              boxShadow: `0 0 30px ${fw.color}08`,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Top bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${fw.color}, transparent)`, borderRadius: '14px 14px 0 0' }}/>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 28 }}>{fw.icon}</div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800 }}>{fw.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{doneCount}/{fw.checks.length} checks</div>
                  </div>
                </div>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, ...statusStyle }}>
                  {fw.status === 'Ready' ? '✅ ' : fw.status === 'In Progress' ? '⏳ ' : '📋 '}
                  {fw.status}
                </span>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.5 }}>{fw.description}</p>

              {/* Score Bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Readiness Score</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: fw.color }}>{fw.score}%</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${fw.score}%`, height: '100%',
                    background: `linear-gradient(90deg, ${fw.color}80, ${fw.color})`,
                    borderRadius: 6,
                    transition: 'width 1s ease',
                  }}/>
                </div>
              </div>

              {/* Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {fw.checks.map((check, ci) => (
                  <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: check.done ? `${fw.color}20` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${check.done ? fw.color + '40' : 'rgba(255,255,255,0.1)'}`,
                      fontSize: 11,
                    }}>
                      {check.done ? '✓' : '○'}
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: check.done ? 600 : 400,
                      color: check.done ? 'var(--text)' : 'var(--text-3)',
                      textDecoration: 'none',
                    }}>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(255,214,10,0.05)', border: '1px solid rgba(255,214,10,0.2)', borderRadius: 12, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, animation: 'fadeInUp 0.5s ease 0.4s both' }}>
        ⚠️ <strong style={{ color: 'var(--yellow)' }}>Disclaimer:</strong> PromptShield AI provides technical controls that support compliance, but does not guarantee regulatory compliance on its own. Achieving full compliance requires legal review, organizational policies, staff training, and formal audits. Consult qualified compliance professionals for your specific obligations.
      </div>
    </div>
  );
}
