
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from fastapi.testclient import TestClient

from database_test import get_test_connection
from main import app, get_db


@pytest.fixture
def shop():
    """Give every test a clean transaction and explicitly target the test DB."""
    cleaner = get_test_connection()
    database_name = cleaner.execute("SELECT current_database()").fetchone()[0]
    assert database_name == "qa_practice_shop_test"
    cleaner.execute(
        "TRUNCATE TABLE products, users RESTART IDENTITY CASCADE"
    )
    cleaner.commit()
    cleaner.close()

    connection = get_test_connection()
    assert connection.execute("SELECT current_database()").fetchone()[0] == "qa_practice_shop_test"
    original_overrides = app.dependency_overrides.copy()

    def override_get_db():
        yield connection

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    try:
        yield client, connection
    finally:
        connection.rollback()
        connection.close()
        app.dependency_overrides.clear()
        app.dependency_overrides.update(original_overrides)


def register(client, email="buyer@example.com", password="correct-horse-1"):
    response = client.post(
        "/auth/register", json={"email": email, "password": password}
    )
    assert response.status_code == 201, response.text
    return response.json()


def admin_token(client, connection):
    user = register(client, "admin@example.com")
    connection.execute("UPDATE users SET role='admin' WHERE id=%s", (user["id"],))
    return user["access_token"]


def create_product(client, token, *, name="Widget", price=8000, stock=10):
    response = client.post(
        "/products",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": name, "description": "Test item", "price_cents": price,
              "stock_quantity": stock},
    )
    assert response.status_code == 201, response.text
    return response.json()


def checkout(client, token, key="order-key-0001"):
    return client.post(
        "/orders",
        headers={"Authorization": f"Bearer {token}"},
        json={"recipient_name": "Buyer One", "recipient_phone": "+1 555 0100",
              "shipping_address": "1 Test Street", "idempotency_key": key},
    )


def test_product_catalog_is_public_and_prices_are_cents(shop):
    client, connection = shop
    token = admin_token(client, connection)
    created = create_product(client, token, price=8000, stock=5)

    assert created["price_cents"] == 8000
    assert client.get("/products").json()[0]["price_cents"] == 8000
    assert client.get(f"/products/{created['id']}").json()["stock_quantity"] == 5


def test_product_mutations_require_admin_and_validate_input(shop):
    client, connection = shop
    customer = register(client)
    denied = client.post(
        "/products", headers={"Authorization": f"Bearer {customer['access_token']}"},
        json={"name": "x", "price_cents": 100, "stock_quantity": 1},
    )
    assert denied.status_code == 403
    client.cookies.clear()
    assert client.post("/products", json={"name": "x", "price_cents": 100}).status_code == 401

    token = admin_token(client, connection)
    invalid = client.post(
        "/products", headers={"Authorization": f"Bearer {token}"},
        json={"name": "   ", "price_cents": 0},
    )
    assert invalid.status_code == 422


def test_auth_login_logout_and_duplicate_registration(shop):
    client, _ = shop
    user = register(client, "Case@Example.com")
    assert client.post(
        "/auth/register", json={"email": "case@example.com", "password": "correct-horse-1"}
    ).status_code == 409
    login = client.post(
        "/auth/login", json={"email": "CASE@example.com", "password": "correct-horse-1"}
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).json()["id"] == user["id"]
    assert client.post(
        "/auth/login", json={"email": "case@example.com", "password": "wrong-password"}
    ).status_code == 401
    assert client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"}).status_code == 204
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_guest_cart_persists_merges_on_registration_and_has_quantity_limit(shop):
    client, connection = shop
    token = admin_token(client, connection)
    product = create_product(client, token)
    guest = TestClient(app)
    added = guest.post("/cart/items", json={"product_id": product["id"], "quantity": 2})
    assert added.status_code == 201
    assert added.json()["total_cents"] == 16000

    user = register(guest, "merge@example.com")
    cart = guest.get("/cart", headers={"Authorization": f"Bearer {user['access_token']}"})
    assert cart.json()["items"][0]["quantity"] == 2
    assert "shop_guest" not in guest.cookies

    too_many = guest.post(
        "/cart/items", headers={"Authorization": f"Bearer {user['access_token']}"},
        json={"product_id": product["id"], "quantity": 999},
    )
    assert too_many.status_code == 409
    assert guest.put(
        f"/cart/items/{product['id']}",
        headers={"Authorization": f"Bearer {user['access_token']}"},
        json={"quantity": 1001},
    ).status_code == 422


