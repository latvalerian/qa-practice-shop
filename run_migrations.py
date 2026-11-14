from pathlib import Path

from database import get_connection


MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def run_migrations() -> None:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version TEXT PRIMARY KEY,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        connection.commit()

        for migration_path in sorted(MIGRATIONS_DIR.glob("[0-9]*.sql")):
            version = migration_path.name
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT 1 FROM schema_migrations WHERE version = %s",
                        (version,),
                    )
                    if cursor.fetchone():
                        continue

                    sql = migration_path.read_text(encoding="utf-8-sig")
                    cursor.execute(sql, prepare=False)
                    cursor.execute(
                        "INSERT INTO schema_migrations (version) VALUES (%s)",
                        (version,),
                    )
            print(f"Applied {version}")


if __name__ == "__main__":
    run_migrations()
