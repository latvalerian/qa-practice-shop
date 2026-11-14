from database import get_connection

try:
    with get_connection() as connection:
        print("Database connection successful!")

except Exception as error:
    print("Connection failed:", error)