import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Download,
  Visibility,
  Close,
  BarChart,
  ShowChart,
  ScatterPlot,
  Timeline
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';

interface Chart {
  id: string;
  title: string;
  type: string;
  data: any;
  created_at: string;
}

interface GraphGalleryProps {
  isVisible: boolean;
}

const GraphGallery: React.FC<GraphGalleryProps> = ({ isVisible }) => {
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCharts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get chart history from session
      const historyResponse = await api.getHistory();
      const chartIds = historyResponse.history?.chart_images || [];
      
      // Load each chart
      const chartPromises = chartIds.map(async (chartId: string) => {
        try {
          const chartData = await api.getChart(chartId);
          return {
            id: chartId,
            title: chartData.layout?.title?.text || `Chart ${chartId}`,
            type: getChartType(chartData),
            data: chartData,
            created_at: new Date().toISOString()
          };
        } catch (err) {
          console.error(`Failed to load chart ${chartId}:`, err);
          return null;
        }
      });
      
      const loadedCharts = (await Promise.all(chartPromises)).filter(Boolean) as Chart[];
      setCharts(loadedCharts);
    } catch (err: any) {
      setError('Failed to load charts');
      console.error('Error loading charts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      loadCharts();
    }
  }, [isVisible, loadCharts]);

  const getChartType = (chartData: any): string => {
    if (chartData.data?.[0]?.type) {
      const type = chartData.data[0].type;
      switch (type) {
        case 'scatter': return 'scatter';
        case 'bar': return 'bar';
        case 'line': return 'line';
        case 'histogram': return 'histogram';
        default: return 'chart';
      }
    }
    return 'chart';
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'line': return <ShowChart />;
      case 'bar': return <BarChart />;
      case 'scatter': return <ScatterPlot />;
      case 'histogram': return <Timeline />;
      default: return <BarChart />;
    }
  };

  const handlePreview = (chart: Chart) => {
    setSelectedChart(chart);
    setPreviewOpen(true);
  };

  const handleDownload = async (chart: Chart) => {
    try {
      const blob = await api.downloadChart(chart.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setSelectedChart(null);
  };

  if (!isVisible) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a202c' }}>
          Graph Gallery
        </Typography>
        <Button
          variant="outlined"
          onClick={loadCharts}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <Download />}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : charts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <BarChart sx={{ fontSize: 64, color: '#cbd5e0', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#4a5568', mb: 1 }}>
            No Charts Generated Yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#718096' }}>
            Generate charts by asking the AI to create visualizations of your data.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: { xs: 2, sm: 3 },
          px: { xs: 1, sm: 0 }
        }}>
          <AnimatePresence>
            {charts.map((chart, index) => (
              <Box 
                key={chart.id} 
                sx={{ 
                  flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 24px)' }, 
                  minWidth: { xs: '100%', sm: '280px', md: '300px' },
                  maxWidth: { xs: '100%', md: 'none' }
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ color: '#667eea', mr: 1 }}>
                          {getChartIcon(chart.type)}
                        </Box>
                        <Chip
                          label={chart.type.toUpperCase()}
                          size="small"
                          sx={{ bgcolor: '#667eea', color: 'white' }}
                        />
                      </Box>
                      
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1a202c' }}>
                        {chart.title}
                      </Typography>
                      
                      <Typography variant="body2" sx={{ color: '#718096', mb: 2 }}>
                        Created: {new Date(chart.created_at).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                    
                    <Box sx={{ 
                      p: 2, 
                      pt: 0, 
                      display: 'flex', 
                      gap: 1,
                      flexDirection: { xs: 'column', sm: 'row' }
                    }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => handlePreview(chart)}
                        sx={{ 
                          flex: 1,
                          minHeight: { xs: '44px', sm: 'auto' }
                        }}
                      >
                        Preview
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Download />}
                        onClick={() => handleDownload(chart)}
                        sx={{ 
                          flex: 1,
                          bgcolor: '#667eea',
                          '&:hover': { bgcolor: '#5a67d8' },
                          minHeight: { xs: '44px', sm: 'auto' }
                        }}
                      >
                        Download
                      </Button>
                    </Box>
                  </Card>
                </motion.div>
              </Box>
            ))}
          </AnimatePresence>
        </Box>
      )}

      {/* Chart Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {selectedChart?.title}
          </Typography>
          <IconButton onClick={handleClosePreview}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          {selectedChart && (
            <Box sx={{ 
              height: { xs: 300, sm: 400, md: 500 }, 
              width: '100%' 
            }}>
              {/* Chart preview would go here - you can integrate with Plotly or another charting library */}
              <Box sx={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: '#f8f9fa',
                borderRadius: 2,
                border: '2px dashed #e2e8f0'
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  {getChartIcon(selectedChart.type)}
                  <Typography variant="h6" sx={{ mt: 1, color: '#4a5568' }}>
                    Chart Preview
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#718096' }}>
                    Chart data is available for download
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => selectedChart && handleDownload(selectedChart)}
            sx={{ bgcolor: '#667eea' }}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GraphGallery;
