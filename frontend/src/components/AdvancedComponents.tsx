import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge,
  Avatar,
  Stack
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error,
  Info,
  Analytics,
  Security,
  Speed,
  AutoAwesome,
  Download,
  Visibility,
  Refresh
} from '@mui/icons-material';
import CountUp from 'react-countup';
import { api } from '../api';

interface AnomalyDetectorProps {
  anomalies: Array<{
    row_index: number;
    anomaly_score: number;
    data: Record<string, number>;
  }>;
}

interface ForecastPanelProps {
  columns: string[];
  onForecastGenerated: (forecast: any) => void;
}

interface RiskAssessmentProps {
  trends: Array<{
    column: string;
    trend_direction: string;
    trend_strength: string;
    percent_change: number;
    volatility: number;
    is_significant: boolean;
  }>;
  ratios: Record<string, number>;
}

// Anomaly Detection Component
export const AnomalyDetector: React.FC<AnomalyDetectorProps> = ({ anomalies }) => {
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const getSeverityColor = (score: number) => {
    if (score < -0.5) return 'error';
    if (score < -0.2) return 'warning';
    return 'info';
  };

  const getSeverityLabel = (score: number) => {
    if (score < -0.5) return 'High Risk';
    if (score < -0.2) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Security sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Anomaly Detection
          </Typography>
          <Badge 
            badgeContent={anomalies.length} 
            color="error" 
            sx={{ ml: 'auto' }}
          >
            <Warning />
          </Badge>
        </Box>

        {anomalies.length === 0 ? (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            <CheckCircle sx={{ mr: 1 }} />
            No anomalies detected in your data
          </Alert>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {anomalies.length} unusual data points found
            </Typography>
            
            <List dense>
              {anomalies.slice(0, 5).map((anomaly, index) => (
                <ListItemButton
                  key={index}
                  onClick={() => {
                    setSelectedAnomaly(anomaly);
                    setOpen(true);
                  }}
                  sx={{ borderRadius: 1, mb: 1 }}
                >
                  <ListItemIcon>
                    <Avatar sx={{ 
                      bgcolor: getSeverityColor(anomaly.anomaly_score) === 'error' ? 'error.main' : 
                               getSeverityColor(anomaly.anomaly_score) === 'warning' ? 'warning.main' : 'info.main',
                      width: 32,
                      height: 32
                    }}>
                      {index + 1}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={`Row ${anomaly.row_index + 1}`}
                    secondary={
                      <Box>
                        <Chip 
                          label={getSeverityLabel(anomaly.anomaly_score)}
                          size="small"
                          color={getSeverityColor(anomaly.anomaly_score)}
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Score: {anomaly.anomaly_score.toFixed(3)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              ))}
            </List>

            {anomalies.length > 5 && (
              <Button 
                size="small" 
                onClick={() => setOpen(true)}
                sx={{ mt: 1 }}
              >
                View All Anomalies
              </Button>
            )}
          </Box>
        )}

        {/* Anomaly Detail Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Warning sx={{ mr: 1, color: 'warning.main' }} />
              Anomaly Details
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedAnomaly && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Row {selectedAnomaly.row_index + 1}
                </Typography>
                
                <Alert 
                  severity={getSeverityColor(selectedAnomaly.anomaly_score)}
                  sx={{ mb: 3 }}
                >
                  Risk Level: {getSeverityLabel(selectedAnomaly.anomaly_score)}
                  <br />
                  Anomaly Score: {selectedAnomaly.anomaly_score.toFixed(4)}
                </Alert>

                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Data Values:
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {Object.entries(selectedAnomaly.data).map(([key, value]) => (
                    <Box key={key} sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '150px' }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {key}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {typeof value === 'number' ? value.toFixed(2) : String(value ?? 'N/A')}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// Forecast Panel Component
export const ForecastPanel: React.FC<ForecastPanelProps> = ({ columns, onForecastGenerated }) => {
  const [selectedColumn, setSelectedColumn] = useState('');
  const [periods, setPeriods] = useState(12);
  const [isGenerating, setIsGenerating] = useState(false);
  const [forecast, setForecast] = useState<any>(null);

  const handleGenerateForecast = async () => {
    if (!selectedColumn) return;

    setIsGenerating(true);
    try {
      const result = await api.forecast(selectedColumn, periods);
      setForecast(result);
      onForecastGenerated(result);
    } catch (error) {
      console.error('Forecast generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            AI Forecasting
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Select Column to Forecast:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {columns.map((column) => (
              <Chip
                key={column}
                label={column}
                onClick={() => setSelectedColumn(column)}
                color={selectedColumn === column ? 'primary' : 'default'}
                variant={selectedColumn === column ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Forecast Periods:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[6, 12, 24].map((period) => (
              <Chip
                key={period}
                label={`${period} periods`}
                onClick={() => setPeriods(period)}
                color={periods === period ? 'primary' : 'default'}
                variant={periods === period ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>

        <Button
          variant="contained"
          fullWidth
          onClick={handleGenerateForecast}
          disabled={!selectedColumn || isGenerating}
          startIcon={<AutoAwesome />}
          sx={{ mb: 3 }}
        >
          {isGenerating ? 'Generating...' : 'Generate Forecast'}
        </Button>

        {isGenerating && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Training ML model and generating predictions...
            </Typography>
          </Box>
        )}

        {forecast && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              Forecast Results:
            </Typography>
            
            <Paper sx={{ p: 2, mb: 2, background: '#f8f9fa' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Model Accuracy:</strong> {(forecast.model_score * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Next Value:</strong> {forecast.forecast[0]?.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                <strong>Trend:</strong> {
                  forecast.forecast[0] > forecast.forecast[forecast.forecast.length - 1] 
                    ? 'Decreasing' 
                    : 'Increasing'
                }
              </Typography>
            </Paper>

            <Button
              size="small"
              startIcon={<Download />}
              onClick={() => {
                // Download forecast data
                const dataStr = JSON.stringify(forecast, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `forecast_${selectedColumn}.json`;
                link.click();
              }}
            >
              Download Forecast
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Risk Assessment Component
export const RiskAssessment: React.FC<RiskAssessmentProps> = ({ trends, ratios }) => {
  const calculateRiskScore = () => {
    let riskScore = 0;
    let factors = 0;

    // Analyze trends
    trends.forEach(trend => {
      if (trend.is_significant) {
        factors++;
        if (trend.trend_direction === 'Decreasing' && Math.abs(trend.percent_change) > 10) {
          riskScore += 2;
        } else if (trend.volatility > 20) {
          riskScore += 1;
        }
      }
    });

    // Analyze ratios
    if (ratios.profit_margin && ratios.profit_margin < 5) {
      riskScore += 2;
      factors++;
    }
    if (ratios.debt_to_asset && ratios.debt_to_asset > 60) {
      riskScore += 2;
      factors++;
    }

    return factors > 0 ? (riskScore / factors) : 0;
  };

  const riskScore = calculateRiskScore();
  const riskLevel = riskScore > 1.5 ? 'High' : riskScore > 0.5 ? 'Medium' : 'Low';
  const riskColor = riskScore > 1.5 ? 'error' : riskScore > 0.5 ? 'warning' : 'success';

  const getRiskRecommendations = () => {
    const recommendations = [];
    
    if (riskScore > 1.5) {
      recommendations.push('Immediate attention required - multiple risk factors detected');
    }
    
    trends.forEach(trend => {
      if (trend.trend_direction === 'Decreasing' && Math.abs(trend.percent_change) > 15) {
        recommendations.push(`Monitor ${trend.column} closely - significant decline detected`);
      }
    });

    if (ratios.profit_margin && ratios.profit_margin < 5) {
      recommendations.push('Consider cost optimization strategies');
    }

    if (ratios.debt_to_asset && ratios.debt_to_asset > 60) {
      recommendations.push('Review debt management and consider equity financing');
    }

    return recommendations;
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Security sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Risk Assessment
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold', color: `${riskColor}.main` }}>
            {riskLevel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Risk Level
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={Math.min(riskScore * 33.33, 100)} 
            color={riskColor}
            sx={{ mt: 1, height: 8, borderRadius: 4 }}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
            Key Risk Factors:
          </Typography>
          
          <Stack spacing={1}>
            {trends.filter(t => t.is_significant).slice(0, 3).map((trend, index) => (
              <Paper key={index} sx={{ p: 2, background: '#f8f9fa' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {trend.column}
                  </Typography>
                  <Chip
                    label={trend.trend_direction}
                    size="small"
                    color={trend.trend_direction === 'Decreasing' ? 'error' : 'success'}
                    icon={trend.trend_direction === 'Decreasing' ? <TrendingDown /> : <TrendingUp />}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Change: {trend.percent_change > 0 ? '+' : ''}{trend.percent_change.toFixed(1)}% | 
                  Volatility: {trend.volatility.toFixed(1)}%
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Box>

        {getRiskRecommendations().length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              Recommendations:
            </Typography>
            <List dense>
              {getRiskRecommendations().map((rec, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', px: 0, mb: 1 }}>
                  <Box sx={{ mr: 2, mt: 0.5 }}>
                    <Info color="primary" fontSize="small" />
                  </Box>
                  <Typography variant="body2">
                    {rec}
                  </Typography>
                </Box>
              ))}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default { AnomalyDetector, ForecastPanel, RiskAssessment };
