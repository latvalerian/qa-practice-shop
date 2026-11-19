# Practice Shop QA

A full-stack e-commerce practice project for learning QA Engineering, API testing, and the basics of frontend and backend development.

The project combines backend development, frontend development, database management, and software testing. Its primary purpose is to practice testing realistic business scenarios, REST API integrations, database operations, and concurrent transactions.

## Project Goals

- Practice manual and API testing.
- Develop backend testing skills.
- Work with SQL and relational databases.
- Test frontend and backend integration.
- Investigate concurrency and transaction integrity.
- Develop automated tests using Python and Pytest.
- Practice Git workflows and CI/CD.
- Follow a realistic QA cycle: review a feature, run test cases, report defects, retest fixes, and add automation over time.
- Learn development fundamentals with AI-assisted explanations and implementation support, while keeping the primary focus on testing.

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
- Playwright — planned for frontend end-to-end tests; not configured yet.

### Tools

- Git
- GitHub
- Swagger / OpenAPI
- VS Code

## Implemented Features

### Product Catalog

- Public product catalog.
- Product search, rotating suggestions, popular searches, category filters, stock and price filters, sorting, and pagination.
- Product pricing in cents (`price_cents`) and title-based placeholder images.
- Product availability and stock management.
- Product creation, updating, and deactivation.
- A generator for repeatable demo product names, descriptions, prices, stock, and placeholder images.

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
- Per-product quantity controls in the catalog and cart.
- Item selection, confirmed removal, and clearing all or selected items.
- Stock availability validation.

### Orders and Inventory

- Checkout functionality.
- Checkout of selected cart items; unselected items remain in the cart.
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
- Responsive catalog, cart, sign-in, registration, and account pages.
- Cart and account previews, profile/security settings, in-app confirmations, and shared navigation/footer.
- Backend integration through the Vite development proxy.
- A manual QA test plan, regression scenarios, and a defect log in `docs/qa/`.

## Project Structure

```text
Practice-Shop/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── docs/qa/
│   ├── BUG_REPORTS.md
│   ├── TEST_CASES.md
│   └── TEST_PLAN.md
├── migrations/                 # PostgreSQL schema migrations
├── scripts/
│   └── generate_products.py
├── tests/
│   ├── test_auth_header.py
│   └── test_products.py
├── database.py
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

```powershell
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
python -m pip install fastapi uvicorn "psycopg[binary]" python-dotenv pytest httpx
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
python -m uvicorn main:app --reload
```

Backend:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### 5. Frontend setup

Open another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Frontend:

`http://localhost:5173`

The Vite development server proxies `/api` requests to the FastAPI backend.

### Generate demo products

The generator previews output by default and does not change the database. From the project root:

```powershell
python scripts/generate_products.py --count 20 --seed 42
```

To create products through a running local API, add `--apply`. The script requests an administrator token without displaying or saving it, then asks you to type `APPLY` before sending changes:

```powershell
python scripts/generate_products.py --count 20 --seed 42 --apply
```

Use local development data only. Never paste tokens into commands, files, or issue reports. See the script help for the option that also creates title-based placeholders for existing products.

## Running Tests

The QA workflow, browser scenarios and defect log are documented in [the test plan](docs/qa/TEST_PLAN.md), [manual test cases](docs/qa/TEST_CASES.md) and [bug reports](docs/qa/BUG_REPORTS.md). Backend integration tests use Pytest. Frontend flows are currently checked manually; Playwright end-to-end automation is the next planned step.

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

## Current status and next steps

- **Implemented:** catalog, authentication, cart and account flows, selected-item checkout, order history, admin API, and inventory reservations.
- **Automated:** backend integration and API tests with a dedicated test database.
- **Manual:** browser test plan, test cases, and defect tracking in `docs/qa/`.
- **Next:** configure Playwright and write the first end-to-end test for the catalog-to-cart flow.
- **Later ideas:** admin dashboard, order tracking, favorites, bonus points, and customer support.

Payment processing, email delivery, and saved card storage are not connected. Never use real payment details.

## License

This project is intended for educational and portfolio purposes.
