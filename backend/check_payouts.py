"""Script to check payout statuses in the database"""
import sys
sys.path.append('.')

from app.db.database import SessionLocal
from app.db.models import WorkerPayout
from sqlalchemy import inspect

db = SessionLocal()

payouts = db.query(WorkerPayout).order_by(WorkerPayout.id).all()

print("\n" + "="*80)
print("CURRENT PAYOUT STATUS IN DATABASE")
print("="*80)

for payout in payouts:
    print(f"\nPayout ID: {payout.id}")
    print(f"  Worker ID: {payout.worker_id}")
    print(f"  Amount: ${payout.amount}")
    print(f"  Status: {payout.status.value}")
    print(f"  Requested at: {payout.requested_at}")
    print(f"  Processed at: {payout.processed_at}")
    print(f"  Completed at: {payout.completed_at}")
    print(f"  Stripe Transfer ID: {payout.stripe_transfer_id}")
    
    # Check if object is in pending changes
    insp = inspect(payout)
    print(f"  Pending changes: {insp.pending}")
    print(f"  Modified: {insp.modified}")

print("\n" + "="*80)

db.close()
