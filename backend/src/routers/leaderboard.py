from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional

from .. import models, schemas
from ..config.database import get_db
from ..config.auth import get_current_active_user
from ..models.user import UserRank

router = APIRouter(
    prefix="/leaderboard",
    tags=["Leaderboard"]
)

def get_rank_thresholds():
    """Return list of (rank_name, min_sales) tuples in descending order"""
    return [
        (UserRank.SENIOR, 2850),
        (UserRank.MAGNATE, 1005),
        (UserRank.BROKER, 555),
        (UserRank.NEGOTIATOR, 228),
        (UserRank.MERCHANT, 75),
        (UserRank.BEGINNER, 25),
        (UserRank.PROFANE, 0),
    ]

def get_rank_for_sales(sales_count: int) -> UserRank:
    """Get rank based on sales count"""
    for rank, min_sales in get_rank_thresholds():
        if sales_count >= min_sales:
            return rank
    return UserRank.PROFANE

@router.get("/global", response_model=schemas.LeaderboardResponse)
async def get_global_leaderboard(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get global leaderboard"""
    # Get total count for pagination
    total_users = db.query(models.User).count()
    
    # Get users ordered by sales_count
    users = db.query(
        models.User.id,
        models.User.username,
        models.User.country,
        models.User.sales_count.label('sales'),
        models.User.rank
    ).order_by(desc('sales')).offset(skip).limit(limit).all()
    
    # Convert to LeaderboardUser format with ranks
    leaderboard_users = []
    for i, user in enumerate(users, start=skip + 1):
        leaderboard_users.append(schemas.LeaderboardUser(
            rank=i,
            username=user.username,
            country=user.country,
            sales=user.sales,
            rank_level=user.rank,
            commission_rate=user.rank.get_commission_rate()
        ))
    
    # Find current user's rank if not in the current page
    current_user_rank = None
    if current_user:
        current_user_rank = db.query(
            func.count().label('rank')
        ).filter(
            models.User.sales_count > current_user.sales_count
        ).scalar() + 1
    
    return {
        "users": leaderboard_users,
        "current_user_rank": current_user_rank if current_user_rank else None,
        "total_users": total_users
    }

@router.get("/national", response_model=schemas.LeaderboardResponse)
async def get_national_leaderboard(
    country: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get national leaderboard for a specific country"""
    # Default to current user's country if not specified
    if country is None and current_user:
        country = current_user.country
    
    if not country:
        raise HTTPException(status_code=400, detail="Country is required")
    
    # Get total count for pagination
    total_users = db.query(models.User).filter(
        models.User.country == country
    ).count()
    
    # Get users from the specified country, ordered by sales
    users = db.query(
        models.User.id,
        models.User.username,
        models.User.country,
        models.User.sales_count.label('sales'),
        models.User.rank
    ).filter(
        models.User.country == country
    ).order_by(desc('sales')).offset(skip).limit(limit).all()
    
    # Convert to LeaderboardUser format with ranks
    leaderboard_users = []
    for i, user in enumerate(users, start=skip + 1):
        leaderboard_users.append(schemas.LeaderboardUser(
            rank=i,
            username=user.username,
            country=user.country,
            sales=user.sales,
            rank_level=user.rank,
            commission_rate=user.rank.get_commission_rate()
        ))
    
    # Find current user's rank if not in the current page
    current_user_rank = None
    if current_user and current_user.country == country:
        current_user_rank = db.query(
            func.count().label('rank')
        ).filter(
            models.User.country == country,
            models.User.sales_count > current_user.sales_count
        ).scalar() + 1
    
    return {
        "users": leaderboard_users,
        "current_user_rank": current_user_rank if current_user_rank else None,
        "total_users": total_users
    }

@router.get("/ranks")
async def get_rank_info():
    """Get information about all ranks and their requirements"""
    ranks = []
    thresholds = get_rank_thresholds()
    
    for i in range(len(thresholds)):
        rank_name, min_sales = thresholds[i]
        next_rank = thresholds[i-1][0] if i > 0 else None
        next_sales = thresholds[i-1][1] if i > 0 else None
        
        rank_info = {
            "name": rank_name.value,
            "display_name": rank_name.get_display_name(),
            "min_sales": min_sales,
            "commission_rate": rank_name.get_commission_rate(),
            "next_rank": next_rank.value if next_rank else None,
            "sales_to_next": next_sales - min_sales if next_sales else None
        }
        ranks.append(rank_info)
    
    return {"ranks": ranks}
