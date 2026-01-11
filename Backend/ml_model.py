import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from Backend import models

class RiskPredictionModel:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.features = ['attendance_rate', 'avg_score', 'study_consistency', 'activity_completion_rate']
        self.model_loaded = False
    
    def load_model(self):
        """Load pre-trained model from pickle file"""
        try:
            if os.path.exists("risk_model.pkl"):
                model_data = joblib.load("risk_model.pkl")
                self.model = model_data['model']
                self.scaler = model_data['scaler']
                self.features = model_data['features']
                self.model_loaded = True
                print(f"✅ Risk model loaded successfully")
                print(f"   Features: {self.features}")
                print(f"   Classes: {self.model.classes_}")
                return True
            else:
                print(f"⚠️ risk_model.pkl not found in current directory")
                
                # Search in common locations
                search_paths = [
                    "./offline_learning/train_model/risk_model.pkl",
                    "./train_model/risk_model.pkl",
                    "../risk_model.pkl",
                    "offline_learning/risk_model.pkl"
                ]
                
                for path in search_paths:
                    if os.path.exists(path):
                        print(f"✅ Found at: {path}")
                        model_data = joblib.load(path)
                        self.model = model_data['model']
                        self.scaler = model_data['scaler']
                        self.features = model_data['features']
                        self.model_loaded = True
                        return True
                
                print("❌ Could not find risk_model.pkl")
                return False
                
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            return False
    
    # ... [Keep all your existing methods: prepare_training_data, calculate_student_features, etc.] ...
    
    def predict_from_features(self, feature_dict: dict):
        """Predict risk directly from feature dictionary"""
        if not self.model_loaded:
            if not self.load_model():
                return {"error": "Model not loaded"}
        
        try:
            # Extract features in correct order
            feature_values = [feature_dict.get(feat, 0) for feat in self.features]
            
            # Convert to numpy array and reshape
            X = np.array([feature_values])
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Predict
            prediction = self.model.predict(X_scaled)[0]
            probabilities = self.model.predict_proba(X_scaled)[0]
            
            # Convert to Python types
            prob_dict = {}
            for i, class_name in enumerate(self.model.classes_):
                prob_dict[class_name] = float(probabilities[i])
            
            # Get recommendations
            recommendations = self.get_recommendations(feature_dict, prediction)
            
            return {
                'predicted_risk': str(prediction),
                'probabilities': prob_dict,
                'confidence': float(max(probabilities)),
                'recommendations': recommendations,
                'features_used': self.features,
                'feature_values': feature_dict
            }
            
        except Exception as e:
            return {"error": str(e), "feature_dict": feature_dict}
    
    def get_recommendations(self, features: dict, risk_level: str):
        """Generate recommendations based on risk level and features"""
        recommendations = []
        
        if risk_level == "high":
            recommendations.append("🚨 HIGH RISK: Immediate intervention needed")
            if features.get('attendance_rate', 100) < 60:
                recommendations.append("📅 Improve attendance to at least 75%")
            if features.get('avg_score', 100) < 50:
                recommendations.append("📚 Focus on foundational concepts")
            recommendations.append("👨‍🏫 Schedule regular teacher meetings")
            recommendations.append("⏰ Allocate 2+ hours daily for focused study")
        
        elif risk_level == "medium":
            recommendations.append("⚠️ MEDIUM RISK: Needs attention")
            if features.get('attendance_rate', 100) < 75:
                recommendations.append("📅 Aim for 80%+ attendance")
            if features.get('avg_score', 100) < 65:
                recommendations.append("📝 Practice more exercises daily")
            recommendations.append("📖 Review completed topics weekly")
            recommendations.append("🎯 Set specific learning goals")
        
        else:  # low risk
            recommendations.append("✅ LOW RISK: Good performance")
            recommendations.append("💪 Continue current study pattern")
            recommendations.append("🤝 Help other students learn")
            recommendations.append("🚀 Explore advanced topics")
        
        # Add general recommendations based on specific features
        if features.get('study_consistency', 0) < 2:
            recommendations.append("📆 Increase study sessions to 3+ per week")
        
        if features.get('activity_completion_rate', 100) < 80:
            recommendations.append("✅ Complete all assigned activities")
        
        return recommendations

# Create a global instance for easy access
risk_model = RiskPredictionModel()