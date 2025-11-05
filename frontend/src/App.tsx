import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Grid,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Fade,
  Zoom,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  CloudUpload, 
  Analytics,
  TrendingUp, 
  Security, 
  Speed,
  AutoAwesome,
  Download,
  Refresh,
  Info,
  CheckCircle,
  Warning,
  Error,
  Menu,
  BarChart
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import Plot from 'react-plotly.js';
import toast, { Toaster } from 'react-hot-toast';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { useSpring, animated } from '@react-spring/web';
import styled from 'styled-components';
import { api } from './api';
import AIChat from './components/AIChat';
import GraphGallery from './components/GraphGallery';

// Styled Components
const HeroSection = styled(Box)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.3;
  }
`;

const GlassCard = styled(Card)`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
`;

const AnimatedCard = styled(motion.div)`
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.1);
  overflow: hidden;
`;

const DropZone = styled(Box)`
  border: 3px dashed #764ba2;
  border-radius: 24px;
  padding: 60px 40px;
  text-align: center;
  background: rgba(118, 75, 162, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    background: rgba(102, 126, 234, 0.1);
    border-color: #667eea;
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(102, 126, 234, 0.3);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover::before {
    left: 100%;
  }
`;

const MetricCard = styled(animated.div)`
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1), 0 2px 16px rgba(0, 0, 0, 0.05);
  text-align: center;
  border: 1px solid rgba(102, 126, 234, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(102, 126, 234, 0.2);
  }
`;

const ChartContainer = styled(Box)`
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.1);
  margin: 16px 0;
  
  h6 {
    color: #1a202c;
    font-weight: 600;
  }
