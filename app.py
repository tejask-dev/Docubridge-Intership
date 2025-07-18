import os
import pandas as pd
from flask import Flask, render_template, request

ALLOWED_EXTENSIONS = {'xls', 'xlsx', 'csv'}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
app.secret_key = 'supersecretkey'

@app.route("/")
def home():
    return render_template("index.html")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/upload", methods=['POST'])
def upload():
    file = request.files.get("file")
    question = request.form.get("user_question")

    if not file or not question:
        return "❌ Missing file or question.", 400

    if not allowed_file(file.filename):
        return "❌ Invalid file type. Only .xls, .xlsx, or .csv allowed.", 400

    filename = file.filename
    file_ext = filename.rsplit('.', 1)[1].lower()

    try:
        # Read the file using Pandas
        if file_ext == 'csv':
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)

        # Extract basic info
        preview = df.head(5).to_html(classes='data', header="true")
        columns = df.columns.tolist()

        print("✅ Excel file parsed successfully")
        print("📊 Columns:", columns)

        return f"""
            <h2>✅ File received: {filename}</h2>
            <h3>📩 Question: {question}</h3>
            <h4>📊 First 5 rows of the spreadsheet:</h4>
            {preview}
            <br><a href="/">🔙 Go back</a>
        """

    except Exception as e:
        print("❌ Error reading file:", e)
        return "❌ Failed to read the uploaded Excel file.", 500

if __name__ == "__main__":
    app.run(debug=True)
