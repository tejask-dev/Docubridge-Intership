import React from 'react';
import { CircularProgress, Box } from '@mui/material';
import { keyframes } from "@emotion/react";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const LoadingSpinner = ({ text = "Loading..." }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 2, py: 2, animation: `${fadeIn} 1s ease`
  }}>
    <CircularProgress color="success" />
    <span style={{ fontWeight: 500 }}>{text}</span>
  </Box>
);