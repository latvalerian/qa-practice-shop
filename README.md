# Practice Shop QA

A full-stack e-commerce application developed as a personal QA Engineering practice project.

The project combines backend development, frontend development, database management, and software testing. Its primary purpose is to practice testing realistic business scenarios, REST API integrations, database operations, and concurrent transactions.

## Project Goals

- Practice manual and API testing.
- Develop backend testing skills.
- Work with SQL and relational databases.
- Test frontend and backend integration.
- Investigate concurrency and transaction integrity.
- Develop automated tests using Python and Pytest.
- Practice Git workflows and CI/CD.

## Tech Stack

### Backend

- Python
- FastAPI
- Pydantic
- PostgreSQL
- Psycopg
- REST API

### Frontend

- React
- TypeScript
- Vite
- React Router

### Testing

- Pytest
- FastAPI TestClient
- HTTPX
- Postman

### Tools

- Git
- GitHub
- Swagger / OpenAPI
- VS Code

## Implemented Features

### Product Catalog

- Public product catalog.
- Product details and pricing.
- Product availability and stock management.
- Product creation, updating, and deactivation.

### Authentication and Authorization

- User registration.
- Login and logout.
- Password hashing.
- Role-based access control.
- Administrative operations.

### Shopping Cart

- Guest shopping carts.
- Authenticated user carts.
- Cart persistence.
- Guest cart merging after registration.
- Adding and updating cart items.
- Removing cart items.
- Stock availability validation.

### Orders and Inventory

- Checkout functionality.
- Order creation.
- Order item snapshots.
- Idempotent checkout requests.
- Stock reservations.
- Reservation expiration.
- Order cancellation.
- Inventory availability validation.

### Concurrency and Data Integrity

- Concurrent cart item addition testing.
- Concurrent checkout testing.
- Protection against overselling.
- PostgreSQL row-level locking.
- Stock reservation validation.

### Frontend

- React application initialized with Vite.
- TypeScript integration.
- React Router navigation.
- Product catalog page.
- Cart and login page scaffolding.
- Backend integration through the Vite development proxy.

## Project Structure

```text
Practice-Shop/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── CatalogPage.tsx
│   │   │   ├── CartPage.tsx
│   │   │   └── LoginPage.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── migrations/
├── tests/
│   └── test_products.py
│
├── database.py
├── database_test.py
├── db_test.py
├── main.py
├── shop_api.py
├── run_migrations.py
├── promote_admin.py
├── .gitignore
├── README.md
└── CHANGELOG.md
```

## Getting Started

### Prerequisites

- Python
- PostgreSQL
- Node.js
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/latvalerian/qa-practice-shop.git
cd qa-practice-shop
```

### 2. Backend setup

Create a virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Install backend dependencies:

```powershell
pip install fastapi uvicorn "psycopg[binary]" python-dotenv pytest httpx
```

### 3. Database configuration

Create a PostgreSQL database.

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
```

Replace the example values with your local database credentials.

Run migrations:

```powershell
python run_migrations.py
```

### 4. Start the backend

```powershell
uvicorn main:app --reload
```

Backend:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### 5. Frontend setup

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend:

`http://localhost:5173`

The Vite development server proxies `/api` requests to the FastAPI backend.

## Running Tests

The QA workflow, browser scenarios and defect log are documented in [the test plan](docs/qa/TEST_PLAN.md), [manual test cases](docs/qa/TEST_CASES.md) and [bug reports](docs/qa/BUG_REPORTS.md). The current automated suite covers backend product/catalog behavior; it does not yet automate frontend or browser flows.

Before running backend tests, prepare and select the dedicated `qa_practice_shop_test` database as described in the test plan. The test fixtures clear data in that database. Never run them against development or production data.

Run the backend test suite from the project root:

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

Run the frontend production build check:

```powershell
cd frontend
npm run build
```

To run one backend test file or case, use:

```powershell
cd ..
.\.venv\Scripts\python.exe -m pytest -v tests/test_products.py
.\.venv\Scripts\python.exe -m pytest -v tests/test_products.py::test_concurrent_checkouts_do_not_oversell_stock
```

## API Documentation

FastAPI provides interactive API documentation through Swagger UI:

`http://127.0.0.1:8000/docs`

## Roadmap

### V1.0 — Core Shop

- [x] Backend product catalog
- [x] Authentication API
- [x] Shopping cart API
- [x] Checkout and order creation
- [x] Stock reservations
- [x] Concurrent checkout protection
- [x] Initial React frontend
- [x] React Router setup
- [ ] Complete storefront UI
- [ ] Shopping cart drawer
- [ ] Full shopping cart page
- [ ] Login and registration UI
- [ ] Checkout page
- [ ] User account page
- [ ] Favorites
- [ ] Order history interface

### V1.1 — User Experience

- [ ] Improved user account
- [ ] Order tracking interface
- [ ] Bonus points system
- [ ] Saved payment methods

### V1.2 — Customer Support

- [ ] Customer support interface
- [ ] Support request management

### V2.0 — AI Assistant

- [ ] AI-powered customer support
- [ ] Order-aware assistant
- [ ] Contextual support responses

## Project Status

Practice Shop is under active development.

The backend includes implemented business logic and automated tests. The frontend is currently being developed.

Features marked as planned are not yet implemented.

## License

This project is intended for educational and portfolio purposes.
