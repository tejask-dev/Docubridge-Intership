import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  IconButton,
  Paper,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  AutoGraph,
  Refresh,
  Download,
  PhotoLibrary
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { api } from '../api';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  chartSuggestion?: any;
  generatedChart?: {
    chart_id: string;
    chart_data: any;
    config: any;
  };
}

interface AIChatProps {
  isVisible: boolean;
  onShowGallery?: () => void;
  fileId?: string | null;
}

// Format backend response text for better readability
const formatResponseText = (text: string): string => {
  if (!text) return '';
  
  // Clean up the text
  let formatted = text
    .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
    .replace(/^\n+/, '') // Remove leading newlines
    .replace(/\n+$/, ''); // Remove trailing newlines
  
  return formatted;
};

const AIChat: React.FC<AIChatProps> = ({ isVisible, onShowGallery, fileId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending request to backend...');
      let response = await api.aiChat(inputValue, fileId || undefined);
      console.log('=== FULL RESPONSE DEBUG ===');
      console.log('AI Chat Response (raw):', response);
      console.log('Response type:', typeof response);
      console.log('=== END DEBUG ===');

      // The API client should have already parsed the JSON, but double-check
      if (typeof response === 'string') {
        try {
          console.log('⚠ Response is a string, attempting to parse JSON...');
          // Clean any NaN values before parsing
          const cleanedString = response.replace(/:\s*NaN/g, ': null').replace(/,\s*NaN/g, ', null');
          response = JSON.parse(cleanedString);
          console.log('✓ Successfully parsed JSON string');
          console.log('Parsed response type:', typeof response);
          console.log('Parsed response keys:', Object.keys(response || {}));
        } catch (parseError) {
          console.error('✗ Failed to parse response as JSON:', parseError);
          setError('Failed to parse response from server. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      // Extract the answer field from the response
      // Backend returns: { answer: "...", chart_suggestion: null, data_info: {...} }
      let answerText = '';
      
      if (response && typeof response === 'object') {
        // Primary: response.answer (the main field from backend)
        if (response.answer && typeof response.answer === 'string') {
          answerText = response.answer;
          console.log('✓ Extracted answer from response.answer');
        } 
        // Fallback: response.message
        else if (response.message && typeof response.message === 'string') {
          answerText = response.message;
          console.log('✓ Extracted answer from response.message');
        }
        // Fallback: nested response.data.answer
        else if (response.data?.answer && typeof response.data.answer === 'string') {
          answerText = response.data.answer;
          console.log('✓ Extracted answer from response.data.answer');
        }
        // Fallback: response.data.message
        else if (response.data?.message && typeof response.data.message === 'string') {
          answerText = response.data.message;
          console.log('✓ Extracted answer from response.data.message');
        }
        // If response is an object but no answer found, show error
        else {
          console.error('✗ Could not find answer field in response structure');
          console.error('Response structure:', JSON.stringify(response, null, 2));
          answerText = 'Sorry, I received a response but couldn\'t extract the answer. Please try again.';
        }
      } 
      // If response is null/undefined
      else {
        console.error('✗ Invalid response type:', typeof response);
        answerText = 'No response received from the AI. Please try again.';
      }

      // Ensure we have valid text to display
      if (!answerText || answerText.trim().length === 0) {
        console.error('✗ Answer text is empty after extraction');
        answerText = 'Received an empty response. Please try asking again.';
      }

      console.log('Final answer text length:', answerText.length);
      console.log('Final answer preview:', answerText.substring(0, 150) + '...');

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: formatResponseText(answerText),
        isUser: false,
        timestamp: new Date(),
        chartSuggestion: response?.chart_suggestion || response?.data?.chart_suggestion,
        generatedChart: response?.generated_chart || response?.data?.generated_chart
      };

      console.log('✓ AI Message created with text length:', aiMessage.text.length);
      if (aiMessage.generatedChart) {
        console.log('✓ Generated chart included:', aiMessage.generatedChart.chart_id);
      }
      
      // Update messages state
      setMessages(prev => [...prev, aiMessage]);
      
      // If a chart was generated, trigger gallery refresh notification
      if (aiMessage.generatedChart && onShowGallery) {
        // Optionally show a notification or automatically navigate to gallery
        console.log('Chart generated! User can view it in the gallery.');
      }
    } catch (err: any) {
      console.error('API Error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateChart = async (chartSuggestion: any) => {
    try {
      setIsLoading(true);
      const response = await api.generateCustomChart(chartSuggestion);

      if (response.chart_id) {
        // Add a message about chart generation
        const chartMessage: Message = {
          id: Date.now().toString(),
          text: `I've generated a ${chartSuggestion.type} chart for you: "${chartSuggestion.title}"`,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, chartMessage]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate chart');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const springProps = useSpring({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0px)' : 'translateY(20px)',
    config: { tension: 300, friction: 30 }
  });

  if (!isVisible) return null;

  return (
    <animated.div style={springProps}>
      <Card sx={{ 
        height: { xs: 'calc(100vh - 80px)', sm: '100%' }, 
        display: 'flex', 
        flexDirection: 'column',
        maxHeight: { xs: '100%', sm: 'none' }
      }}>
        <CardContent sx={{ 
          p: 0, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <Box sx={{ 
            p: { xs: 2, sm: 3 }, 
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: '#667eea', mr: 2 }}>
                  <SmartToy />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a202c' }}>
                    AI Data Assistant
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#718096' }}>
                    Ask questions about your data
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 0.5, sm: 1 },
                flexWrap: 'wrap'
              }}>
                {onShowGallery && (
                  <IconButton 
                    onClick={onShowGallery} 
                    size="small" 
                    title="View Graph Gallery"
                    sx={{ 
                      minWidth: { xs: '44px', sm: 'auto' },
                      minHeight: { xs: '44px', sm: 'auto' }
                    }}
                  >
                    <PhotoLibrary />
                  </IconButton>
                )}
                <IconButton 
                  onClick={clearChat} 
                  size="small" 
                  title="Clear Chat"
                  sx={{ 
                    minWidth: { xs: '44px', sm: 'auto' },
                    minHeight: { xs: '44px', sm: 'auto' }
                  }}
                >
                  <Refresh />
                </IconButton>
              </Box>
            </Box>
          </Box>

          {/* Messages */}
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto', 
            p: { xs: 1.5, sm: 2 }, 
            minHeight: { xs: 300, sm: 400 },
            maxHeight: { xs: 'calc(100vh - 300px)', sm: 'none' }
          }}>
            {messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <SmartToy sx={{ fontSize: 64, color: '#cbd5e0', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#4a5568', mb: 1 }}>
                  Welcome to AI Data Assistant
                </Typography>
                <Typography variant="body2" sx={{ color: '#718096' }}>
                  Ask me anything about your uploaded data. I can help analyze trends, 
                  suggest visualizations, and answer questions about your dataset.
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ListItem sx={{ alignItems: 'flex-start', px: 0, py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            bgcolor: message.isUser ? '#667eea' : '#48bb78',
                            width: { xs: 36, sm: 40 },
                            height: { xs: 36, sm: 40 }
                          }}>
                            {message.isUser ? <Person /> : <SmartToy />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box>
                              <Box
                                sx={{
                                  color: '#1a202c',
                                  fontSize: '0.95rem',
                                  lineHeight: 1.7,
                                  '& > *:first-child': { mt: 0 },
                                  '& > *:last-child': { mb: 0 },
                                }}
                              >
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm, remarkBreaks]}
                                  components={{
                                    h1: ({children}) => (
                                      <Typography variant="h6" component="h1" sx={{ fontWeight: 700, mt: 2.5, mb: 1.5, color: '#1a202c' }}>
                                        {children}
                                      </Typography>
                                    ),
                                    h2: ({children}) => (
                                      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mt: 2, mb: 1, color: '#2d3748' }}>
                                        {children}
                                      </Typography>
                                    ),
                                    h3: ({children}) => (
                                      <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 600, mt: 1.5, mb: 0.75, color: '#2d3748' }}>
                                        {children}
                                      </Typography>
                                    ),
                                    p: ({children}) => (
                                      <Typography variant="body1" component="p" sx={{ mb: 1.5, lineHeight: 1.75, color: '#1a202c' }}>
                                        {children}
                                      </Typography>
                                    ),
                                    ul: ({children}) => (
                                      <Box component="ul" sx={{ pl: 3, mb: 1.5, mt: 0, listStyleType: 'disc' }}>
                                        {children}
                                      </Box>
                                    ),
                                    ol: ({children}) => (
                                      <Box component="ol" sx={{ pl: 3, mb: 1.5, mt: 0, listStyleType: 'decimal' }}>
                                        {children}
                                      </Box>
                                    ),
                                    li: ({children}) => (
                                      <Box component="li" sx={{ mb: 0.75, lineHeight: 1.7, color: '#1a202c' }}>
                                        {children}
                                      </Box>
                                    ),
                                    strong: ({children}) => (
                                      <Box component="strong" sx={{ fontWeight: 600, color: '#1a202c' }}>
                                        {children}
                                      </Box>
                                    ),
                                    em: ({children}) => (
                                      <Box component="em" sx={{ fontStyle: 'italic' }}>
                                        {children}
                                      </Box>
                                    ),
                                    code: ({inline, children, className}) => {
                                      if (inline) {
                                        return (
                                          <Box 
                                            component="code" 
                                            sx={{ 
                                              bgcolor: '#edf2f7', 
                                              px: 0.75, 
                                              py: 0.25, 
                                              borderRadius: 0.5, 
                                              fontSize: '0.875em',
                                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                              color: '#2d3748'
                                            }}
                                          >
                                            {children}
                                          </Box>
                                        );
                                      }
                                      return (
                                        <Box 
                                          component="pre" 
                                          sx={{ 
                                            bgcolor: '#1a202c', 
                                            color: '#e2e8f0', 
                                            p: 1.5, 
                                            borderRadius: 1, 
                                            overflow: 'auto',
                                            mb: 1.5,
                                            mt: 1.5
                                          }}
                                        >
                                          <Box 
                                            component="code" 
                                            sx={{
                                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                              fontSize: '0.875em'
                                            }}
                                          >
                                            {children}
                                          </Box>
                                        </Box>
                                      );
                                    },
                                    hr: () => (
                                      <Divider sx={{ my: 2, borderColor: '#e2e8f0' }} />
                                    ),
                                    blockquote: ({children}) => (
                                      <Box 
                                        component="blockquote"
                                        sx={{
                                          borderLeft: '4px solid #667eea',
                                          pl: 2,
                                          py: 1,
                                          my: 1.5,
                                          bgcolor: '#f7fafc',
                                          fontStyle: 'italic',
                                          color: '#4a5568'
                                        }}
                                      >
                                        {children}
                                      </Box>
                                    ),
                                    a: ({children, href}) => (
                                      <Box 
                                        component="a" 
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{ 
                                          color: '#667eea', 
                                          textDecoration: 'none',
                                          '&:hover': { textDecoration: 'underline' }
                                        }}
                                      >
                                        {children}
                                      </Box>
                                    )
                                  }}
                                >
                                  {message.text}
                                </ReactMarkdown>
                              </Box>
                              {message.chartSuggestion && (
                                <Box sx={{ mt: 2 }}>
                                  <Paper sx={{ p: 2, bgcolor: '#f7fafc', border: '1px solid #e2e8f0' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1a202c' }}>
                                      <AutoGraph sx={{ mr: 1, verticalAlign: 'middle', fontSize: 16 }} />
                                      Chart Suggestion
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#4a5568', mb: 2 }}>
                                      I can create a {message.chartSuggestion.type} chart showing {message.chartSuggestion.title}
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      startIcon={<AutoGraph />}
                                      onClick={() => handleGenerateChart(message.chartSuggestion)}
                                      disabled={isLoading}
                                      sx={{
                                        bgcolor: '#667eea',
                                        '&:hover': { bgcolor: '#5a67d8' }
                                      }}
                                    >
                                      Generate Chart
                                    </Button>
                                  </Paper>
                                </Box>
                              )}
                              {message.generatedChart && (
                                <Box sx={{ mt: 2 }}>
                                  <Paper sx={{ p: 2, bgcolor: '#e6fffa', border: '1px solid #48bb78' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#22543d' }}>
                                      ✅ Chart Generated Successfully!
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#2d3748', mb: 2 }}>
                                      Chart: {message.generatedChart.config?.title || 'Custom Chart'}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      {onShowGallery && (
                                        <Button
                                          size="small"
                                          variant="contained"
                                          startIcon={<PhotoLibrary />}
                                          onClick={onShowGallery}
                                          sx={{
                                            bgcolor: '#48bb78',
                                            '&:hover': { bgcolor: '#38a169' }
                                          }}
                                        >
                                          View in Gallery
                                        </Button>
                                      )}
                                    </Box>
                                  </Paper>
                                </Box>
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" sx={{ color: '#a0aec0', mt: 0.5 }}>
                              {message.timestamp.toLocaleTimeString()}
                            </Typography>
                          }
                        />
                      </ListItem>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#48bb78', width: 32, height: 32 }}>
                        <SmartToy />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CircularProgress size={16} sx={{ mr: 1 }} />
                          <Typography variant="body2" sx={{ color: '#718096' }}>
                            AI is thinking...
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                )}
                <div ref={messagesEndRef} />
              </List>
            )}
          </Box>

          {error && (
            <Box sx={{ p: 2 }}>
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            </Box>
          )}

          {/* Input */}
          <Box sx={{ 
            p: { xs: 1.5, sm: 2 }, 
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff'
          }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your data..."
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    '& fieldset': {
                      borderColor: '#e2e8f0'
                    },
                    '&:hover fieldset': {
                      borderColor: '#cbd5e0'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea'
                    }
                  },
                  '& .MuiInputBase-input': {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                sx={{
                  minWidth: { xs: '48px', sm: 'auto' },
                  minHeight: { xs: '48px', sm: 'auto' },
                  px: { xs: 1.5, sm: 2 },
                  bgcolor: '#667eea',
                  '&:hover': { bgcolor: '#5a67d8' },
                  '&:disabled': { bgcolor: '#e2e8f0' },
                  '& .MuiSvgIcon-root': {
                    fontSize: { xs: '1.25rem', sm: '1.5rem' }
                  }
                }}
              >
                <Send />
              </Button>
            </Box>
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#a0aec0', 
                mt: 1, 
                display: 'block',
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            >
              Press Enter to send, Shift+Enter for new line
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </animated.div>
  );
};

export default AIChat;
