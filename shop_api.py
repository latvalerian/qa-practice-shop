import hmac
import hashlib
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from main import get_db

router = APIRouter()


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _password_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 310000)
    return f'pbkdf2_sha256$310000${salt.hex()}${digest.hex()}'


def _password_verify(password: str, stored: str) -> bool:
    try:
        scheme, rounds, salt_hex, digest_hex = stored.split('$', 3)
        if scheme != 'pbkdf2_sha256':
            return False
        digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt_hex), int(rounds))
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False
def _user(authorization: str | None, db):
    if not authorization or not authorization.lower().startswith('bearer '):
        return None
    token = authorization.split(None, 1)[1]
    with db.cursor() as cur:
        cur.execute("""SELECT u.id, u.email, u.role FROM auth_sessions s JOIN users u ON u.id=s.user_id
                     WHERE s.token_hash=%s AND s.expires_at>NOW() AND u.is_active""", (_hash(token),))
        row = cur.fetchone()
    return dict(id=row[0], email=row[1], role=row[2]) if row else None


def require_user(authorization: str | None, db, request: Request | None = None):
    if not authorization and request and request.cookies.get('shop_session'):
        authorization = 'Bearer ' + request.cookies['shop_session']
    user = _user(authorization, db)
    if not user:
        raise HTTPException(401, 'Authentication required')
    return user


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=200)


class ProductInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ''
    price_cents: int = Field(gt=0, le=9223372036854775807)
    image_url: str | None = None
    stock_quantity: int = Field(default=0, ge=0)
    is_active: bool = True

    @field_validator('name')
    @classmethod
    def nonblank_name(cls, value):
        value = value.strip()
        if not value: raise ValueError('Name cannot be blank')
        return value