def test_guest_merge_rejects_combined_quantity_over_limit(shop):
    client, connection = shop
    admin = admin_token(client, connection)
    product = create_product(client, admin, stock=1000)
    buyer = register(client, "existing@example.com")
    user_headers = {"Authorization": f"Bearer {buyer['access_token']}"}
    assert client.post("/cart/items", headers=user_headers,
                       json={"product_id": product["id"], "quantity": 600}).status_code == 201

    guest = TestClient(app)
    # Keep the test database dependency override in effect for the second client.
    guest.cookies.set("shop_guest", "guest-token-for-merge-test")
    assert guest.post("/cart/items", json={"product_id": product["id"], "quantity": 500}).status_code == 201
    merged = guest.post(
        "/auth/login", json={"email": "existing@example.com", "password": "correct-horse-1"}
    )
    assert merged.status_code == 409


def test_checkout_requires_login_and_cart_item(shop):
    client, connection = shop
    assert checkout(client, "unused-token").status_code == 401
    token = register(client)["access_token"]
    assert checkout(client, token).status_code == 400


def test_checkout_snapshots_total_clears_cart_and_is_idempotent(shop):
    client, connection = shop
    admin = admin_token(client, connection)
    product = create_product(client, admin, name="Snapshot Widget", price=8000, stock=8)
    buyer = register(client, "snapshot@example.com")
    headers = {"Authorization": f"Bearer {buyer['access_token']}"}
    assert client.post("/cart/items", headers=headers,
                       json={"product_id": product["id"], "quantity": 2}).status_code == 201

    created = checkout(client, buyer["access_token"])
    assert created.status_code == 201, created.text
    order = created.json()
    assert order["total_cents"] == 16000
    assert order["currency"] == "USD"
    assert order["status"] == "PENDING_PAYMENT"
    assert client.get("/cart", headers=headers).json()["items"] == []

    changed = client.put(
        f"/products/{product['id']}", headers={"Authorization": f"Bearer {admin}"},
        json={"name": "Renamed", "description": "Changed", "price_cents": 12000,
              "stock_quantity": 8, "is_active": True},
    )
    assert changed.status_code == 200
    detail = client.get(f"/orders/{order['id']}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["items"] == [
        {"product_name": "Snapshot Widget", "unit_price_cents": 8000,
         "quantity": 2, "line_total_cents": 16000}
    ]

    retry = checkout(client, buyer["access_token"])
    assert retry.status_code == 201
    assert retry.json()["id"] == order["id"]


def test_checkout_reserves_stock_and_cancellation_releases_it(shop):
    client, connection = shop
    admin = admin_token(client, connection)
    product = create_product(client, admin, stock=3)
    buyer = register(client, "reserve@example.com")
    headers = {"Authorization": f"Bearer {buyer['access_token']}"}
    assert client.post("/cart/items", headers=headers,
                       json={"product_id": product["id"], "quantity": 2}).status_code == 201
    order = checkout(client, buyer["access_token"]).json()
    assert client.get(f"/products/{product['id']}").json()["stock_quantity"] == 1

    other = register(client, "other@example.com")
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}
    assert client.post(
    "/cart/items",
    headers=other_headers,
    json={"product_id": product["id"], "quantity": 2}
).status_code == 409

    cancelled = client.post(f"/orders/{order['id']}/cancel", headers=headers)
    assert cancelled.status_code == 200
    assert client.get(f"/products/{product['id']}").json()["stock_quantity"] == 3