`;

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { duration: 0.5 }
};

interface AnalysisData {
  summary_stats: {
    total_rows: number;
    total_columns: number;
    numeric_columns: number;
    missing_data_percentage: number;
  };
  trends: Array<{
    column: string;
    trend_direction: string;
    trend_strength: string;
    percent_change: number;
    is_significant: boolean;
  }>;
  ratios: Record<string, number>;
  anomalies: Array<{
    row_index: number;
    anomaly_score: number;
  }>;
}

interface ChartData {
  id: string;
  type: string;
  title: string;
  column?: string;
}

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null); // Store file_id from upload
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [history, setHistory] = useState<Array<{question: string, answer: string}>>([]);
  const [currentView, setCurrentView] = useState<'upload' | 'ai_chat' | 'gallery'>('upload');
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const { ref: heroRef, inView: heroInView } = useInView({ threshold: 0.1 });
  const { ref: metricsRef, inView: metricsInView } = useInView({ threshold: 0.3 });

  // Spring animations
  const heroSpring = useSpring({
    opacity: heroInView ? 1 : 0,
    transform: heroInView ? 'translateY(0px)' : 'translateY(30px)',
    config: { tension: 300, friction: 30 }
  });

  const metricsSpring = useSpring({
    opacity: metricsInView ? 1 : 0,
    transform: metricsInView ? 'translateY(0px)' : 'translateY(50px)',
    config: { tension: 200, friction: 25 }
  });

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.uploadFile(formData);
      
      if (response.sheet_names) {
        setSheetNames(response.sheet_names);
        setSelectedSheet(response.sheet_names[0]);
      }

      // Store file_id for stateless requests
      if (response.file_id) {
        setFileId(response.file_id);
      }

      toast.success('File uploaded successfully!');
      
      // Auto-analyze after upload, passing file_id
      setTimeout(() => {
        handleAnalyze(response.file_id, response.sheet_names?.[0]);
      }, 1000);

    } catch (error) {
      toast.error('Upload failed. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleAnalyze = async (fileIdParam?: string, sheetNameParam?: string) => {
    // Use passed params or state
    // Ensure we only use string values (not event objects accidentally passed)
    const idToUse = (fileIdParam && typeof fileIdParam === 'string') ? fileIdParam : fileId;
    const sheetToUse = (sheetNameParam && typeof sheetNameParam === 'string') ? sheetNameParam : selectedSheet;
    
    if (!file && !idToUse) return;

    setIsAnalyzing(true);
    try {
      const response = await api.analyze(idToUse || undefined, sheetToUse || undefined);
      setAnalysisData(response.analysis);
      setCharts(response.charts);
      toast.success('Analysis completed!');
    } catch (error) {
      toast.error('Analysis failed. Please try again.');
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setIsAsking(true);
    try {
      const response = await api.askQuestion(question);
      setAnswer(response.answer);
      setHistory(prev => [...prev, { question, answer: response.answer }]);
      setQuestion('');
      toast.success('Question answered!');
    } catch (error) {
      toast.error('Failed to get answer. Please try again.');
      console.error('Q&A error:', error);
    } finally {
      setIsAsking(false);
    }
  };

  const handleReset = async () => {
    try {
      await api.reset();
      setFile(null);
      setAnalysisData(null);
      setCharts([]);
      setSheetNames([]);
      setSelectedSheet('');
      setAnswer('');
      setHistory([]);
      toast.success('Session reset successfully!');
    } catch (error) {
      toast.error('Reset failed. Please refresh the page.');
    }
  };

  const renderMetrics = () => {
    if (!analysisData) return null;

    const metrics = [
      {
        label: 'Total Rows',
        value: analysisData.summary_stats.total_rows,
        icon: <Analytics />,
        color: '#667eea'
      },
      {
        label: 'Data Columns',
        value: analysisData.summary_stats.total_columns,
        icon: <TrendingUp />,
        color: '#764ba2'
      },
      {
        label: 'Numeric Fields',
        value: analysisData.summary_stats.numeric_columns,
        icon: <Speed />,
        color: '#f093fb'
      },
      {
        label: 'Data Quality',
        value: 100 - analysisData.summary_stats.missing_data_percentage,
        suffix: '%',
        icon: <Security />,
        color: '#4facfe'
      }
    ];

    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 0 }
        }} 
        ref={metricsRef}
      >
        {metrics.map((metric, index) => (
          <Box 
            key={index} 
            sx={{ 
              flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 24px)' }, 
              minWidth: { xs: '140px', sm: '200px', md: '250px' },
              maxWidth: { xs: '100%', md: 'none' }
            }}
          >
            <MetricCard style={metricsSpring}>
              <Box sx={{ color: metric.color, mb: { xs: 1.5, md: 2 }, fontSize: { xs: 32, md: 40 } }}>
                {metric.icon}
              </Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold', 
                  mb: 1,
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                }}
              >
                <CountUp 
                  end={metric.value} 
                  duration={2}
                  suffix={metric.suffix || ''}
                />
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                {metric.label}
              </Typography>
            </MetricCard>
          </Box>
        ))}
      </Box>
    );
  };

  const renderTrends = () => {
    if (!analysisData?.trends) return null;

    return (
      <AnimatedCard {...fadeInUp}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', color: '#1a202c' }}>
            <TrendingUp sx={{ mr: 1, verticalAlign: 'middle', color: '#667eea' }} />
            Key Trends
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {analysisData.trends.slice(0, 6).map((trend, index) => (
              <Box key={index} sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' }}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    background: trend.is_significant 
                      ? 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)'
                      : 'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {trend.column}
                  </Typography>
                  <Typography variant="body2">
                    {trend.trend_direction} ({trend.trend_strength})
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {trend.percent_change > 0 ? '+' : ''}{trend.percent_change.toFixed(1)}%
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Box>
        </CardContent>
      </AnimatedCard>
    );
  };

  const renderCharts = () => {
    if (charts.length === 0) return null;

    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#1a202c' }}>
          <Analytics sx={{ mr: 1, verticalAlign: 'middle', color: '#667eea' }} />
          Interactive Charts
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {charts.map((chart, index) => (
            <Box key={chart.id} sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
              <ChartContainer>
                <Typography variant="h6" sx={{ mb: 2, color: '#1a202c', fontWeight: 600 }}>
                  {chart.title}
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ChartRenderer chartId={chart.id} />
                </Box>
              </ChartContainer>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Toaster position="top-right" />
      
      {/* Navigation Bar */}
      <AppBar position="sticky" sx={{ 
        background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <Menu />
          </IconButton>
          
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            DocuBridge AI
          </Typography>
          
          {file && (
            <Button
              color="inherit"
              startIcon={<AutoAwesome />}
              onClick={() => setCurrentView('ai_chat')}
              sx={{ ml: 2 }}
            >
              Talk to AI
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: 280, sm: 300 },
            backgroundColor: '#ffffff'
          }
        }}
      >
        <Box sx={{ width: '100%', pt: 2 }}>
          <Typography variant="h6" sx={{ px: 2, mb: 2, fontWeight: 'bold' }}>
            Navigation
          </Typography>
          <List>
            <ListItemButton onClick={() => { setCurrentView('upload'); setDrawerOpen(false); }}>
              <ListItemIcon><CloudUpload /></ListItemIcon>
              <ListItemText primary="Upload File" />
            </ListItemButton>
            {file && (
              <>
                <ListItemButton onClick={() => { setCurrentView('ai_chat'); setDrawerOpen(false); }}>
                  <ListItemIcon><AutoAwesome /></ListItemIcon>
                  <ListItemText primary="Talk to AI" />
                </ListItemButton>
                <ListItemButton onClick={() => { setCurrentView('gallery'); setDrawerOpen(false); }}>
                  <ListItemIcon><BarChart /></ListItemIcon>
                  <ListItemText primary="Graph Gallery" />
                </ListItemButton>
              </>
            )}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      {currentView === 'upload' ? (
        <>
          {/* Hero Section */}
          <HeroSection ref={heroRef}>
            <Container maxWidth="lg">
              <animated.div style={heroSpring}>
                <Box sx={{ textAlign: 'center', color: 'white', py: 8 }}>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, type: "spring" }}
                  >
                    <Typography 
                      variant="h1" 
                      sx={{ 
                        fontWeight: 800, 
                        mb: 2,
                        fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem', lg: '4rem' },
                        background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #ffffff 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        letterSpacing: '-0.02em',
                        px: { xs: 2, sm: 0 }
                      }}
                    >
                      🚀 DocuBridge AI
                    </Typography>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        mb: 4, 
                        opacity: 0.95, 
                        fontWeight: 400, 
                        fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.3rem', lg: '1.5rem' },
                        px: { xs: 2, sm: 0 }
                      }}
                    >
                      Advanced Financial Analysis & AI-Powered Insights
                    </Typography>
                  </motion.div>

                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  >
                    <GlassCard sx={{ 
                      maxWidth: 700, 
                      mx: { xs: 2, sm: 'auto' },
                      p: { xs: 3, sm: 4, md: 5 }
                    }}>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          mb: { xs: 3, md: 4 }, 
                          color: '#667eea', 
                          fontWeight: 700, 
                          textAlign: 'center',
                          fontSize: { xs: '1.25rem', sm: '1.5rem' }
                        }}
                      >
                        Upload Your Financial Data
                      </Typography>
                      
                      <motion.div
                        animate={isDragActive ? { scale: 1.02 } : { scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <DropZone {...getRootProps()} sx={{ 
                          borderColor: isDragActive ? '#667eea' : '#764ba2',
                          background: isDragActive ? 'rgba(102, 126, 234, 0.1)' : 'rgba(118, 75, 162, 0.05)',
                          transform: isDragActive ? 'scale(1.02)' : 'scale(1)',
                          padding: { xs: '40px 20px', sm: '50px 30px', md: '60px 40px' },
                          minHeight: { xs: '200px', sm: '250px' }
                        }}>
                          <input {...getInputProps()} />
                          <CloudUpload sx={{ 
                            fontSize: { xs: 48, sm: 60, md: 72 }, 
                            color: '#667eea', 
                            mb: { xs: 2, md: 3 } 
                          }} />
                          <Typography 
                            variant="h5" 
                            sx={{ 
                              color: '#1a202c', 
                              mb: 2, 
                              fontWeight: 600,
                              fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
                              px: { xs: 1, sm: 0 }
                            }}
                          >
                            {isDragActive ? '📁 Drop your file here!' : '📊 Upload Your Financial Data'}
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              color: '#4a5568', 
                              mb: 1, 
                              fontWeight: 500,
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                              px: { xs: 1, sm: 0 }
                            }}
                          >
                            Drag & drop your Excel (.xlsx, .xls) or CSV file
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#718096',
                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                              px: { xs: 1, sm: 0 }
                            }}
                          >
                            Supports files up to 50MB • Secure & Fast Analysis
                          </Typography>
                        </DropZone>
                      </motion.div>

                      {isUploading && (
                        <Box sx={{ mt: 3 }}>
                          <LinearProgress sx={{ borderRadius: 2, height: 6 }} />
                          <Typography variant="body2" sx={{ mt: 2, color: '#4a5568', textAlign: 'center' }}>
                            Uploading and analyzing...
                          </Typography>
                        </Box>
                      )}
                    </GlassCard>
                  </motion.div>
                </Box>
              </animated.div>
            </Container>
          </HeroSection>

          {/* Upload Results */}
          <Container maxWidth="lg" sx={{ py: 6 }}>
            <AnimatePresence>
              {file && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ duration: 0.6 }}
                >
                  {/* File Info */}
                  <Box sx={{ mb: 4 }}>
                    <AnimatedCard {...scaleIn}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between', 
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: { xs: 2, sm: 0 }
                      }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 'bold', 
                              color: '#1a202c', 
                              mb: 0.5,
                              fontSize: { xs: '1rem', sm: '1.25rem' },
                              wordBreak: 'break-word'
                            }}
                          >
                            {file.name}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#718096',
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}
                          >
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 1,
                          width: { xs: '100%', sm: 'auto' },
                          flexDirection: { xs: 'column', sm: 'row' }
                        }}>
                          <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={handleReset}
                            fullWidth={true}
                            sx={{ 
                              minHeight: { xs: '44px', sm: 'auto' },
                              fontSize: { xs: '0.875rem', sm: '1rem' }
                            }}
                          >
                            Reset
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<Analytics />}
                            onClick={() => handleAnalyze()}
                            disabled={isAnalyzing}
                            fullWidth={true}
                            sx={{ 
                              background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                              '&:hover': {
                                background: 'linear-gradient(45deg, #764ba2 0%, #667eea 100%)'
                              },
                              minHeight: { xs: '44px', sm: 'auto' },
                              fontSize: { xs: '0.875rem', sm: '1rem' }
                            }}
                          >
                            {isAnalyzing ? 'Analyzing...' : 'Analyze Data'}
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                    </AnimatedCard>
                  </Box>

                  {/* Talk to AI Button */}
                  {analysisData && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.8 }}
                    >
                      <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<AutoAwesome />}
                          onClick={() => setCurrentView('ai_chat')}
                          sx={{ 
                            background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                            px: { xs: 4, sm: 6 },
                            py: { xs: 1.5, sm: 2 },
                            fontSize: { xs: '0.95rem', sm: '1.1rem' },
                            minHeight: { xs: '48px', sm: 'auto' },
                            width: { xs: '100%', sm: 'auto' },
                            maxWidth: { xs: '100%', sm: 'none' }
                          }}
                        >
                          Talk to AI About Your Data
                        </Button>
                      </Box>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Container>
        </>
      ) : currentView === 'ai_chat' ? (
        /* AI Chat View */
        <Container 
          maxWidth="lg" 
          sx={{ 
            py: { xs: 2, sm: 4 },
            px: { xs: 1, sm: 3 },
            height: { xs: 'calc(100vh - 64px)', sm: 'auto' },
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <AIChat 
              isVisible={true} 
              onShowGallery={() => setCurrentView('gallery')}
              fileId={fileId}
            />
          </Box>
        </Container>
      ) : (
        /* Graph Gallery View */
        <GraphGallery isVisible={true} />
      )}
    </Box>
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
      layout={{
        ...chartData.layout,
        autosize: true,
        responsive: true,
        font: { size: 12 }
      }}
      style={{ width: '100%', height: '100%', minHeight: '300px' }}
      config={{ 
        responsive: true, 
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
          format: 'png',
          filename: 'chart',
          height: 500,
          width: 700,
          scale: 1
        }
      }}
      useResizeHandler={true}
    />
  );
};

export default App;