import os
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["recommendations"])

WEIGHT_PRICE = float(os.getenv("RECOMMEND_WEIGHT_PRICE", "0.4"))
WEIGHT_RATING = float(os.getenv("RECOMMEND_WEIGHT_RATING", "0.35"))
WEIGHT_DISTANCE = float(os.getenv("RECOMMEND_WEIGHT_DISTANCE", "0.25"))


class ScoredOption(BaseModel):
    id: str
    score: float
    score_breakdown: dict[str, float]


class RentalRecommendRequest(BaseModel):
    options: list[dict] = Field(
        description="Each option: id, price, rating, distance_km",
    )


class RentalRecommendResponse(BaseModel):
    recommendations: list[ScoredOption]


@router.post("/recommendations/rental", response_model=RentalRecommendResponse)
def recommend_rental(body: RentalRecommendRequest):
    """Rules-based rental scorer — Phase 5 MVP."""
    if not body.options:
        return RentalRecommendResponse(recommendations=[])

    prices = [o.get("price", 0) for o in body.options]
    ratings = [o.get("rating", 0) for o in body.options]
    distances = [o.get("distance_km", 0) for o in body.options]

    max_price = max(prices) or 1
    max_dist = max(distances) or 1

    scored: list[ScoredOption] = []
    for opt in body.options:
        price_norm = 1 - (opt.get("price", 0) / max_price)
        rating_norm = (opt.get("rating", 0)) / 5
        dist_norm = 1 - (opt.get("distance_km", 0) / max_dist)

        breakdown = {
            "price": round(price_norm * WEIGHT_PRICE, 4),
            "rating": round(rating_norm * WEIGHT_RATING, 4),
            "distance": round(dist_norm * WEIGHT_DISTANCE, 4),
        }
        total = sum(breakdown.values())
        scored.append(
            ScoredOption(id=opt["id"], score=round(total, 4), score_breakdown=breakdown),
        )

    scored.sort(key=lambda s: s.score, reverse=True)
    return RentalRecommendResponse(recommendations=scored[:3])
