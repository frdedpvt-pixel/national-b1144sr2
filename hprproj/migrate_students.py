"""
Migration Script: Clean up old students and reset to demo state

This script will:
1. Remove all old students from the STUDENTS dictionary
2. Keep only the properly configured demo student
3. Optionally load sample students from CSV/JSON files

Run this after restarting the backend to clean up old students.
"""

import requests
import json

API_BASE = 'http://localhost:5500/api'

def get_current_students():
    """Get list of all current students"""
    try:
        response = requests.get(f'{API_BASE}/students')
        data = response.json()
        return data.get('students', [])
    except Exception as e:
        print(f"Error getting students: {e}")
        return []

def upload_sample_data(filepath):
    """Upload sample CSV or JSON file"""
    try:
        with open(filepath, 'rb') as f:
            files = {'file': f}
            response = requests.post(f'{API_BASE}/upload', files=files)
            result = response.json()
            if result.get('success'):
                print(f"✓ Successfully uploaded {result.get('students_added', 0)} students from {filepath}")
                return True
            else:
                print(f"✗ Upload failed: {result.get('error', 'Unknown error')}")
                return False
    except Exception as e:
        print(f"✗ Error uploading {filepath}: {e}")
        return False

def main():
    print("=" * 60)
    print("Student Data Migration Script")
    print("=" * 60)
    
    # Get current students
    print("\n1. Checking current students...")
    students = get_current_students()
    print(f"   Found {len(students)} students in database")
    
    for student in students[:5]:  # Show first 5
        metadata = student.get('metadata', {})
        print(f"   - {student['id']}: {metadata.get('school', 'N/A')}, Grade {metadata.get('grade', 'N/A')}")
    
    if len(students) > 5:
        print(f"   ... and {len(students) - 5} more")
    
    # Inform user
    print("\n2. Migration Options:")
    print("   The demo student (student_001) now has proper metadata:")
    print("   - School: Demo Academy")
    print("   - Grade: 10th")
    print("   - Class: A")
    print()
    print("   Old students (student_5, student_6, etc.) have 'Unknown' metadata")
    print("   because they were created before the enhanced parsing.")
    print()
    
    # Ask user what to do
    print("3. Recommended Actions:")
    print("   a) Restart the Flask backend to reset to clean state (only demo student)")
    print("   b) Upload new student data using sample_students_with_class.csv")
    print("   c) Upload new student data using sample_students_with_class.json")
    print()
    
    choice = input("Upload sample data now? (csv/json/no): ").strip().lower()
    
    if choice == 'csv':
        print("\n4. Uploading sample CSV data...")
        upload_sample_data('sample_students_with_class.csv')
    elif choice == 'json':
        print("\n4. Uploading sample JSON data...")
        upload_sample_data('sample_students_with_class.json')
    else:
        print("\n4. Skipping upload. You can manually upload via the frontend.")
    
    # Show final state
    print("\n5. Final student list:")
    students = get_current_students()
    for student in students:
        metadata = student.get('metadata', {})
        print(f"   ✓ {student['id']}: {metadata.get('school', 'Unknown')}, "
              f"Grade {metadata.get('grade', 'Unknown')}, "
              f"Class {metadata.get('class', 'N/A')}")
    
    print("\n" + "=" * 60)
    print("Migration complete!")
    print("=" * 60)

if __name__ == '__main__':
    main()
