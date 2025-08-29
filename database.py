from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Replace with your own Postgres credentials

DATABASE_URL = "postgresql://admin:admin@localhost:5432/admin"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
import logging

# Test database connection and log result
try:
	with engine.connect() as connection:
		logging.basicConfig(level=logging.INFO)
		logging.info("Database connection successful!")
except Exception as e:
	logging.basicConfig(level=logging.ERROR)
	logging.error(f"Database connection failed: {e}")
