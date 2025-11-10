from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..config.database import Base

class UserRank(str, enum.Enum):
    PROFANE = "profane"
    BEGINNER = "beginner"
    MERCHANT = "merchant"
    NEGOTIATOR = "negotiator"
    BROKER = "broker"
    MAGNATE = "magnate"
    SENIOR = "senior"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    country = Column(String, default="Bénin")
    city = Column(String)
    phone_number = Column(String)
    profile_picture = Column(String, nullable=True)
    
    # Gamification fields
    sales_count = Column(Integer, default=0)
    total_earnings = Column(Float, default=0.0)
    rank = Column(SQLEnum(UserRank), default=UserRank.PROFANE)
    commission_rate = Column(Float, default=4.5)  # Default commission rate in %
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    products = relationship("Product", back_populates="owner")
    sales = relationship("Sale", back_populates="seller")
    
    def update_rank(self):
        """Update user's rank based on sales count"""
        if self.sales_count >= 2850:
            self.rank = UserRank.SENIOR
            self.commission_rate = 3.6
        elif self.sales_count >= 1005:
            self.rank = UserRank.MAGNATE
            self.commission_rate = 3.75
        elif self.sales_count >= 555:
            self.rank = UserRank.BROKER
            self.commission_rate = 3.9
        elif self.sales_count >= 228:
            self.rank = UserRank.NEGOTIATOR
            self.commission_rate = 4.05
        elif self.sales_count >= 75:
            self.rank = UserRank.MERCHANT
            self.commission_rate = 4.2
        elif self.sales_count >= 25:
            self.rank = UserRank.BEGINNER
            self.commission_rate = 4.35
        else:
            self.rank = UserRank.PROFANE
            self.commission_rate = 4.5
