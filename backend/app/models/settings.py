"""Store settings model."""
from sqlalchemy import Column, Integer, String
from app.core.database import Base

class StoreSettings(Base):
    __tablename__ = "store_settings"

    id = Column(Integer, primary_key=True, index=True)
    upi_id = Column(String(255), nullable=True)
    upi_name = Column(String(255), nullable=True)
