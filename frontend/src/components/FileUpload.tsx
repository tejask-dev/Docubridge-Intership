import React, { useRef } from "react";
import { Box, Button, Typography, LinearProgress } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { motion } from "framer-motion";
import GlassCard from "./GlassCard";

export const FileUpload = ({ onUpload, uploading }: { onUpload: (f: File) => void, uploading: boolean }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring", bounce: 0.36 }}
    >
      <GlassCard sx={{ p: 4, mb: 4 }}>
        <Box sx={{ textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<UploadFileIcon />}
            component="label"
            disabled={uploading}
            sx={{
              px: 4, py: 1.7, fontWeight: 700, fontSize: "1.09rem",
              borderRadius: 3,
              boxShadow: uploading ? "0 0px 24px #2563eb33" : "0 2px 12px #2563eb22"
            }}
          >
            {uploading ? "Uploading..." : "Choose Excel or CSV File"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              hidden
              ref={inputRef}
              onChange={e => {
                if (e.target.files && e.target.files[0]) onUpload(e.target.files[0]);
              }}
              disabled={uploading}
            />
          </Button>
          {uploading && <LinearProgress sx={{ mt: 3, width: "60%", mx: "auto" }} />}
          <Typography mt={3} color="textSecondary" fontWeight={500}>
            Drag & drop or select a file (.xlsx, .xls, .csv)
          </Typography>
        </Box>
      </GlassCard>
    </motion.div>
  );
};