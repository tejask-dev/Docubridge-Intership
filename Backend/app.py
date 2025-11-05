import os
import pandas as pd
import numpy as np
import logging
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.utils import PlotlyJSONEncoder
import json
import requests
import warnings
warnings.filterwarnings('ignore')

from flask import Flask, request, session, send_file, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime, timedelta
import uuid
import io
import base64

# Advanced ML imports (optional - wrapped in try/except)
try:
    from sklearn.ensemble import RandomForestRegressor, IsolationForest
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import mean_squared_error, r2_score
    from scipy import stats
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    logging.warning("ML libraries not available. Some features will be disabled.")

# Load environment variables from .env
load_dotenv()

# Configuration
ALLOWED_EXTENSIONS = {'xls', 'xlsx', 'csv'}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
UPLOAD_FOLDER = 'uploads'
CHARTS_FOLDER = 'charts'

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['CHARTS_FOLDER'] = CHARTS_FOLDER

secret = os.getenv("FLASK_SECRET_KEY")
if not secret:
    raise RuntimeError("FLASK_SECRET_KEY is not set in .env!")
app.secret_key = secret

# Configure session cookies for production
# Set secure=True only in production (HTTPS), allow cross-origin cookies
app.config['SESSION_COOKIE_SECURE'] = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'  # Required for cross-origin with credentials
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)  # Session lasts 24 hours

