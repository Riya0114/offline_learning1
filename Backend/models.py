from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from Backend.database import Base

class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer)
    grade = Column(String(10))
    village = Column(String(100))
    school = Column(String(100))
    contact = Column(String(20))
    learning_style = Column(String(50))
    last_sync = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    attendances = relationship("Attendance", back_populates="student")
    activities = relationship("LearningActivity", back_populates="student")
    assessments = relationship("Assessment", back_populates="student")

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    date = Column(DateTime(timezone=True), server_default=func.now())
    present = Column(Boolean, default=False)
    subject = Column(String(50))
    
    # Relationship
    student = relationship("Student", back_populates="attendances")

class Syllabus(Base):
    __tablename__ = "syllabus"
    
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(50), nullable=False)
    grade = Column(String(10), nullable=False)
    chapter = Column(String(100), nullable=False)
    topic = Column(String(200))
    content = Column(Text)
    difficulty_level = Column(String(20))  # easy, medium, hard
    estimated_time = Column(Integer)  # in minutes
    prerequisites = Column(Text)
    learning_outcomes = Column(Text)
    offline_resources = Column(Text)  # JSON string of file paths

class LearningActivity(Base):
    __tablename__ = "learning_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    syllabus_id = Column(Integer, ForeignKey("syllabus.id"))
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True))
    duration = Column(Integer)  # in minutes
    completed = Column(Boolean, default=False)
    score = Column(Float)
    notes = Column(Text)
    
    # Relationships
    student = relationship("Student", back_populates="activities")
    syllabus = relationship("Syllabus")

class Assessment(Base):
    __tablename__ = "assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    subject = Column(String(50))
    chapter = Column(String(100))
    score = Column(Float)
    max_score = Column(Float)
    date = Column(DateTime(timezone=True), server_default=func.now())
    time_taken = Column(Integer)  # in minutes
    
    # Relationship
    student = relationship("Student", back_populates="assessments")

class RiskPrediction(Base):
    __tablename__ = "risk_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    attendance_rate = Column(Float)
    avg_score = Column(Float)
    study_consistency = Column(Float)
    risk_level = Column(String(20))  # low, medium, high
    prediction_date = Column(DateTime(timezone=True), server_default=func.now())
    recommendations = Column(Text)