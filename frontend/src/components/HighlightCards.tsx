import React from "react";

interface Trend {
  column: string;
  trend: string;
  avg_growth: number;
}

interface Ratio {
  label: string;
  value: string;
}

export interface HighlightCardsProps {
  trends: Trend[];
  ratios: Ratio[];
  errors: string;
}

const HighlightCards: React.FC<HighlightCardsProps> = ({ trends, ratios, errors }) => {
  return (
    <div style={{ margin: "2rem 0", display: "flex", flexWrap: "wrap", gap: 10 }}>
      {ratios.map((r, i) => (
        <span key={r.label}
          style={{
            background: i === 0 ? "#4caf50" : "#fff6e0",
            color: i === 0 ? "#fff" : "#d97706",
            padding: "10px 22px",
            borderRadius: 20,
            fontWeight: 600,
            fontSize: "1rem",
            marginRight: 10,
            border: i === 0 ? "none" : "2px solid #ffe0b2"
          }}
        >
          {r.label}: {r.value}
        </span>
      ))}
      {trends.map((t, i) => (
        <span key={t.column}
          style={{
            background: "#fff7ed",
            color: "#ea580c",
            padding: "10px 22px",
            borderRadius: 20,
            fontWeight: 500,
            fontSize: "1rem",
            marginRight: 10,
            border: "2px solid #fed7aa"
          }}
        >
          {t.column}: {t.trend}
        </span>
      ))}
      {errors && (
        <span style={{
          background: "#fee2e2",
          color: "#dc2626",
          padding: "10px 22px",
          borderRadius: 20,
          fontWeight: 500,
          fontSize: "1rem",
          border: "2px solid #fecaca"
        }}>
          {errors}
        </span>
      )}
    </div>
  );
};

export default HighlightCards;