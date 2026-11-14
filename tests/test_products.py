
import pytest
from fastapi.testclient import TestClient
from main import app, get_db
from database_test import get_test_connection

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolate_test_database():
    connection = get_test_connection()
    original_overrides = app.dependency_overrides.copy()

    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM products")

    def override_get_db():
        yield connection

    app.dependency_overrides[get_db] = override_get_db
    yield connection
    app.dependency_overrides.clear()
    app.dependency_overrides.update(original_overrides)
    connection.rollback()
    connection.close()


def test_get_products_from_db(isolate_test_database):
    with isolate_test_database.cursor() as cursor:
        cursor.execute(
            "INSERT INTO products (name, price) VALUES (%s, %s)",
            ("Test database product", 25),
        )

    response = client.get("/db/products")

    assert response.status_code == 200

    products = response.json()

    assert isinstance(products, list)
    assert len(products) > 0

    for product in products:
        assert "id" in product
        assert "name" in product
        assert "price" in product

        assert isinstance(product["id"], int)
        assert isinstance(product["name"], str)
        assert isinstance(product["price"], int)

        assert product["name"].strip() != ""
        assert product["price"] > 0


@pytest.mark.parametrize(
    "product_id, expected_status",
    [
        (999999, 404),
        (-1, 422),
        (0, 422)
    ]
)
def test_get_nonexistent_product(product_id, expected_status):
    response = client.get(f"/products/{product_id}")

    assert response.status_code == expected_status

    error_data = response.json()

    if expected_status == 404:
        assert error_data["detail"] == "Product not found"

    elif expected_status == 422:
        assert isinstance(error_data["detail"], list)

        validation_error = error_data["detail"][0]

        assert validation_error["type"] == "greater_than_equal"
        assert validation_error["loc"] == ["path", "product_id"]
        assert validation_error["ctx"]["ge"] == 1


def test_list_products_sorted_ascending():
    for name, price in [("Expensive", 90), ("Cheap", 10), ("Midrange", 40)]:
        response = client.post("/products", json={"name": name, "price": price})
        assert response.status_code == 201

    response = client.get("/products")

    assert response.status_code == 200
    assert [product["price"] for product in response.json()] == [10, 40, 90]


def test_list_products_filter_and_sort_descending():
    for name, price in [("Expensive", 90), ("Cheap", 10), ("Midrange", 40)]:
        response = client.post("/products", json={"name": name, "price": price})
        assert response.status_code == 201

    response = client.get("/products", params={"min_price": 40, "sort": "desc"})

    assert response.status_code == 200
    assert [product["price"] for product in response.json()] == [90, 40]


def test_list_products_rejects_invalid_sort():
    response = client.get("/products", params={"sort": "random"})

    assert response.status_code == 422
    assert response.json()["detail"] == "Invalid sort parameter"

def test_api_products_match_database(isolate_test_database):
    create_response = client.post(
        "/products", json={"name": "Database comparison", "price": 75}
    )
    assert create_response.status_code == 201

    response = client.get("/db/products")

    assert response.status_code == 200

    api_products = response.json()

    with isolate_test_database.cursor() as cursor:
        cursor.execute("SELECT id, name, price FROM products ORDER BY id")
        db_products = cursor.fetchall()

    expected_products = [
        {
            "id": product[0],
            "name": product[1],
            "price": product[2]
        }
        for product in db_products
    ]

    assert api_products == expected_products

def test_empty_products_from_test_db():
    response = client.get("/db/products")

    assert response.status_code == 200
    assert response.json() == []

def test_create_product():
    payload = {
        "name": "Test Monitor",
        "price": 250
    }

    response = client.post("/products", json=payload)

    assert response.status_code == 201

    created_product = response.json()

    assert created_product["name"] == payload["name"]
    assert created_product["price"] == payload["price"]
    assert isinstance(created_product["id"], int)

    persisted_response = client.get(f"/products/{created_product['id']}")
    assert persisted_response.status_code == 200
    assert persisted_response.json() == created_product