def test_expired_reservation_returns_to_available_stock(shop):
    client, connection = shop
    admin = admin_token(client, connection)
    product = create_product(client, admin, stock=4)
    buyer = register(client, "expiry@example.com")
    headers = {"Authorization": f"Bearer {buyer['access_token']}"}
    client.post("/cart/items", headers=headers,
                json={"product_id": product["id"], "quantity": 3})
    order = checkout(client, buyer["access_token"]).json()
    connection.execute(
        "UPDATE stock_reservations SET expires_at=NOW()-INTERVAL '1 second' WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=%s)",
        (order["id"],),
    )
    connection.execute(
        "UPDATE orders SET reservation_expires_at=NOW()-INTERVAL '1 second' WHERE id=%s",
        (order["id"],),
    )
    assert client.get(f"/products/{product['id']}").json()["stock_quantity"] == 4
    assert client.get(f"/orders/{order['id']}", headers=headers).json()["status"] == "EXPIRED"


def test_cart_and_order_are_private_to_their_owner(shop):
    client, connection = shop
    admin = admin_token(client, connection)
    product = create_product(client, admin)
    buyer = register(client, "owner@example.com")
    headers = {"Authorization": f"Bearer {buyer['access_token']}"}
    client.post("/cart/items", headers=headers,
                json={"product_id": product["id"], "quantity": 1})
    order = checkout(client, buyer["access_token"]).json()

    stranger = register(client, "stranger@example.com")
    stranger_headers = {"Authorization": f"Bearer {stranger['access_token']}"}
    assert client.get(f"/orders/{order['id']}", headers=stranger_headers).status_code == 404
    assert client.post(f"/orders/{order['id']}/cancel", headers=stranger_headers).status_code == 409


def test_admin_user_management_requires_admin(shop):
    client, connection = shop
    buyer = register(client)
    buyer_headers = {"Authorization": f"Bearer {buyer['access_token']}"}
    assert client.get("/admin/users", headers=buyer_headers).status_code == 403

    admin = admin_token(client, connection)
    admin_headers = {"Authorization": f"Bearer {admin}"}
    users = client.get("/admin/users", headers=admin_headers)
    assert users.status_code == 200
    changed = client.patch(
        f"/admin/users/{buyer['id']}", headers=admin_headers,
        json={"is_active": False},
    )
    assert changed.status_code == 200
    assert changed.json()["is_active"] is False


def test_admin_cannot_set_stock_below_active_reservations(shop):
    client, connection = shop
    admin = admin_token(client, connection)
    product = create_product(client, admin, stock=5)
    buyer = register(client, "held@example.com")
    client.post("/cart/items", headers={"Authorization": f"Bearer {buyer['access_token']}"},
                json={"product_id": product['id'], "quantity": 3})
    checkout(client, buyer["access_token"])
    response = client.put(
        f"/products/{product['id']}", headers={"Authorization": f"Bearer {admin}"},
        json={"name": "Widget", "description": "Test item", "price_cents": 8000,
              "stock_quantity": 2, "is_active": True},
    )
    assert response.status_code == 409

def test_checkout_rejects_stock_reserved_by_another_buyer(shop):
    client, connection = shop

    admin = admin_token(client, connection)
    product = create_product(client, admin, stock=5)

    buyer_a = register(client, "buyer_a@example.com")
    buyer_b = register(client, "buyer_b@example.com")

    headers_a = {
        "Authorization": f"Bearer {buyer_a['access_token']}"
    }
    headers_b = {
        "Authorization": f"Bearer {buyer_b['access_token']}"
    }

    # Client A adds item to cart
    added = client.post(
        "/cart/items",
        headers=headers_a,
        json={"product_id": product["id"], "quantity": 5}
    )
    assert added.status_code == 201

    # Client B adds item to cart and checks out
    added = client.post(
        "/cart/items",
        headers=headers_b,
        json={"product_id": product["id"], "quantity": 5}
    )
    assert added.status_code == 201

    order = checkout(client, buyer_b["access_token"], "buyer-b-order")
    assert order.status_code == 201

    # Client A tries to check out
    order = checkout(client, buyer_a["access_token"], "buyer-a-order")

    assert order.status_code == 409
    assert order.json()["detail"] == "Insufficient available stock"


