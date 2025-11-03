import React from "react";
import { CardContent, Typography } from "@mui/material";
import GlassCard from "./GlassCard";
import { motion } from "framer-motion";

export const AnimatedQnABox = ({ question, answer }: { question: string, answer: string }) => (
  <motion.div
    initial={{ opacity: 0, x: -60 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.45 }}
    style={{ marginBottom: "1.3rem" }}
  >
    <GlassCard sx={{ p: 3 }}>
      <CardContent sx={{ pl: 3 }}>
        <Typography variant="subtitle1" color="primary" fontWeight={700}>
          Q: {question}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }} dangerouslySetInnerHTML={{ __html: answer }} />
      </CardContent>
    </GlassCard>
  </motion.div>
);