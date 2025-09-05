from twilio.rest import Client
from twilio.base.exceptions import TwilioException
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

class SMSService:
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.phone_number = settings.TWILIO_PHONE_NUMBER
        self.client = None
        
        if self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)

    async def send_sms(self, to_phone: str, message: str) -> bool:
        """Send SMS using Twilio"""
        if not self.client:
            logger.error("Twilio client not configured")
            return False
            
        try:
            message = self.client.messages.create(
                body=message,
                from_=self.phone_number,
                to=to_phone
            )
            
            logger.info(f"SMS sent successfully to {to_phone}, SID: {message.sid}")
            return True
            
        except TwilioException as e:
            logger.error(f"Failed to send SMS to {to_phone}: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {to_phone}: {str(e)}")
            return False

    async def send_verification_sms(self, to_phone: str, verification_code: str) -> bool:
        """Send phone verification SMS"""
        message = f"""
Handwork Marketplace

Your verification code is: {verification_code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this message.
        """.strip()
        
        return await self.send_sms(to_phone, message)

    def generate_verification_code(self) -> str:
        """Generate 6-digit verification code"""
        import random
        return str(random.randint(100000, 999999))

# Create global instance
sms_service = SMSService()