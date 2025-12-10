#!/usr/bin/env python3
"""
Generate BCrypt password hash for seed data
Password: Password123!
"""

import bcrypt

password = "Password123!"
salt = bcrypt.gensalt(rounds=10)
hashed = bcrypt.hashpw(password.encode('utf-8'), salt)

print("=" * 50)
print("Password Hash Generator")
print("=" * 50)
print(f"Plain Password: {password}")
print(f"BCrypt Hash:    {hashed.decode('utf-8')}")
print("=" * 50)
print("\nUse this hash in your SQL migration:")
print(f"'{hashed.decode('utf-8')}'")
print("=" * 50)

# Verify
if bcrypt.checkpw(password.encode('utf-8'), hashed):
    print("\n✓ Hash is valid")
else:
    print("\n✗ Hash is invalid")
print("=" * 50)
