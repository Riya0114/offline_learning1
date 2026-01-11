from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from Backend.database import get_db
from Backend import models, schemas
import json

router = APIRouter(prefix="/syllabus", tags=["syllabus"])

@router.post("/", response_model=schemas.Syllabus)
def create_syllabus(syllabus: schemas.SyllabusCreate, db: Session = Depends(get_db)):
    db_syllabus = models.Syllabus(**syllabus.dict())
    db.add(db_syllabus)
    db.commit()
    db.refresh(db_syllabus)
    return db_syllabus

@router.get("/", response_model=List[schemas.Syllabus])
def read_syllabus(
    grade: Optional[str] = None,
    subject: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.Syllabus)
    
    if grade:
        query = query.filter(models.Syllabus.grade == grade)
    if subject:
        query = query.filter(models.Syllabus.subject == subject)
    
    syllabus = query.offset(skip).limit(limit).all()
    return syllabus

@router.get("/{syllabus_id}", response_model=schemas.Syllabus)
def read_syllabus_item(syllabus_id: int, db: Session = Depends(get_db)):
    syllabus = db.query(models.Syllabus).filter(models.Syllabus.id == syllabus_id).first()
    if syllabus is None:
        raise HTTPException(status_code=404, detail="Syllabus item not found")
    return syllabus

@router.get("/student/{student_id}/recommended")
def get_recommended_syllabus(student_id: int, db: Session = Depends(get_db)):
    # Get student's grade
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get student's completed activities
    completed = db.query(models.LearningActivity.syllabus_id).filter(
        models.LearningActivity.student_id == student_id,
        models.LearningActivity.completed == True
    ).all()
    completed_ids = [c[0] for c in completed]
    
    # Get syllabus for student's grade
    syllabus = db.query(models.Syllabus).filter(
        models.Syllabus.grade == student.grade
    ).all()
    
    # Categorize by difficulty and completion status
    recommended = []
    in_progress = []
    completed_items = []
    
    for item in syllabus:
        item_dict = {
            "id": item.id,
            "subject": item.subject,
            "chapter": item.chapter,
            "topic": item.topic,
            "difficulty_level": item.difficulty_level,
            "estimated_time": item.estimated_time
        }
        
        if item.id in completed_ids:
            completed_items.append(item_dict)
        elif item.difficulty_level == "easy":
            recommended.append(item_dict)
        else:
            in_progress.append(item_dict)
    
    return {
        "student_id": student_id,
        "grade": student.grade,
        "recommended": recommended[:5],  # Top 5 easy items
        "in_progress": in_progress,
        "completed": completed_items
    }

@router.get("/offline/resources")
def get_offline_resources():
    # This would typically load from a JSON file or database
    # For rural offline use, this could be pre-loaded educational content
    resources = {
        "mathematics": {
            "grade_5": [
                {
                    "chapter": "Basic Arithmetic",
                    "topics": ["Addition", "Subtraction", "Multiplication", "Division"],
                    "resources": ["math_basics.pdf", "arithmetic_video.mp4"],
                    "worksheets": ["worksheet1.pdf", "worksheet2.pdf"]
                }
            ]
        },
        "science": {
            "grade_5": [
                {
                    "chapter": "Plants and Animals",
                    "topics": ["Photosynthesis", "Animal Classification"],
                    "resources": ["science_basics.pdf"],
                    "worksheets": ["science_ws1.pdf"]
                }
            ]
        }
    }
    return resources