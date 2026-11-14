from database import DB_CONFIG
import psycopg

TEST_DB_CONFIG = DB_CONFIG.copy()
TEST_DB_CONFIG["dbname"] = "qa_practice_shop_test"


def get_test_connection():
    return psycopg.connect(**TEST_DB_CONFIG)

try:
    with get_test_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_database()")
            result = cursor.fetchone()

            print("Connected to:", result[0])

except Exception as error:
    print("Connection failed:", error)