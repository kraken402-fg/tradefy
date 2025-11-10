from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..config.database import Base

class ProductStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    SOLD = "sold"
    ARCHIVED = "archived"

class ProductCategory(str, enum.Enum):
    ELECTRONICS = "electronics"
    FASHION = "fashion"
    HOME = "home"
    BEAUTY = "beauty"
    SPORTS = "sports"
    TOYS = "toys"
    BOOKS = "books"
    OTHER = "other"

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)
    category = Column(Enum(ProductCategory), default=ProductCategory.OTHER)
    status = Column(Enum(ProductStatus), default=ProductStatus.DRAFT)
    
    # Media
    main_image_url = Column(String)
    image_urls = Column(String)  # JSON string of image URLs
    
    # Location
    city = Column(String)
    country = Column(String, default="Bénin")
    
    # Foreign keys
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Status
    is_negotiable = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="products")
    sales = relationship("Sale", back_populates="product")
    
    @property
    def image_list(self):
        """Returns a list of image URLs"""
        if not self.image_urls:
            return []
        return self.image_urls.split(",")
    
    @image_list.setter
    def image_list(self, urls):
        """Sets image URLs from a list"""
        self.image_urls = ",".join(urls) if urls else ""
        
    def publish(self):
        """Publish the product"""
        if self.status != ProductStatus.PUBLISHED:
            self.status = ProductStatus.PUBLISHED
            self.published_at = datetime.utcnow()
            
    def mark_as_sold(self):
        """Mark product as sold"""
        self.status = ProductStatus.SOLD
        
    def archive(self):
        """Archive the product"""
        self.status = ProductStatus.ARCHIVED
