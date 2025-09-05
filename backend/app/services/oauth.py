import httpx
import jwt
from typing import Optional, Dict, Any
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

class OAuthService:
    
    async def verify_google_token(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Verify Google OAuth token and return user info"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://www.googleapis.com/oauth2/v1/userinfo?access_token={access_token}"
                )
                
                if response.status_code == 200:
                    user_info = response.json()
                    return {
                        "provider_user_id": user_info.get("id"),
                        "email": user_info.get("email"),
                        "first_name": user_info.get("given_name", ""),
                        "last_name": user_info.get("family_name", ""),
                        "verified_email": user_info.get("verified_email", False)
                    }
                else:
                    logger.error(f"Google token verification failed: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error verifying Google token: {str(e)}")
            return None

    async def verify_facebook_token(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Verify Facebook OAuth token and return user info"""
        try:
            async with httpx.AsyncClient() as client:
                # First verify the token
                app_token_response = await client.get(
                    f"https://graph.facebook.com/oauth/access_token?client_id={settings.FACEBOOK_CLIENT_ID}&client_secret={settings.FACEBOOK_CLIENT_SECRET}&grant_type=client_credentials"
                )
                
                if app_token_response.status_code != 200:
                    logger.error("Failed to get Facebook app token")
                    return None
                
                app_token = app_token_response.json().get("access_token")
                
                # Verify user token
                verify_response = await client.get(
                    f"https://graph.facebook.com/debug_token?input_token={access_token}&access_token={app_token}"
                )
                
                if verify_response.status_code != 200:
                    logger.error("Facebook token verification failed")
                    return None
                
                verify_data = verify_response.json().get("data", {})
                if not verify_data.get("is_valid"):
                    logger.error("Facebook token is not valid")
                    return None
                
                # Get user info
                user_response = await client.get(
                    f"https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token={access_token}"
                )
                
                if user_response.status_code == 200:
                    user_info = user_response.json()
                    return {
                        "provider_user_id": user_info.get("id"),
                        "email": user_info.get("email"),
                        "first_name": user_info.get("first_name", ""),
                        "last_name": user_info.get("last_name", ""),
                        "verified_email": True  # Facebook emails are generally verified
                    }
                else:
                    logger.error(f"Facebook user info request failed: {user_response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error verifying Facebook token: {str(e)}")
            return None

    async def verify_apple_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """Verify Apple OAuth token and return user info"""
        try:
            # Apple uses JWT ID tokens, not access tokens
            # We need to verify the JWT signature using Apple's public keys
            
            # For now, we'll decode without verification (not recommended for production)
            # In production, you should verify the signature using Apple's public keys
            decoded_token = jwt.decode(id_token, options={"verify_signature": False})
            
            # Verify the token claims
            if decoded_token.get("iss") != "https://appleid.apple.com":
                logger.error("Invalid Apple token issuer")
                return None
                
            if decoded_token.get("aud") != settings.APPLE_CLIENT_ID:
                logger.error("Invalid Apple token audience")
                return None
            
            # Extract user info
            email = decoded_token.get("email")
            email_verified = decoded_token.get("email_verified", False)
            
            return {
                "provider_user_id": decoded_token.get("sub"),
                "email": email,
                "first_name": "",  # Apple doesn't always provide names
                "last_name": "",
                "verified_email": email_verified
            }
            
        except Exception as e:
            logger.error(f"Error verifying Apple token: {str(e)}")
            return None

    async def verify_oauth_token(self, provider: str, token: str) -> Optional[Dict[str, Any]]:
        """Verify OAuth token based on provider"""
        if provider == "google":
            return await self.verify_google_token(token)
        elif provider == "facebook":
            return await self.verify_facebook_token(token)
        elif provider == "apple":
            return await self.verify_apple_token(token)
        else:
            logger.error(f"Unsupported OAuth provider: {provider}")
            return None

# Create global instance
oauth_service = OAuthService()