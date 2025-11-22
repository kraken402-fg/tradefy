from fastapi import FastAPI
from .routes import api, webhooks

app = FastAPI()

app.include_router(api.router)
app.include_router(webhooks.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Tradefy Backend!"}
