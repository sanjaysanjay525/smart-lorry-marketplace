# Phase 4 (Module 3 — shared cargo pooling) adds the route optimizer here.
#
# POST /optimize-route
#   Input:  list of pickup/drop coordinates + vehicle capacity
#   Output: ordered waypoints, total distance, feasibility flag
#   Algorithm: OR-Tools TSP/VRP (simple heuristic MVP; ML hook later)
#
# Called by the Express API's POST /shared-slots/:id/optimize-route route.
