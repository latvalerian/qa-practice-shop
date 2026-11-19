from fastapi import Depends, FastAPI

from database import get_connection

app = FastAPI()

def get_db():
    with get_connection() as connection:
        yield connection


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


