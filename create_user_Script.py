from sqlalchemy.orm import Session
from database import SessionLocal
from crud import create_user

# Create a new database session
db = SessionLocal()

# Call the create_user function
new_user = create_user(db, username="sonu", email="test@test.com", password="admin", full_name="sonu kumar")

print("User created:", new_user.username)