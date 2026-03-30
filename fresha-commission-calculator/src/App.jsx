import React, { useState } from 'react';
import { BookOpen, Calculator, RotateCcw, Users } from 'lucide-react';
import { COLORS } from './components/shared.jsx';
import CommissionStructure from './components/CommissionStructure.jsx';
import CommissionCalculatorTab from './components/CommissionCalculator.jsx';
import RetentionAdjustmentTab from './components/RetentionAdjustment.jsx';
import TeamLeadCalculatorTab from './components/TeamLeadCalculator.jsx';

const TABS = [
  { id: "structure", label: "Commission Structure", icon: <BookOpen size={18} /> },
  { id: "calculator", label: "Commission Calculator", icon: <Calculator size={18} /> },
  { id: "retention", label: "Retention Adjustment", icon: <RotateCcw size={18} /> },
  { id: "teamlead", label: "Team Lead Calculator", icon: <Users size={18} /> },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("structure");

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6" }}>
      {/* Header */}
      <header style={{
        background: COLORS.dark, padding: "0 32px", display: "flex",
        alignItems: "center", justifyContent: "space-between", height: 64,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: COLORS.white, letterSpacing: "-0.5px" }}>fresha</span>
          <div style={{ width: 1, height: 28, background: "#374151" }} />
          <span style={{ fontSize: 14, color: "#9CA3AF", fontWeight: 500 }}>BDM Commission Calculator</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.ceelo }} />
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>v1.0</span>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-nav" style={{
        background: COLORS.white, borderBottom: `1px solid ${COLORS.border}`,
        padding: "0 32px", display: "flex", gap: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        overflowX: "auto",
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "16px 24px",
                border: "none", background: "transparent", cursor: "pointer",
                fontSize: 14, fontWeight: isActive ? 600 : 400,
                color: isActive ? COLORS.prince : COLORS.secondary,
                borderBottom: `3px solid ${isActive ? COLORS.prince : "transparent"}`,
                transition: "all 0.2s", whiteSpace: "nowrap",
              }}
              onMouseOver={e => { if (!isActive) e.currentTarget.style.color = COLORS.prince80; }}
              onMouseOut={e => { if (!isActive) e.currentTarget.style.color = COLORS.secondary; }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 60px" }} role="tabpanel">
        {activeTab === "structure" && <CommissionStructure />}
        {activeTab === "calculator" && <CommissionCalculatorTab />}
        {activeTab === "retention" && <RetentionAdjustmentTab />}
        {activeTab === "teamlead" && <TeamLeadCalculatorTab />}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "20px 0", fontSize: 12, color: COLORS.secondary, borderTop: `1px solid ${COLORS.border}`, background: COLORS.white }}>
        Fresha BDM Commission Calculator - Internal Use Only
      </footer>
    </div>
  );
}
