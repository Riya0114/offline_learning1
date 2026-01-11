# activities.py - Learning Activities Management Router
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, Integer
from datetime import datetime, timedelta
from typing import List, Optional
from Backend.database import get_db
from Backend import models, schemas

router = APIRouter(prefix="/activities", tags=["activities"])

@router.post("/start", response_model=schemas.LearningActivity)
def start_learning_activity(
    activity: schemas.LearningActivityCreate,
    db: Session = Depends(get_db)
):
    """
    Start a new learning activity for a student
    """
    # Check if student and syllabus exist
    student = db.query(models.Student).filter(models.Student.id == activity.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    syllabus = db.query(models.Syllabus).filter(models.Syllabus.id == activity.syllabus_id).first()
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus item not found")
    
    # Create new activity
    db_activity = models.LearningActivity(
        student_id=activity.student_id,
        syllabus_id=activity.syllabus_id,
        start_time=datetime.now()
    )
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity

@router.post("/{activity_id}/complete")
def complete_learning_activity(
    activity_id: int,
    score: Optional[float] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Complete a learning activity
    """
    activity = db.query(models.LearningActivity).filter(
        models.LearningActivity.id == activity_id
    ).first()
    
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    activity.end_time = datetime.now()
    activity.completed = True
    
    # Calculate duration in minutes
    if activity.start_time and activity.end_time:
        duration = (activity.end_time - activity.start_time).total_seconds() / 60
        activity.duration = round(duration, 2)
    
    if score is not None:
        activity.score = score
    
    if notes:
        activity.notes = notes
    
    db.commit()
    db.refresh(activity)
    
    return {
        "message": "Activity completed successfully",
        "activity_id": activity_id,
        "duration_minutes": activity.duration,
        "score": activity.score,
        "completed": activity.completed
    }

@router.get("/student/{student_id}", response_model=List[schemas.LearningActivity])
def get_student_activities(
    student_id: int,
    completed: Optional[bool] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get all learning activities for a student
    """
    # Check if student exists
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    query = db.query(models.LearningActivity).filter(
        models.LearningActivity.student_id == student_id
    )
    
    if completed is not None:
        query = query.filter(models.LearningActivity.completed == completed)
    
    activities = query.order_by(models.LearningActivity.start_time.desc()).limit(limit).all()
    return activities

@router.get("/student/{student_id}/progress")
def get_student_progress(student_id: int, db: Session = Depends(get_db)):
    """
    Get detailed progress report for a student
    """
    # Check if student exists
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get total activities
    total_activities = db.query(models.LearningActivity).filter(
        models.LearningActivity.student_id == student_id
    ).count()
    
    # Get completed activities
    completed_activities = db.query(models.LearningActivity).filter(
        models.LearningActivity.student_id == student_id,
        models.LearningActivity.completed == True
    ).count()
    
    # Calculate average score
    avg_score = db.query(func.avg(models.LearningActivity.score)).filter(
        models.LearningActivity.student_id == student_id,
        models.LearningActivity.score.isnot(None)
    ).scalar() or 0
    
    # Get total study time
    total_study_time = db.query(func.sum(models.LearningActivity.duration)).filter(
        models.LearningActivity.student_id == student_id,
        models.LearningActivity.completed == True
    ).scalar() or 0
    
    # Get progress by subject
    progress_by_subject = db.query(
        models.Syllabus.subject,
        func.count(models.LearningActivity.id).label('total'),
        func.sum(func.cast(models.LearningActivity.completed, Integer)).label('completed'),
        func.avg(models.LearningActivity.score).label('avg_score')
    ).join(
        models.Syllabus, models.LearningActivity.syllabus_id == models.Syllabus.id
    ).filter(
        models.LearningActivity.student_id == student_id
    ).group_by(models.Syllabus.subject).all()
    
    # Weekly activity
    week_ago = datetime.now() - timedelta(days=7)
    weekly_activities = db.query(models.LearningActivity).filter(
        models.LearningActivity.student_id == student_id,
        models.LearningActivity.start_time >= week_ago
    ).count()
    
    # Current active activities
    active_activities = db.query(models.LearningActivity).filter(
        models.LearningActivity.student_id == student_id,
        models.LearningActivity.completed == False
    ).count()
    
    # Most recent activities
    recent_activities = db.query(models.LearningActivity).filter(
        models.LearningActivity.student_id == student_id
    ).order_by(models.LearningActivity.start_time.desc()).limit(5).all()
    
    return {
        "student_id": student_id,
        "student_name": student.name,
        "total_activities": total_activities,
        "completed_activities": completed_activities,
        "active_activities": active_activities,
        "completion_rate": round((completed_activities / total_activities * 100), 2) if total_activities > 0 else 0,
        "average_score": round(avg_score, 2),
        "total_study_hours": round(total_study_time / 60, 2),
        "weekly_activities": weekly_activities,
        "progress_by_subject": [
            {
                "subject": item.subject,
                "completed": item.completed or 0,
                "total": item.total or 0,
                "completion_rate": round((item.completed / item.total * 100), 2) if item.total > 0 else 0,
                "average_score": round(item.avg_score or 0, 2)
            }
            for item in progress_by_subject
        ],
        "recent_activities": [
            {
                "activity_id": act.id,
                "subject": act.syllabus.subject if act.syllabus else "Unknown",
                "start_time": act.start_time,
                "completed": act.completed,
                "score": act.score,
                "duration": act.duration
            }
            for act in recent_activities
        ]
    }

@router.get("/{activity_id}", response_model=schemas.LearningActivity)
def get_activity_details(activity_id: int, db: Session = Depends(get_db)):
    """
    Get details of a specific activity
    """
    activity = db.query(models.LearningActivity).filter(
        models.LearningActivity.id == activity_id
    ).first()
    
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    return activity

@router.put("/{activity_id}")
def update_activity(
    activity_id: int,
    activity_update: schemas.LearningActivityUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an activity record
    """
    activity = db.query(models.LearningActivity).filter(
        models.LearningActivity.id == activity_id
    ).first()
    
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Update fields
    for key, value in activity_update.dict(exclude_unset=True).items():
        setattr(activity, key, value)
    
    db.commit()
    db.refresh(activity)
    return activity

@router.delete("/{activity_id}")
def delete_activity(activity_id: int, db: Session = Depends(get_db)):
    """
    Delete an activity record
    """
    activity = db.query(models.LearningActivity).filter(
        models.LearningActivity.id == activity_id
    ).first()
    
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    db.delete(activity)
    db.commit()
    return {"message": "Activity deleted successfully"}

@router.get("/recent/{student_id}")
def get_recent_activities(student_id: int, days: int = 7, db: Session = Depends(get_db)):
    """
    Get recent activities for a student within specified days
    """
    since_date = datetime.now() - timedelta(days=days)
    
    activities = db.query(models.LearningActivity).filter(
        models.LearningActivity.student_id == student_id,
        models.LearningActivity.start_time >= since_date
    ).order_by(models.LearningActivity.start_time.desc()).all()
    
    daily_summary = {}
    for activity in activities:
        date_str = activity.start_time.date().isoformat()
        if date_str not in daily_summary:
            daily_summary[date_str] = {
                "date": date_str,
                "total_activities": 0,
                "total_duration": 0,
                "completed": 0,
                "average_score": 0,
                "scores": []
            }
        
        daily_summary[date_str]["total_activities"] += 1
        if activity.duration:
            daily_summary[date_str]["total_duration"] += activity.duration
        if activity.completed:
            daily_summary[date_str]["completed"] += 1
        if activity.score:
            daily_summary[date_str]["scores"].append(activity.score)
    
    # Calculate averages
    for date_str in daily_summary:
        scores = daily_summary[date_str]["scores"]
        daily_summary[date_str]["average_score"] = round(sum(scores) / len(scores), 2) if scores else 0
        del daily_summary[date_str]["scores"]
    
    return {
        "student_id": student_id,
        "period_days": days,
        "daily_summary": list(daily_summary.values())
    }