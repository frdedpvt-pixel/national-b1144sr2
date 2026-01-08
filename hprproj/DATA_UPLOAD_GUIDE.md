# Multi-Student Data Upload Guide

## Overview

The system now supports uploading CSV or JSON files with heterogeneous student populations including demographic data.

## File Formats

### CSV Format

**Required column:** `student_id`  
**Optional demographic columns:** `school`, `age`, `grade`  
**Concept mastery columns:** Use concept names with values 0-1 (or 0-100, will be auto-normalized)

**Example (`sample_students.csv`):**
```csv
student_id,school,age,grade,Numbers,Addition,Subtraction,Multiplication,Division,Fractions,Decimals,Algebra,Equations
S001,Lincoln High,15,10th,95,90,88,75,65,70,60,45,30
S002,Washington Middle,13,8th,85,80,82,60,45,55,40,25,15
```

### JSON Format

**Required field:** `student_id`  
**Optional demographics:** `school`, `age`, `grade`, and any custom fields  
**Mastery data:** Nested object with concept names as keys

**Example (`sample_students.json`):**
```json
[
  {
    "student_id": "S101",
    "school": "Riverside High",
    "age": 16,
    "grade": "11th",
    "gender": "F",
    "mastery": {
      "Numbers": 0.92,
      "Addition": 0.88,
      "Multiplication": 0.78
    }
  }
]
```

## How to Upload

1. **Click "📁 Upload CSV/JSON"** button in the Student Data Management section
2. **Select your file** (.csv or .json)
3. **Wait for confirmation** - You'll see a success message with the number of students added
4. **Select a student** from the dropdown to view their data

## Features

### Student Selector
- Lists all students with their school and age
- Click to switch between students
- Automatically updates mastery visualization

### Metadata Display
Shows demographic information for the selected student:
- School name
- Age
- Grade level
- Upload timestamp
- Any custom fields from JSON

### Dynamic Mastery Updates
When you select a different student:
- Mastery bars update to show their proficiency levels
- Performance predictions use their specific data
- Counterfactual interventions apply to that student

## API Endpoints

- `POST /api/upload` - Upload CSV or JSON file
- `GET /api/students` - List all students with metadata
- `GET /api/student/<student_id>` - Get specific student's full data

## Sample Data Files

Two sample files are included:

1. **`sample_students.csv`** - 5 students from different schools with varying mastery levels
2. **`sample_students.json`** - 3 students with rich metadata including gender

Try uploading these to test the system!

## Use Cases

### Educational Research
- Compare students across different schools
- Analyze age/grade-based performance patterns
- Track heterogeneous populations

### Interventions
- Test counterfactual interventions on different student profiles
- Compare how interventions affect students at different mastery levels
- Identify which concepts to prioritize per student

### Hackathon Demo
- Load diverse student data to show real-world applicability
- Demonstrate fairness across demographics
- Show explainable predictions for different populations
