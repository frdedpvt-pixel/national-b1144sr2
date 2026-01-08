
import csv
import json
import random
import numpy as np
import os

CONCEPTS = [
    'Numbers', 'Addition', 'Subtraction', 'Multiplication',
    'Division', 'Fractions', 'Decimals', 'Algebra', 'Equations'
]

SCHOOLS = ['Lincoln High', 'Washington Tech', 'Jefferson Academy', 'Roosevelt High']

def generate_student(idx):
    base_mastery = random.random()
    mastery = {}
    for c in CONCEPTS:
        # Mastery correlated with base ability + random noise
        val = max(0, min(1, base_mastery + random.uniform(-0.2, 0.2)))
        mastery[c] = round(val, 2)
        
    return {
        'id': f'S{1000+idx}',
        'school': random.choice(SCHOOLS),
        'age': random.randint(14, 18),
        'grade': f'{random.randint(9,12)}th',
        'mastery': mastery
    }

def generate_csv(filename, n=50):
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        # Headers: student_id, school, age, grade, [Concepts...]
        # Mix cases to test robustness
        headers = ['Student ID', 'School', 'Age', 'Grade'] + CONCEPTS
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        
        for i in range(n):
            s = generate_student(i)
            row = {
                'Student ID': s['id'],
                'School': s['school'],
                'Age': s['age'],
                'Grade': s['grade']
            }
            # Flatten mastery
            row.update(s['mastery'])
            writer.writerow(row)
    print(f"Generated {filename} with {n} records.")

def generate_json(filename, n=50):
    data = []
    for i in range(n):
        s = generate_student(i+n) # Offset IDs
        # JSON format: {student_id: ..., mastery: {...}}
        record = {
            'student_id': s['id'],
            'School': s['school'], # Mixed case key
            'age': s['age'],
            'grade': s['grade'],
            'Mastery': s['mastery'] # Mixed case key
        }
        data.append(record)
        
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f"Generated {filename} with {n} records.")

if __name__ == "__main__":
    generate_csv('test_students_large.csv', 100)
    generate_json('test_students_complex.json', 50)
