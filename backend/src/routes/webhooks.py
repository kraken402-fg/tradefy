from fastapi import APIRouter

router = APIRouter()

@router.post("/webhooks")
async def handle_webhook():
    # Handle webhook logic here
    return {"message": "Webhook received"}
