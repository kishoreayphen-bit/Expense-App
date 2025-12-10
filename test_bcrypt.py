import bcrypt

# Generate hash for Password123!
password = "Password123!"
salt = bcrypt.gensalt(rounds=10)
hashed = bcrypt.hashpw(password.encode('utf-8'), salt)

print(f"Password: {password}")
print(f"Hash: {hashed.decode('utf-8')}")

# Verify it works
test_hash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
result = bcrypt.checkpw(password.encode('utf-8'), test_hash.encode('utf-8'))
print(f"\nVerifying existing hash: {result}")

# Generate a new one
new_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(10))
print(f"\nNew hash: {new_hash.decode('utf-8')}")
verify_new = bcrypt.checkpw(password.encode('utf-8'), new_hash)
print(f"Verify new hash: {verify_new}")
