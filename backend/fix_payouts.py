"""
Admin Script: Fix Payment and Payout Linking

This script will:
1. Find all released payments that don't have linked payouts
2. Create payouts for those payments with proper metadata
3. Find orphaned payouts and try to link them to payments
4. Display a summary of the current state
"""
import sys
sys.path.append('.')

from app.db.database import SessionLocal
from app.db.models import WorkerPayout, Payment, Booking, PaymentStatus, WithdrawalStatus, PaymentMethod
from datetime import datetime, timedelta
from sqlalchemy import text
import json

db = SessionLocal()

print("\n" + "="*80)
print("PAYMENT & PAYOUT LINKING FIX SCRIPT")
print("="*80)

# Step 1: Check current state
print("\n📊 CURRENT STATE:")
print("-" * 80)

all_payments = db.query(Payment).all()
all_payouts = db.query(WorkerPayout).all()

print(f"Total Payments: {len(all_payments)}")
print(f"  - Pending: {sum(1 for p in all_payments if p.status == PaymentStatus.PENDING)}")
print(f"  - Held: {sum(1 for p in all_payments if p.status == PaymentStatus.HELD)}")
print(f"  - Released: {sum(1 for p in all_payments if p.status == PaymentStatus.RELEASED)}")
print(f"\nTotal Payouts: {len(all_payouts)}")
print(f"  - Pending: {sum(1 for p in all_payouts if p.status == WithdrawalStatus.PENDING)}")
print(f"  - Completed: {sum(1 for p in all_payouts if p.status == WithdrawalStatus.COMPLETED)}")

# Step 2: Find released payments without payouts
print("\n🔍 FINDING RELEASED PAYMENTS WITHOUT PAYOUTS:")
print("-" * 80)

payments_needing_payouts = []

for payment in all_payments:
    if payment.status == PaymentStatus.RELEASED:
        # Check if a payout exists for this payment
        payout_exists = False
        for payout in all_payouts:
            if payout.payout_metadata and payout.payout_metadata.get('payment_id') == payment.id:
                payout_exists = True
                break
        
        if not payout_exists:
            payments_needing_payouts.append(payment)
            print(f"  ❌ Payment #{payment.id} (Booking #{payment.booking_id}): ${payment.worker_amount} - NO PAYOUT")

if not payments_needing_payouts:
    print("  ✅ All released payments have linked payouts")

# Step 3: Create missing payouts
if payments_needing_payouts:
    print("\n🔧 CREATING MISSING PAYOUTS:")
    print("-" * 80)
    
    for payment in payments_needing_payouts:
        print(f"\n  Creating payout for Payment #{payment.id}:")
        print(f"    Booking: #{payment.booking_id}")
        print(f"    Worker: {payment.booking.worker_id}")
        print(f"    Amount: ${payment.worker_amount}")
        
        new_payout = WorkerPayout(
            worker_id=payment.booking.worker_id,
            amount=payment.worker_amount,
            status=WithdrawalStatus.PENDING,
            payment_method=PaymentMethod.STRIPE,
            requested_at=payment.released_at or datetime.utcnow(),
            auto_process_at=(payment.released_at or datetime.utcnow()) + timedelta(days=14),
            payout_metadata={
                'payment_id': payment.id,
                'booking_id': payment.booking_id,
                'platform_fee': str(payment.platform_fee),
                'total_payment': str(payment.amount),
                'job_title': payment.booking.job.title
            }
        )
        db.add(new_payout)
        print(f"    ✅ Created payout with metadata linking to payment #{payment.id}")
    
    db.commit()
    print(f"\n  ✅ Created {len(payments_needing_payouts)} new payouts")

# Step 4: Find orphaned payouts (payouts without metadata)
print("\n🔍 FINDING ORPHANED PAYOUTS:")
print("-" * 80)

orphaned_payouts = [p for p in all_payouts if not p.payout_metadata or not p.payout_metadata.get('payment_id')]

if orphaned_payouts:
    print(f"\nFound {len(orphaned_payouts)} orphaned payouts without payment links:")
    
    for payout in orphaned_payouts:
        print(f"\n  Payout #{payout.id}: Worker {payout.worker_id}, ${payout.amount}, Status: {payout.status.value}")
        
        # Try to find a matching payment
        matching_payment = db.query(Payment).join(Booking).filter(
            Booking.worker_id == payout.worker_id,
            Payment.worker_amount == payout.amount,
            Payment.status == PaymentStatus.RELEASED
        ).order_by(Payment.released_at.desc()).first()
        
        if matching_payment:
            # Check if this payment already has a payout
            payment_has_payout = False
            for other_payout in all_payouts:
                if other_payout.id != payout.id and other_payout.payout_metadata and other_payout.payout_metadata.get('payment_id') == matching_payment.id:
                    payment_has_payout = True
                    break
            
            if not payment_has_payout:
                print(f"    ✅ Found matching payment #{matching_payment.id} - Linking...")
                payout.payout_metadata = {
                    'payment_id': matching_payment.id,
                    'booking_id': matching_payment.booking_id,
                    'platform_fee': str(matching_payment.platform_fee),
                    'total_payment': str(matching_payment.amount),
                    'job_title': matching_payment.booking.job.title
                }
                db.commit()
            else:
                print(f"    ⚠️  Payment #{matching_payment.id} already has a payout")
        else:
            print(f"    ❌ No matching released payment found")
else:
    print("  ✅ All payouts have payment links")

# Step 5: Summary
print("\n" + "="*80)
print("FINAL STATE:")
print("="*80)

# Refresh data
all_payments = db.query(Payment).all()
all_payouts = db.query(WorkerPayout).all()

print(f"\n📊 Payments:")
for payment in all_payments:
    linked_payout = None
    for payout in all_payouts:
        if payout.payout_metadata and payout.payout_metadata.get('payment_id') == payment.id:
            linked_payout = payout
            break
    
    payout_info = f"Payout #{linked_payout.id} ({linked_payout.status.value})" if linked_payout else "No payout"
    print(f"  Payment #{payment.id}: {payment.status.value:10} | ${payment.worker_amount:6.2f} | {payout_info}")

print("\n" + "="*80)
print("✅ DONE!")
print("="*80 + "\n")

db.close()
