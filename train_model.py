import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from Backend.database import SessionLocal, engine, Base
from Backend.ml_model import RiskPredictionModel
import pandas as pd

def initialize_database():
    """Initialize database with sample data"""
    from Backend import models
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Add sample students
    sample_students = [
        models.Student(
            name="Rajesh Kumar",
            age=12,
            grade="5",
            village="Rural Village",
            school="Government School",
            contact="9876543210",
            learning_style="visual"
        ),
        models.Student(
            name="Priya Sharma",
            age=11,
            grade="5",
            village="Rural Village",
            school="Government School",
            contact="9876543211",
            learning_style="auditory"
        ),
        models.Student(
            name="Amit Singh",
            age=12,
            grade="5",
            village="Rural Village",
            school="Government School",
            contact="9876543212",
            learning_style="kinesthetic"
        )
    ]
    
    for student in sample_students:
        db.add(student)
    
    db.commit()
    
    # Add sample syllabus
    sample_syllabus = [
        models.Syllabus(
            subject="Mathematics",
            grade="5",
            chapter="Numbers and Operations",
            topic="Basic Arithmetic",
            content="Learn addition, subtraction, multiplication, and division",
            difficulty_level="easy",
            estimated_time=120,
            prerequisites="Basic counting",
            learning_outcomes="Understand basic arithmetic operations",
            offline_resources='["math_basics.pdf"]'
        ),
        models.Syllabus(
            subject="Science",
            grade="5",
            chapter="Plants",
            topic="Photosynthesis",
            content="Learn how plants make their food",
            difficulty_level="medium",
            estimated_time=90,
            prerequisites="Basic biology",
            learning_outcomes="Understand photosynthesis process",
            offline_resources='["plants_science.pdf"]'
        )
    ]
    
    for syllabus in sample_syllabus:
        db.add(syllabus)
    
    db.commit()
    db.close()
    
    print("Database initialized with sample data")

def train_ml_model():
    """Setup the machine learning model"""
    db = SessionLocal()
    
    model = RiskPredictionModel()
    # Just load the model instead of training
    model.load_model()
    
    db.close()
    print("✅ ML model setup completed")

if __name__ == "__main__":
    print("Initializing Offline Learning Analytics System...")
    
    # Step 1: Initialize database
    print("\n1. Initializing database...")
    initialize_database()
    
    # Step 2: Train ML model
    print("\n2. Training ML model...")
    train_ml_model()
    
    print("\nSetup completed successfully!")
    print("\nTo start the server, run:")
    print("python -m Backend.main")
