from fastapi import Depends, FastAPI, HTTPException, Path, Query
from pydantic import BaseModel, Field, field_validator

from database import get_connection

app = FastAPI()

def get_db():
    with get_connection() as connection:
        yield connection


class ProductCreate(BaseModel):
    name: str = Field(min_length=1)
    price: int = Field(gt=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()

        if not value:
            raise ValueError("Name cannot contain only whitespace")

        return value

class ProductUpdate(BaseModel):
    name: str = Field(min_length=1)
    price: int = Field(gt=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()

        if not value:
            raise ValueError("Name cannot contain only whitespace")

        return value

class ProductPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    price: int | None = Field(default=None, gt=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        if value is None:
            raise ValueError("Name cannot be null")

        value = value.strip()

        if not value:
            raise ValueError("Name cannot contain only whitespace")

        return value

    @field_validator("price")
    @classmethod
    def validate_price(cls, value):
        if value is None:
            raise ValueError("Price cannot be null")

        return value


@app.get("/")
def home():
    return {
        "message": "Welcome to QA Practice Shop!"
    }


@app.get("/db/products")
def get_products_from_db(connection = Depends(get_db)):
    with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, name, price FROM products ORDER BY id"
            )

            products_from_db = cursor.fetchall()

    return [
        {
            "id": product[0],
            "name": product[1],
            "price": product[2]
        }
        for product in products_from_db
    ]

@app.get("/products")
def get_products(
    min_price: int = Query(default=0, ge=0),
    sort: str = "asc",
    connection=Depends(get_db),
):
    if sort not in {"asc", "desc"}:
        raise HTTPException(
            status_code=422,
            detail="Invalid sort parameter",
        )

    direction = "ASC" if sort == "asc" else "DESC"
    with connection.cursor() as cursor:
        cursor.execute(
            f"SELECT id, name, price FROM products "
            f"WHERE price >= %s ORDER BY price {direction}, id ASC",
            (min_price,),
        )
        rows = cursor.fetchall()

    return [dict(id=row[0], name=row[1], price=row[2]) for row in rows]


@app.get("/products/{product_id}")
def get_product(product_id: int = Path(ge=1), connection=Depends(get_db)):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT id, name, price FROM products WHERE id = %s",
            (product_id,),
        )
        row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return dict(id=row[0], name=row[1], price=row[2])

@app.post("/products", status_code=201)
def create_product(product: ProductCreate, connection=Depends(get_db)):
    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO products (name, price) VALUES (%s, %s) "
            "RETURNING id, name, price",
            (product.name, product.price),
        )
        row = cursor.fetchone()

    return dict(id=row[0], name=row[1], price=row[2])

@app.put("/products/{product_id}")
def update_product(
    product: ProductUpdate,
    product_id: int = Path(ge=1),
    connection=Depends(get_db),
):
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE products SET name = %s, price = %s WHERE id = %s "
            "RETURNING id, name, price",
            (product.name, product.price, product_id),
        )
        row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return dict(id=row[0], name=row[1], price=row[2])

@app.patch("/products/{product_id}")
def patch_product(
    product: ProductPatch,
    product_id: int = Path(ge=1),
    connection=Depends(get_db),
):
    if not product.model_fields_set:
        raise HTTPException(
            status_code=422,
            detail="At least one field must be provided"
        )

    fields = []
    values = []
    if "name" in product.model_fields_set:
        fields.append("name = %s")
        values.append(product.name)
    if "price" in product.model_fields_set:
        fields.append("price = %s")
        values.append(product.price)
    values.append(product_id)

    with connection.cursor() as cursor:
        cursor.execute(
            f"UPDATE products SET {', '.join(fields)} WHERE id = %s "
            "RETURNING id, name, price",
            values,
        )
        row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return dict(id=row[0], name=row[1], price=row[2])

@app.delete("/products/{product_id}")
def delete_product(product_id: int = Path(ge=1), connection=Depends(get_db)):
    with connection.cursor() as cursor:
        cursor.execute(
            "DELETE FROM products WHERE id = %s RETURNING id",
            (product_id,),
        )
        row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"detail": "Product deleted successfully"}
