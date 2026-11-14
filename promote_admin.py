import sys

from database import get_connection


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python promote_admin.py <email>")

    email = sys.argv[1].strip().lower()
    if "@" not in email:
        raise SystemExit("Enter a valid email address.")

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET role = 'admin'
                WHERE email = %s
                RETURNING id
                """,
                (email,),
            )
            row = cursor.fetchone()

    if row is None:
        raise SystemExit("No account found for that email. Register first.")
    print(f"Promoted user id {row[0]} to admin.")


if __name__ == "__main__":
    main()
