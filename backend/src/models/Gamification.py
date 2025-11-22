from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Gamification(Base):
    __tablename__ = 'gamification'

    id = Column(Integer, primary_key=True)
    level_name = Column(String, nullable=False)
    sales_required = Column(Integer, nullable=False)
    commission_rate = Column(Float, nullable=False)
