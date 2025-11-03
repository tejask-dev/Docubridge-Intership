import React from "react";
import { Alert } from "@mui/material";
import { motion } from "framer-motion";

const ExcelFormulaTip = ({ answer }: { answer: string }) => {
  if (!answer) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Alert
        severity="info"
        sx={{
          mb: 2,
          borderRadius: 3,
          px: 3,
          fontWeight: 600,
          fontSize: "1.08rem",
          bgcolor: "#e0e7ff"
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: answer }} />
      </Alert>
    </motion.div>
  );
};

export default ExcelFormulaTip;