from fastapi import FastAPI, HTTPException, Path, Query
from pydantic import BaseModel, Field
from database import get_connection

app = FastAPI()


class ProductCreate(BaseModel):
    name: str
    price: int = Field(gt=0)

class ProductUpdate(BaseModel):
    name: str
    price: int = Field(gt=0)

class ProductPatch(BaseModel):
    name: str | None = None
    price: int | None = Field(default=None, gt=0)


products = [
    {"id": 1, "name": "Gaming Headphones", "price": 80},
    {"id": 2, "name": "Mechanical Keyboard", "price": 120},
    {"id": 3, "name": "Gaming Mouse", "price": 45}
]


@app.get("/")
def home():
    return {
        "message": "Welcome to QA Practice Shop!"
    }


@app.get("/db/products")
def get_products_from_db():
    with get_connection() as connection:
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
    sort: str = "asc"
):
    filtered_products = []

    for product in products:
        if product["price"] >= min_price:
            filtered_products.append(product)

    if sort == "asc":
        return sorted(filtered_products, key=lambda product: product["price"])

    elif sort == "desc":
        return sorted(filtered_products, key=lambda product: product["price"], reverse=True)

    else:
        raise HTTPException(
        status_code=422,
        detail="Invalid sort parameter"
    )


@app.get("/products/{product_id}")
def get_product(product_id: int = Path(ge=1)):
    for product in products:
        if product["id"] == product_id:
            return product

    raise HTTPException(status_code=404, detail="Product not found")

@app.post("/products")
def create_product(product: ProductCreate):
    new_product = {
        "id": len(products) + 1,
        "name": product.name,
        "price": product.price
    }

    products.append(new_product)

    return new_product

@app.put("/products/{product_id}")
def update_product(product_id: int, product: ProductUpdate):
    for existing_product in products:
        if existing_product["id"] == product_id:
            existing_product["name"] = product.name
            existing_product["price"] = product.price
            return existing_product


    raise HTTPException(status_code=404, detail="Product not found")

@app.patch("/products/{product_id}")
def patch_product(product_id: int, product: ProductPatch):
    if not product.model_fields_set:
        raise HTTPException(
            status_code=422,
            detail="At least one field must be provided"
        )
    for existing_product in products:
        if existing_product["id"] == product_id:

            if product.name is not None:
                existing_product["name"] = product.name

            if product.price is not None:
                existing_product["price"] = product.price

            return existing_product

    raise HTTPException(status_code=404, detail="Product not found")

@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    for existing_product in products:
        if existing_product["id"] == product_id:
            products.remove(existing_product)
            return {
                "message": "Product deleted successfully"
            }

    raise HTTPException(status_code=404, detail="Product not found")
