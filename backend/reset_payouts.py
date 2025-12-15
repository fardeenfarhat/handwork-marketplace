"""
Reset payout statuses to PENDING for testing
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db.database import engine
from app.db.models import WorkerPayout, WithdrawalStatus

def reset_payouts():
    """Reset all payouts to PENDING status"""
    db = Session(bind=engine)
    
    try:
        # Get all payouts
        payouts = db.query(WorkerPayout).all()
        
        print(f"\n📋 Found {len(payouts)} payout(s)")
        
        for payout in payouts:
            old_status = payout.status
            payout.status = WithdrawalStatus.PENDING
            payout.processed_at = None
            payout.completed_at = None
            payout.failure_reason = None
            payout.stripe_transfer_id = None
            payout.payout_metadata = None
            
            print(f"   Payout #{payout.id}: {old_status.value} → PENDING")
        
        db.commit()
        print(f"\n✅ Successfully reset {len(payouts)} payout(s) to PENDING status")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_payouts()