def test_put_cart_item_updates_quantity_within_stock(shop):
    client, connection = shop
    admin = admin_token(client, connection)
    product = create_product(client, admin, stock=10)
    buyer = register(client, "buyer@example.com")

    headers = {"Authorization": f"Bearer {buyer['access_token']}"}
    # Add item to cart
    added = client.post(
        "/cart/items",
        headers=headers,
        json={"product_id": product["id"], "quantity": 3}
    )
    assert added.status_code == 201

    # Update cart item quantity
    updated = client.put(
        f"/cart/items/{product['id']}",
        headers=headers,
        json={"quantity": 7}
    )
    assert updated.status_code == 200
    assert updated.json()["items"][0]["quantity"] == 7

def test_put_cart_item_rejects_quantity_exceeding_stock(shop):
    client, connection = shop
    admin = admin_token(client, connection)
    product = create_product(client, admin, stock=5)
    buyer = register(client, "buyer@example.com")

    headers = {"Authorization": f"Bearer {buyer['access_token']}"}
    # Add item to cart
    added = client.post(
        "/cart/items",
        headers=headers,
        json={"product_id": product["id"], "quantity": 3}
    )
    assert added.status_code == 201

    # Try to update cart item quantity beyond stock
    updated = client.put(
        f"/cart/items/{product['id']}",
        headers=headers,
        json={"quantity": 11}
    )
    assert added.status_code == 201
    assert updated.status_code == 409
    assert updated.json()["detail"] == "Insufficient available stock"

    cart = client.get("/cart", headers=headers)
    assert cart.status_code == 200
    assert cart.json()["items"][0]["quantity"] == 3

def test_cart_rejects_checkout_when_product_is_deactivated(shop):
    client, connection = shop
    admin = admin_token(client, connection)
    product = create_product(client, admin, stock=5)
    buyer = register(client, "buyer@example.com")

    headers = {"Authorization": f"Bearer {buyer['access_token']}"}
    # Add item to cart
    added = client.post(
        "/cart/items",
        headers=headers,
        json={"product_id": product["id"], "quantity": 3}
    )
    assert added.status_code == 201

    # Deactivate the product
    response = client.put(
    f"/products/{product['id']}",
    headers={"Authorization": f"Bearer {admin}"},
    json={
        "name": product["name"],
        "description": product["description"],
        "price_cents": product["price_cents"],
        "stock_quantity": 10,
        "is_active": False
    }
)
    # Try to checkout
    order = checkout(client, buyer["access_token"], "order-key-deactivated")
    assert order.status_code == 409
    assert order.json()["detail"] == "Cart contains an unavailable product; remove it before checkout"
    assert response.status_code == 200
    assert response.json()["is_active"] is False

@pytest.fixture
def concurrent_shop():
    connection = get_test_connection()

    assert connection.execute(
        "SELECT current_database()"
    ).fetchone()[0] == "qa_practice_shop_test"

    connection.execute(
        "TRUNCATE TABLE products, users RESTART IDENTITY CASCADE"
    )
    connection.commit()

    original_overrides = app.dependency_overrides.copy()

    def override_get_db():
        with get_test_connection() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)

    try:
        yield client, connection
    finally:
        connection.close()

        app.dependency_overrides.clear()
        app.dependency_overrides.update(original_overrides)

        cleaner = get_test_connection()
        try:
            cleaner.execute(
                "TRUNCATE TABLE products, users RESTART IDENTITY CASCADE"
            )
            cleaner.commit()
        finally:
            cleaner.close()

