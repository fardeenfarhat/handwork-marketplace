import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class BackgroundTaskService:
    """Service for handling background tasks like notification processing"""
    
    def __init__(self):
        self.is_running = False
        self.tasks = []
    
    async def start(self):
        """Start background task processing"""
        if self.is_running:
            logger.warning("Background tasks already running")
            return
        
        self.is_running = True
        logger.info("Starting background task service")
        
        # Start notification processing task
        notification_task = asyncio.create_task(self._process_notifications_loop())
        self.tasks.append(notification_task)
        
        # Start cleanup task
        cleanup_task = asyncio.create_task(self._cleanup_loop())
        self.tasks.append(cleanup_task)
        
        logger.info("Background tasks started")
    
    async def stop(self):
        """Stop background task processing"""
        if not self.is_running:
            return
        
        self.is_running = False
        logger.info("Stopping background task service")
        
        # Cancel all tasks
        for task in self.tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.tasks:
            await asyncio.gather(*self.tasks, return_exceptions=True)
        
        self.tasks.clear()
        logger.info("Background tasks stopped")
    
    async def _process_notifications_loop(self):
        """Process scheduled notifications every minute"""
        while self.is_running:
            try:
                await self._process_scheduled_notifications()
                await asyncio.sleep(60)  # Check every minute
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in notification processing loop: {e}")
                await asyncio.sleep(60)
    
    async def _cleanup_loop(self):
        """Cleanup old data every hour"""
        while self.is_running:
            try:
                await self._cleanup_old_data()
                await asyncio.sleep(3600)  # Run every hour
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
                await asyncio.sleep(3600)
    
    async def _process_scheduled_notifications(self):
        """Process scheduled notifications that are due"""
        try:
            db = SessionLocal()
            notification_service = NotificationService(db)
            
            sent_count = await notification_service.process_scheduled_notifications()
            
            if sent_count > 0:
                logger.info(f"Processed {sent_count} scheduled notifications")
            
        except Exception as e:
            logger.error(f"Failed to process scheduled notifications: {e}")
        finally:
            if 'db' in locals():
                db.close()
    
    async def _cleanup_old_data(self):
        """Clean up old notifications and logs"""
        try:
            db = SessionLocal()
            
            # Delete notifications older than 30 days
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            
            from app.db.models import Notification
            
            deleted_count = (
                db.query(Notification)
                .filter(
                    Notification.created_at < cutoff_date,
                    Notification.is_read == True
                )
                .delete(synchronize_session=False)
            )
            
            db.commit()
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} old notifications")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old data: {e}")
        finally:
            if 'db' in locals():
                db.close()

# Global background task service instance
background_task_service = BackgroundTaskService()

async def start_background_tasks():
    """Start background tasks"""
    await background_task_service.start()

async def stop_background_tasks():
    """Stop background tasks"""
    await background_task_service.stop()