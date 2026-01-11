from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from Backend.database import get_db
from Backend import models, schemas

router = APIRouter(prefix="/alerts", tags=["alerts"])

class AlertService:
    @staticmethod
    def check_attendance_alerts(student_id: int, db: Session):
        """Check for attendance-related alerts"""
        alerts = []
        
        # Check recent attendance (last 7 days)
        week_ago = datetime.now() - timedelta(days=7)
        recent_attendance = db.query(models.Attendance).filter(
            models.Attendance.student_id == student_id,
            models.Attendance.date >= week_ago
        ).all()
        
        if recent_attendance:
            present_days = sum(1 for a in recent_attendance if a.present)
            attendance_rate = (present_days / len(recent_attendance)) * 100
            
            if attendance_rate < 70:
                alerts.append({
                    "type": "attendance_low",
                    "message": f"Low attendance rate: {attendance_rate:.1f}% in last 7 days",
                    "severity": "warning",
                    "recommendation": "Try to attend more regularly"
                })
        
        return alerts
    
    @staticmethod
    def check_study_alerts(student_id: int, db: Session):
        """Check for study-related alerts"""
        alerts = []
        
        # Check recent study activity
        week_ago = datetime.now() - timedelta(days=7)
        recent_activities = db.query(models.LearningActivity).filter(
            models.LearningActivity.student_id == student_id,
            models.LearningActivity.start_time >= week_ago
        ).count()
        
        if recent_activities < 3:
            alerts.append({
                "type": "low_study_activity",
                "message": f"Low study activity: only {recent_activities} sessions in last 7 days",
                "severity": "warning",
                "recommendation": "Try to study at least 30 minutes daily"
            })
        
        return alerts
    
    @staticmethod
    def check_performance_alerts(student_id: int, db: Session):
        """Check for performance-related alerts"""
        alerts = []
        
        # Check recent assessment scores
        recent_assessments = db.query(models.Assessment).filter(
            models.Assessment.student_id == student_id
        ).order_by(models.Assessment.date.desc()).limit(5).all()
        
        if recent_assessments:
            scores = [a.score / a.max_score * 100 for a in recent_assessments]
            avg_score = sum(scores) / len(scores)
            
            if avg_score < 50:
                alerts.append({
                    "type": "low_performance",
                    "message": f"Average score is low: {avg_score:.1f}%",
                    "severity": "warning",
                    "recommendation": "Review difficult topics and practice more"
                })
        
        return alerts

@router.get("/student/{student_id}")
def get_student_alerts(student_id: int, db: Session = Depends(get_db)):
    """Get all alerts for a student"""
    # Check if student exists
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Collect alerts from different checks
    alerts = []
    
    alerts.extend(AlertService.check_attendance_alerts(student_id, db))
    alerts.extend(AlertService.check_study_alerts(student_id, db))
    alerts.extend(AlertService.check_performance_alerts(student_id, db))
    
    return {
        "student_id": student_id,
        "student_name": student.name,
        "total_alerts": len(alerts),
        "alerts": alerts,
        "checked_at": datetime.now().isoformat()
    }

@router.get("/summary")
def get_alerts_summary(days: int = 7, db: Session = Depends(get_db)):
    """Get summary of all alerts"""
    all_students = db.query(models.Student).all()
    
    summary = {
        "total_students": len(all_students),
        "students_with_alerts": 0,
        "alert_types": {
            "attendance_low": 0,
            "low_study_activity": 0,
            "low_performance": 0
        },
        "by_severity": {
            "warning": 0,
            "critical": 0
        }
    }
    
    for student in all_students:
        alerts = AlertService.check_attendance_alerts(student.id, db)
        alerts.extend(AlertService.check_study_alerts(student.id, db))
        alerts.extend(AlertService.check_performance_alerts(student.id, db))
        
        if alerts:
            summary["students_with_alerts"] += 1
            
        for alert in alerts:
            summary["alert_types"][alert["type"]] = summary["alert_types"].get(alert["type"], 0) + 1
            summary["by_severity"][alert["severity"]] = summary["by_severity"].get(alert["severity"], 0) + 1
    
    return summary