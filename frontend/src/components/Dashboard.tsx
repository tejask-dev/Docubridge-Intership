import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge,
  Avatar,
  Stack,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Dashboard,
  Analytics,
  TrendingUp,
  Security,
  AutoAwesome,
  Download,
  Refresh,
  Visibility,
  Warning,
  CheckCircle,
  Error,
  Info,
  Speed,
  Assessment,
  Timeline,
  BarChart,
  PieChart,
  ShowChart,
  TableChart,
  CloudDownload,
  Share,
  Settings
} from '@mui/icons-material';
import Plot from 'react-plotly.js';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { useSpring, animated } from '@react-spring/web';
import { AnomalyDetector, ForecastPanel, RiskAssessment } from './AdvancedComponents';
import { api } from '../api';

interface DashboardProps {
  analysisData: any;
  charts: any[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const DashboardComponent: React.FC<DashboardProps> = ({ 
  analysisData, 
  charts, 
  onRefresh, 
  isRefreshing 
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedChart, setSelectedChart] = useState<any>(null);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');

  const { ref: dashboardRef, inView: dashboardInView } = useInView({ threshold: 0.1 });

  const dashboardSpring = useSpring({
    opacity: dashboardInView ? 1 : 0,
    transform: dashboardInView ? 'translateY(0px)' : 'translateY(30px)',
    config: { tension: 300, friction: 30 }
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleChartClick = async (chartId: string) => {
    try {
      const chartData = await api.getChart(chartId);
      setSelectedChart(chartData);
      setChartDialogOpen(true);
    } catch (error) {
      console.error('Failed to load chart:', error);
    }
  };

  const handleExport = async (format: string) => {
    try {
      // This would integrate with a backend export service
      const exportData = {
        analysis: analysisData,
        charts: charts,
        timestamp: new Date().toISOString(),
        format: format
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `docubridge-analysis-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const renderOverviewTab = () => (
    <Box>
      {/* Key Metrics */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {[
          {
            title: 'Data Quality Score',
            value: 100 - (analysisData?.summary_stats?.missing_data_percentage || 0),
            suffix: '%',
            icon: <CheckCircle />,
            color: '#4caf50',
            trend: '+2.3%'
          },
          {
            title: 'Trends Identified',
            value: analysisData?.trends?.length || 0,
            icon: <TrendingUp />,
            color: '#2196f3',
            trend: 'Active'
          },
          {
            title: 'Anomalies Found',
            value: analysisData?.anomalies?.length || 0,
            icon: <Warning />,
            color: '#ff9800',
            trend: analysisData?.anomalies?.length > 0 ? 'Needs Review' : 'Clean'
          },
          {
            title: 'Risk Level',
            value: analysisData?.trends?.filter((t: any) => t.is_significant && t.trend_direction === 'Decreasing').length > 2 ? 'High' : 'Low',
            icon: <Security />,
            color: analysisData?.trends?.filter((t: any) => t.is_significant && t.trend_direction === 'Decreasing').length > 2 ? '#f44336' : '#4caf50',
            trend: 'Monitor'
          }
        ].map((metric, index) => (
          <Box key={index} sx={{ flex: '1 1 calc(25% - 24px)', minWidth: '250px' }}>
            <animated.div style={dashboardSpring}>
              <Card sx={{ 
                height: '100%',
                background: `linear-gradient(135deg, ${metric.color}15 0%, ${metric.color}05 100%)`,
                border: `1px solid ${metric.color}30`
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Avatar sx={{ bgcolor: metric.color, width: 48, height: 48 }}>
                      {metric.icon}
                    </Avatar>
                    <Chip 
                      label={metric.trend} 
                      size="small" 
                      sx={{ 
                        bgcolor: `${metric.color}20`,
                        color: metric.color,
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: metric.color, mb: 1 }}>
                    {typeof metric.value === 'number' ? (
                      <CountUp end={metric.value} duration={2} suffix={metric.suffix || ''} />
                    ) : (
                      metric.value
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {metric.title}
                  </Typography>
                </CardContent>
              </Card>
            </animated.div>
          </Box>
        ))}
      </Box>

      {/* Quick Actions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
            <Dashboard sx={{ mr: 1, verticalAlign: 'middle' }} />
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {[
              { label: 'Generate Forecast', icon: <AutoAwesome />, action: () => setTabValue(2) },
              { label: 'Export Report', icon: <Download />, action: () => handleExport('pdf') },
              { label: 'Share Analysis', icon: <Share />, action: () => console.log('Share') },
              { label: 'Settings', icon: <Settings />, action: () => console.log('Settings') }
            ].map((action, index) => (
              <Box key={index} sx={{ flex: '1 1 calc(25% - 16px)', minWidth: '150px' }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={action.icon}
                  onClick={action.action}
                  sx={{ py: 2 }}
                >
                  {action.label}
                </Button>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Recent Trends */}
      {analysisData?.trends && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              <Timeline sx={{ mr: 1, verticalAlign: 'middle' }} />
              Recent Trends
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {analysisData.trends.slice(0, 6).map((trend: any, index: number) => (
                <Box key={index} sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' }}>
                  <Paper sx={{ 
                    p: 2, 
                    background: trend.is_significant 
                      ? 'linear-gradient(45deg, #e3f2fd 0%, #bbdefb 100%)'
                      : 'linear-gradient(45deg, #f3e5f5 0%, #e1bee7 100%)',
                    border: `1px solid ${trend.is_significant ? '#2196f3' : '#9c27b0'}30`
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {trend.column}
                      </Typography>
                      <Chip
                        label={trend.trend_strength}
                        size="small"
                        color={trend.trend_strength === 'Strong' ? 'primary' : 'default'}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {trend.trend_direction}
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 'bold',
                      color: trend.percent_change > 0 ? '#4caf50' : '#f44336'
                    }}>
                      {trend.percent_change > 0 ? '+' : ''}{trend.percent_change.toFixed(1)}%
                    </Typography>
                  </Paper>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  const renderChartsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          <BarChart sx={{ mr: 1, verticalAlign: 'middle' }} />
          Interactive Charts
        </Typography>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={realTimeMode}
                onChange={(e) => setRealTimeMode(e.target.checked)}
                color="primary"
              />
            }
            label="Real-time Updates"
          />
        </Box>
      </Box>

      {charts.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Info sx={{ mr: 1 }} />
          No charts available. Upload a file and run analysis to generate charts.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {charts.map((chart, index) => (
            <Box key={chart.id} sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
              <Card sx={{ height: 500 }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {chart.title}
                    </Typography>
                    <Box>
                      <Tooltip title="View Full Screen">
                        <IconButton 
                          size="small" 
                          onClick={() => handleChartClick(chart.id)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download Chart">
                        <IconButton size="small">
                          <CloudDownload />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  
                  <Box sx={{ flexGrow: 1, minHeight: 400 }}>
                    <ChartRenderer chartId={chart.id} />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );

  const renderAdvancedTab = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      <Box sx={{ flex: '1 1 calc(33.333% - 24px)', minWidth: '300px' }}>
        <AnomalyDetector anomalies={analysisData?.anomalies || []} />
      </Box>
      <Box sx={{ flex: '1 1 calc(33.333% - 24px)', minWidth: '300px' }}>
        <ForecastPanel 
          columns={analysisData?.numeric_columns || []}
          onForecastGenerated={(forecast) => console.log('Forecast generated:', forecast)}
        />
      </Box>
      <Box sx={{ flex: '1 1 calc(33.333% - 24px)', minWidth: '300px' }}>
        <RiskAssessment 
          trends={analysisData?.trends || []}
          ratios={analysisData?.ratios || {}}
        />
      </Box>
    </Box>
  );

  const renderDataTab = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
        <TableChart sx={{ mr: 1, verticalAlign: 'middle' }} />
        Data Summary
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Dataset Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Total Rows" 
                    secondary={analysisData?.summary_stats?.total_rows || 0}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Total Columns" 
                    secondary={analysisData?.summary_stats?.total_columns || 0}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Numeric Columns" 
                    secondary={analysisData?.summary_stats?.numeric_columns || 0}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Missing Data" 
                    secondary={`${(analysisData?.summary_stats?.missing_data_percentage || 0).toFixed(1)}%`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Financial Ratios
              </Typography>
              {analysisData?.ratios ? (
                <List dense>
                  {Object.entries(analysisData.ratios).map(([key, value]) => (
                    <ListItem key={key}>
                      <ListItemText 
                        primary={key.replace(/_/g, ' ').toUpperCase()} 
                        secondary={typeof value === 'number' ? value.toFixed(2) : String(value ?? 'N/A')}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">No financial ratios calculated</Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} ref={dashboardRef}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
            Financial Analysis Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive insights and AI-powered analysis
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Refresh Analysis">
            <IconButton 
              onClick={onRefresh} 
              disabled={isRefreshing}
              sx={{ 
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              <Refresh className={isRefreshing ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
            <Tab 
              icon={<Dashboard />} 
              label="Overview" 
              iconPosition="start"
            />
            <Tab 
              icon={<BarChart />} 
              label="Charts" 
              iconPosition="start"
            />
            <Tab 
              icon={<AutoAwesome />} 
              label="AI Features" 
              iconPosition="start"
            />
            <Tab 
              icon={<TableChart />} 
              label="Data" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {renderOverviewTab()}
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          {renderChartsTab()}
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          {renderAdvancedTab()}
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          {renderDataTab()}
        </TabPanel>
      </Card>

      {/* Chart Dialog */}
      <Dialog 
        open={chartDialogOpen} 
        onClose={() => setChartDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Chart Details</Typography>
            <Box>
              <Tooltip title="Download">
                <IconButton>
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedChart && (
            <Box sx={{ height: 600 }}>
              <Plot
                data={selectedChart.data}
                layout={{
                  ...selectedChart.layout,
                  height: 600,
                  autosize: true
                }}
                style={{ width: '100%', height: '100%' }}
                config={{ responsive: true, displayModeBar: true }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChartDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Chart Renderer Component
const ChartRenderer: React.FC<{ chartId: string }> = ({ chartId }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        const response = await api.getChart(chartId);
        setChartData(response);
      } catch (error) {
        console.error('Chart fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, [chartId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <LinearProgress sx={{ width: '100%' }} />
      </Box>
    );
  }

  if (!chartData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Typography color="error">Failed to load chart</Typography>
      </Box>
    );
  }

  return (
    <Plot
      data={chartData.data}
      layout={chartData.layout}
      style={{ width: '100%', height: '100%' }}
      config={{ responsive: true, displayModeBar: true }}
    />
  );
};

export default DashboardComponent;