@pytest.mark.parametrize(
    "price",
    [
        0,
        -1,
        -100
    ]
)
def test_create_product_with_invalid_price(price):
    products_before = client.get("/products").json()
    payload = {
        "name": "Invalid Product",
        "price": price
    }

    response = client.post("/products", json=payload)

    assert response.status_code == 422

    products_after = client.get("/products").json()

    assert products_before == products_after

def test_create_product_without_name():
    products_before = client.get("/products").json()

    payload = {
        "price": 100
    }

    response = client.post("/products", json=payload)

    assert response.status_code == 422

    products_after = client.get("/products").json()

    assert products_before == products_after

def test_create_product_with_null_name():
    payload = {
        "name": None,
        "price": 100
    }

    response = client.post("/products", json=payload)

    assert response.status_code == 422

def test_create_product_with_empty_name():
    payload = {
        "name": "",
        "price": 100
    }

    response = client.post("/products", json=payload)

    assert response.status_code == 422

def test_create_product_with_whitespace_name():
    response = client.post(
        "/products",
        json={"name": "   ", "price": 100}
    )

    assert response.status_code == 422

@pytest.mark.parametrize(
    "name",
    ["  Keyboard", "Keyboard  ", "  Gaming Mouse  "]
)
def test_create_product_strips_whitespace(name):
    response = client.post(
        "/products",
        json={"name": name, "price": 100}
    )

    assert response.status_code == 201
    assert response.json()["name"] == name.strip()

