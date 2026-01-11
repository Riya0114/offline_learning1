from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case, and_, or_
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import numpy as np
from Backend import models
from Backend.ml_model import RiskPredictionModel

class LearningAnalytics:
    def __init__(self):
        self.risk_model = RiskPredictionModel()
    
    def get_student_analytics(self, student_id: int, db: Session) -> Dict:
        """Get comprehensive analytics for a student"""
        # Get basic student info
        student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if not student:
            return {"error": "Student not found"}
        
        # Calculate attendance analytics
        attendance_stats = self._calculate_attendance_stats(student_id, db)
        
        # Calculate learning progress
        learning_progress = self._calculate_learning_progress(student_id, db)
        
        # Calculate assessment scores
        assessment_scores = self._calculate_assessment_scores(student_id, db)
        
        # Calculate study patterns
        study_patterns = self._analyze_study_patterns(student_id, db)
        
        # Predict risk level
        risk_prediction = self._predict_risk_level(student_id, db, attendance_stats, learning_progress, assessment_scores)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            attendance_stats,
            learning_progress,
            assessment_scores,
            risk_prediction.get('risk_level', 'medium')
        )
        
        # Calculate progress by subject
        progress_by_subject = self._calculate_progress_by_subject(student_id, db)
        
        # Get recent activities
        recent_activities = db.query(models.LearningActivity).filter(
            models.LearningActivity.student_id == student_id
        ).order_by(models.LearningActivity.start_time.desc()).limit(5).all()
        
        return {
            "student_id": student_id,
            "student_name": student.name,
            "grade": student.grade,
            "village": student.village,
            "analytics_date": datetime.now().isoformat(),
            
            "attendance": attendance_stats,
            "learning_progress": learning_progress,
            "assessment_scores": assessment_scores,
            "study_patterns": study_patterns,
            "progress_by_subject": progress_by_subject,
            
            "risk_level": risk_prediction.get('risk_level', 'medium'),
            "risk_probabilities": risk_prediction.get('probabilities', {}),
            "risk_factors": risk_prediction.get('factors', []),
            
            "recommendations": recommendations,
            "recent_activities": [
                {
                    "id": act.id,
                    "syllabus_id": act.syllabus_id,
                    "start_time": act.start_time.isoformat() if act.start_time else None,
                    "duration": act.duration,
                    "completed": act.completed,
                    "score": act.score
                }
                for act in recent_activities
            ],
            
            "summary": self._generate_summary(
                attendance_stats,
                learning_progress,
                assessment_scores,
                risk_prediction.get('risk_level', 'medium')
            )
        }
    
    def _calculate_attendance_stats(self, student_id: int, db: Session) -> Dict:
        """Calculate attendance statistics"""
        # Get all attendance records for student
        attendance_records = db.query(models.Attendance).filter(
            models.Attendance.student_id == student_id
        ).all()
        
        if not attendance_records:
            return {
                "total_days": 0,
                "days_present": 0,
                "attendance_rate": 0,
                "by_subject": [],
                "recent_trend": [],
                "monthly_trend": []
            }
        
        total_days = len(attendance_records)
        days_present = sum(1 for record in attendance_records if record.present)
        attendance_rate = (days_present / total_days * 100) if total_days > 0 else 0
        
        # Attendance by subject
        by_subject = {}
        for record in attendance_records:
            subject = record.subject or "General"
            if subject not in by_subject:
                by_subject[subject] = {"total": 0, "present": 0}
            by_subject[subject]["total"] += 1
            if record.present:
                by_subject[subject]["present"] += 1
        
        # Recent trend (last 7 days)
        week_ago = datetime.now() - timedelta(days=7)
        recent_records = [r for r in attendance_records if r.date and r.date >= week_ago]
        
        recent_trend = {}
        for record in recent_records:
            if record.date:
                date_str = record.date.strftime("%Y-%m-%d")
                if date_str not in recent_trend:
                    recent_trend[date_str] = {"total": 0, "present": 0}
                recent_trend[date_str]["total"] += 1
                if record.present:
                    recent_trend[date_str]["present"] += 1
        
        # Monthly trend
        monthly_trend = {}
        for record in attendance_records:
            if record.date:
                month_key = record.date.strftime("%Y-%m")
                if month_key not in monthly_trend:
                    monthly_trend[month_key] = {"total": 0, "present": 0}
                monthly_trend[month_key]["total"] += 1
                if record.present:
                    monthly_trend[month_key]["present"] += 1
        
        return {
            "total_days": total_days,
            "days_present": days_present,
            "attendance_rate": round(attendance_rate, 2),
            "by_subject": [
                {
                    "subject": subject,
                    "total": data["total"],
                    "present": data["present"],
                    "rate": round((data["present"] / data["total"] * 100), 2) if data["total"] > 0 else 0
                }
                for subject, data in by_subject.items()
            ],
            "recent_trend": [
                {
                    "date": date_str,
                    "total": data["total"],
                    "present": data["present"],
                    "rate": round((data["present"] / data["total"] * 100), 2) if data["total"] > 0 else 0
                }
                for date_str, data in recent_trend.items()
            ],
            "monthly_trend": [
                {
                    "month": month_key,
                    "total": data["total"],
                    "present": data["present"],
                    "rate": round((data["present"] / data["total"] * 100), 2) if data["total"] > 0 else 0
                }
                for month_key, data in monthly_trend.items()
            ]
        }
    
    def _calculate_learning_progress(self, student_id: int, db: Session) -> Dict:
        """Calculate learning progress analytics"""
        # Get all learning activities for student
        activities = db.query(models.LearningActivity).filter(
            models.LearningActivity.student_id == student_id
        ).all()
        
        if not activities:
            return {
                "total_activities": 0,
                "completed_activities": 0,
                "completion_rate": 0,
                "average_score": 0,
                "total_study_time": 0,
                "average_duration": 0,
                "weekly_activities": 0,
                "score_distribution": []
            }
        
        total_activities = len(activities)
        completed_activities = sum(1 for act in activities if act.completed)
        completion_rate = (completed_activities / total_activities * 100) if total_activities > 0 else 0
        
        # Calculate scores
        scores = [act.score for act in activities if act.score is not None]
        average_score = sum(scores) / len(scores) if scores else 0
        
        # Calculate study time
        total_study_time = sum(act.duration or 0 for act in activities if act.duration)
        average_duration = total_study_time / len(activities) if activities else 0
        
        # Weekly activity count
        week_ago = datetime.now() - timedelta(days=7)
        weekly_activities = sum(1 for act in activities if act.start_time and act.start_time >= week_ago)
        
        # Score distribution
        score_distribution = {
            "excellent": sum(1 for act in activities if act.score and act.score >= 90),
            "good": sum(1 for act in activities if act.score and 75 <= act.score < 90),
            "average": sum(1 for act in activities if act.score and 60 <= act.score < 75),
            "poor": sum(1 for act in activities if act.score and act.score < 60),
            "no_score": sum(1 for act in activities if act.score is None)
        }
        
        return {
            "total_activities": total_activities,
            "completed_activities": completed_activities,
            "completion_rate": round(completion_rate, 2),
            "average_score": round(average_score, 2),
            "total_study_time": round(total_study_time, 2),
            "average_duration": round(average_duration, 2),
            "weekly_activities": weekly_activities,
            "score_distribution": score_distribution
        }
    
    def _calculate_assessment_scores(self, student_id: int, db: Session) -> Dict:
        """Calculate assessment scores analytics"""
        # Get all assessments for student
        assessments = db.query(models.Assessment).filter(
            models.Assessment.student_id == student_id
        ).all()
        
        if not assessments:
            return {
                "total_assessments": 0,
                "average_score": 0,
                "best_score": 0,
                "worst_score": 0,
                "improvement_trend": [],
                "by_subject": []
            }
        
        total_assessments = len(assessments)
        
        # Calculate scores
        scores = [ass.score / ass.max_score * 100 for ass in assessments if ass.max_score and ass.max_score > 0]
        average_score = sum(scores) / len(scores) if scores else 0
        best_score = max(scores) if scores else 0
        worst_score = min(scores) if scores else 0
        
        # Improvement trend (by date)
        assessments_by_date = sorted(
            [ass for ass in assessments if ass.date],
            key=lambda x: x.date
        )
        
        improvement_trend = [
            {
                "date": ass.date.strftime("%Y-%m-%d"),
                "score": round((ass.score / ass.max_score * 100), 2) if ass.max_score and ass.max_score > 0 else 0,
                "subject": ass.subject
            }
            for ass in assessments_by_date
        ]
        
        # Scores by subject
        scores_by_subject = {}
        for ass in assessments:
            subject = ass.subject or "General"
            percentage = (ass.score / ass.max_score * 100) if ass.max_score and ass.max_score > 0 else 0
            
            if subject not in scores_by_subject:
                scores_by_subject[subject] = {
                    "total": 0,
                    "sum": 0,
                    "scores": []
                }
            
            scores_by_subject[subject]["total"] += 1
            scores_by_subject[subject]["sum"] += percentage
            scores_by_subject[subject]["scores"].append(percentage)
        
        return {
            "total_assessments": total_assessments,
            "average_score": round(average_score, 2),
            "best_score": round(best_score, 2),
            "worst_score": round(worst_score, 2),
            "improvement_trend": improvement_trend,
            "by_subject": [
                {
                    "subject": subject,
                    "average_score": round(data["sum"] / data["total"], 2) if data["total"] > 0 else 0,
                    "total_assessments": data["total"],
                    "best_score": round(max(data["scores"]), 2) if data["scores"] else 0,
                    "worst_score": round(min(data["scores"]), 2) if data["scores"] else 0
                }
                for subject, data in scores_by_subject.items()
            ]
        }
    
    def _analyze_study_patterns(self, student_id: int, db: Session) -> Dict:
        """Analyze study patterns and habits"""
        activities = db.query(models.LearningActivity).filter(
            models.LearningActivity.student_id == student_id,
            models.LearningActivity.start_time.isnot(None)
        ).all()
        
        if not activities:
            return {
                "preferred_time": "Not enough data",
                "average_session_length": 0,
                "consistency_score": 0,
                "weekly_pattern": {},
                "peak_hours": []
            }
        
        # Analyze time of day preferences
        hour_distribution = {hour: 0 for hour in range(24)}
        for act in activities:
            if act.start_time:
                hour = act.start_time.hour
                hour_distribution[hour] = hour_distribution.get(hour, 0) + 1
        
        # Find preferred study time
        preferred_hour = max(hour_distribution.items(), key=lambda x: x[1])[0] if hour_distribution else None
        preferred_time = "Not enough data"
        if preferred_hour is not None:
            if 5 <= preferred_hour < 12:
                preferred_time = "Morning"
            elif 12 <= preferred_hour < 17:
                preferred_time = "Afternoon"
            elif 17 <= preferred_hour < 22:
                preferred_time = "Evening"
            else:
                preferred_time = "Night"
        
        # Calculate average session length
        durations = [act.duration for act in activities if act.duration]
        average_session_length = sum(durations) / len(durations) if durations else 0
        
        # Calculate consistency (study days per week)
        study_dates = set()
        for act in activities:
            if act.start_time:
                study_dates.add(act.start_time.date())
        
        total_days = len(study_dates)
        if total_days > 0:
            first_date = min(study_dates)
            last_date = max(study_dates)
            total_weeks = max(1, (last_date - first_date).days / 7)
            consistency_score = min(100, (total_days / (total_weeks * 7)) * 100)
        else:
            consistency_score = 0
        
        # Weekly pattern
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        weekly_pattern = {day: 0 for day in day_names}
        for act in activities:
            if act.start_time:
                day_index = act.start_time.weekday()
                weekly_pattern[day_names[day_index]] += 1
        
        # Peak hours (top 3 hours)
        peak_hours = sorted(
            [(hour, count) for hour, count in hour_distribution.items() if count > 0],
            key=lambda x: x[1],
            reverse=True
        )[:3]
        
        return {
            "preferred_time": preferred_time,
            "average_session_length": round(average_session_length, 2),
            "consistency_score": round(consistency_score, 2),
            "weekly_pattern": weekly_pattern,
            "peak_hours": [
                {
                    "hour": f"{hour:02d}:00",
                    "count": count,
                    "percentage": round((count / len(activities) * 100), 2)
                }
                for hour, count in peak_hours
            ]
        }
    
    def _calculate_progress_by_subject(self, student_id: int, db: Session) -> Dict:
        """Calculate progress by subject"""
        # Get activities with syllabus information
        activities = db.query(
            models.LearningActivity,
            models.Syllabus
        ).join(
            models.Syllabus,
            models.LearningActivity.syllabus_id == models.Syllabus.id
        ).filter(
            models.LearningActivity.student_id == student_id
        ).all()
        
        if not activities:
            return {}
        
        progress_by_subject = {}
        
        for activity, syllabus in activities:
            subject = syllabus.subject
            
            if subject not in progress_by_subject:
                progress_by_subject[subject] = {
                    "total_activities": 0,
                    "completed_activities": 0,
                    "total_score": 0,
                    "score_count": 0,
                    "total_duration": 0
                }
            
            progress_by_subject[subject]["total_activities"] += 1
            
            if activity.completed:
                progress_by_subject[subject]["completed_activities"] += 1
            
            if activity.score is not None:
                progress_by_subject[subject]["total_score"] += activity.score
                progress_by_subject[subject]["score_count"] += 1
            
            if activity.duration:
                progress_by_subject[subject]["total_duration"] += activity.duration
        
        # Calculate derived metrics
        for subject, data in progress_by_subject.items():
            data["completion_rate"] = round(
                (data["completed_activities"] / data["total_activities"] * 100), 2
            ) if data["total_activities"] > 0 else 0
            
            data["average_score"] = round(
                data["total_score"] / data["score_count"], 2
            ) if data["score_count"] > 0 else 0
            
            data["average_duration"] = round(
                data["total_duration"] / data["total_activities"], 2
            ) if data["total_activities"] > 0 else 0
        
        return progress_by_subject
    
    def _predict_risk_level(self, student_id: int, db: Session, 
                          attendance_stats: Dict, 
                          learning_progress: Dict,
                          assessment_scores: Dict) -> Dict:
        """Predict student risk level"""
        try:
            # Use ML model for prediction
            risk_prediction = self.risk_model.predict_risk(student_id, db)
            
            if risk_prediction and "error" not in risk_prediction:
                return {
                    "risk_level": risk_prediction.get("predicted_risk", "medium"),
                    "probabilities": risk_prediction.get("probabilities", {}),
                    "factors": self._identify_risk_factors(
                        attendance_stats,
                        learning_progress,
                        assessment_scores
                    )
                }
        except Exception as e:
            print(f"Error in risk prediction: {e}")
        
        # Fallback to rule-based prediction
        return self._rule_based_risk_prediction(
            attendance_stats,
            learning_progress,
            assessment_scores
        )
    
    def _rule_based_risk_prediction(self, attendance_stats: Dict,
                                   learning_progress: Dict,
                                   assessment_scores: Dict) -> Dict:
        """Rule-based risk prediction fallback"""
        risk_factors = []
        risk_score = 0
        
        # Attendance factors
        attendance_rate = attendance_stats.get("attendance_rate", 0)
        if attendance_rate < 50:
            risk_factors.append("Very low attendance (<50%)")
            risk_score += 3
        elif attendance_rate < 70:
            risk_factors.append("Low attendance (<70%)")
            risk_score += 2
        elif attendance_rate < 80:
            risk_factors.append("Moderate attendance (<80%)")
            risk_score += 1
        
        # Learning progress factors
        completion_rate = learning_progress.get("completion_rate", 0)
        if completion_rate < 40:
            risk_factors.append("Very low activity completion (<40%)")
            risk_score += 3
        elif completion_rate < 60:
            risk_factors.append("Low activity completion (<60%)")
            risk_score += 2
        
        average_score = learning_progress.get("average_score", 0)
        if average_score < 50:
            risk_factors.append("Very low average score (<50%)")
            risk_score += 3
        elif average_score < 65:
            risk_factors.append("Low average score (<65%)")
            risk_score += 2
        
        # Assessment factors
        assessment_avg = assessment_scores.get("average_score", 0)
        if assessment_avg < 50:
            risk_factors.append("Very low assessment scores (<50%)")
            risk_score += 3
        elif assessment_avg < 65:
            risk_factors.append("Low assessment scores (<65%)")
            risk_score += 2
        
        # Determine risk level
        if risk_score >= 6:
            risk_level = "high"
        elif risk_score >= 3:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Calculate probabilities (simplified)
        if risk_level == "high":
            probabilities = {"high": 0.7, "medium": 0.2, "low": 0.1}
        elif risk_level == "medium":
            probabilities = {"high": 0.2, "medium": 0.6, "low": 0.2}
        else:
            probabilities = {"high": 0.1, "medium": 0.2, "low": 0.7}
        
        return {
            "risk_level": risk_level,
            "probabilities": probabilities,
            "factors": risk_factors
        }
    
    def _identify_risk_factors(self, attendance_stats: Dict,
                              learning_progress: Dict,
                              assessment_scores: Dict) -> List[str]:
        """Identify specific risk factors"""
        factors = []
        
        # Attendance factors
        if attendance_stats.get("attendance_rate", 0) < 75:
            factors.append(f"Attendance rate is {attendance_stats.get('attendance_rate', 0)}% (below 75%)")
        
        # Learning progress factors
        if learning_progress.get("completion_rate", 0) < 50:
            factors.append(f"Activity completion rate is {learning_progress.get('completion_rate', 0)}% (below 50%)")
        
        if learning_progress.get("average_score", 0) < 60:
            factors.append(f"Average activity score is {learning_progress.get('average_score', 0)}% (below 60%)")
        
        if learning_progress.get("weekly_activities", 0) < 3:
            factors.append(f"Only {learning_progress.get('weekly_activities', 0)} activities this week (below 3)")
        
        # Assessment factors
        if assessment_scores.get("average_score", 0) < 60:
            factors.append(f"Average assessment score is {assessment_scores.get('average_score', 0)}% (below 60%)")
        
        if assessment_scores.get("total_assessments", 0) == 0:
            factors.append("No assessment records found")
        
        return factors
    
    def _generate_recommendations(self, attendance_stats: Dict,
                                 learning_progress: Dict,
                                 assessment_scores: Dict,
                                 risk_level: str) -> List[str]:
        """Generate personalized recommendations"""
        recommendations = []
        
        # Attendance recommendations
        if attendance_stats.get("attendance_rate", 0) < 80:
            recommendations.append("Try to maintain at least 80% attendance for better learning outcomes")
        
        # Learning progress recommendations
        if learning_progress.get("completion_rate", 0) < 60:
            recommendations.append("Focus on completing more learning activities to improve understanding")
        
        if learning_progress.get("average_score", 0) < 70:
            recommendations.append("Review completed activities and retake quizzes to improve scores")
        
        if learning_progress.get("weekly_activities", 0) < 5:
            recommendations.append("Aim for at least 5 learning activities per week for consistent progress")
        
        # Assessment recommendations
        if assessment_scores.get("average_score", 0) < 70:
            recommendations.append("Practice more assessment questions to improve test performance")
        
        # Risk-level specific recommendations
        if risk_level == "high":
            recommendations.append("Schedule one-on-one sessions with teacher for extra support")
            recommendations.append("Start with easier topics and gradually increase difficulty")
            recommendations.append("Set smaller, achievable daily learning goals")
        
        elif risk_level == "medium":
            recommendations.append("Join study groups for collaborative learning")
            recommendations.append("Review foundational concepts before moving to advanced topics")
            recommendations.append("Use visual aids and examples for better understanding")
        
        else:  # low risk
            recommendations.append("Continue current study patterns")
            recommendations.append("Help other students to reinforce your own understanding")
            recommendations.append("Explore advanced topics and challenges")
        
        # General recommendations
        recommendations.append("Take regular breaks during study sessions (5 minutes every 25 minutes)")
        recommendations.append("Review previous topics weekly to reinforce learning")
        recommendations.append("Use different learning methods (visual, auditory, practical)")
        
        return recommendations[:8]  # Return top 8 recommendations
    
    def _generate_summary(self, attendance_stats: Dict,
                         learning_progress: Dict,
                         assessment_scores: Dict,
                         risk_level: str) -> str:
        """Generate a summary of student performance"""
        attendance_rate = attendance_stats.get("attendance_rate", 0)
        completion_rate = learning_progress.get("completion_rate", 0)
        average_score = learning_progress.get("average_score", 0)
        assessment_avg = assessment_scores.get("average_score", 0)
        
        # Determine performance level
        performance_score = (attendance_rate * 0.2 + 
                           completion_rate * 0.3 + 
                           average_score * 0.25 + 
                           assessment_avg * 0.25)
        
        if performance_score >= 80:
            performance = "Excellent"
        elif performance_score >= 65:
            performance = "Good"
        elif performance_score >= 50:
            performance = "Average"
        else:
            performance = "Needs Improvement"
        
        # Generate summary
        summary = f"Student shows {performance.lower()} performance. "
        
        if attendance_rate >= 85:
            summary += "Excellent attendance. "
        elif attendance_rate >= 70:
            summary += "Good attendance. "
        else:
            summary += "Needs to improve attendance. "
        
        if completion_rate >= 75:
            summary += "Completes most learning activities. "
        elif completion_rate >= 50:
            summary += "Moderate activity completion. "
        else:
            summary += "Low activity completion rate. "
        
        if assessment_avg >= 75:
            summary += "Strong assessment performance. "
        elif assessment_avg >= 60:
            summary += "Average assessment scores. "
        else:
            summary += "Assessment scores need improvement. "
        
        summary += f"Overall risk level: {risk_level.upper()}."
        
        return summary
    
    def get_class_analytics(self, db: Session, grade: Optional[str] = None) -> Dict:
        """Get analytics for entire class or specific grade"""
        # Get all students or filtered by grade
        query = db.query(models.Student)
        if grade:
            query = query.filter(models.Student.grade == grade)
        
        students = query.all()
        
        if not students:
            return {"error": "No students found"}
        
        # Collect analytics for each student
        class_analytics = []
        total_attendance_rate = 0
        total_completion_rate = 0
        total_average_score = 0
        risk_distribution = {"low": 0, "medium": 0, "high": 0}
        
        for student in students:
            student_analytics = self.get_student_analytics(student.id, db)
            
            if "error" not in student_analytics:
                class_analytics.append(student_analytics)
                
                # Aggregate data
                attendance_rate = student_analytics.get("attendance", {}).get("attendance_rate", 0)
                completion_rate = student_analytics.get("learning_progress", {}).get("completion_rate", 0)
                average_score = student_analytics.get("learning_progress", {}).get("average_score", 0)
                risk_level = student_analytics.get("risk_level", "medium")
                
                total_attendance_rate += attendance_rate
                total_completion_rate += completion_rate
                total_average_score += average_score
                risk_distribution[risk_level] = risk_distribution.get(risk_level, 0) + 1
        
        num_students = len(class_analytics)
        
        return {
            "total_students": num_students,
            "grade": grade or "All Grades",
            "average_attendance_rate": round(total_attendance_rate / num_students, 2) if num_students > 0 else 0,
            "average_completion_rate": round(total_completion_rate / num_students, 2) if num_students > 0 else 0,
            "average_score": round(total_average_score / num_students, 2) if num_students > 0 else 0,
            "risk_distribution": risk_distribution,
            "top_performers": sorted(
                class_analytics,
                key=lambda x: (x.get("learning_progress", {}).get("average_score", 0) * 0.4 +
                              x.get("assessment_scores", {}).get("average_score", 0) * 0.3 +
                              x.get("attendance", {}).get("attendance_rate", 0) * 0.3),
                reverse=True
            )[:5],
            "students_needing_attention": [
                analytics for analytics in class_analytics 
                if analytics.get("risk_level") in ["high", "medium"]
            ][:10],
            "analytics_date": datetime.now().isoformat()
        }
    
    def get_subject_analytics(self, subject: str, db: Session, 
                             grade: Optional[str] = None) -> Dict:
        """Get analytics for specific subject"""
        # Get all students
        query = db.query(models.Student)
        if grade:
            query = query.filter(models.Student.grade == grade)
        
        students = query.all()
        
        subject_analytics = []
        total_score = 0
        score_count = 0
        
        for student in students:
            # Get student analytics
            student_analytics = self.get_student_analytics(student.id, db)
            
            if "error" not in student_analytics:
                # Get subject-specific progress
                subject_progress = student_analytics.get("progress_by_subject", {}).get(subject)
                
                if subject_progress:
                    subject_data = {
                        "student_id": student.id,
                        "student_name": student.name,
                        "grade": student.grade,
                        "completion_rate": subject_progress.get("completion_rate", 0),
                        "average_score": subject_progress.get("average_score", 0),
                        "total_activities": subject_progress.get("total_activities", 0),
                        "completed_activities": subject_progress.get("completed_activities", 0)
                    }
                    
                    subject_analytics.append(subject_data)
                    
                    if subject_progress.get("average_score", 0) > 0:
                        total_score += subject_progress.get("average_score", 0)
                        score_count += 1
        
        average_score = total_score / score_count if score_count > 0 else 0
        
        return {
            "subject": subject,
            "grade": grade or "All Grades",
            "total_students": len(subject_analytics),
            "average_score": round(average_score, 2),
            "student_performance": sorted(subject_analytics, key=lambda x: x.get("average_score", 0), reverse=True),
            "analytics_date": datetime.now().isoformat()
        }