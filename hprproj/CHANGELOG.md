# Causality-Aware Knowledge Tracing System

## 🎉 What's New - Multi-Student Support!

The system now supports uploading heterogeneous student populations with demographics:

### ✨ New Features
- **📁 File Upload**: Upload CSV or JSON files with student data
- **👥 Multi-Student Database**: Manage dozens or hundreds of students
- **📊 Demographics**: Track school, age, grade, and custom metadata
- **🔄 Student Switcher**: Easily switch between students to compare
- **📈 Metadata Display**: View student demographics in real-time

### 📋 Quick Start with Sample Data

1. **Start the server** (if not running):
   ```bash
   python backend.py
   ```

2. **Open the frontend** in your browser

3. **Upload sample data**:
   - Click "📁 Upload CSV/JSON"
   - Select `sample_students.csv` or `sample_students.json`
   - See confirmation message

4. **Switch students**:
   - Use the dropdown to select different students
   - Watch the mastery bars update
   - View their demographics below the selector

### 📂 File Formats

**CSV Example:**
```csv
student_id,school,age,grade,Numbers,Addition,Multiplication
S001,Lincoln High,15,10th,95,90,75
S002,Washington Middle,13,8th,85,80,60
```

**JSON Example:**
```json
[
  {
    "student_id": "S101",
    "school": "Riverside High",
    "age": 16,
    "grade": "11th",
    "mastery": {
      "Numbers": 0.92,
      "Addition": 0.88
    }
  }
]
```

### 🎯 Use Cases

1. **Research**: Compare performance across different schools or age groups
2. **Interventions**: Test counterfactuals on different student profiles
3. **Fairness Analysis**: Ensure predictions are equitable across demographics
4. **Hackathon Demo**: Show real-world applicability with diverse data

### 📖 Full Documentation

- See [`DATA_UPLOAD_GUIDE.md`](DATA_UPLOAD_GUIDE.md) for complete file format specs
- See [`README.md`](README.md) for general system documentation

### 🔧 API Endpoints Added

- `POST /api/upload` - Upload student data file
- `GET /api/students` - List all students with metadata  
- `GET /api/student/<id>` - Get specific student data

---

**Perfect for demonstrating how causal AI can handle real-world heterogeneous populations!** 🚀
