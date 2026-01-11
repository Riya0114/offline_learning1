# attendance.py - Attendance Management Router
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, Float
from datetime import datetime, timedelta, date
from typing import List
from Backend.database import get_db
import Backend.models as models  # ✅ Import as module
import Backend.schemas as schemas

router = APIRouter(prefix="/attendance", tags=["attendance"])

@router.post("/", response_model=schemas.Attendance)
def mark_attendance(attendance: schemas.AttendanceCreate, db: Session = Depends(get_db)):
    """
    Mark attendance for a student
    """
    # Check if student exists
    student = db.query(models.Student).filter(models.Student.id == attendance.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Create attendance record
    db_attendance = models.Attendance(**attendance.dict())
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

@router.get("/student/{student_id}", response_model=List[schemas.Attendance])
def get_student_attendance(student_id: int, db: Session = Depends(get_db)):
    """
    Get all attendance records for a specific student
    """
    attendances = db.query(models.Attendance).filter(
        models.Attendance.student_id == student_id
    ).order_by(models.Attendance.date.desc()).all()
    return attendances

@router.get("/student/{student_id}/stats")
def get_attendance_stats(student_id: int, db: Session = Depends(get_db)):
    """
    Get attendance statistics for a student
    """
    # Get total attendance records
    total = db.query(models.Attendance).filter(
        models.Attendance.student_id == student_id
    ).count()
    
    # Get present records
    present = db.query(models.Attendance).filter(
        models.Attendance.student_id == student_id,
        models.Attendance.present == True
    ).count()
    
    # Calculate attendance rate
    attendance_rate = (present / total * 100) if total > 0 else 0
    
    # Get attendance by subject
    by_subject = db.query(
        models.Attendance.subject,
        func.count(models.Attendance.id).label('total'),
        func.sum(func.cast(models.Attendance.present, Float)).label('present')
    ).filter(
        models.Attendance.student_id == student_id
    ).group_by(models.Attendance.subject).all()
    
    # Recent attendance (last 7 days)
    recent_days = db.query(
        func.date(models.Attendance.date).label('date'),
        func.avg(func.cast(models.Attendance.present, Float)).label('attendance_rate')
    ).filter(
        models.Attendance.student_id == student_id,
        models.Attendance.date >= datetime.now() - timedelta(days=7)
    ).group_by(func.date(models.Attendance.date)).order_by(func.date(models.Attendance.date).desc()).all()
    
    return {
        "student_id": student_id,
        "total_days": total,
        "days_present": present,
        "attendance_rate": round(attendance_rate, 2),
        "by_subject": [
            {
                "subject": item.subject,
                "attendance_rate": round((item.present / item.total * 100), 2) if item.total > 0 else 0
            }
            for item in by_subject
        ],
        "recent_trend": [
            {
                "date": str(item.date),
                "attendance_rate": round(item.attendance_rate * 100, 2)
            }
            for item in recent_days
        ]
    }

@router.get("/today")
def get_today_attendance(db: Session = Depends(get_db)):
    """
    Get today's attendance summary
    """
    today = date.today()
    attendances = db.query(models.Attendance).filter(
        func.date(models.Attendance.date) == today
    ).all()
    
    present_count = sum(1 for a in attendances if a.present)
    total_count = len(attendances)
    
    return {
        "date": str(today),
        "total_students": total_count,
        "present_count": present_count,
        "absent_count": total_count - present_count,
        "attendance_rate": round((present_count / total_count * 100), 2) if total_count > 0 else 0
    }

@router.get("/date/{date_str}")
def get_attendance_by_date(date_str: str, db: Session = Depends(get_db)):
    """
    Get attendance for a specific date (format: YYYY-MM-DD)
    """
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    attendances = db.query(models.Attendance).filter(
        func.date(models.Attendance.date) == target_date
    ).all()
    
    # Get student details for each attendance
    attendance_with_details = []
    for attendance in attendances:
        student = db.query(models.Student).filter(models.Student.id == attendance.student_id).first()
        if student:
            attendance_with_details.append({
                "attendance_id": attendance.id,
                "student_id": attendance.student_id,
                "student_name": student.name,
                "present": attendance.present,
                "subject": attendance.subject,
                "date": attendance.date
            })
    
    present_count = sum(1 for a in attendances if a.present)
    total_count = len(attendances)
    
    return {
        "date": str(target_date),
        "total_records": total_count,
        "present_count": present_count,
        "absent_count": total_count - present_count,
        "attendance_rate": round((present_count / total_count * 100), 2) if total_count > 0 else 0,
        "attendance_details": attendance_with_details
    }

@router.put("/{attendance_id}")
def update_attendance(
    attendance_id: int, 
    attendance_update: schemas.AttendanceUpdate, 
    db: Session = Depends(get_db)
):
    """
    Update an attendance record
    """
    attendance = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    # Update fields
    for key, value in attendance_update.dict(exclude_unset=True).items():
        setattr(attendance, key, value)
    
    db.commit()
    db.refresh(attendance)
    return attendance

@router.delete("/{attendance_id}")
def delete_attendance(attendance_id: int, db: Session = Depends(get_db)):
    """
    Delete an attendance record
    """
    attendance = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    db.delete(attendance)
    db.commit()
    return {"message": "Attendance record deleted successfully"}