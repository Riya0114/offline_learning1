# Backend/routers/risk.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from Backend.database import get_db
from Backend.ml_model import risk_model
import Backend.models as models

router = APIRouter(prefix="/risk", tags=["risk-prediction"])

# Request/Response schemas
class FeatureInput(BaseModel):
    attendance_rate: float = 85.0
    avg_score: float = 75.0
    study_consistency: float = 3.5  # activities per week
    activity_completion_rate: float = 90.0

class RiskPredictionRequest(BaseModel):
    student_id: Optional[int] = None
    features: Optional[FeatureInput] = None

class RiskPredictionResponse(BaseModel):
    student_id: Optional[int]
    predicted_risk: str
    confidence: float
    probabilities: Dict[str, float]
    recommendations: List[str]
    features_used: List[str]
    feature_values: Dict[str, float]

# Check model status
@router.get("/status")
async def get_risk_model_status():
    """Check if risk prediction model is loaded"""
    if risk_model.model_loaded or risk_model.load_model():
        return {
            "status": "loaded",
            "model_type": "RandomForestClassifier",
            "features": risk_model.features,
            "classes": risk_model.model.classes_.tolist() if risk_model.model else [],
            "message": "Risk prediction model is ready"
        }
    return {
        "status": "not_loaded",
        "message": "Risk model not found. Run train_model.py first.",
        "expected_file": "risk_model.pkl"
    }

# Predict risk from features
@router.post("/predict/from-features", response_model=RiskPredictionResponse)
async def predict_risk_from_features(request: FeatureInput):
    """Predict risk level directly from features"""
    try:
        # Convert Pydantic model to dict
        feature_dict = request.dict()
        
        # Get prediction
        result = risk_model.predict_from_features(feature_dict)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return RiskPredictionResponse(
            student_id=None,
            predicted_risk=result["predicted_risk"],
            confidence=result["confidence"],
            probabilities=result["probabilities"],
            recommendations=result["recommendations"],
            features_used=result["features_used"],
            feature_values=result["feature_values"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Predict risk for a student ID
@router.get("/predict/student/{student_id}", response_model=RiskPredictionResponse)
async def predict_risk_for_student(student_id: int, db: Session = Depends(get_db)):
    """Predict risk level for a specific student"""
    try:
        # Check if student exists
        student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")
        
        # Calculate features for this student
        features_dict = risk_model.calculate_student_features(student_id, db)
        if not features_dict:
            raise HTTPException(status_code=400, detail="Could not calculate student features")
        
        # Get prediction using features
        result = risk_model.predict_from_features(features_dict)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return RiskPredictionResponse(
            student_id=student_id,
            predicted_risk=result["predicted_risk"],
            confidence=result["confidence"],
            probabilities=result["probabilities"],
            recommendations=result["recommendations"],
            features_used=result["features_used"],
            feature_values={k: features_dict.get(k, 0) for k in risk_model.features}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get all students with risk predictions
@router.get("/predict/all-students")
async def predict_risk_all_students(db: Session = Depends(get_db)):
    """Get risk predictions for all students"""
    try:
        students = db.query(models.Student).all()
        
        results = []
        for student in students:
            try:
                features_dict = risk_model.calculate_student_features(student.id, db)
                if features_dict:
                    prediction = risk_model.predict_from_features(features_dict)
                    
                    if "error" not in prediction:
                        results.append({
                            "student_id": student.id,
                            "student_name": student.name,
                            "grade": student.grade,
                            "predicted_risk": prediction["predicted_risk"],
                            "confidence": prediction["confidence"],
                            "recommendations": prediction["recommendations"][:3],  # Top 3 only
                            "attendance_rate": features_dict.get('attendance_rate', 0),
                            "avg_score": features_dict.get('avg_score', 0)
                        })
            except:
                continue  # Skip students with errors
        
        # Sort by risk level (high to low)
        risk_order = {"high": 3, "medium": 2, "low": 1}
        results.sort(key=lambda x: risk_order.get(x["predicted_risk"], 0), reverse=True)
        
        return {
            "total_students": len(students),
            "predicted_students": len(results),
            "high_risk_count": sum(1 for r in results if r["predicted_risk"] == "high"),
            "medium_risk_count": sum(1 for r in results if r["predicted_risk"] == "medium"),
            "low_risk_count": sum(1 for r in results if r["predicted_risk"] == "low"),
            "students": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))