def test_create_product_preserves_internal_spaces():
    response = client.post(
        "/products",
        json={"name": "Gaming Mouse", "price": 100}
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Gaming Mouse"

def test_patch_product_updates_only_price():
    create_response = client.post(
        "/products",
        json={"name": "Patch Test Product", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.patch(
        f"/products/{product_id}",
        json={"price": 200}
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Patch Test Product"
    assert response.json()["price"] == 200

def test_patch_product_updates_only_name():
    create_response = client.post(
        "/products",
        json={"name": "Old Product Name", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.patch(
        f"/products/{product_id}",
        json={"name": "New Product Name"}
    )

    assert response.status_code == 200
    assert response.json()["name"] == "New Product Name"
    assert response.json()["price"] == 100

def test_patch_product_with_empty_body():
    create_response = client.post(
        "/products",
        json={"name": "Patch Test Product", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.patch(
        f"/products/{product_id}",
        json={}
    )

    assert response.status_code == 422

    check_response = client.get(f"/products/{product_id}")

    assert check_response.status_code == 200
    assert check_response.json()["name"] == "Patch Test Product"
    assert check_response.json()["price"] == 100

def test_patch_product_with_null_name():
    create_response = client.post(
        "/products",
        json={"name": "Original Name", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.patch(
        f"/products/{product_id}",
        json={"name": None}
    )

    assert response.status_code == 422

    check_response = client.get(f"/products/{product_id}")

    assert check_response.json()["name"] == "Original Name"
    assert check_response.json()["price"] == 100

def test_patch_product_with_null_price():
    create_response = client.post(
        "/products",
        json={"name": "Original Name", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.patch(
        f"/products/{product_id}",
        json={"price": None}
    )

    assert response.status_code == 422

    check_response = client.get(f"/products/{product_id}")

    assert check_response.json()["name"] == "Original Name"
    assert check_response.json()["price"] == 100

@pytest.mark.parametrize("price", [0, -1, -100])
def test_patch_product_with_invalid_price(price):
    create_response = client.post(
        "/products",
        json={"name": "Price Test Product", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.patch(
        f"/products/{product_id}",
        json={"price": price}
    )

    assert response.status_code == 422

    check_response = client.get(f"/products/{product_id}")

    assert check_response.json()["price"] == 100

def test_put_product_updates_all_fields():
    create_response = client.post(
        "/products",
        json={"name": "Old Product", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.put(
        f"/products/{product_id}",
        json={"name": "New Product", "price": 200}
    )

    assert response.status_code == 200
    assert response.json()["name"] == "New Product"
    assert response.json()["price"] == 200

def test_put_product_without_name():
    create_response = client.post(
        "/products",
        json={"name": "Original Product", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.put(
        f"/products/{product_id}",
        json={"price": 200}
    )

    assert response.status_code == 422

    check_response = client.get(f"/products/{product_id}")

    assert check_response.json()["name"] == "Original Product"
    assert check_response.json()["price"] == 100

def test_put_product_without_price():
    create_response = client.post(
        "/products",
        json={"name": "Original Product", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.put(
        f"/products/{product_id}",
        json={"name": "Updated Product"}
    )

    assert response.status_code == 422

    check_response = client.get(f"/products/{product_id}")

    assert check_response.json()["name"] == "Original Product"
    assert check_response.json()["price"] == 100

def test_put_product_with_null_name():
    create_response = client.post(
        "/products",
        json={"name": "Original Product", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.put(
        f"/products/{product_id}",
        json={"name": None, "price": 200}
    )

    assert response.status_code == 422

    check_response = client.get(f"/products/{product_id}")

    assert check_response.json()["name"] == "Original Product"
    assert check_response.json()["price"] == 100

def test_put_product_with_null_price():
    create_response = client.post(
        "/products",
        json={"name": "Original Product", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.put(
        f"/products/{product_id}",
        json={"name": "Updated Product", "price": None}
    )

    assert response.status_code == 422

    check_response = client.get(f"/products/{product_id}")

    assert check_response.json()["name"] == "Original Product"
    assert check_response.json()["price"] == 100

@pytest.mark.parametrize("price", [0, -1, -100])
def test_put_product_with_invalid_price(price):
    create_response = client.post(
        "/products",
        json={"name": "Original Product", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.put(
        f"/products/{product_id}",
        json={"name": "Updated Product", "price": price}
    )

    assert response.status_code == 422

    check_response = client.get(f"/products/{product_id}")

    assert check_response.json()["name"] == "Original Product"
    assert check_response.json()["price"] == 100

@pytest.mark.parametrize("name", ["", "   "])
def test_put_product_with_invalid_name(name):
    create_response = client.post(
        "/products",
        json={"name": "Original Product", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.put(
        f"/products/{product_id}",
        json={"name": name, "price": 200}
    )

    assert response.status_code == 422

    check_response = client.get(f"/products/{product_id}")

    assert check_response.json()["name"] == "Original Product"
    assert check_response.json()["price"] == 100

@pytest.mark.parametrize(
    "name",
    ["  Keyboard", "Keyboard  ", "  Gaming Mouse  "]
)
def test_put_product_strips_whitespace(name):
    create_response = client.post(
        "/products",
        json={"name": "Original Product", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.put(
        f"/products/{product_id}",
        json={"name": name, "price": 200}
    )

    assert response.status_code == 200
    assert response.json()["name"] == name.strip()
    assert response.json()["price"] == 200

def test_delete_product():
    create_response = client.post(
        "/products",
        json={"name": "Product To Delete", "price": 100}
    )

    product_id = create_response.json()["id"]

    response = client.delete(f"/products/{product_id}")

    assert response.status_code == 200
    assert response.json()["detail"] == "Product deleted successfully"

    check_response = client.get(f"/products/{product_id}")
    assert check_response.status_code == 404

def test_delete_product_twice():
    create_response = client.post(
        "/products",
        json={"name": "Product To Delete", "price": 100}
    )

    product_id = create_response.json()["id"]

    first_response = client.delete(f"/products/{product_id}")
    second_response = client.delete(f"/products/{product_id}")

    assert first_response.status_code == 200
    assert second_response.status_code == 404

def test_delete_nonexistent_product():
    response = client.delete("/products/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"

@pytest.mark.parametrize("product_id", [0, -1])
def test_delete_product_with_invalid_id(product_id):
    response = client.delete(f"/products/{product_id}")

    assert response.status_code == 422
