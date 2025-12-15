import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.db.models import User, WorkerProfile, Booking, Payment, Review

db = SessionLocal()

try:
    # Get all workers
    workers = db.query(WorkerProfile).all()
    print(f"\n{'='*60}")
    print(f"Total Workers: {len(workers)}")
    print(f"{'='*60}\n")
    
    for worker in workers:
        user = db.query(User).filter(User.id == worker.user_id).first()
        print(f"\n--- Worker: {user.email} (User ID: {user.id}, Worker Profile ID: {worker.id}) ---")
        
        # Check bookings
        bookings = db.query(Booking).filter(Booking.worker_id == worker.id).all()
        print(f"  Total Bookings: {len(bookings)}")
        
        if bookings:
            completed = [b for b in bookings if b.status == 'completed']
            active = [b for b in bookings if b.status in ['confirmed', 'in_progress']]
            print(f"    - Completed: {len(completed)}")
            print(f"    - Active: {len(active)}")
            
            for booking in bookings[:3]:  # Show first 3
                print(f"      Booking #{booking.id}: Status={booking.status}, Job ID={booking.job_id}")
        
        # Check payments (through bookings)
        payments = db.query(Payment).join(
            Booking, Payment.booking_id == Booking.id
        ).filter(Booking.worker_id == worker.id).all()
        print(f"  Total Payments: {len(payments)}")
        
        if payments:
            released = [p for p in payments if p.status == 'released']
            total_earnings = sum(float(p.worker_amount) for p in released)
            print(f"    - Released: {len(released)}")
            print(f"    - Total Earnings: ${total_earnings:.2f}")
            
            for payment in payments[:3]:  # Show first 3
                print(f"      Payment #{payment.id}: ${float(payment.worker_amount):.2f} (from ${float(payment.amount):.2f}) - Status={payment.status}")
        
        # Check reviews
        reviews = db.query(Review).filter(
            Review.reviewee_id == user.id,
            Review.status == 'approved'
        ).all()
        print(f"  Total Reviews: {len(reviews)}")
        
        if reviews:
            avg_rating = sum(r.rating for r in reviews) / len(reviews)
            print(f"    - Average Rating: {avg_rating:.1f}")
        
        print(f"  Profile Rating: {worker.rating}")
        print(f"  Profile Total Jobs: {worker.total_jobs}")
    
    # Check if there are any bookings at all
    print(f"\n{'='*60}")
    all_bookings = db.query(Booking).all()
    print(f"Total Bookings in Database: {len(all_bookings)}")
    
    if all_bookings:
        print("\nAll Bookings:")
        for booking in all_bookings[:10]:  # Show first 10
            print(f"  Booking #{booking.id}: Worker={booking.worker_id}, Job={booking.job_id}, Status={booking.status}")
    
    print(f"{'='*60}\n")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
