import React from 'react';
import { Box, Select, MenuItem, InputLabel, FormControl } from "@mui/material";

interface Props {
  sheets: string[];
  selected: string;
  onChange: (sheet: string) => void;
}

export const SheetSelect: React.FC<Props> = ({ sheets, selected, onChange }) => (
  <Box sx={{ maxWidth: 300, mx: 'auto', mb: 2 }}>
    <FormControl fullWidth>
      <InputLabel id="sheet-select-label">Worksheet</InputLabel>
      <Select
        id="sheet-select"
        label="Worksheet"
        value={selected}
        onChange={e => onChange(e.target.value)}
        sx={{ mb: 2 }}
      >
        {sheets.map(sheet => (
          <MenuItem key={sheet} value={sheet}>{sheet}</MenuItem>
        ))}
      </Select>
    </FormControl>
  </Box>
);