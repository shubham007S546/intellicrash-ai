import sqlite3
import os

db_path = r"c:\Users\shubh\Downloads\intellicrash_complete\intellicrash\python\intellicrash.db"

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
try:
    conn.execute("ALTER TABLE community_reports ADD COLUMN sentiment TEXT DEFAULT 'neutral';")
    conn.commit()
    print("Column 'sentiment' added successfully to 'community_reports'.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("Column 'sentiment' already exists.")
    else:
        print(f"Error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
finally:
    conn.close()
