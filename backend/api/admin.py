"""
Admin API Endpoints
Requires admin authentication for all operations
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import logging

from backend.auth import get_current_user, set_user_plan

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

class UpdatePlanRequest(BaseModel):
    user_id: str
    plan: str  # 'free', 'pro', or 'enterprise'

class UpdateRoleRequest(BaseModel):
    user_id: str
    role: str  # 'admin' or 'user'

class AssignRoleByEmailRequest(BaseModel):
    email: str
    role: str  # 'admin' or 'user'

async def verify_admin(current_user = Depends(get_current_user)):
    """Verify that the current user is an admin"""
    try:
        import firebase_admin
        from firebase_admin import db
        
        user_id = current_user.get("user_id")
        
        # Check admin role in Firebase
        ref = db.reference(f'/user_roles/{user_id}/role')
        role = ref.get()
        
        if role != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        return current_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying admin: {str(e)}")
        raise HTTPException(status_code=403, detail="Failed to verify admin status")

@router.post("/update-plan")
async def update_user_plan(
    request: UpdatePlanRequest,
    admin_user = Depends(verify_admin)
):
    """
    Update a user's subscription plan (Admin only)
    """
    try:
        result = await set_user_plan(request.user_id, request.plan)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to update plan"))
        
        return {
            "success": True,
            "message": f"Successfully updated user {request.user_id} to {request.plan} plan"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-role")
async def update_user_role(
    request: UpdateRoleRequest,
    admin_user = Depends(verify_admin)
):
    """
    Update a user's role by user ID (Admin only)
    """
    try:
        import firebase_admin
        from firebase_admin import db
        from datetime import datetime
        import time

        if request.role not in ['admin', 'user']:
            raise HTTPException(status_code=400, detail="Invalid role. Must be: admin or user")

        # Update role in Firebase
        ref = db.reference(f'/user_roles/{request.user_id}')
        ref.set({
            'role': request.role,
            'assigned_by': admin_user.get('user_id'),
            'updatedAt': datetime.utcnow().isoformat()
        })

        # Log admin action
        log_ref = db.reference('admin_logs')
        log_ref.push({
            'action': 'role_assignment',
            'admin_id': admin_user.get('user_id'),
            'target_user_id': request.user_id,
            'new_role': request.role,
            'timestamp': int(time.time())
        })

        logger.info(f"Admin {admin_user.get('user_id')} assigned {request.role} role to {request.user_id}")

        return {
            "success": True,
            "message": f"Successfully updated user {request.user_id} to {request.role} role"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user role: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assign-role-by-email")
async def assign_role_by_email(
    request: AssignRoleByEmailRequest,
    admin_user = Depends(verify_admin)
):
    """
    Assign admin role to user by email (Admin only)
    Useful when you only know the user's email address
    """
    try:
        import firebase_admin
        from firebase_admin import db, auth as firebase_auth
        from datetime import datetime
        import time

        if request.role not in ['admin', 'user']:
            raise HTTPException(status_code=400, detail="Invalid role. Must be: admin or user")

        # Find user by email in Firebase Auth
        try:
            user_record = firebase_auth.get_user_by_email(request.email)
            target_user_id = user_record.uid
        except firebase_admin.auth.UserNotFoundError:
            raise HTTPException(status_code=404, detail=f"User not found with email: {request.email}")
        except Exception as e:
            logger.error(f"Error finding user by email: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to find user")

        # Assign role in Firebase Realtime Database
        ref = db.reference(f'/user_roles/{target_user_id}')
        ref.set({
            'role': request.role,
            'email': request.email,
            'assigned_by': admin_user.get('user_id'),
            'assigned_at': datetime.utcnow().isoformat()
        })

        # Log admin action
        log_ref = db.reference('admin_logs')
        log_ref.push({
            'action': 'role_assignment_by_email',
            'admin_id': admin_user.get('user_id'),
            'target_user_id': target_user_id,
            'target_email': request.email,
            'new_role': request.role,
            'timestamp': int(time.time())
        })

        logger.info(
            f"Admin {admin_user.get('user_id')} assigned {request.role} role to "
            f"{request.email} (uid: {target_user_id})"
        )

        return {
            "success": True,
            "user_id": target_user_id,
            "email": request.email,
            "role": request.role,
            "message": f"Successfully assigned {request.role} role to {request.email}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning role by email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
