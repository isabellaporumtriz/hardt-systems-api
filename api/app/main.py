from app.asaas.webhook_routes import router as asaas_webhook_router
from app.billing.routes import router as billing_router
from app.asaas.routes import router as asaas_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.admin.routes import router as admin_router
from app.auth.routes import router as auth_router
from app.finance.routes import router as finance_router
from app.licenses.routes import router as licenses_router
from app.products.routes import router as products_router
from app.users.routes import router as users_router
from app.client.routes import router as client_router
from app.wallet.routes import router as wallet_router
from app.inventory.routes import router as store_router


app = FastAPI(
    title="Hardt Systems API",
    version="1.0.0",
)

app.include_router(
    asaas_router,
    prefix="/api/v1",
)



app.include_router(
    billing_router,
    prefix="/api/v1",
)



app.include_router(
    asaas_webhook_router,
    prefix="/api/v1",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://hardt-admin.vercel.app",
        "https://portal.hardtsystems.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Hardt Systems API",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
    }


app.include_router(
    auth_router,
    prefix="/api/v1",
)

app.include_router(
    users_router,
    prefix="/api/v1",
)

app.include_router(
    admin_router,
    prefix="/api/v1",
)

app.include_router(
    products_router,
    prefix="/api/v1",
)

app.include_router(
    licenses_router,
    prefix="/api/v1",
)

app.include_router(
    finance_router,
    prefix="/api/v1",
)

app.include_router(
    client_router,
    prefix="/api/v1",
)

app.include_router(
    wallet_router,
    prefix="/api/v1",
)

app.include_router(
    store_router,
    prefix="/api/v1",
)
