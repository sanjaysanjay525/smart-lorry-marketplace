# Phase 5 (AI recommendation layer) adds weighted, transparent scoring here:
#
#   GET /recommendations/rental             — top 3 vehicles for a search
#   GET /recommendations/return-loads/:id   — ranked return loads
#   GET /recommendations/shared-slots       — ranked pooling options
#
# Every response includes a score_breakdown per option (see Settings in
# app/config.py for the configurable weights) so the web UI can show "why
# this was recommended" without the scorer being a black box. The Express
# API proxies to this service rather than clients calling it directly.
