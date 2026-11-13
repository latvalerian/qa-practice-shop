from fastapi import FastAPI, HTTPException, Path, Query
from pydantic import BaseModel, Field


app = FastAPI()


class ProductCreate(BaseModel):
    name: str
    price: int = Field(gt=0)


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
@app.get("/products")
def get_products(
    min_price: int = Query(default=0, ge=0),
    sort: str = "asc"
):

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