from fastapi import APIRouter

from app.api.api_v1.endpoints import auth, profiles, jobs, messages, payments, bookings, reviews, recommendations, ml_recommendations, admin, notifications, websocket, security, users

api_router = APIRouter()

@api_router.get("/")
async def api_root():
    return {"message": "Handwork Marketplace API v1"}

# Include routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(messages.router, prefix="/messages", tags=["messaging"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
api_router.include_router(ml_recommendations.router, prefix="/ml", tags=["machine-learning"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(security.router, prefix="/security", tags=["security"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(websocket.router, prefix="", tags=["websocket"])