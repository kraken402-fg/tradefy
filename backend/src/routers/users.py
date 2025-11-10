from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import models, schemas
from ..config.database import get_db
from ..config.auth import get_current_active_user, get_password_hash

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.get("/", response_model=List[schemas.UserResponse])
def read_users(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all users (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@router.get("/me", response_model=schemas.UserResponse)
def read_user_me(
    current_user: models.User = Depends(get_current_active_user)
):
    """Get current user"""
    return current_user

@router.get("/{user_id}", response_model=schemas.UserResponse)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get a specific user by ID"""
    # Users can only view their own profile unless they're admin
    if user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/me", response_model=schemas.UserResponse)
def update_user_me(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update current user's information"""
    update_data = user_update.dict(exclude_unset=True)
    
    # Don't allow updating these fields here
    for field in ["is_active", "is_superuser", "is_verified"]:
        update_data.pop(field, None)
    
    # Update user
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/me/password")
def change_password(
    current_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Change current user's password"""
    from ..config.auth import verify_password, get_password_hash
    
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    current_user.hashed_password = get_password_hash(new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.get("/me/stats", response_model=schemas.UserStats)
def get_user_stats(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's statistics"""
    from ..models.user import UserRank
    
    # Calculate rank progress
    def get_rank_progress(sales_count: int) -> tuple[float, Optional[str], Optional[int]]:
        rank_thresholds = [
            (UserRank.SENIOR, 2850),
            (UserRank.MAGNATE, 1005),
            (UserRank.BROKER, 555),
            (UserRank.NEGOTIATOR, 228),
            (UserRank.MERCHANT, 75),
            (UserRank.BEGINNER, 25),
            (UserRank.PROFANE, 0),
        ]
        
        for i, (rank, threshold) in enumerate(rank_thresholds):
            if sales_count >= threshold:
                if i == 0:  # Already at max rank
                    return 100.0, None, None
                next_rank, next_threshold = rank_thresholds[i-1]
                current_rank_sales = threshold
                next_rank_sales = next_threshold
                progress = ((sales_count - current_rank_sales) / 
                          (next_rank_sales - current_rank_sales)) * 100
                return min(progress, 100), next_rank.value, next_rank_sales - sales_count
        
        return 0.0, UserRank.BEGINNER.value, 25 - sales_count
    
    progress, next_rank, sales_needed = get_rank_progress(current_user.sales_count)
    
    return {
        "total_products": db.query(models.Product)
                           .filter(models.Product.owner_id == current_user.id)
                           .count(),
        "total_sales": current_user.sales_count,
        "total_earnings": current_user.total_earnings,
        "commission_rate": current_user.commission_rate,
        "rank": current_user.rank,
        "rank_progress": progress,
        "next_rank": next_rank,
        "sales_to_next_rank": sales_needed
    }