# CORS configuration - allow frontend origin from environment or default to localhost
CORS_ORIGINS_STR = os.getenv("CORS_ORIGINS", "http://localhost:3000")
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_STR.split(",") if origin.strip()]
logging.info(f"CORS origins configured: {CORS_ORIGINS}")
CORS(app, supports_credentials=True, origins=CORS_ORIGINS, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL = "tngtech/deepseek-r1t2-chimera:free"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Check if API key is available
if not OPENROUTER_API_KEY:
    logging.warning("OPENROUTER_API_KEY not found. AI chat will use fallback responses.")
else:
    logging.info(f"OpenRouter API key loaded. Model: {MODEL}")

# Create necessary directories
for folder in [UPLOAD_FOLDER, CHARTS_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

class FinancialAnalyzer:
    def __init__(self, df):
        self.df = df.copy()
        self.numeric_columns = self.df.select_dtypes(include=[np.number]).columns.tolist()
        self.date_columns = self._find_date_columns()
        self.analysis_results = {}
        
    def _find_date_columns(self):
        """Find columns that contain date/time information"""
        date_cols = []
        for col in self.df.columns:
            if any(keyword in col.lower() for keyword in ['date', 'time', 'month', 'year', 'period', 'quarter']):
                date_cols.append(col)
            elif self.df[col].dtype == 'datetime64[ns]':
                date_cols.append(col)
        return date_cols
    
    def detect_anomalies(self):
        """Detect anomalies using Isolation Forest"""
        if not ML_AVAILABLE:
            return []
        if len(self.numeric_columns) < 2:
            return []
        
        try:
            # Prepare data for anomaly detection
            numeric_data = self.df[self.numeric_columns].fillna(0)
            scaler = StandardScaler()
            scaled_data = scaler.fit_transform(numeric_data)
            
            # Apply Isolation Forest
            iso_forest = IsolationForest(contamination=0.1, random_state=42)
            anomaly_labels = iso_forest.fit_predict(scaled_data)
            
            anomalies = []
            for idx, label in enumerate(anomaly_labels):
                if label == -1:  # Anomaly detected
                    row_data = {}
                    for col in self.numeric_columns:
                        row_data[col] = float(self.df.iloc[idx][col]) if pd.notna(self.df.iloc[idx][col]) else None
                    anomalies.append({
                        'row_index': idx,
                        'data': row_data,
                        'anomaly_score': float(iso_forest.decision_function(scaled_data[idx:idx+1])[0])
                    })
            
            return anomalies
        except Exception as e:
            logging.error(f"Anomaly detection error: {e}")
            return []
    
    def calculate_advanced_ratios(self):
        """Calculate comprehensive financial ratios"""
        ratios = {}
        
        # Find key financial columns
        revenue_cols = [col for col in self.df.columns if any(x in col.lower() for x in ['revenue', 'sales', 'income'])]
        profit_cols = [col for col in self.df.columns if any(x in col.lower() for x in ['profit', 'net income', 'earnings'])]
        asset_cols = [col for col in self.df.columns if any(x in col.lower() for x in ['asset', 'total asset'])]
        liability_cols = [col for col in self.df.columns if any(x in col.lower() for x in ['liability', 'debt', 'total debt'])]
        equity_cols = [col for col in self.df.columns if any(x in col.lower() for x in ['equity', 'shareholder'])]
        
        # Profitability Ratios
        if revenue_cols and profit_cols:
            revenue = self.df[revenue_cols[0]].sum()
            profit = self.df[profit_cols[0]].sum()
            if revenue != 0:
                ratios['profit_margin'] = (profit / revenue) * 100
                ratios['gross_margin'] = (profit / revenue) * 100
        
        # Liquidity Ratios
        if asset_cols and liability_cols:
            assets = self.df[asset_cols[0]].sum()
            liabilities = self.df[liability_cols[0]].sum()
            if liabilities != 0:
                ratios['debt_to_asset'] = (liabilities / assets) * 100
                ratios['asset_turnover'] = revenue / assets if 'revenue' in locals() and assets != 0 else None
        
        # Efficiency Ratios
        if len(self.numeric_columns) >= 2:
            for col in self.numeric_columns:
                if 'inventory' in col.lower():
                    ratios['inventory_turnover'] = revenue / self.df[col].mean() if 'revenue' in locals() and self.df[col].mean() != 0 else None
        
        return ratios
    
    def perform_trend_analysis(self):
        """Advanced trend analysis with statistical significance"""
        
        trends = []
        
        if not self.date_columns:
            return trends
        
        date_col = self.date_columns[0]
        
        for col in self.numeric_columns:
            try:
                # Sort by date
                sorted_df = self.df.sort_values(by=date_col)
                y_values = sorted_df[col].dropna().values
                x_values = np.arange(len(y_values))
                
                if len(y_values) < 3:
                    continue
                
                # Linear regression for trend
                slope, intercept, r_value, p_value, std_err = stats.linregress(x_values, y_values)
                
                # Calculate growth metrics
                total_change = y_values[-1] - y_values[0]
                percent_change = (total_change / y_values[0]) * 100 if y_values[0] != 0 else 0
                
                # Volatility calculation
                volatility = np.std(y_values) / np.mean(y_values) * 100 if np.mean(y_values) != 0 else 0
                
                # Trend strength
                trend_strength = "Strong" if abs(r_value) > 0.7 else "Moderate" if abs(r_value) > 0.4 else "Weak"
                trend_direction = "Increasing" if slope > 0 else "Decreasing" if slope < 0 else "Stable"
                
                trends.append({
                    'column': col,
                    'trend_direction': trend_direction,
                    'trend_strength': trend_strength,
                    'slope': float(slope),
                    'r_squared': float(r_value ** 2),
                    'p_value': float(p_value),
                    'total_change': float(total_change),
                    'percent_change': float(percent_change),
                    'volatility': float(volatility),
                    'start_value': float(y_values[0]),
                    'end_value': float(y_values[-1]),
                    'is_significant': p_value < 0.05
                })
                
            except Exception as e:
                logging.error(f"Trend analysis error for {col}: {e}")
                continue
        
        return trends
    
    def generate_forecast(self, column_name, periods=12):
        """Generate ML-based forecasts"""
        if not ML_AVAILABLE:
            return None
        if column_name not in self.numeric_columns:
            return None
        
        try:
            # Prepare data
            data = self.df[column_name].dropna().values
            if len(data) < 10:
                return None
            
            # Create features (lagged values)
            X = []
            y = []
            for i in range(3, len(data)):
                X.append(data[i-3:i])
                y.append(data[i])
            
            X = np.array(X)
            y = np.array(y)
            
            if len(X) < 5:
                return None
            
            # Train model
            model = RandomForestRegressor(n_estimators=100, random_state=42)
            model.fit(X, y)
            
            # Generate forecast
            last_values = data[-3:]
            forecast = []
            current_values = last_values.copy()
            
            for _ in range(periods):
                next_pred = model.predict([current_values])[0]
                forecast.append(next_pred)
                current_values = np.append(current_values[1:], next_pred)
            
            # Calculate confidence intervals
            predictions = model.predict(X)
            mse = mean_squared_error(y, predictions)
            std_error = np.sqrt(mse)
            
            confidence_intervals = []
            for pred in forecast:
                ci_lower = pred - 1.96 * std_error
                ci_upper = pred + 1.96 * std_error
                confidence_intervals.append({
                    'lower': float(ci_lower),
                    'upper': float(ci_upper)
                })
            
            return {
                'forecast': [float(x) for x in forecast],
                'confidence_intervals': confidence_intervals,
                'model_score': float(r2_score(y, predictions)),
                'periods': periods
            }
            
        except Exception as e:
            logging.error(f"Forecast error for {column_name}: {e}")
            return None
    
    def calculate_correlation_matrix(self):
        """Calculate correlation matrix for numeric columns"""
        if len(self.numeric_columns) < 2:
            return None
        
        try:
            corr_matrix = self.df[self.numeric_columns].corr()
            return corr_matrix.to_dict()
        except Exception as e:
            logging.error(f"Correlation calculation error: {e}")
            return None
    
    def detect_seasonality(self, column_name):
        """Detect seasonal patterns in data"""
        if column_name not in self.numeric_columns:
            return None
        
        try:
            data = self.df[column_name].dropna().values
            if len(data) < 12:
                return None
            
            # Simple seasonality detection using FFT
            fft = np.fft.fft(data)
            freqs = np.fft.fftfreq(len(data))
            
            # Find dominant frequencies
            power = np.abs(fft) ** 2
            dominant_freq_idx = np.argsort(power)[-3:]
            
            seasonality_info = {
                'has_seasonality': False,
                'dominant_periods': [],
                'seasonal_strength': 0
            }
            
            for idx in dominant_freq_idx:
                if freqs[idx] > 0:
                    period = 1 / freqs[idx]
                    if 2 <= period <= len(data) / 2:
                        seasonality_info['dominant_periods'].append(float(period))
                        seasonality_info['has_seasonality'] = True
            
            seasonality_info['seasonal_strength'] = float(np.max(power[1:]) / np.sum(power[1:]))
            
            return seasonality_info
            
        except Exception as e:
            logging.error(f"Seasonality detection error: {e}")
            return None

def allowed_file(filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return ext in ALLOWED_EXTENSIONS

def list_excel_sheets(filepath, file_ext):
    try:
        if file_ext in ['xls', 'xlsx']:
            logging.info(f"Opening Excel file to list sheets: {filepath}")
            # Use engine='openpyxl' for .xlsx files for better performance
            engine = 'openpyxl' if file_ext == 'xlsx' else None
            xls = pd.ExcelFile(filepath, engine=engine)
            sheet_names = xls.sheet_names
            logging.info(f"Successfully listed {len(sheet_names)} sheets")
            return sheet_names
        else:
            return []
    except Exception as e:
        logging.error(f"Failed to list sheets: {str(e)}", exc_info=True)
        return []

def read_dataframe(file_path, file_ext, sheet_name=None):
    if file_ext == "csv":
        return pd.read_csv(file_path)
    elif file_ext in ['xls', 'xlsx']:
        if sheet_name:
            return pd.read_excel(file_path, sheet_name=sheet_name)
        else:
            return pd.read_excel(file_path)
    else:
        raise Exception("Unsupported file type.")

def create_advanced_charts(df, analyzer):
    """Create advanced interactive charts"""
    charts = []
    
    # Time series charts
    if analyzer.date_columns:
        date_col = analyzer.date_columns[0]
        
        for col in analyzer.numeric_columns[:5]:  # Limit to 5 charts
            try:
                sorted_df = df.sort_values(by=date_col)
                
                # Create Plotly figure
                fig = go.Figure()
                
                # Main line
                fig.add_trace(go.Scatter(
                    x=sorted_df[date_col],
                    y=sorted_df[col],
                    mode='lines+markers',
                    name=col,
                    line=dict(color='#2E86AB', width=3),
                    marker=dict(size=6, color='#2E86AB')
                ))
                
                # Add trend line
                if len(sorted_df) > 2:
                    z = np.polyfit(range(len(sorted_df)), sorted_df[col], 1)
                    p = np.poly1d(z)
                    fig.add_trace(go.Scatter(
                        x=sorted_df[date_col],
                        y=p(range(len(sorted_df))),
                        mode='lines',
                        name='Trend',
                        line=dict(color='#F24236', width=2, dash='dash')
                    ))
                
                # Add moving average
                if len(sorted_df) > 5:
                    window = min(5, len(sorted_df) // 3)
                    ma = sorted_df[col].rolling(window=window).mean()
                    fig.add_trace(go.Scatter(
                        x=sorted_df[date_col],
                        y=ma,
                        mode='lines',
                        name=f'MA({window})',
                        line=dict(color='#F6AE2D', width=2)
                    ))
                
                fig.update_layout(
                    title=f'{col} Analysis',
                    xaxis_title=date_col,
                    yaxis_title=col,
                    template='plotly_white',
                    height=400,
                    showlegend=True
                )
                
                chart_id = str(uuid.uuid4())
                chart_path = os.path.join(app.config['CHARTS_FOLDER'], f'chart_{chart_id}.json')
                
                with open(chart_path, 'w') as f:
                    json.dump(fig, f, cls=PlotlyJSONEncoder)
                
                charts.append({
                    'id': chart_id,
                    'type': 'time_series',
                    'column': col,
                    'title': f'{col} Analysis'
                })
                
            except Exception as e:
                logging.error(f"Chart creation error for {col}: {e}")
                continue
    
    # Correlation heatmap
    if len(analyzer.numeric_columns) > 2:
        try:
            corr_matrix = df[analyzer.numeric_columns].corr()
            
            fig = go.Figure(data=go.Heatmap(
                z=corr_matrix.values,
                x=corr_matrix.columns,
                y=corr_matrix.columns,
                colorscale='RdBu',
                zmid=0,
                text=np.round(corr_matrix.values, 2),
                texttemplate="%{text}",
                textfont={"size": 10}
            ))
            
            fig.update_layout(
                title='Correlation Matrix',
                height=400,
                template='plotly_white'
            )
            
            chart_id = str(uuid.uuid4())
            chart_path = os.path.join(app.config['CHARTS_FOLDER'], f'chart_{chart_id}.json')
            
            with open(chart_path, 'w') as f:
                json.dump(fig, f, cls=PlotlyJSONEncoder)
            
            charts.append({
                'id': chart_id,
                'type': 'correlation',
                'title': 'Correlation Matrix'
            })
            
        except Exception as e:
            logging.error(f"Correlation chart error: {e}")
    
    return charts

def ask_llm(prompt):
    import requests
    try:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 2000
        }
        response = requests.post(url, headers=headers, json=data, timeout=30)
        rjson = response.json()
        if "choices" in rjson:
            content = rjson["choices"][0]["message"]["content"]
            return content
        else:
            return f"Error: {rjson.get('error', 'Unknown error')}"
    except Exception as e:
        logging.error("LLM API error: %s", e, exc_info=True)
        return None

def convert_np(obj):
    """Convert numpy/pandas types to JSON-serializable types"""
    if isinstance(obj, dict):
        return {k: convert_np(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_np(i) for i in obj]
    elif isinstance(obj, np.generic):
        return obj.item()
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif pd.isna(obj):
        # Convert NaN, NaT, etc. to None (which becomes null in JSON)
        return None
    elif isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        # Handle float NaN and infinity
        return None
    return obj

@app.route("/upload", methods=["POST"])
def upload():
    try:
        logging.info("Upload request received")
        file = request.files.get("file")
        if not file:
            logging.error("No file in request")
            return jsonify({"error": "No file selected."}), 400
        
        filename = secure_filename(file.filename)
        file_ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ""
        logging.info(f"Uploading file: {filename}, type: {file_ext}")
        
        if not allowed_file(filename):
            logging.error(f"Invalid file type: {file_ext}")
            return jsonify({"error": "Invalid file type. Only Excel (.xls/.xlsx) or CSV files are allowed."}), 400
        
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        logging.info(f"Saving file to: {temp_path}")
        file.save(temp_path)
        logging.info(f"File saved successfully, size: {os.path.getsize(temp_path)} bytes")
        
        session["data_path"] = temp_path
        session["file_ext"] = file_ext
        session["filename"] = filename
        
        logging.info("Listing Excel sheets...")
        sheet_names = list_excel_sheets(temp_path, file_ext)
        logging.info(f"Found {len(sheet_names)} sheets: {sheet_names}")
        
        session["sheet_names"] = sheet_names
        session["selected_sheet"] = sheet_names[0] if sheet_names else None
        session["qna_history"] = []
        session["chart_images"] = []
        
        logging.info("Upload completed successfully")
        return jsonify({
            "sheet_names": sheet_names, 
            "selected_sheet": session["selected_sheet"],
            "filename": filename
        })
    except Exception as e:
        error_msg = str(e)
        logging.error(f"Upload error: {error_msg}", exc_info=True)
        return jsonify({"error": f"Upload failed: {error_msg}"}), 500

@app.route("/select_sheet", methods=["POST"])
def select_sheet():
    sheet = request.json.get("sheet") or request.form.get("sheet")
    session["selected_sheet"] = sheet
    session["chart_images"] = []
    return jsonify({"selected_sheet": sheet})

@app.route("/analyze", methods=["POST"])
def analyze():
    """Comprehensive financial analysis endpoint"""
    # Debug: Log session info
    logging.info(f"Analyze request - Session ID: {id(session)}, Session keys: {list(session.keys())}")
    logging.info(f"Session contents: data_path={session.get('data_path')}, file_ext={session.get('file_ext')}")
    
    data_path = session.get("data_path")
    file_ext = session.get("file_ext")
    sheet_name = session.get("selected_sheet")
    
    logging.info(f"Analyze request - data_path: {data_path}, file_ext: {file_ext}, sheet_name: {sheet_name}")
    
    if not data_path:
        logging.error("No data_path in session")
        logging.error(f"Available session keys: {list(session.keys())}")
        return jsonify({"error": "No file uploaded. Please upload a file first."}), 400
    
    if not os.path.exists(data_path):
        logging.error(f"File not found at path: {data_path}")
        logging.error(f"Current working directory: {os.getcwd()}")
        logging.error(f"Upload folder exists: {os.path.exists(app.config['UPLOAD_FOLDER'])}")
        logging.error(f"Upload folder contents: {os.listdir(app.config['UPLOAD_FOLDER']) if os.path.exists(app.config['UPLOAD_FOLDER']) else 'N/A'}")
        return jsonify({"error": "File not found. Please re-upload."}), 400
    
    try:
        df = read_dataframe(data_path, file_ext, sheet_name)
        analyzer = FinancialAnalyzer(df)
        
        # Perform comprehensive analysis
        analysis_results = {
            'anomalies': analyzer.detect_anomalies(),
            'ratios': analyzer.calculate_advanced_ratios(),
            'trends': analyzer.perform_trend_analysis(),
            'correlation_matrix': analyzer.calculate_correlation_matrix(),
            'summary_stats': {
                'total_rows': len(df),
                'total_columns': len(df.columns),
                'numeric_columns': len(analyzer.numeric_columns),
                'date_columns': len(analyzer.date_columns),
                'missing_data_percentage': (df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100
            }
        }
        
        # Generate charts
        charts = create_advanced_charts(df, analyzer)
        session["chart_images"] = [c['id'] for c in charts]
        
        return jsonify(convert_np({
            'analysis': analysis_results,
            'charts': charts,
            'columns': df.columns.tolist(),
            'numeric_columns': analyzer.numeric_columns
        }))
        
    except Exception as e:
        error_msg = str(e)
        logging.error(f"Analysis error: {error_msg}", exc_info=True)
        return jsonify({"error": f"Analysis failed: {error_msg}. Please check your file format."}), 400

@app.route("/forecast", methods=["POST"])
def forecast():
    """Generate forecasts for selected columns"""
    data = request.get_json()
    column_name = data.get("column")
    periods = data.get("periods", 12)
    
    data_path = session.get("data_path")
    file_ext = session.get("file_ext")
    sheet_name = session.get("selected_sheet")
    
    if not data_path or not os.path.exists(data_path):
        return jsonify({"error": "File not found. Please re-upload."}), 400
    
    try:
        df = read_dataframe(data_path, file_ext, sheet_name)
        analyzer = FinancialAnalyzer(df)
        
        forecast_result = analyzer.generate_forecast(column_name, periods)
        
        if forecast_result:
            return jsonify(convert_np(forecast_result))
        else:
            return jsonify({"error": "Forecast generation failed. Insufficient data."}), 400
            
    except Exception as e:
        logging.error("Forecast error:", exc_info=True)
        return jsonify({"error": "Forecast generation failed."}), 400

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json() or request.form
    question = data.get("user_question")
    
    if not question or not question.strip():
        return jsonify({"error": "Please enter a question."}), 400
    
    data_path = session.get("data_path")
    file_ext = session.get("file_ext")
    sheet_name = session.get("selected_sheet")
    
    if not data_path or not os.path.exists(data_path):
        return jsonify({"error": "File not found. Please re-upload."}), 400
    
    try:
        df = read_dataframe(data_path, file_ext, sheet_name)
        analyzer = FinancialAnalyzer(df)
        
        # Get analysis results
        trends = analyzer.perform_trend_analysis()
        ratios = analyzer.calculate_advanced_ratios()
        anomalies = analyzer.detect_anomalies()
        
        # Prepare context for LLM
        columns = ', '.join(df.columns)
        nrows = len(df)
        
        MAX_ROWS = 15
        if nrows > MAX_ROWS:
            sample_rows = pd.concat([df.head(7), df.tail(7)])
            summary = f"Dataset has {nrows} rows with columns: {columns}.\nSample data: {sample_rows.to_dict(orient='records')}\n"
        else:
            summary = f"Dataset has {nrows} rows with columns: {columns}.\nAll data: {df.to_dict(orient='records')}\n"
        
        # Enhanced prompt with analysis results
        analysis_context = ""
        if trends:
            analysis_context += f"\nTrend Analysis:\n"
            for trend in trends[:5]:  # Limit to top 5 trends
                analysis_context += f"- {trend['column']}: {trend['trend_direction']} trend ({trend['trend_strength']} strength, {trend['percent_change']:+.1f}% change)\n"
        
        if ratios:
            analysis_context += f"\nFinancial Ratios:\n"
            for key, value in ratios.items():
                analysis_context += f"- {key.replace('_', ' ').title()}: {value:.2f}\n"
        
        if anomalies:
            analysis_context += f"\nAnomalies Detected: {len(anomalies)} unusual data points found\n"
        
        wants_excel_formula = any(x in question.lower() for x in ["excel formula", "how do i", "calculate", "sum in excel", "formula for"])
        formula_instruction = ""
        if wants_excel_formula:
            formula_instruction = "\nThe user is asking for an Excel formula. Provide a clear formula and explanation."
        
        prompt = f"""
        You are a financial analysis expert. Analyze the following data and answer the user's question.
        
        {summary}
        {analysis_context}
        {formula_instruction}
        
        User Question: {question}
        
        Provide a comprehensive, professional answer based on the data. Include specific insights, trends, and recommendations where applicable. Format your response with proper headings and bullet points for clarity.
        """
        
        ai_answer = ask_llm(prompt)
        if ai_answer is None:
            return jsonify({"error": "AI service unavailable. Please try again later."}), 503
        
        # Update Q&A history
        qna_history = session.get("qna_history", [])
        qna_history.append({"question": question, "answer": ai_answer})
        session["qna_history"] = qna_history
        
        return jsonify(convert_np({
            "answer": ai_answer,
            "trends": trends[:3],  # Return top 3 trends
            "ratios": ratios,
            "anomalies_count": len(anomalies)
        }))
        
    except Exception as e:
        logging.error("Q&A error:", exc_info=True)
        return jsonify({"error": "Analysis failed. Please check your file."}), 400

@app.route("/get_chart/<chart_id>")
def get_chart(chart_id):
    chart_path = os.path.join(app.config['CHARTS_FOLDER'], f'chart_{chart_id}.json')
    if not os.path.exists(chart_path):
        return jsonify({"error": "Chart not found."}), 404
    
    with open(chart_path, 'r') as f:
        chart_data = json.load(f)
    
    return jsonify(chart_data)

@app.route("/download_chart/<chart_id>")
def download_chart(chart_id):
    chart_path = os.path.join(app.config['CHARTS_FOLDER'], f'chart_{chart_id}.json')
    if not os.path.exists(chart_path):
        return jsonify({"error": "Chart not found."}), 404
    
    return send_file(chart_path, mimetype='application/json', as_attachment=True, download_name=f'chart_{chart_id}.json')

@app.route("/get_history")
def get_history():
    return jsonify({"history": session.get("qna_history", [])})

@app.route("/reset", methods=["POST"])
def reset():
    # Clean up files
    data_path = session.get("data_path")
    if data_path and os.path.exists(data_path):
        try:
            os.remove(data_path)
        except Exception:
            pass
    
    # Clean up charts
    chart_ids = session.get("chart_images", [])
    for chart_id in chart_ids:
        chart_path = os.path.join(app.config['CHARTS_FOLDER'], f'chart_{chart_id}.json')
        try:
            if os.path.exists(chart_path):
                os.remove(chart_path)
        except Exception:
            pass
    
    # Clear session
    for key in ["data_path", "file_ext", "sheet_names", "selected_sheet", "qna_history", "chart_images", "filename", "ai_chat_history"]:
        session.pop(key, None)
    
    return jsonify({"status": "reset"})

@app.route("/ai_chat", methods=["POST"])
def ai_chat():
    """AI chat endpoint for asking questions about the data"""
    try:
        data = request.get_json()
        question = data.get("question", "")
        data_path = session.get("data_path")
        
        if not question:
            return jsonify({"error": "Question is required"}), 400
            
        if not data_path or not os.path.exists(data_path):
            return jsonify({"error": "No data file uploaded"}), 400
        
        # Load the current data
        df = pd.read_excel(data_path) if data_path.endswith('.xlsx') else pd.read_csv(data_path)
        
        # Get basic data info for context
        # Convert sample_data to dict, then convert NaN values to None
        sample_data = df.head(5).to_dict('records')
        
        data_info = {
            "columns": df.columns.tolist(),
            "shape": df.shape,
            "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
            "date_columns": df.select_dtypes(include=['datetime64']).columns.tolist(),
            "sample_data": convert_np(sample_data)  # Convert NaN to None for JSON serialization
        }
        
        # Get chat history from session
        chat_history = session.get("ai_chat_history", [])
        
        # Build conversation history for context
        conversation_context = ""
        if chat_history:
            conversation_context = "\n\nPrevious conversation:\n"
            for msg in chat_history[-10:]:  # Last 10 messages for context
                conversation_context += f"User: {msg.get('user', '')}\n"
                conversation_context += f"Assistant: {msg.get('assistant', '')}\n\n"
        
        # Create context for AI
        context = f"""
        You are an AI financial and data analysis assistant. You can:
        - Perform mathematical calculations and analysis
        - Answer questions about data
        - Suggest and create visualizations (charts, graphs)
        - Provide insights and recommendations
        - Analyze trends and patterns
        
        Here's the current dataset information:
        
        Dataset Shape: {data_info['shape'][0]} rows, {data_info['shape'][1]} columns
        Columns: {', '.join(data_info['columns'])}
        Numeric Columns: {', '.join(data_info['numeric_columns'])}
        Date Columns: {', '.join(data_info['date_columns'])}
        
        Sample Data (first 5 rows):
        {data_info['sample_data']}
        
        {conversation_context}
        
        User Question: {question}
        
        IMPORTANT INSTRUCTIONS:
        1. You are a helpful assistant - answer questions directly, perform calculations when asked, and provide insights.
        2. Remember the previous conversation context to understand references like "Category 1", "Option 1", etc.
        3. When the user asks for a chart/graph with action words (make, create, generate, show, visualize, do), 
           explain what chart will be created but know that the system will automatically generate it for them.
        4. When suggesting multiple chart options, number them clearly (Category 1, Category 2, etc.).
        5. For calculations and analysis: Be thorough, show your work when appropriate, and provide actionable insights.
        6. When discussing charts: Explain what the chart will show, what columns/aggregations will be used, and what insights they can gain.
        7. Be conversational and helpful - you're not just a chart generator, you're a data analyst assistant.
        
        Please provide a helpful, comprehensive response. If the user asks for calculations, do them. 
        If they ask for analysis, provide detailed insights. If they ask for charts, explain what will be created.
        """
        
        # Check if API key is available
        if not OPENROUTER_API_KEY:
            logging.warning("No API key found, using fallback response")
            # Fallback response when API key is not available
            answer = generate_fallback_response(question, data_info)
            chart_suggestion = None
            if any(word in question.lower() for word in ['graph', 'chart', 'plot', 'visualize', 'show', 'pie', 'bar', 'line']):
                chart_suggestion = suggest_chart_type(question, data_info)
            
            # Save chat history
            if 'ai_chat_history' not in session:
                session['ai_chat_history'] = []
            session['ai_chat_history'].append({
                "user": question,
                "assistant": answer,
                "timestamp": datetime.now().isoformat()
            })
            if len(session['ai_chat_history']) > 50:
                session['ai_chat_history'] = session['ai_chat_history'][-50:]
            
            return jsonify(convert_np({
                "answer": answer,
                "chart_suggestion": chart_suggestion,
                "generated_chart": None,
                "data_info": data_info
            }))
        
        logging.info(f"Making API request to OpenRouter with model: {MODEL}")
        
        # Call OpenRouter API
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": "You are an AI financial and data analysis assistant. You help users with mathematical calculations, data analysis, insights, and creating visualizations. You're conversational, thorough, and provide actionable insights."},
                {"role": "user", "content": context}
            ],
            "max_tokens": 1500,
            "temperature": 0.7
        }
        
        try:
            logging.info(f"Request payload: {json.dumps(payload, indent=2)}")
            response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
            
            logging.info(f"Response status: {response.status_code}")
            logging.info(f"Response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                ai_response = response.json()
                logging.info(f"AI Response: {ai_response}")
                answer = ai_response['choices'][0]['message']['content']
                
                # Detect if user wants to generate a chart based on previous conversation
                chart_config = detect_chart_generation_request(question, chat_history, data_info, df)
                generated_chart = None
                chart_suggestion = None
                
                if chart_config:
                    # Automatically generate the chart
                    try:
                        chart_id = str(uuid.uuid4())
                        chart_data = create_custom_chart(df, chart_config, chart_id)
                        
                        if chart_data:
                            # Save chart
                            chart_path = os.path.join(app.config['CHARTS_FOLDER'], f'chart_{chart_id}.json')
                            with open(chart_path, 'w') as f:
                                json.dump(chart_data, f)
                            
                            # Add to session
                            if 'chart_images' not in session:
                                session['chart_images'] = []
                            session['chart_images'].append(chart_id)
                            
                            generated_chart = {
                                "chart_id": chart_id,
                                "chart_data": chart_data,
                                "config": chart_config
                            }
                            # Prepend success message to answer
                            chart_success_msg = f"\n\n✅ **Chart Generated Successfully!**\nI've created a {chart_config.get('type', 'chart')} chart: **{chart_config.get('title', 'Custom Chart')}**. You can view it in the Graph Gallery and download it!"
                            answer = chart_success_msg + "\n\n" + answer
                            logging.info(f"Chart generated successfully: {chart_id}")
                        else:
                            logging.warning(f"Chart generation returned None for config: {chart_config}")
                            answer += "\n\n⚠️ I tried to generate the chart but couldn't create it with the available data. Please check the data columns."
                    except Exception as e:
                        logging.error(f"Error generating chart: {e}", exc_info=True)
                        answer += f"\n\n⚠️ I tried to generate the chart but encountered an error: {str(e)}"
                else:
                    # Check if user wants to generate a chart (general request)
                    if any(word in question.lower() for word in ['graph', 'chart', 'plot', 'visualize', 'show', 'pie', 'bar', 'line']):
                        chart_suggestion = suggest_chart_type(question, data_info)
                
                # Save chat history
                if 'ai_chat_history' not in session:
                    session['ai_chat_history'] = []
                session['ai_chat_history'].append({
                    "user": question,
                    "assistant": answer,
                    "timestamp": datetime.now().isoformat()
                })
                # Keep only last 50 messages to avoid session bloat
                if len(session['ai_chat_history']) > 50:
                    session['ai_chat_history'] = session['ai_chat_history'][-50:]
                
                return jsonify(convert_np({
                    "answer": answer,
                    "chart_suggestion": chart_suggestion,
                    "generated_chart": generated_chart,
                    "data_info": data_info
                }))
            else:
                logging.error(f"OpenRouter API Error: {response.status_code} - {response.text}")
                # Fallback to basic response for any non-200 status
                answer = generate_fallback_response(question, data_info)
                chart_suggestion = None
                if any(word in question.lower() for word in ['graph', 'chart', 'plot', 'visualize', 'show', 'pie', 'bar', 'line']):
                    chart_suggestion = suggest_chart_type(question, data_info)
                
                # Save chat history
                if 'ai_chat_history' not in session:
                    session['ai_chat_history'] = []
                session['ai_chat_history'].append({
                    "user": question,
                    "assistant": answer,
                    "timestamp": datetime.now().isoformat()
                })
                if len(session['ai_chat_history']) > 50:
                    session['ai_chat_history'] = session['ai_chat_history'][-50:]
                
                return jsonify(convert_np({
                    "answer": answer,
                    "chart_suggestion": chart_suggestion,
                    "generated_chart": None,
                    "data_info": data_info
                }))
        except requests.exceptions.RequestException as e:
            logging.error(f"Request error: {e}")
            # Fallback to basic response
            answer = generate_fallback_response(question, data_info)
            chart_suggestion = None
            if any(word in question.lower() for word in ['graph', 'chart', 'plot', 'visualize', 'show']):
                chart_suggestion = suggest_chart_type(question, data_info)
            
            return jsonify(convert_np({
                "answer": answer,
                "chart_suggestion": chart_suggestion,
                "data_info": data_info
            }))
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def generate_fallback_response(question, data_info):
    """Generate a basic response when AI API is not available"""
    question_lower = question.lower()
    
    # Basic responses based on common questions
    if any(word in question_lower for word in ['what', 'tell me about', 'describe']):
        return f"""Based on your dataset, I can see you have {data_info['shape'][0]} rows and {data_info['shape'][1]} columns. 
        
The columns in your data are: {', '.join(data_info['columns'][:5])}{'...' if len(data_info['columns']) > 5 else ''}

Numeric columns available for analysis: {', '.join(data_info['numeric_columns'][:3])}{'...' if len(data_info['numeric_columns']) > 3 else ''}

⚠️ **AI Analysis Status**: Your OpenRouter API key is working, but you need to add credits to your account to use AI models. Visit https://openrouter.ai/settings/credits to add credits, or the app will continue with basic analysis."""
    
    elif any(word in question_lower for word in ['trend', 'pattern', 'analysis']):
        return f"""I can help you analyze trends in your data. Your dataset has {data_info['shape'][0]} rows which is good for trend analysis.

Available numeric columns for trend analysis: {', '.join(data_info['numeric_columns'][:3])}

⚠️ **AI Analysis Status**: Your OpenRouter API key is working, but you need to add credits to your account to use AI models. Visit https://openrouter.ai/settings/credits to add credits."""
    
    elif any(word in question_lower for word in ['chart', 'graph', 'plot', 'visualize']):
        return f"""I can help you create visualizations! Your data has several numeric columns that would work well for charts:

- {', '.join(data_info['numeric_columns'][:3])}

For time series charts, I can use date columns: {', '.join(data_info['date_columns'])}

⚠️ **AI Analysis Status**: Your OpenRouter API key is working, but you need to add credits to your account to use AI models. Visit https://openrouter.ai/settings/credits to add credits."""
    
    else:
        return f"""I'd be happy to help analyze your data! Your dataset contains {data_info['shape'][0]} rows and {data_info['shape'][1]} columns.

Available columns: {', '.join(data_info['columns'][:5])}{'...' if len(data_info['columns']) > 5 else ''}

⚠️ **AI Analysis Status**: Your OpenRouter API key is working, but you need to add credits to your account to use AI models. Visit https://openrouter.ai/settings/credits to add credits for full AI-powered analysis."""

def detect_chart_generation_request(question, chat_history, data_info, df):
    """Detect if user wants to generate a chart based on previous conversation"""
    question_lower = question.lower()
    
    # Check for explicit chart generation requests like "Category 1", "Option 1", "do category 1"
    category_patterns = [
        r'category\s*(\d+)',
        r'option\s*(\d+)',
        r'(\d+)\s*(?:category|option)',
        r'do\s*(?:category|option)\s*(\d+)',
        r'generate\s*(?:category|option)\s*(\d+)',
        r'make\s*(?:category|option)\s*(\d+)',
    ]
    
    import re
    for pattern in category_patterns:
        match = re.search(pattern, question_lower)
        if match:
            category_num = int(match.group(1))
            # Search previous conversation for what category/option this refers to
            return find_chart_config_from_history(category_num, chat_history, data_info, df)
    
    # Check for direct chart requests with action verbs - these should generate charts automatically
    chart_action_patterns = [
        r'(?:do|make|create|generate|show|visualize|plot|draw)\s+(?:a|an)?\s*(?:pie|bar|line|histogram|scatter|graph|chart)',
        r'(?:do|make|create|generate)\s+(?:a|an)?\s*(?:rank|grade|homeroom|distribution).*?(?:analysis|using|with).*?(?:histogram|chart|graph|pie|bar)',
        r'(?:rank|grade|homeroom|total cans).*?(?:analysis|chart|graph|histogram|pie|bar).*?(?:using|with)',
        r'(?:pie|bar|line|histogram|scatter|graph|chart).*?(?:analysis|visualization|distribution)',
    ]
    
    for pattern in chart_action_patterns:
        if re.search(pattern, question_lower):
            # Extract chart type from question - prioritize specific mentions
            if 'histogram' in question_lower:
                # Check if it's about rank
                if 'rank' in question_lower:
                    return {
                        "type": "histogram",
                        "x_axis": "Rank",
                        "title": "Rank Distribution Histogram"
                    }
                # Otherwise use first numeric column
                elif data_info['numeric_columns']:
                    return {
                        "type": "histogram",
                        "x_axis": data_info['numeric_columns'][0],
                        "title": f"Distribution of {data_info['numeric_columns'][0]}"
                    }
            elif 'pie' in question_lower:
                return suggest_pie_chart(data_info, df)
            elif 'bar' in question_lower:
                if 'grade' in question_lower and 'Total Cans' in data_info['numeric_columns']:
                    return {
                        "type": "bar",
                        "x_axis": "Grade",
                        "y_axis": "Total Cans",
                        "title": "Total Cans by Grade"
                    }
                elif data_info['numeric_columns']:
                    # Generic bar chart
                    return {
                        "type": "bar",
                        "x_axis": data_info['columns'][0] if data_info['columns'] else None,
                        "y_axis": data_info['numeric_columns'][0],
                        "title": f"Bar Chart: {data_info['numeric_columns'][0]}"
                    }
            elif 'line' in question_lower:
                if data_info['date_columns'] and data_info['numeric_columns']:
                    return {
                        "type": "line",
                        "x_axis": data_info['date_columns'][0],
                        "y_axis": data_info['numeric_columns'][0],
                        "title": f"{data_info['numeric_columns'][0]} Over Time"
                    }
    
    # Check for specific analysis requests that imply charts
    if 'rank' in question_lower and ('analysis' in question_lower or 'histogram' in question_lower):
        return {
            "type": "histogram",
            "x_axis": "Rank",
            "title": "Rank Distribution Histogram"
        }
    
    # Check for simple chart type mentions (less aggressive - only if clear intent)
    if any(phrase in question_lower for phrase in ['make a pie chart', 'create a pie chart', 'generate a pie chart']):
        return suggest_pie_chart(data_info, df)
    
    return None

def find_chart_config_from_history(category_num, chat_history, data_info, df):
    """Find chart configuration based on category number mentioned in history"""
    # Look through recent assistant messages for chart suggestions
    for msg in reversed(chat_history[-10:]):
        assistant_msg = msg.get('assistant', '').lower()
        
        # Look for patterns like "Category 1:", "1.", "Option 1:"
        patterns = [
            rf'(?:category|option)\s*{category_num}[:\-]',
            rf'{category_num}\.\s*(?:category|option)',
            rf'{category_num}\s*[:\-]'
        ]
        
        import re
        for pattern in patterns:
            if re.search(pattern, assistant_msg):
                # Extract what category/option this refers to
                # Common patterns: pie chart by grade, bar chart, etc.
                
                # Pie chart patterns
                if 'pie' in assistant_msg or 'proportion' in assistant_msg:
                    if 'grade' in assistant_msg:
                        return suggest_pie_chart_by_column('Grade', data_info, df)
                    elif 'homeroom' in assistant_msg:
                        return suggest_pie_chart_by_column('Homeroom Teacher', data_info, df)
                    return suggest_pie_chart(data_info, df)
                
                # Bar chart patterns
                if 'bar' in assistant_msg:
                    if 'grade' in assistant_msg:
                        return {
                            "type": "bar",
                            "x_axis": "Grade",
                            "y_axis": "Total Cans",
                            "title": "Total Cans by Grade"
                        }
                
    # Default: create pie chart by grade if grade column exists
    if 'Grade' in data_info['columns']:
        return suggest_pie_chart_by_column('Grade', data_info, df)
    
    return None

def suggest_pie_chart(data_info, df):
    """Suggest a pie chart configuration"""
    # Default: by Grade if available
    if 'Grade' in data_info['columns']:
        return suggest_pie_chart_by_column('Grade', data_info, df)
    # Otherwise, use first categorical column
    for col in data_info['columns']:
        if col not in data_info['numeric_columns'] and col not in data_info['date_columns']:
            return suggest_pie_chart_by_column(col, data_info, df)
    return None

def suggest_pie_chart_by_column(column, data_info, df):
    """Create pie chart configuration for a specific column"""
    if column not in data_info['columns']:
        return None
    
    # Aggregate numeric column by the categorical column
    numeric_col = 'Total Cans' if 'Total Cans' in data_info['numeric_columns'] else data_info['numeric_columns'][0] if data_info['numeric_columns'] else None
    
    if not numeric_col:
        return None
    
    return {
        "type": "pie",
        "category_column": column,
        "value_column": numeric_col,
        "title": f"Distribution by {column}"
    }

def suggest_chart_type(question, data_info):
    """Suggest appropriate chart type based on question and data"""
    question_lower = question.lower()
    
    if any(word in question_lower for word in ['pie', 'pie chart']):
        return suggest_pie_chart(data_info, None)
    
    if any(word in question_lower for word in ['trend', 'over time', 'time series', 'timeline']):
        if data_info['date_columns']:
            return {
                "type": "line",
                "x_axis": data_info['date_columns'][0],
                "y_axis": data_info['numeric_columns'][0] if data_info['numeric_columns'] else None,
                "title": f"{data_info['numeric_columns'][0]} Over Time"
            }
    
    elif any(word in question_lower for word in ['compare', 'comparison', 'vs', 'versus']):
        if len(data_info['numeric_columns']) >= 2:
            return {
                "type": "bar",
                "x_axis": data_info['columns'][0],  # First column as categories
                "y_axis": data_info['numeric_columns'][0],
                "title": f"Comparison of {data_info['numeric_columns'][0]}"
            }
    
    elif any(word in question_lower for word in ['distribution', 'histogram', 'frequency']):
        if data_info['numeric_columns']:
            return {
                "type": "histogram",
                "x_axis": data_info['numeric_columns'][0],
                "title": f"Distribution of {data_info['numeric_columns'][0]}"
            }
    
    elif any(word in question_lower for word in ['correlation', 'relationship', 'scatter']):
        if len(data_info['numeric_columns']) >= 2:
            return {
                "type": "scatter",
                "x_axis": data_info['numeric_columns'][0],
                "y_axis": data_info['numeric_columns'][1],
                "title": f"{data_info['numeric_columns'][0]} vs {data_info['numeric_columns'][1]}"
            }
    
    return None

@app.route("/generate_custom_chart", methods=["POST"])
def generate_custom_chart():
    """Generate a custom chart based on AI suggestion"""
    try:
        data = request.get_json()
        chart_config = data.get("chart_config")
        
        if not chart_config:
            return jsonify({"error": "Chart configuration required"}), 400
        
        data_path = session.get("data_path")
        if not data_path or not os.path.exists(data_path):
            return jsonify({"error": "No data file uploaded"}), 400
        
        # Load data
        df = pd.read_excel(data_path) if data_path.endswith('.xlsx') else pd.read_csv(data_path)
        
        # Generate chart based on type
        chart_id = str(uuid.uuid4())
        chart_data = create_custom_chart(df, chart_config, chart_id)
        
        if chart_data:
            # Save chart
            chart_path = os.path.join(app.config['CHARTS_FOLDER'], f'chart_{chart_id}.json')
            with open(chart_path, 'w') as f:
                json.dump(chart_data, f)
            
            # Add to session
            if 'chart_images' not in session:
                session['chart_images'] = []
            session['chart_images'].append(chart_id)
            
            return jsonify({
                "chart_id": chart_id,
                "chart_data": chart_data,
                "message": "Chart generated successfully"
            })
        else:
            return jsonify({"error": "Failed to generate chart"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def create_custom_chart(df, config, chart_id):
    """Create a custom chart based on configuration"""
    try:
        chart_type = config.get("type")
        title = config.get("title", "Custom Chart")
        
        if chart_type == "pie":
            category_column = config.get("category_column")
            value_column = config.get("value_column")
            
            if category_column in df.columns and value_column in df.columns:
                # Aggregate data by category
                aggregated = df.groupby(category_column)[value_column].sum().reset_index()
                # Remove NaN/null categories
                aggregated = aggregated.dropna(subset=[category_column])
                
                fig = px.pie(
                    aggregated, 
                    values=value_column, 
                    names=category_column, 
                    title=title,
                    hole=0.3  # Make it a donut chart for better aesthetics
                )
                fig.update_traces(textposition='inside', textinfo='percent+label')
                fig.update_layout(
                    font=dict(size=12),
                    showlegend=True,
                    legend=dict(orientation="v", yanchor="middle", y=0.5, xanchor="left", x=1.05)
                )
            else:
                return None
                
        elif chart_type == "line":
            x_axis = config.get("x_axis")
            y_axis = config.get("y_axis")
            if x_axis in df.columns and y_axis in df.columns:
                fig = px.line(df, x=x_axis, y=y_axis, title=title, markers=True)
            else:
                return None
                
        elif chart_type == "bar":
            x_axis = config.get("x_axis")
            y_axis = config.get("y_axis")
            if x_axis in df.columns and y_axis in df.columns:
                fig = px.bar(df, x=x_axis, y=y_axis, title=title)
            else:
                return None
                
        elif chart_type == "histogram":
            y_axis = config.get("y_axis") or config.get("x_axis")
            if y_axis in df.columns:
                fig = px.histogram(df, x=y_axis, title=title)
            else:
                return None
                
        elif chart_type == "scatter":
            x_axis = config.get("x_axis")
            y_axis = config.get("y_axis")
            if x_axis in df.columns and y_axis in df.columns:
                fig = px.scatter(df, x=x_axis, y=y_axis, title=title)
            else:
                return None
        else:
            return None
        
        # Convert to JSON
        chart_json = fig.to_json()
        chart_data = json.loads(chart_json)
        chart_data['id'] = chart_id
        chart_data['title'] = title
        chart_data['type'] = chart_type
        
        return chart_data
        
    except Exception as e:
        logging.error(f"Error creating custom chart: {e}", exc_info=True)
        return None

@app.route("/test_ai", methods=["POST"])
def test_ai():
    """Test endpoint to verify AI API is working"""
    try:
        if not OPENROUTER_API_KEY:
            return jsonify({"error": "No API key configured"}), 400
        
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": MODEL,
            "messages": [
                {"role": "user", "content": "Hello, can you respond with 'AI is working'?"}
            ],
            "max_tokens": 50,
            "temperature": 0.7
        }
        
        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            ai_response = response.json()
            return jsonify({
                "status": "success",
                "model": MODEL,
                "response": ai_response['choices'][0]['message']['content'],
                "full_response": ai_response
            })
        else:
            return jsonify({
                "status": "error",
                "status_code": response.status_code,
                "response": response.text
            }), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health")
def health():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route("/test_ai_simple")
def test_ai_simple():
    """Simple test endpoint to verify AI chat is working"""
    return jsonify({
        "answer": "Hello! This is a test response from the AI chat endpoint. If you can see this, the connection is working!",
        "chart_suggestion": None,
        "data_info": {"test": True}
    })

if __name__ == "__main__":
    # Use environment variable for debug mode (defaults to False for production)
    debug_mode = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)