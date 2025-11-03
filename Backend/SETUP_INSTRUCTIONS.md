# Setup Instructions

## Quick Start

1. **Create .env file** in the Backend directory:
   ```
   OPENROUTER_API_KEY=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
   FLASK_SECRET_KEY=your-super-secret-key-here-make-it-long-and-random-12345
   FLASK_ENV=development
   ```

2. **Install Python dependencies**:
   ```bash
   cd Backend
   pip install -r requirements.txt
   ```

3. **Run the backend**:
   ```bash
   python app.py
   ```

4. **Run the frontend** (in another terminal):
   ```bash
   cd frontend
   npm start
   ```

## Features

- **AI Chat**: Ask questions about your Excel data
- **Graph Generation**: AI suggests and creates charts
- **Graph Gallery**: View and download generated charts
- **Fallback Mode**: Works even without API key (basic responses)

## Troubleshooting

- If AI chat shows 500 errors, check that the .env file exists with correct API key
- The app will work in fallback mode without the API key
- Check console logs for detailed error messages
