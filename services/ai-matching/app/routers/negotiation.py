from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/negotiate", tags=["Negotiation"])

class Message(BaseModel):
    role: str
    content: str

class NegotiateRequest(BaseModel):
    history: List[Message]
    user_offer: float
    base_rate: float
    distance_km: float

class NegotiateResponse(BaseModel):
    response_text: str
    is_accepted: bool
    final_price: Optional[float] = None
    counter_offer: Optional[float] = None

@router.post("/", response_model=NegotiateResponse)
def negotiate_rate(req: NegotiateRequest):
    # Mock AI logic for deterministic negotiations
    min_acceptable_rate = req.base_rate * 0.85 # Willing to give a 15% discount max
    
    if req.user_offer >= min_acceptable_rate:
        return NegotiateResponse(
            response_text=f"Agreed. We accept ₹{req.user_offer} for this trip.",
            is_accepted=True,
            final_price=req.user_offer
        )
    
    # Counter offer logic
    counter = max(req.user_offer + (req.base_rate * 0.05), min_acceptable_rate)
    return NegotiateResponse(
        response_text=f"That's a bit too low. Based on current market rates and fuel costs for {req.distance_km}km, the best I can do is ₹{round(counter)}.",
        is_accepted=False,
        counter_offer=round(counter)
    )
