import json
import os
import pickle
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
import numpy as np
from collections import defaultdict

try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import mean_squared_error, r2_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

from sqlalchemy.orm import Session
from app.db.models import (
    Job, JobApplication, WorkerProfile, ClientProfile, User, Review, Booking,
    JobStatus, ApplicationStatus, BookingStatus
)


class MLRecommendationService:
    """
    Machine Learning service for improving recommendation accuracy
    Uses historical data to train models and make predictions
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.model_dir = "backend/ml_models"
        self.data_dir = "backend/ml_data"
        self.job_model = None
        self.worker_model = None
        self.scaler = None
        
        # Ensure directories exist
        os.makedirs(self.model_dir, exist_ok=True)
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Load existing models if available
        self._load_models()

    def train_job_recommendation_model(self) -> Dict[str, float]:
        """
        Train a machine learning model to predict job recommendation success
        Returns training metrics
        """
        if not SKLEARN_AVAILABLE:
            return {"error": "scikit-learn not available"}
        
        # Collect training data
        training_data = self._collect_job_recommendation_training_data()
        
        if len(training_data) < 50:  # Minimum data requirement
            return {"error": "Insufficient training data", "samples": len(training_data)}
        
        # Prepare features and targets
        X, y = self._prepare_job_recommendation_features(training_data)
        
        if len(X) == 0:
            return {"error": "No valid features extracted"}
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.job_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.job_model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        y_pred = self.job_model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        # Save model
        self._save_models()
        
        return {
            "model_type": "job_recommendation",
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "mse": float(mse),
            "r2_score": float(r2),
            "feature_count": len(X_train[0]) if len(X_train) > 0 else 0
        }

    def train_worker_recommendation_model(self) -> Dict[str, float]:
        """
        Train a machine learning model to predict worker recommendation success
        Returns training metrics
        """
        if not SKLEARN_AVAILABLE:
            return {"error": "scikit-learn not available"}
        
        # Collect training data
        training_data = self._collect_worker_recommendation_training_data()
        
        if len(training_data) < 50:  # Minimum data requirement
            return {"error": "Insufficient training data", "samples": len(training_data)}
        
        # Prepare features and targets
        X, y = self._prepare_worker_recommendation_features(training_data)
        
        if len(X) == 0:
            return {"error": "No valid features extracted"}
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features (reuse scaler if available)
        if self.scaler is None:
            self.scaler = StandardScaler()
            X_train_scaled = self.scaler.fit_transform(X_train)
        else:
            X_train_scaled = self.scaler.transform(X_train)
        
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.worker_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.worker_model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        y_pred = self.worker_model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        # Save model
        self._save_models()
        
        return {
            "model_type": "worker_recommendation",
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "mse": float(mse),
            "r2_score": float(r2),
            "feature_count": len(X_train[0]) if len(X_train) > 0 else 0
        }

    def predict_job_recommendation_score(
        self, 
        job_id: int, 
        worker_id: int
    ) -> Optional[float]:
        """
        Use ML model to predict recommendation score for a job-worker pair
        """
        if not SKLEARN_AVAILABLE or self.job_model is None or self.scaler is None:
            return None
        
        # Extract features for this job-worker pair
        features = self._extract_job_worker_features(job_id, worker_id)
        
        if features is None:
            return None
        
        try:
            # Scale features and predict
            features_scaled = self.scaler.transform([features])
            prediction = self.job_model.predict(features_scaled)[0]
            
            # Ensure prediction is in valid range [0, 1]
            return max(0.0, min(1.0, float(prediction)))
        except Exception:
            return None

    def predict_worker_recommendation_score(
        self, 
        worker_id: int, 
        job_id: int
    ) -> Optional[float]:
        """
        Use ML model to predict recommendation score for a worker-job pair
        """
        if not SKLEARN_AVAILABLE or self.worker_model is None or self.scaler is None:
            return None
        
        # Extract features for this worker-job pair
        features = self._extract_worker_job_features(worker_id, job_id)
        
        if features is None:
            return None
        
        try:
            # Scale features and predict
            features_scaled = self.scaler.transform([features])
            prediction = self.worker_model.predict(features_scaled)[0]
            
            # Ensure prediction is in valid range [0, 1]
            return max(0.0, min(1.0, float(prediction)))
        except Exception:
            return None

    def process_feedback_for_learning(self) -> Dict[str, int]:
        """
        Process accumulated feedback to improve model accuracy
        """
        feedback_file = os.path.join(self.data_dir, "recommendation_feedback.jsonl")
        
        if not os.path.exists(feedback_file):
            return {"processed": 0, "error": "No feedback file found"}
        
        processed_count = 0
        
        try:
            with open(feedback_file, "r") as f:
                for line in f:
                    feedback = json.loads(line.strip())
                    # Process feedback (store in database, update training data, etc.)
                    processed_count += 1
            
            # Archive processed feedback
            archive_file = os.path.join(
                self.data_dir, 
                f"feedback_archive_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"
            )
            os.rename(feedback_file, archive_file)
            
            return {"processed": processed_count}
        except Exception as e:
            return {"processed": processed_count, "error": str(e)}

    def _collect_job_recommendation_training_data(self) -> List[Dict]:
        """
        Collect historical data for training job recommendation model
        """
        training_data = []
        
        # Get job applications from the last year
        cutoff_date = datetime.utcnow() - timedelta(days=365)
        
        applications = self.db.query(JobApplication).join(Job).join(WorkerProfile).filter(
            JobApplication.created_at >= cutoff_date
        ).all()
        
        for app in applications:
            # Create training sample
            sample = {
                "job_id": app.job_id,
                "worker_id": app.worker_id,
                "job": app.job,
                "worker": app.worker,
                "application_status": app.status,
                "was_hired": app.status == ApplicationStatus.ACCEPTED,
                "created_at": app.created_at
            }
            
            # Add success metrics
            if app.status == ApplicationStatus.ACCEPTED:
                # Check if job was completed successfully
                booking = self.db.query(Booking).filter(
                    Booking.job_id == app.job_id,
                    Booking.worker_id == app.worker_id
                ).first()
                
                if booking:
                    sample["job_completed"] = booking.status == BookingStatus.COMPLETED
                    sample["success_score"] = 1.0 if booking.status == BookingStatus.COMPLETED else 0.5
                else:
                    sample["success_score"] = 0.3  # Hired but no booking
            else:
                sample["success_score"] = 0.0  # Not hired
            
            training_data.append(sample)
        
        return training_data

    def _collect_worker_recommendation_training_data(self) -> List[Dict]:
        """
        Collect historical data for training worker recommendation model
        """
        # Similar to job recommendation data but from client perspective
        return self._collect_job_recommendation_training_data()

    def _prepare_job_recommendation_features(self, training_data: List[Dict]) -> Tuple[List[List[float]], List[float]]:
        """
        Extract features and targets for job recommendation model
        """
        X = []
        y = []
        
        for sample in training_data:
            features = self._extract_job_worker_features_from_sample(sample)
            if features is not None:
                X.append(features)
                y.append(sample["success_score"])
        
        return X, y

    def _prepare_worker_recommendation_features(self, training_data: List[Dict]) -> Tuple[List[List[float]], List[float]]:
        """
        Extract features and targets for worker recommendation model
        """
        # Same as job recommendation for now
        return self._prepare_job_recommendation_features(training_data)

    def _extract_job_worker_features(self, job_id: int, worker_id: int) -> Optional[List[float]]:
        """
        Extract features for a specific job-worker pair
        """
        job = self.db.query(Job).filter(Job.id == job_id).first()
        worker = self.db.query(WorkerProfile).filter(WorkerProfile.id == worker_id).first()
        
        if not job or not worker:
            return None
        
        return self._extract_features_from_job_worker(job, worker)

    def _extract_worker_job_features(self, worker_id: int, job_id: int) -> Optional[List[float]]:
        """
        Extract features for a specific worker-job pair (same as job-worker)
        """
        return self._extract_job_worker_features(job_id, worker_id)

    def _extract_job_worker_features_from_sample(self, sample: Dict) -> Optional[List[float]]:
        """
        Extract features from a training sample
        """
        return self._extract_features_from_job_worker(sample["job"], sample["worker"])

    def _extract_features_from_job_worker(self, job: Job, worker: WorkerProfile) -> List[float]:
        """
        Extract numerical features from job and worker objects
        """
        features = []
        
        # Job features
        features.append(float(job.budget_min))
        features.append(float(job.budget_max))
        features.append((float(job.budget_min) + float(job.budget_max)) / 2)  # avg budget
        
        # Worker features
        features.append(float(worker.rating) if worker.rating else 0.0)
        features.append(float(worker.total_jobs))
        features.append(float(worker.hourly_rate) if worker.hourly_rate else 0.0)
        
        # Category match (simplified)
        category_match = 1.0 if job.category in (worker.service_categories or []) else 0.0
        features.append(category_match)
        
        # Location match (simplified)
        location_match = 1.0 if job.location.lower() in (worker.location or "").lower() else 0.0
        features.append(location_match)
        
        # Budget compatibility
        if worker.hourly_rate:
            worker_rate = float(worker.hourly_rate)
            budget_compatibility = 1.0 if job.budget_min <= worker_rate <= job.budget_max else 0.0
        else:
            budget_compatibility = 0.5
        features.append(budget_compatibility)
        
        # Experience level
        experience_level = min(worker.total_jobs / 50.0, 1.0)
        features.append(experience_level)
        
        return features

    def _save_models(self):
        """Save trained models to disk"""
        if not SKLEARN_AVAILABLE:
            return
        
        try:
            if self.job_model is not None:
                job_model_path = os.path.join(self.model_dir, "job_recommendation_model.pkl")
                with open(job_model_path, "wb") as f:
                    pickle.dump(self.job_model, f)
            
            if self.worker_model is not None:
                worker_model_path = os.path.join(self.model_dir, "worker_recommendation_model.pkl")
                with open(worker_model_path, "wb") as f:
                    pickle.dump(self.worker_model, f)
            
            if self.scaler is not None:
                scaler_path = os.path.join(self.model_dir, "feature_scaler.pkl")
                with open(scaler_path, "wb") as f:
                    pickle.dump(self.scaler, f)
        except Exception:
            # Fail silently for now
            pass

    def _load_models(self):
        """Load trained models from disk"""
        if not SKLEARN_AVAILABLE:
            return
        
        try:
            job_model_path = os.path.join(self.model_dir, "job_recommendation_model.pkl")
            if os.path.exists(job_model_path):
                with open(job_model_path, "rb") as f:
                    self.job_model = pickle.load(f)
            
            worker_model_path = os.path.join(self.model_dir, "worker_recommendation_model.pkl")
            if os.path.exists(worker_model_path):
                with open(worker_model_path, "rb") as f:
                    self.worker_model = pickle.load(f)
            
            scaler_path = os.path.join(self.model_dir, "feature_scaler.pkl")
            if os.path.exists(scaler_path):
                with open(scaler_path, "rb") as f:
                    self.scaler = pickle.load(f)
        except Exception:
            # Fail silently and use default models
            pass