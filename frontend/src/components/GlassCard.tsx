import { Card, CardProps } from "@mui/material";

const GlassCard = (props: CardProps) => (
  <Card
    elevation={8}
    sx={{
      backdropFilter: "blur(8px)",
      background: "rgba(255,255,255,0.88)",
      borderRadius: 5,
      boxShadow: "0 8px 32px 0 rgba(37,99,235,.13), 0 2px 8px rgba(37,99,235,.08)",
      ...props.sx
    }}
    {...props}
  />
);
export default GlassCard;