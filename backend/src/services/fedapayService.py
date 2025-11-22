import requests

class FedapayService:
    def __init__(self, api_key):
        self.api_key = api_key

    def process_payment(self, amount, currency):
        # Logic to process payment via Fedapay
        print(f"Processing payment of {amount} {currency}")