class CartAdd(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(default=1, gt=0, le=1000)


class QuantitySet(BaseModel):
    quantity: int = Field(gt=0, le=1000)


class Checkout(BaseModel):
    recipient_name: str = Field(min_length=1, max_length=200)
    recipient_phone: str = Field(min_length=3, max_length=40)
    shipping_address: str = Field(min_length=5, max_length=1000)
    idempotency_key: str = Field(min_length=8, max_length=200)


def _merge_guest_cart(db, user_id: int, request: Request):
    guest = request.cookies.get('shop_guest')
    if not guest:
        return
    guest_hash = _hash(guest)
    with db.cursor() as cur:
        cur.execute('INSERT INTO carts(user_id) VALUES (%s) ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET updated_at=NOW() RETURNING id', (user_id,))
        user_cart = cur.fetchone()[0]
        cur.execute('SELECT id FROM carts WHERE guest_token_hash=%s FOR UPDATE', (guest_hash,))
        guest_cart = cur.fetchone()
        if guest_cart:
            cur.execute('SELECT 1 FROM cart_items guest JOIN cart_items user_item ON user_item.product_id=guest.product_id WHERE guest.cart_id=%s AND user_item.cart_id=%s AND guest.quantity+user_item.quantity>1000 LIMIT 1', (guest_cart[0],user_cart))
            if cur.fetchone():
                raise HTTPException(409, 'Guest cart merge would exceed 1000 units for an item')
            cur.execute('''INSERT INTO cart_items(cart_id,product_id,quantity)
                           SELECT %s,product_id,quantity FROM cart_items WHERE cart_id=%s
                           ON CONFLICT(cart_id,product_id) DO UPDATE
                           SET quantity=cart_items.quantity+EXCLUDED.quantity,updated_at=NOW()''', (user_cart, guest_cart[0]))
            cur.execute('DELETE FROM carts WHERE id=%s', (guest_cart[0],))


def _reconcile_expired(db):
    with db.cursor() as cur:
        cur.execute("UPDATE orders SET status='EXPIRED' WHERE status='PENDING_PAYMENT' AND reservation_expires_at<=NOW()")

def _cart(db, user, guest_hash):
    with db.cursor() as cur:
        if user:
            cur.execute('INSERT INTO carts(user_id) VALUES (%s) ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET updated_at=NOW() RETURNING id', (user['id'],))
        else:
            cur.execute('INSERT INTO carts(guest_token_hash) VALUES (%s) ON CONFLICT (guest_token_hash) WHERE guest_token_hash IS NOT NULL DO UPDATE SET updated_at=NOW() RETURNING id', (guest_hash,))
        return cur.fetchone()[0]


@router.post('/auth/register', status_code=201)
def register(body: Credentials, request: Request, response: Response, db=Depends(get_db)):
    token = secrets.token_urlsafe(32)
    with db.cursor() as cur:
        cur.execute('INSERT INTO users(email,password_hash) VALUES (%s,%s) ON CONFLICT(email) DO NOTHING RETURNING id,email,role', (body.email.strip().lower(), _password_hash(body.password)))
        user = cur.fetchone()
        if not user: raise HTTPException(409, 'Email already registered')
        cur.execute("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES (%s,%s,NOW()+INTERVAL '30 days')", (_hash(token), user[0]))
    _merge_guest_cart(db, user[0], request)
    response.delete_cookie('shop_guest')
    response.set_cookie('shop_session', token, httponly=True, samesite='lax', max_age=30*86400)
    return {'id': user[0], 'email': user[1], 'role': user[2], 'access_token': token, 'token_type': 'bearer'}


@router.post('/auth/login')
def login(body: Credentials, request: Request, response: Response, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute('SELECT id,email,password_hash,role FROM users WHERE email=%s AND is_active', (body.email.strip().lower(),))
        user = cur.fetchone()
        if not user or not _password_verify(body.password, user[2]):
            raise HTTPException(401, 'Invalid email or password')
        token = secrets.token_urlsafe(32)
        cur.execute("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES (%s,%s,NOW()+INTERVAL '30 days')", (_hash(token), user[0]))
    _merge_guest_cart(db, user[0], request)
    response.delete_cookie('shop_guest')
    response.set_cookie('shop_session', token, httponly=True, samesite='lax', max_age=30*86400)
    return {'id': user[0], 'email': user[1], 'role': user[3], 'access_token': token, 'token_type': 'bearer'}


@router.post('/auth/logout', status_code=204)
def logout(request: Request, response: Response, authorization: str | None = Header(default=None), db=Depends(get_db)):
    token = authorization.split(None,1)[1] if authorization and authorization.lower().startswith('bearer ') else request.cookies.get('shop_session')
    if token:
        with db.cursor() as cur: cur.execute('DELETE FROM auth_sessions WHERE token_hash=%s', (_hash(token),))
    response.delete_cookie('shop_session')


@router.get('/auth/me')
def me(request: Request, authorization: str | None = Header(default=None), db=Depends(get_db)):
    return require_user(authorization, db, request)


@router.get('/products')
def products(min_price_cents: int = 0, sort: str = 'asc', db=Depends(get_db)):
    if min_price_cents < 0 or sort not in {'asc','desc'}: raise HTTPException(422, 'Invalid filter')
    with db.cursor() as cur:
        cur.execute(f'''SELECT p.id,p.name,p.description,p.price_cents,p.image_url,
                        GREATEST(p.stock_quantity-COALESCE(r.quantity,0),0)
                        FROM products p LEFT JOIN (
                            SELECT product_id,SUM(quantity) AS quantity FROM stock_reservations
                            WHERE released_at IS NULL AND expires_at>NOW() GROUP BY product_id
                        ) r ON r.product_id=p.id
                        WHERE p.is_active AND p.price_cents >= %s
                        ORDER BY p.price_cents {sort.upper()},p.id''', (min_price_cents,))
        rows=cur.fetchall()
    return [dict(id=r[0],name=r[1],description=r[2],price_cents=r[3],image_url=r[4],stock_quantity=r[5]) for r in rows]
@router.get('/products/{product_id}')
def product(product_id: int, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute('''SELECT p.id,p.name,p.description,p.price_cents,p.image_url,
                       GREATEST(p.stock_quantity-COALESCE((SELECT SUM(quantity) FROM stock_reservations
                       WHERE product_id=p.id AND released_at IS NULL AND expires_at>NOW()),0),0)
                       FROM products p WHERE p.id=%s AND p.is_active''', (product_id,))
        r=cur.fetchone()
    if not r: raise HTTPException(404,'Product not found')
    return dict(id=r[0],name=r[1],description=r[2],price_cents=r[3],image_url=r[4],stock_quantity=r[5])
def admin(authorization, db, request: Request | None = None):
    u=require_user(authorization,db,request)
    if u['role']!='admin': raise HTTPException(403,'Admin role required')
    return u


@router.post('/products',status_code=201)
def create_product(request: Request, body: ProductInput, authorization: str | None=Header(default=None), db=Depends(get_db)):
    admin(authorization,db,request)
    with db.cursor() as cur:
        cur.execute('INSERT INTO products(name,description,price_cents,image_url,stock_quantity,is_active) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id,name,description,price_cents,image_url,stock_quantity,is_active', (body.name.strip(),body.description,body.price_cents,body.image_url,body.stock_quantity,body.is_active)); r=cur.fetchone()
    return dict(id=r[0],name=r[1],description=r[2],price_cents=r[3],image_url=r[4],stock_quantity=r[5],is_active=r[6])


@router.put('/products/{product_id}')
def update_product(product_id:int, request: Request, body:ProductInput, authorization:str|None=Header(default=None), db=Depends(get_db)):
    admin(authorization,db,request)
    with db.cursor() as cur:
        cur.execute('SELECT id FROM products WHERE id=%s FOR UPDATE', (product_id,))
        if not cur.fetchone(): raise HTTPException(404,'Product not found')
        cur.execute('SELECT COALESCE(SUM(quantity),0) FROM stock_reservations WHERE product_id=%s AND released_at IS NULL AND expires_at>NOW()', (product_id,))
        active_reserved=cur.fetchone()[0]
        if body.stock_quantity < active_reserved: raise HTTPException(409,'Stock cannot be set below active reservations')
        cur.execute('UPDATE products SET name=%s,description=%s,price_cents=%s,image_url=%s,stock_quantity=%s,is_active=%s,updated_at=NOW() WHERE id=%s RETURNING id,name,description,price_cents,image_url,stock_quantity,is_active', (body.name.strip(),body.description,body.price_cents,body.image_url,body.stock_quantity,body.is_active,product_id)); r=cur.fetchone()
    if not r: raise HTTPException(404,'Product not found')
    return dict(id=r[0],name=r[1],description=r[2],price_cents=r[3],image_url=r[4],stock_quantity=r[5],is_active=r[6])


@router.delete('/products/{product_id}',status_code=204)
def delete_product(product_id:int, request: Request, authorization:str|None=Header(default=None), db=Depends(get_db)):
    admin(authorization,db,request)
    with db.cursor() as cur: cur.execute('UPDATE products SET is_active=FALSE WHERE id=%s RETURNING id',(product_id,)); r=cur.fetchone()
    if not r: raise HTTPException(404,'Product not found')


def _guest_hash(request: Request, response: Response):
    token=request.cookies.get('shop_guest')
    if not token:
        token=secrets.token_urlsafe(32); response.set_cookie('shop_guest',token,httponly=True,samesite='lax',max_age=365*86400)
    return _hash(token)


def _identity(request, response, authorization, db):
    user=_user(authorization,db)
    if not user and request.cookies.get('shop_session'): user=_user('Bearer '+request.cookies['shop_session'],db)
    return (user,None) if user else (None,_guest_hash(request,response))


def _cart_payload(db, cart_id):
    with db.cursor() as cur:
        cur.execute('SELECT ci.product_id,p.name,p.price_cents,ci.quantity,p.image_url FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.cart_id=%s ORDER BY p.name', (cart_id,))
        rows=cur.fetchall()
    items=[dict(product_id=r[0],name=r[1],unit_price_cents=r[2],quantity=r[3],image_url=r[4],line_total_cents=r[2]*r[3]) for r in rows]
    return {'items':items,'total_cents':sum(x['line_total_cents'] for x in items),'currency':'USD'}


@router.get('/cart')
def get_cart(request:Request,response:Response,authorization:str|None=Header(default=None),db=Depends(get_db)):
    _reconcile_expired(db)
    user,gh=_identity(request,response,authorization,db); cid=_cart(db,user,gh)
    return _cart_payload(db,cid)
@router.post('/cart/items',status_code=201)
def add_cart_item(body:CartAdd,request:Request,response:Response,authorization:str|None=Header(default=None),db=Depends(get_db)):
    user,gh=_identity(request,response,authorization,db); cid=_cart(db,user,gh)
    with db.cursor() as cur:
        cur.execute('SELECT id FROM carts WHERE id=%s FOR UPDATE', (cid,))
        cur.execute('SELECT id FROM products WHERE id=%s AND is_active',(body.product_id,))
        if not cur.fetchone(): raise HTTPException(404,'Product not found')
        cur.execute('SELECT quantity FROM cart_items WHERE cart_id=%s AND product_id=%s FOR UPDATE', (cid,body.product_id))
        existing=cur.fetchone()
        if existing and existing[0]+body.quantity>1000: raise HTTPException(409,'Cart item quantity cannot exceed 1000')
        cur.execute('INSERT INTO cart_items(cart_id,product_id,quantity) VALUES (%s,%s,%s) ON CONFLICT(cart_id,product_id) DO UPDATE SET quantity=cart_items.quantity+EXCLUDED.quantity,updated_at=NOW()', (cid,body.product_id,body.quantity))
    return _cart_payload(db,cid)


@router.put('/cart/items/{product_id}')
def set_cart_item(product_id:int,body:QuantitySet,request:Request,response:Response,authorization:str|None=Header(default=None),db=Depends(get_db)):
    user,gh=_identity(request,response,authorization,db); cid=_cart(db,user,gh)
    with db.cursor() as cur:
        cur.execute('SELECT id FROM carts WHERE id=%s FOR UPDATE', (cid,))
        cur.execute('UPDATE cart_items SET quantity=%s,updated_at=NOW() WHERE cart_id=%s AND product_id=%s RETURNING product_id',(body.quantity,cid,product_id))
        r=cur.fetchone()
    if not r: raise HTTPException(404,'Cart item not found')
    return _cart_payload(db,cid)


@router.delete('/cart/items/{product_id}',status_code=204)
def remove_cart_item(product_id:int,request:Request,response:Response,authorization:str|None=Header(default=None),db=Depends(get_db)):
    user,gh=_identity(request,response,authorization,db); cid=_cart(db,user,gh)
    with db.cursor() as cur: cur.execute('DELETE FROM cart_items WHERE cart_id=%s AND product_id=%s',(cid,product_id))


@router.post('/orders',status_code=201)
def checkout(body: Checkout, request: Request, authorization: str | None = Header(default=None), db=Depends(get_db)):
    _reconcile_expired(db)
    u = require_user(authorization, db, request)
    with db.cursor() as cur:
        cur.execute('SELECT id FROM carts WHERE user_id=%s FOR UPDATE', (u['id'],))
        cart = cur.fetchone()
        if not cart: raise HTTPException(400, 'Cart is empty')
        # Serialize checkout on this cart, then recheck idempotency and reread its items.
        cur.execute('SELECT id,status,total_cents,currency,reservation_expires_at FROM orders WHERE user_id=%s AND idempotency_key=%s', (u['id'], body.idempotency_key))
        old = cur.fetchone()
        if old:
            return dict(id=old[0],status=old[1],total_cents=old[2],currency=old[3],reservation_expires_at=old[4])
        cur.execute('''SELECT ci.product_id,ci.quantity,p.id,p.name,p.price_cents,p.is_active
                       FROM cart_items ci LEFT JOIN products p ON p.id=ci.product_id
                       WHERE ci.cart_id=%s ORDER BY ci.product_id''', (cart[0],))
        raw_items = cur.fetchall()
        if not raw_items: raise HTTPException(400, 'Cart is empty')
        if any(r[2] is None or not r[5] for r in raw_items):
            raise HTTPException(409, 'Cart contains an unavailable product; remove it before checkout')
        product_ids = [r[0] for r in raw_items]
        cur.execute('SELECT id FROM products WHERE id = ANY(%s) ORDER BY id FOR UPDATE', (product_ids,))
        locked_ids = [r[0] for r in cur.fetchall()]
        if locked_ids != sorted(product_ids):
            raise HTTPException(409, 'Cart changed; retry checkout')
        cur.execute('''SELECT product_id,COALESCE(SUM(quantity),0) FROM stock_reservations
                       WHERE released_at IS NULL AND expires_at>NOW() AND product_id=ANY(%s)
                       GROUP BY product_id''', (product_ids,))
        reserved = dict(cur.fetchall())
        cur.execute('SELECT id,stock_quantity FROM products WHERE id=ANY(%s) ORDER BY id', (product_ids,))
        stock = dict(cur.fetchall())
        items = [(r[0],r[1],r[3],r[4]) for r in raw_items]
        if any(stock[i[0]]-reserved.get(i[0],0)<i[1] for i in items):
            raise HTTPException(409, 'Insufficient available stock')
        total = sum(i[1]*i[3] for i in items)
        cur.execute("""INSERT INTO orders(user_id,status,recipient_name,recipient_phone,shipping_address,total_cents,idempotency_key,reservation_expires_at)
                       VALUES (%s,'PENDING_PAYMENT',%s,%s,%s,%s,%s,NOW()+INTERVAL '15 minutes')
                       RETURNING id,status,total_cents,currency,reservation_expires_at""",
                    (u['id'],body.recipient_name.strip(),body.recipient_phone.strip(),body.shipping_address.strip(),total,body.idempotency_key))
        order = cur.fetchone()
        for product_id,quantity,name,price in items:
            cur.execute('INSERT INTO order_items(order_id,product_id,product_name,unit_price_cents,quantity,line_total_cents) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id', (order[0],product_id,name,price,quantity,price*quantity))
            item_id=cur.fetchone()[0]
            cur.execute("INSERT INTO stock_reservations(order_item_id,product_id,quantity,expires_at) VALUES (%s,%s,%s,NOW()+INTERVAL '15 minutes')", (item_id,product_id,quantity))
        cur.execute('DELETE FROM cart_items WHERE cart_id=%s', (cart[0],))
    return dict(id=order[0],status=order[1],total_cents=order[2],currency=order[3],reservation_expires_at=order[4])
@router.get('/orders')
def list_orders(request: Request, authorization:str|None=Header(default=None),db=Depends(get_db)):
    _reconcile_expired(db)
    u=require_user(authorization,db,request)
    with db.cursor() as cur: cur.execute('SELECT id,status,total_cents,currency,created_at,reservation_expires_at FROM orders WHERE user_id=%s ORDER BY created_at DESC',(u['id'],)); rows=cur.fetchall()
    return [dict(id=r[0],status=r[1],total_cents=r[2],currency=r[3],created_at=r[4],reservation_expires_at=r[5]) for r in rows]


@router.post('/orders/{order_id}/cancel')
def cancel_order(order_id: int, request: Request, authorization: str | None=Header(default=None), db=Depends(get_db)):
    _reconcile_expired(db)
    u = require_user(authorization, db, request)
    with db.cursor() as cur:
        cur.execute("UPDATE orders SET status='CANCELLED',cancelled_at=NOW() WHERE id=%s AND user_id=%s AND status='PENDING_PAYMENT' AND reservation_expires_at>NOW() RETURNING id", (order_id,u['id']))
        if not cur.fetchone(): raise HTTPException(409, 'Order cannot be cancelled')
        cur.execute('UPDATE stock_reservations SET released_at=NOW() WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=%s) AND released_at IS NULL', (order_id,))
    return {'id':order_id,'status':'CANCELLED'}


@router.get('/orders/{order_id}')
def get_order(order_id: int, request: Request, authorization: str | None=Header(default=None), db=Depends(get_db)):
    _reconcile_expired(db)
    u = require_user(authorization, db, request)
    with db.cursor() as cur:
        cur.execute('SELECT id,status,total_cents,currency,recipient_name,recipient_phone,shipping_address,created_at,reservation_expires_at FROM orders WHERE id=%s AND user_id=%s', (order_id,u['id']))
        row=cur.fetchone()
        if not row: raise HTTPException(404,'Order not found')
        cur.execute('SELECT product_name,unit_price_cents,quantity,line_total_cents FROM order_items WHERE order_id=%s ORDER BY id', (order_id,))
        items=cur.fetchall()
    return dict(id=row[0],status=row[1],total_cents=row[2],currency=row[3],recipient_name=row[4],recipient_phone=row[5],shipping_address=row[6],created_at=row[7],reservation_expires_at=row[8],items=[dict(product_name=i[0],unit_price_cents=i[1],quantity=i[2],line_total_cents=i[3]) for i in items])
class UserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None

    @field_validator('role')
    @classmethod
    def valid_role(cls, value):
        if value is not None and value not in {'customer','admin'}: raise ValueError('Invalid role')
        return value


@router.get('/admin/users')
def admin_users(request: Request, authorization: str | None=Header(default=None),db=Depends(get_db)):
    admin(authorization,db,request)
    with db.cursor() as cur: cur.execute('SELECT id,email,role,is_active,created_at FROM users ORDER BY id'); rows=cur.fetchall()
    return [dict(id=r[0],email=r[1],role=r[2],is_active=r[3],created_at=r[4]) for r in rows]


@router.patch('/admin/users/{user_id}')
def update_user(user_id: int, body: UserUpdate, request: Request, authorization: str | None=Header(default=None), db=Depends(get_db)):
    admin(authorization,db,request)
    fields=[]; values=[]
    if body.role is not None: fields.append('role=%s'); values.append(body.role)
    if body.is_active is not None: fields.append('is_active=%s'); values.append(body.is_active)
    if not fields: raise HTTPException(422,'Provide role or is_active')
    values.append(user_id)
    with db.cursor() as cur:
        cur.execute('UPDATE users SET '+','.join(fields)+' WHERE id=%s RETURNING id,email,role,is_active,created_at', values)
        row=cur.fetchone()
    if not row: raise HTTPException(404,'User not found')
    return dict(id=row[0],email=row[1],role=row[2],is_active=row[3],created_at=row[4])
