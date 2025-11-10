from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRank(str, Enum):
    PROFANE = "profane"
    BEGINNER = "beginner"
    MERCHANT = "merchant"
    NEGOTIATOR = "negotiator"
    BROKER = "broker"
    MAGNATE = "magnate"
    SENIOR = "senior"

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    country: str = "Bénin"
    city: Optional[str] = None
    phone_number: Optional[str] = None
    profile_picture: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        # Add more password strength validations as needed
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    city: Optional[str] = None
    phone_number: Optional[str] = None
    profile_picture: Optional[str] = None
    is_active: Optional[bool] = None

class UserInDBBase(UserBase):
    id: int
    sales_count: int = 0
    total_earnings: float = 0.0
    rank: UserRank = UserRank.PROFANE
    commission_rate: float = 4.5
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserResponse(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserStats(BaseModel):
    total_products: int
    total_sales: int
    total_earnings: float
    commission_rate: float
    rank: UserRank
    rank_progress: float  # 0-100%
    next_rank: Optional[str] = None
    sales_to_next_rank: Optional[int] = None

class LeaderboardUser(BaseModel):
    rank: int
    username: str
    country: str
    sales: int
    rank_level: UserRank
    commission_rate: float

class LeaderboardResponse(BaseModel):
    users: List[LeaderboardUser]
    current_user_rank: Optional[int] = None
    total_users: int
