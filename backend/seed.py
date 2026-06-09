"""
seed.py — Run once to create the initial admin user and a test user.

Usage:
    cd backend
    python seed.py
"""

from database.db import SessionLocal, engine
from models.models import Base, User, RoleEnum
from utils.auth import hash_password

# Create all tables if they don't exist
Base.metadata.create_all(bind=engine)

db = SessionLocal()

def create_user_if_not_exists(name, email, password, role):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"  [SKIP] {email} already exists.")
        return
    user = User(
        name=name,
        email=email,
        password=hash_password(password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    print(f"  [OK]   Created {role}: {email} / password: {password}")

print("\n🌱 Seeding database...\n")

create_user_if_not_exists(
    name="Admin User",
    email="admin@gmail.com",
    password="admin123",
    role=RoleEnum.admin,
)

create_user_if_not_exists(
    name="Test User",
    email="user@example.com",
    password="user123",
    role=RoleEnum.user,
)

db.close()

print("\n✅ Done! You can now login with:")
print("   Admin → admin@example.com / admin123")
print("   User  → user@example.com  / user123\n")
