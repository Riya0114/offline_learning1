from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class StudentBase(BaseModel):
    name: str
    age: Optional[int] = None
    grade: Optional[str] = None
    village: Optional[str] = None
    school: Optional[str] = None
    contact: Optional[str] = None
    learning_style: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    grade: Optional[str] = None
    village: Optional[str] = None
    school: Optional[str] = None
    contact: Optional[str] = None
    learning_style: Optional[str] = None
    last_sync: Optional[datetime] = None

class Student(StudentBase):
    id: int
    last_sync: datetime
    
    class Config:
        from_attributes = True

class AttendanceBase(BaseModel):
    student_id: int
    present: bool
    subject: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    student_id: Optional[int] = None
    present: Optional[bool] = None
    subject: Optional[str] = None
    date: Optional[datetime] = None

class Attendance(AttendanceBase):
    id: int
    date: datetime
    
    class Config:
        from_attributes = True

class SyllabusBase(BaseModel):
    subject: str
    grade: str
    chapter: str
    topic: Optional[str] = None
    content: Optional[str] = None
    difficulty_level: Optional[str] = None
    estimated_time: Optional[int] = None
    prerequisites: Optional[str] = None
    learning_outcomes: Optional[str] = None
    offline_resources: Optional[str] = None

class SyllabusCreate(SyllabusBase):
    pass

class SyllabusUpdate(BaseModel):
    subject: Optional[str] = None
    grade: Optional[str] = None
    chapter: Optional[str] = None
    topic: Optional[str] = None
    content: Optional[str] = None
    difficulty_level: Optional[str] = None
    estimated_time: Optional[int] = None
    prerequisites: Optional[str] = None
    learning_outcomes: Optional[str] = None
    offline_resources: Optional[str] = None

class Syllabus(SyllabusBase):
    id: int
    
    class Config:
        from_attributes = True

class LearningActivityBase(BaseModel):
    student_id: int
    syllabus_id: int
    completed: bool = False
    score: Optional[float] = None
    notes: Optional[str] = None

class LearningActivityCreate(LearningActivityBase):
    pass

class LearningActivityUpdate(BaseModel):
    student_id: Optional[int] = None
    syllabus_id: Optional[int] = None
    completed: Optional[bool] = None
    score: Optional[float] = None
    notes: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[int] = None

class LearningActivity(LearningActivityBase):
    id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[int] = None
    
    class Config:
        from_attributes = True

class AssessmentBase(BaseModel):
    student_id: int
    subject: str
    chapter: str
    score: float
    max_score: float
    time_taken: int

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentUpdate(BaseModel):
    student_id: Optional[int] = None
    subject: Optional[str] = None
    chapter: Optional[str] = None
    score: Optional[float] = None
    max_score: Optional[float] = None
    time_taken: Optional[int] = None
    date: Optional[datetime] = None

class Assessment(AssessmentBase):
    id: int
    date: datetime
    
    class Config:
        from_attributes = True

class RiskPredictionBase(BaseModel):
    student_id: int
    attendance_rate: float
    avg_score: float
    study_consistency: float
    risk_level: str
    recommendations: Optional[str] = None

class RiskPredictionCreate(RiskPredictionBase):
    pass

class RiskPredictionUpdate(BaseModel):
    student_id: Optional[int] = None
    attendance_rate: Optional[float] = None
    avg_score: Optional[float] = None
    study_consistency: Optional[float] = None
    risk_level: Optional[str] = None
    recommendations: Optional[str] = None
    prediction_date: Optional[datetime] = None

class RiskPrediction(RiskPredictionBase):
    id: int
    prediction_date: datetime
    
    class Config:
        from_attributes = True

class AnalyticsResponse(BaseModel):
    student_id: int
    attendance_rate: float
    avg_score: float
    completion_rate: float
    study_hours: float
    risk_level: str
    recommendations: List[str]
    progress_by_subject: dict