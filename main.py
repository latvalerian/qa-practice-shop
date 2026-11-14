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
def get_products_from_db(connection=Depends(get_db)):
    with connection.cursor() as cursor:
        cursor.execute("SELECT id, name, description, price_cents, image_url, stock_quantity FROM products ORDER BY id")
        rows = cursor.fetchall()
    return [dict(id=r[0], name=r[1], description=r[2], price_cents=r[3], image_url=r[4], stock_quantity=r[5]) for r in rows]

from shop_api import router as shop_router
app.include_router(shop_router)


