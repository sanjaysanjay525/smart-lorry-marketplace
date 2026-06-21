from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "development"
    port: int = 8000
    # Phase 5 — per-factor scoring weights for the recommendation engine, kept
    # configurable rather than hardcoded so they can be tuned without a redeploy.
    weight_rating_driver: float = 0.6
    weight_rating_vehicle: float = 0.4
    weight_return_bearing: float = 0.4
    weight_return_proximity: float = 0.3
    weight_return_weight_fit: float = 0.3

    class Config:
        env_prefix = "AI_"
        env_file = ".env"


settings = Settings()
