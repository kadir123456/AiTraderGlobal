"""
Startup and Shutdown Events for FastAPI
Initialize database and other services
"""
import logging
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app):
    """
    Lifespan context manager for FastAPI app
    Handles startup and shutdown events
    """
    # Startup
    logger.info("🚀 Starting EMA Navigator AI Trading API...")
    
    # Initialize database
    try:
        from backend.database import db
        await db.init_db()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {str(e)}")
    
    # Initialize EMA monitor (if available)
    try:
        from backend.api.auto_trading import init_ema_monitor
        init_ema_monitor()
        logger.info("✅ EMA Monitor initialized")
    except Exception as e:
        logger.warning(f"⚠️ EMA Monitor not available: {str(e)}")
    
    logger.info("✅ Application startup complete!")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down EMA Navigator AI Trading API...")
    
    try:
        from backend.database import db
        await db.close_db()
        logger.info("✅ Database connections closed")
    except Exception as e:
        logger.error(f"❌ Error closing database: {str(e)}")
    
    logger.info("✅ Application shutdown complete!")
