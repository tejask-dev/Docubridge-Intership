import React from "react";
import confetti from "canvas-confetti";

type Chart = {
  filename: string;
  column: string;
};

interface ChartCarouselProps {
  charts: Chart[];
  onDownload: (filename: string) => void;
}

const ChartCarousel: React.FC<ChartCarouselProps> = ({ charts, onDownload }) => {
  if (!charts || charts.length === 0) return null;

  const handleDownload = (filename: string) => {
    onDownload(filename);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {charts.map((chart, idx) => (
        <div
          key={chart.filename}
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 0 12px #e0e7ff",
            margin: "1.5rem 0",
            padding: "1.5rem",
            textAlign: "center",
            width: "90%",
            maxWidth: 780,
          }}
        >
          <img
            src={`/get_chart/${chart.filename}`}
            alt={chart.column}
            style={{ maxWidth: "100%", borderRadius: 10 }}
          />
          <div style={{ marginTop: 16 }}>
            <button
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                background: "#388e3c",
                color: "#fff",
                border: "none",
                cursor: "pointer"
              }}
              onClick={() => handleDownload(chart.filename)}
            >
              Download Chart
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChartCarousel;