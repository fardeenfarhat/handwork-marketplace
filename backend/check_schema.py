import sqlite3

conn = sqlite3.connect('handwork.db')
cursor = conn.cursor()

print("\n=== All Tables ===\n")
tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
for table in tables:
    print(f"  - {table[0]}")

print("\n=== Alembic Version ===\n")
try:
    version = cursor.execute("SELECT version_num FROM alembic_version").fetchone()
    print(f"Current migration: {version[0] if version else 'None'}")
except:
    print("No alembic_version table found")

conn.close()
