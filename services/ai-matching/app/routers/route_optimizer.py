from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["route-optimizer"])


class Coordinate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    label: str = ""


class RouteOptimizeRequest(BaseModel):
    waypoints: list[Coordinate]
    vehicle_capacity_kg: float = Field(gt=0)


class RouteOptimizeResponse(BaseModel):
    ordered_waypoints: list[Coordinate]
    total_distance_m: float
    feasible: bool
    algorithm: str = "nearest_neighbor_mvp"


@router.post("/optimize-route", response_model=RouteOptimizeResponse)
def optimize_route(body: RouteOptimizeRequest):
    """
    MVP route optimizer — nearest-neighbor heuristic.
    Phase 4 will upgrade to OR-Tools VRP.
    """
    if len(body.waypoints) < 2:
        return RouteOptimizeResponse(
            ordered_waypoints=body.waypoints,
            total_distance_m=0,
            feasible=True,
        )

    remaining = body.waypoints[1:]
    ordered = [body.waypoints[0]]
    total_m = 0.0
    current = body.waypoints[0]

    while remaining:
        nearest_idx = min(
            range(len(remaining)),
            key=lambda i: _haversine_m(current, remaining[i]),
        )
        nxt = remaining.pop(nearest_idx)
        total_m += _haversine_m(current, nxt)
        ordered.append(nxt)
        current = nxt

    return RouteOptimizeResponse(
        ordered_waypoints=ordered,
        total_distance_m=total_m,
        feasible=True,
    )


def _haversine_m(a: Coordinate, b: Coordinate) -> float:
    from math import radians, sin, cos, sqrt, atan2

    r = 6371000
    dlat = radians(b.lat - a.lat)
    dlng = radians(b.lng - a.lng)
    x = sin(dlat / 2) ** 2 + cos(radians(a.lat)) * cos(radians(b.lat)) * sin(dlng / 2) ** 2
    return 2 * r * atan2(sqrt(x), sqrt(1 - x))
