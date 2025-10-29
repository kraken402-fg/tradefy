// Handles create-payment call and redirect to Moneroo checkout
export async function createPayment(productId, buyerId){
  try{
    const res = await fetch('/api/payments/create-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId,buyerId})});
    const j = await res.json();
    if(j.ok && j.paymentUrl){
      window.open(j.paymentUrl,'_blank');
      return j;
    }
    throw new Error(j.error||'Payment error');
  }catch(e){console.error('createPayment',e);throw e}
}

// Example usage: createPayment('PRODUCT_ID','BUYER_ID')
