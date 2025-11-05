import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds - increased for AI API calls
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const api = {
  // File upload
  uploadFile: async (formData: FormData) => {
    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 120 seconds - file uploads can take time for large files
    });
    return response.data;
  },

  // Sheet selection
  selectSheet: async (sheetName: string) => {
    const response = await apiClient.post('/select_sheet', { sheet: sheetName });
    return response.data;
  },

  // Comprehensive analysis
  analyze: async (fileId?: string, sheetName?: string) => {
    const response = await apiClient.post('/analyze', {
      file_id: fileId,
      sheet_name: sheetName,
    });
    return response.data;
  },

  // Generate forecast
  forecast: async (columnName: string, periods: number = 12) => {
    const response = await apiClient.post('/forecast', {
      column: columnName,
      periods: periods,
    });
    return response.data;
  },

  // Ask questions
  askQuestion: async (question: string) => {
    const response = await apiClient.post('/ask', {
      user_question: question,
    });
    return response.data;
  },

  // Get chart data
  getChart: async (chartId: string) => {
    const response = await apiClient.get(`/get_chart/${chartId}`);
    return response.data;
  },

  // Download chart
  downloadChart: async (chartId: string) => {
    const response = await apiClient.get(`/download_chart/${chartId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Get Q&A history
  getHistory: async () => {
    const response = await apiClient.get('/get_history');
    return response.data;
  },

  // Reset session
  reset: async () => {
    const response = await apiClient.post('/reset');
    return response.data;
  },

  // AI Chat
  aiChat: async (question: string, fileId?: string) => {
    const response = await apiClient.post('/ai_chat', { question, file_id: fileId }, {
      timeout: 90000, // 90 seconds - AI calls can take longer
      responseType: 'json', // Explicitly request JSON response
    });
    
    // Axios should automatically parse JSON, but ensure we have an object
    let responseData = response.data;
    
    // If it's still a string, try to parse it
    if (typeof responseData === 'string') {
      try {
        // Replace any invalid NaN values with null before parsing
        const cleanedString = responseData.replace(/:\s*NaN/g, ': null').replace(/,\s*NaN/g, ', null');
        responseData = JSON.parse(cleanedString);
        console.log('⚠ Parsed string response to object');
      } catch (e) {
        console.error('Failed to parse response.data as JSON:', e);
        throw new Error('Invalid JSON response from server');
      }
    }
    
    // Ensure we have a valid object
    if (typeof responseData !== 'object' || responseData === null) {
      console.error('Invalid response data type:', typeof responseData);
      throw new Error('Invalid response format from server');
    }
    
    return responseData;
  },

  // Generate custom chart
  generateCustomChart: async (chartConfig: any) => {
    const response = await apiClient.post('/generate_custom_chart', {
      chart_config: chartConfig,
    });
    return response.data;
  },

  // Health check
  health: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

export default api;