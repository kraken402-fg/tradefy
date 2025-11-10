from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Enum, String
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..config.database import Base

class SaleStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    MOBILE_MONEY = "mobile_money"
    CREDIT_CARD = "credit_card"
    BANK_TRANSFER = "bank_transfer"

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    sale_price = Column(Float, nullable=False)
    commission_rate = Column(Float, nullable=False)  # In percentage
    commission_amount = Column(Float, nullable=False)
    seller_earnings = Column(Float, nullable=False)
    
    # Payment information
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.MOBILE_MONEY)
    payment_reference = Column(String, nullable=True)
    payment_confirmed = Column(Boolean, default=False)
    
    # Status
    status = Column(Enum(SaleStatus), default=SaleStatus.PENDING)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Foreign keys
    product_id = Column(Integer, ForeignKey("products.id"))
    seller_id = Column(Integer, ForeignKey("users.id"))
    buyer_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    product = relationship("Product", back_populates="sales")
    seller = relationship("User", foreign_keys=[seller_id], back_populates="sales")
    buyer = relationship("User", foreign_keys=[buyer_id])
    
    def confirm_payment(self, reference: str):
        """Confirm payment for this sale"""
        self.payment_confirmed = True
        self.payment_reference = reference
        self.paid_at = datetime.utcnow()
        self.status = SaleStatus.PAID
        
    def mark_as_shipped(self):
        """Mark the item as shipped"""
        self.status = SaleStatus.SHIPPED
        
    def mark_as_delivered(self):
        """Mark the item as delivered and complete the sale"""
        self.status = SaleStatus.DELIVERED
        self.completed_at = datetime.utcnow()
        
        # Update seller's sales count and earnings
        self.seller.sales_count += 1
        self.seller.total_earnings += self.seller_earnings
        self.seller.update_rank()
        
    def cancel(self):
        """Cancel the sale"""
        self.status = SaleStatus.CANCELLED
        
    def refund(self):
        """Process a refund"""
        self.status = SaleStatus.REFUNDED
        # Here you would typically integrate with your payment processor
        # to issue a refund to the buyer
