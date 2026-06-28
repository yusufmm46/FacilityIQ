import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


def _uuid():
    return str(uuid.uuid4())


class Organisation(Base):
    __tablename__ = "organisations"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    name = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    buildings = relationship("Building", back_populates="org", cascade="all, delete-orphan")


class Building(Base):
    __tablename__ = "buildings"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    org_id = Column(UUID(as_uuid=False), ForeignKey("organisations.id", ondelete="CASCADE"))
    name = Column(Text, nullable=False)
    address = Column(Text)
    city = Column(Text)
    country = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    org = relationship("Organisation", back_populates="buildings")
    floors = relationship("Floor", back_populates="building", cascade="all, delete-orphan")


class Floor(Base):
    __tablename__ = "floors"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    building_id = Column(UUID(as_uuid=False), ForeignKey("buildings.id", ondelete="CASCADE"))
    name = Column(Text, nullable=False)
    level_number = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    building = relationship("Building", back_populates="floors")
    areas = relationship("Area", back_populates="floor", cascade="all, delete-orphan")


class Area(Base):
    __tablename__ = "areas"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    floor_id = Column(UUID(as_uuid=False), ForeignKey("floors.id", ondelete="CASCADE"))
    name = Column(Text, nullable=False)
    width_m = Column(Float)
    height_m = Column(Float)
    dxf_parsed_data = Column(JSONB)
    svg_path_data = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    floor = relationship("Floor", back_populates="areas")
    access_points = relationship("AccessPoint", back_populates="area", cascade="all, delete-orphan")
    zones = relationship("Zone", back_populates="area", cascade="all, delete-orphan")
    uploads = relationship("RssiUpload", back_populates="area", cascade="all, delete-orphan")


class AccessPoint(Base):
    __tablename__ = "access_points"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    area_id = Column(UUID(as_uuid=False), ForeignKey("areas.id", ondelete="CASCADE"))
    ap_id = Column(Text, nullable=False)
    x_m = Column(Float, nullable=False)
    y_m = Column(Float, nullable=False)
    layer = Column(Text)
    area = relationship("Area", back_populates="access_points")


class Zone(Base):
    __tablename__ = "zones"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    area_id = Column(UUID(as_uuid=False), ForeignKey("areas.id", ondelete="CASCADE"))
    name = Column(Text, nullable=False)
    capacity = Column(Integer, default=10)
    polygon_json = Column(JSONB, nullable=False)
    color = Column(Text, default="#3B82F6")
    method = Column(Text, default="freehand")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    area = relationship("Area", back_populates="zones")
    device_positions = relationship("DevicePosition", back_populates="zone")


class RssiUpload(Base):
    __tablename__ = "rssi_uploads"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    area_id = Column(UUID(as_uuid=False), ForeignKey("areas.id", ondelete="CASCADE"))
    filename = Column(Text)
    record_count = Column(Integer)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    area = relationship("Area", back_populates="uploads")
    device_positions = relationship("DevicePosition", back_populates="upload", cascade="all, delete-orphan")


class DevicePosition(Base):
    __tablename__ = "device_positions"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    upload_id = Column(UUID(as_uuid=False), ForeignKey("rssi_uploads.id", ondelete="CASCADE"))
    mac_hash = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    est_x = Column(Float, nullable=False)
    est_y = Column(Float, nullable=False)
    zone_id = Column(UUID(as_uuid=False), ForeignKey("zones.id"), nullable=True)
    area_name = Column(Text)
    upload = relationship("RssiUpload", back_populates="device_positions")
    zone = relationship("Zone", back_populates="device_positions")
