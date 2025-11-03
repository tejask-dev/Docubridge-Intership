import React, { useState } from "react";
import axios from "axios";
import HighlightCards from "../components/HighlightCards";
import ChartCarousel from "../components/ChartCarousel";
import ExcelFormulaTip from "../components/ExcelFormulaTip";

export default function HomePage() {
  const [charts, setCharts] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [ratios, setRatios] = useState<any[]>([]);
  const [errors, setErrors] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [excelFormulaTip, setExcelFormulaTip] = useState<string>("");

  // Demo: You'd call this after /ask API response!
  const handleAsk = async () => {
    const response = await axios.post("/ask", { user_question: "Show me revenue trends" });
    setCharts(response.data.charts ?? []);
    setTrends(response.data.trends ?? []);
    setRatios(response.data.ratios ?? []);
    setErrors(response.data.errors ?? "");
    setAnswer(response.data.answer ?? "");
    // If you want, parse response to extract excelFormulaTip
    setExcelFormulaTip(""); // set to response.data.excelFormulaTip if you have it
  };

  const handleDownloadChart = (filename: string) => {
    window.open(`/download_chart/${filename}`, "_blank");
    // confetti is triggered in ChartCarousel
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <button style={{ margin: 24 }} onClick={handleAsk}>Ask Example</button>
      <HighlightCards trends={trends} ratios={ratios} errors={errors} />
      {excelFormulaTip && <ExcelFormulaTip answer={excelFormulaTip} />}
      <ChartCarousel charts={charts} onDownload={handleDownloadChart} />
      <div
        style={{
          background: "#f3f4f6",
          borderRadius: 16,
          padding: 32,
          marginTop: 32,
          minHeight: 80
        }}
        dangerouslySetInnerHTML={{ __html: answer }}
      />
    </div>
  );
}