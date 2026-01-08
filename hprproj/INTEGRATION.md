# Teacher Help Platform Integration

## Overview
The **hprproj** (Causality-Aware Knowledge Tracing System) has been integrated into the Teacher Panel of the School Network Platform.

## How to Access

### For Teachers:
1. Navigate to the Teacher Dashboard at `http://localhost:5173/teacher/dashboard`
2. Click the **"📚 Teacher Help"** button in the Quick Actions section
3. The platform will open in a new tab

## Architecture

### Frontend
- **Location**: `hprproj/` folder
- **Main Files**: `index.html`, `script.js`, `styles.css`
- **Served By**: Express server on `http://localhost:5000/hprproj/`
- **Access URL**: `http://localhost:5000/hprproj/index.html`

### Backend
- **File**: `backend.py` (Flask)
- **Port**: 5001
- **API Base**: `http://localhost:5001/api`

## Starting the System

### Option 1: Quick Start (Windows)
Double-click `start-backend.bat` in the `hprproj` folder

### Option 2: Manual Start
```bash
cd hprproj
python backend.py
```

### Option 3: With Virtual Environment
```bash
cd hprproj
.venv\Scripts\activate  # Windows
python backend.py
```

## What It Does
The Teacher Help Platform provides advanced student analytics:

- **📊 Concept Graph Visualization**: Interactive D3.js graph showing prerequisite relationships
- **🧠 Mastery Tracking**: Real-time student mastery levels across all concepts
- **🔮 Performance Prediction**: Causal AI model predicting student success probability
- **💡 Counterfactual Reasoning**: "What-if" analysis for targeted interventions
- **📈 Intervention Optimization**: Recommends minimal study sets to reduce failure risk
- **🔍 Fragility Analysis**: Identifies bottleneck concepts affecting student progress
- **📁 Multi-Student Management**: Upload and analyze data for entire classrooms via CSV/JSON

## Integration Points

1. **Teacher Dashboard Button**:
   - File: `client/src/pages/teacher/Dashboard.jsx`
   - Opens: `http://localhost:5000/hprproj/index.html`

2. **Express Server Route**:
   - File: `server.js`
   - Serves static files from `hprproj/` folder

3. **Flask Backend**:
   - Runs independently on port 5001
   - Provides REST API for analytics engine

## Requirements
- Python 3.x
- Flask, flask-cors, numpy, scipy (see `requirements.txt`)
- Main Express server running (port 5000)

## Notes
- The Flask backend must be running for the frontend to function
- The system includes a demo student ("student_001") by default
- Teachers can upload student data via CSV or JSON files
- All data is in-memory (resets on backend restart)