def test_concurrent_cart_additions_do_not_exceed_stock(concurrent_shop):
    client, connection = concurrent_shop

    buyer = register(client, "concurrent@example.com")
    admin = register(client, "concurrent_admin@example.com")

    connection.execute(
        "UPDATE users SET role='admin' WHERE id=%s",
        (admin["id"],)
    )
    connection.commit()

    product = create_product(
        client,
        admin["access_token"],
        stock=1
    )

    headers = {
        "Authorization": f"Bearer {buyer['access_token']}"
    }

    barrier = Barrier(2)

    def add_to_cart():
        with TestClient(app) as concurrent_client:
            barrier.wait()

            return concurrent_client.post(
                "/cart/items",
                headers=headers,
                json={
                    "product_id": product["id"],
                    "quantity": 1
                }
            )

    with ThreadPoolExecutor(max_workers=2) as executor:
        future_1 = executor.submit(add_to_cart)
        future_2 = executor.submit(add_to_cart)

        response_1 = future_1.result()
        response_2 = future_2.result()

    statuses = sorted([
        response_1.status_code,
        response_2.status_code
    ])

    assert statuses == [201, 409]

    cart = client.get("/cart", headers=headers)

    assert cart.status_code == 200

    items = cart.json()["items"]

    assert len(items) == 1
    assert items[0]["quantity"] == 1

def test_concurrent_checkouts_do_not_oversell_stock(concurrent_shop):
    client, connection = concurrent_shop

    buyer_a = register(client, "buyer_a@example.com")
    buyer_b = register(client, "buyer_b@example.com")
    admin = register(client, "concurrent_admin@example.com")

    connection.execute(
        "UPDATE users SET role='admin' WHERE id=%s",
        (admin["id"],)
    )
    connection.commit()

    product = create_product(
        client,
        admin["access_token"],
        stock=1
    )

    headers_a = {
        "Authorization": f"Bearer {buyer_a['access_token']}"
    }

    headers_b = {
        "Authorization": f"Bearer {buyer_b['access_token']}"
    }

    # Both buyers add the same product to their carts
    cart_a = client.post(
        "/cart/items",
        headers=headers_a,
        json={
            "product_id": product["id"],
            "quantity": 1
        }
    )

    cart_b = client.post(
        "/cart/items",
        headers=headers_b,
        json={
            "product_id": product["id"],
            "quantity": 1
        }
    )

    assert cart_a.status_code == 201
    assert cart_b.status_code == 201

    barrier = Barrier(2)

    def place_order(token, idempotency_key):
        with TestClient(app) as concurrent_client:
            barrier.wait()

            return checkout(
                concurrent_client,
                token,
                key=idempotency_key
            )

    # Both buyers place orders concurrently.
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_a = executor.submit(
            place_order,
            buyer_a["access_token"],
            "concurrent-order-a"
        )

        future_b = executor.submit(
            place_order,
            buyer_b["access_token"],
            "concurrent-order-b"
        )

        response_a = future_a.result()
        response_b = future_b.result()

    statuses = sorted([
        response_a.status_code,
        response_b.status_code
    ])

    assert statuses == [201, 409]

    # Check the number of created orders.
    order_count = connection.execute(
        "SELECT COUNT(*) FROM orders WHERE status='PENDING_PAYMENT'"
    ).fetchone()[0]

    assert order_count == 1

    # Check the number of active product reservations.
    reserved_quantity = connection.execute(
        """
        SELECT COALESCE(SUM(quantity), 0)
        FROM stock_reservations
        WHERE product_id=%s
          AND released_at IS NULL
          AND expires_at > NOW()
        """,
        (product["id"],)
    ).fetchone()[0]

    assert reserved_quantity == 1