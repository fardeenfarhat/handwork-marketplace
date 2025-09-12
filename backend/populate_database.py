#!/usr/bin/env python3
"""
Database population script for Handwork Marketplace
This script populates the database with sample data for testing
"""

import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, engine
from app.db.models import User, WorkerProfile, ClientProfile, Job, JobApplication, Review, Message, Booking
from app.core.security import get_password_hash

def populate_database():
    """Populate the database with sample data"""
    
    print("🚀 Starting database population...")
    
    session = SessionLocal()
    try:
        # Create sample users
        print("👥 Creating sample users...")
        
        # Create client users
        client_user1 = User(
            email="sarah.johnson@email.com",
            password_hash=get_password_hash("password123"),
            first_name="Sarah",
            last_name="Johnson",
            phone="+1234567890",
            role="client",
            is_active=True,
            is_verified=True,
            email_verified=True,
            phone_verified=True
        )
        
        client_user2 = User(
            email="david.chen@email.com",
            password_hash=get_password_hash("password123"),
            first_name="David",
            last_name="Chen",
            phone="+1234567891",
            role="client",
            is_active=True,
            is_verified=True,
            email_verified=True,
            phone_verified=True
        )
        
        client_user3 = User(
            email="lisa.martinez@email.com",
            password_hash=get_password_hash("password123"),
            first_name="Lisa",
            last_name="Martinez",
            phone="+1234567892",
            role="client",
            is_active=True,
            is_verified=True,
            email_verified=True,
            phone_verified=True
        )
        
        # Create worker users
        worker_user1 = User(
            email="mike.wilson@email.com",
            password_hash=get_password_hash("password123"),
            first_name="Mike",
            last_name="Wilson",
            phone="+1234567893",
            role="worker",
            is_active=True,
            is_verified=True,
            email_verified=True,
            phone_verified=True
        )
        
        worker_user2 = User(
            email="carlos.rodriguez@email.com",
            password_hash=get_password_hash("password123"),
            first_name="Carlos",
            last_name="Rodriguez",
            phone="+1234567894",
            role="worker",
            is_active=True,
            is_verified=True,
            email_verified=True,
            phone_verified=True
        )
        
        worker_user3 = User(
            email="jennifer.brown@email.com",
            password_hash=get_password_hash("password123"),
            first_name="Jennifer",
            last_name="Brown",
            phone="+1234567895",
            role="worker",
            is_active=True,
            is_verified=True,
            email_verified=True,
            phone_verified=True
        )
        
        # Add users to session
        users = [client_user1, client_user2, client_user3, worker_user1, worker_user2, worker_user3]
        for user in users:
            session.add(user)
        
        session.flush()  # Get user IDs
        
        # Create client profiles
        print("👔 Creating client profiles...")
        
        client_profile1 = ClientProfile(
            user_id=client_user1.id,
            company_name="Johnson Construction",
            description="Looking for reliable contractors for home renovation projects",
            location="New York, NY",
            rating=4.8,
            total_jobs_posted=15
        )
        
        client_profile2 = ClientProfile(
            user_id=client_user2.id,
            company_name="Chen Properties",
            description="Property manager seeking skilled workers for maintenance",
            location="Los Angeles, CA",
            rating=4.6,
            total_jobs_posted=8
        )
        
        client_profile3 = ClientProfile(
            user_id=client_user3.id,
            company_name="Martinez Homes",
            description="Homeowner looking for quality craftsmen",
            location="Chicago, IL",
            rating=4.9,
            total_jobs_posted=12
        )
        
        # Create worker profiles
        print("🔨 Creating worker profiles...")
        
        worker_profile1 = WorkerProfile(
            user_id=worker_user1.id,
            bio="Experienced plumber with 10+ years in residential and commercial work",
            skills=["Plumbing", "Pipe Installation", "Leak Repair", "Drain Cleaning"],
            service_categories=["Plumbing", "Emergency Repairs"],
            hourly_rate=Decimal("75.00"),
            location="New York, NY",
            portfolio_images=["https://example.com/portfolio1.jpg", "https://example.com/portfolio2.jpg"],
            kyc_status="approved",
            rating=4.7,
            total_jobs=23
        )
        
        worker_profile2 = WorkerProfile(
            user_id=worker_user2.id,
            bio="Licensed electrician specializing in residential electrical work",
            skills=["Electrical Wiring", "Panel Installation", "Lighting", "Outlet Installation"],
            service_categories=["Electrical", "Home Improvement"],
            hourly_rate=Decimal("85.00"),
            location="Los Angeles, CA",
            portfolio_images=["https://example.com/portfolio3.jpg"],
            kyc_status="approved",
            rating=4.9,
            total_jobs=31
        )
        
        worker_profile3 = WorkerProfile(
            user_id=worker_user3.id,
            bio="Professional carpenter and handywoman with expertise in home repairs",
            skills=["Carpentry", "Drywall", "Painting", "Flooring", "General Repairs"],
            service_categories=["Carpentry", "Home Improvement", "Repairs"],
            hourly_rate=Decimal("65.00"),
            location="Chicago, IL",
            portfolio_images=["https://example.com/portfolio4.jpg", "https://example.com/portfolio5.jpg"],
            kyc_status="approved",
            rating=4.8,
            total_jobs=19
        )
        
        # Add profiles to session
        profiles = [client_profile1, client_profile2, client_profile3, worker_profile1, worker_profile2, worker_profile3]
        for profile in profiles:
            session.add(profile)
        
        session.flush()  # Get profile IDs
        
        # Create sample jobs
        print("� CreaCting sample jobs...")
        
        job1 = Job(
            title="Kitchen Sink Plumbing Repair",
            description="Need to fix a leaky kitchen sink and replace the faucet. The leak is getting worse and needs immediate attention.",
            category="Plumbing",
            budget_min=Decimal("150.00"),
            budget_max=Decimal("300.00"),
            location="New York, NY",
            status="open",
            client_id=client_profile1.id,
            created_at=datetime.utcnow() - timedelta(days=2)
        )
        
        job2 = Job(
            title="Bathroom Electrical Outlet Installation",
            description="Install GFCI outlets in master bathroom. Need 2 outlets installed near the vanity area.",
            category="Electrical",
            budget_min=Decimal("200.00"),
            budget_max=Decimal("400.00"),
            location="Los Angeles, CA",
            latitude=34.0522,
            longitude=-118.2437,
            urgency="low",
            status="open",
            client_id=client_profile2.id,
            created_at=datetime.utcnow() - timedelta(days=1)
        )
        
        job3 = Job(
            title="Living Room Drywall Repair",
            description="Repair holes in living room drywall and repaint the affected area. About 3 small holes that need patching.",
            category="Home Improvement",
            budget_min=Decimal("100.00"),
            budget_max=Decimal("250.00"),
            location="Chicago, IL",
            latitude=41.8781,
            longitude=-87.6298,
            urgency="low",
            status="in_progress",
            client_id=client_profile3.id,
            worker_id=worker_profile3.id,
            created_at=datetime.utcnow() - timedelta(days=5)
        )
        
        job4 = Job(
            title="Emergency Toilet Repair",
            description="Toilet is overflowing and won't stop running. Need immediate repair.",
            category="Plumbing",
            budget_min=Decimal("100.00"),
            budget_max=Decimal("200.00"),
            location="New York, NY",
            latitude=40.7589,
            longitude=-73.9851,
            urgency="high",
            status="completed",
            client_id=client_profile1.id,
            worker_id=worker_profile1.id,
            created_at=datetime.utcnow() - timedelta(days=10),
            completed_at=datetime.utcnow() - timedelta(days=8)
        )
        
        job5 = Job(
            title="Kitchen Cabinet Installation",
            description="Install new kitchen cabinets. Cabinets are already purchased, just need installation.",
            category="Carpentry",
            budget_min=Decimal("500.00"),
            budget_max=Decimal("800.00"),
            location="Chicago, IL",
            latitude=41.8781,
            longitude=-87.6298,
            urgency="medium",
            status="open",
            client_id=client_profile3.id,
            created_at=datetime.utcnow() - timedelta(hours=6)
        )
        
        # Add jobs to session
        jobs = [job1, job2, job3, job4, job5]
        for job in jobs:
            session.add(job)
        
        session.flush()  # Get job IDs
        
        # Create job applications
        print("📝 Creating job applications...")
        
        app1 = JobApplication(
            job_id=job1.id,
            worker_id=worker_profile1.id,
            proposed_rate=Decimal("75.00"),
            message="I have 10+ years of plumbing experience and can fix your kitchen sink quickly. Available this week.",
            status="pending",
            created_at=datetime.utcnow() - timedelta(hours=12)
        )
        
        app2 = JobApplication(
            job_id=job2.id,
            worker_id=worker_profile2.id,
            proposed_rate=Decimal("85.00"),
            message="Licensed electrician with GFCI installation experience. Can complete this safely and up to code.",
            status="pending",
            created_at=datetime.utcnow() - timedelta(hours=8)
        )
        
        app3 = JobApplication(
            job_id=job5.id,
            worker_id=worker_profile3.id,
            proposed_rate=Decimal("65.00"),
            message="Experienced carpenter with cabinet installation expertise. Have all necessary tools.",
            status="pending",
            created_at=datetime.utcnow() - timedelta(hours=3)
        )
        
        # Add applications to session
        applications = [app1, app2, app3]
        for app in applications:
            session.add(app)
        
        session.flush()
        
        # Create reviews
        print("⭐ Creating reviews...")
        
        review1 = Review(
            booking_id=1,  # We'll create bookings next
            reviewer_id=client_user1.id,
            reviewee_id=worker_user1.id,
            job_title="Emergency Toilet Repair",
            rating=5,
            comment="Excellent work! Mike was professional, punctual, and fixed the issue quickly. The toilet is working perfectly now. Highly recommend!",
            status="approved",
            created_at=datetime.utcnow() - timedelta(days=7)
        )
        
        review2 = Review(
            booking_id=2,
            reviewer_id=client_user2.id,
            reviewee_id=worker_user2.id,
            job_title="Electrical Panel Upgrade",
            rating=4,
            comment="Good work overall. Carlos upgraded the electrical panel properly and cleaned up after himself. Only minor issue was he arrived 30 minutes late, but he called ahead to let me know.",
            status="approved",
            created_at=datetime.utcnow() - timedelta(days=15)
        )
        
        review3 = Review(
            booking_id=3,
            reviewer_id=client_user3.id,
            reviewee_id=worker_user3.id,
            job_title="Deck Repair",
            rating=5,
            comment="Outstanding service! Jennifer diagnosed the problem immediately and had it fixed in no time. Very knowledgeable and fair pricing. Will definitely hire again.",
            status="approved",
            created_at=datetime.utcnow() - timedelta(days=20)
        )
        
        # Add review response
        review1.response = {
            "id": 1,
            "review_id": review1.id,
            "responder_id": worker_user1.id,
            "responder_name": "Mike Wilson",
            "response": "Thank you Sarah! It was a pleasure working on your plumbing. Glad I could help resolve the issue quickly.",
            "created_at": (datetime.utcnow() - timedelta(days=6)).isoformat()
        }
        
        # Add reviews to session
        reviews = [review1, review2, review3]
        for review in reviews:
            session.add(review)
        
        session.flush()
        
        # Create bookings
        print("📅 Creating bookings...")
        
        booking1 = Booking(
            job_id=job4.id,
            client_id=client_profile1.id,
            worker_id=worker_profile1.id,
            start_date=datetime.utcnow() - timedelta(days=10),
            end_date=datetime.utcnow() - timedelta(days=8),
            total_amount=Decimal("150.00"),
            status="completed",
            created_at=datetime.utcnow() - timedelta(days=11)
        )
        
        booking2 = Booking(
            job_id=job3.id,
            client_id=client_profile3.id,
            worker_id=worker_profile3.id,
            start_date=datetime.utcnow() - timedelta(days=3),
            end_date=datetime.utcnow() + timedelta(days=2),
            total_amount=Decimal("175.00"),
            status="in_progress",
            created_at=datetime.utcnow() - timedelta(days=4)
        )
        
        # Add bookings to session
        bookings = [booking1, booking2]
        for booking in bookings:
            session.add(booking)
        
        session.flush()
        
        # Create messages
        print("💬 Creating messages...")
        
        message1 = Message(
            job_id=job1.id,
            sender_id=client_user1.id,
            receiver_id=worker_user1.id,
            content="Hi Mike, I saw your application for the kitchen sink repair. When would you be available to take a look?",
            created_at=datetime.utcnow() - timedelta(hours=10)
        )
        
        message2 = Message(
            job_id=job1.id,
            sender_id=worker_user1.id,
            receiver_id=client_user1.id,
            content="Hi Sarah! I can come by tomorrow morning around 9 AM if that works for you. I'll bring all the necessary tools and parts.",
            created_at=datetime.utcnow() - timedelta(hours=9)
        )
        
        message3 = Message(
            job_id=job1.id,
            sender_id=client_user1.id,
            receiver_id=worker_user1.id,
            content="Perfect! 9 AM tomorrow works great. The address is 123 Main St. I'll be home to let you in.",
            created_at=datetime.utcnow() - timedelta(hours=8)
        )
        
        message4 = Message(
            job_id=job2.id,
            sender_id=client_user2.id,
            receiver_id=worker_user2.id,
            content="Carlos, your application looks great. Do you have experience with GFCI outlets specifically?",
            created_at=datetime.utcnow() - timedelta(hours=6)
        )
        
        message5 = Message(
            job_id=job2.id,
            sender_id=worker_user2.id,
            receiver_id=client_user2.id,
            content="Yes, I've installed dozens of GFCI outlets. I'm fully licensed and insured. I can provide references if needed.",
            created_at=datetime.utcnow() - timedelta(hours=5)
        )
        
        # Add messages to session
        messages = [message1, message2, message3, message4, message5]
        for message in messages:
            session.add(message)
        
        # Commit all changes
        session.commit()
        
        print("✅ Database population completed successfully!")
        print(f"Created:")
        print(f"  - {len(users)} users (3 clients, 3 workers)")
        print(f"  - {len(jobs)} jobs")
        print(f"  - {len(applications)} job applications")
        print(f"  - {len(reviews)} reviews")
        print(f"  - {len(bookings)} bookings")
        print(f"  - {len(messages)} messages")
        
    except Exception as e:
        print(f"❌ Error populating database: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    populate_database()