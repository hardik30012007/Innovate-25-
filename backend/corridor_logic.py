from geopy.distance import geodesic
from shapely.geometry import LineString
from priority_locations import PRIORITY_LOCATIONS

# -------- CONFIG --------
MAX_DISTANCE = 2000        # meters
MIN_SCORE_REQUIRED = 5     # lowered to allow real corridors
# ------------------------


def calculate_priority_score(midpoint):
    """
    Boost score if corridor serves important city locations
    """
    score = 0
    served = []

    for loc in PRIORITY_LOCATIONS:
        dist = geodesic(
            (midpoint.y, midpoint.x),
            (loc["lat"], loc["lon"])
        ).meters

        if dist <= 800:   # relaxed radius
            score += loc["weight"]
            served.append(loc["name"])

    return score, served


def calculate_base_score(distance, area_a, area_b):
    """
    Base corridor feasibility score
    """
    score = 0

    # Distance feasibility
    if distance <= 500:
        score += 3
    elif distance <= 1000:
        score += 2
    elif distance <= 1500:
        score += 1

    # Anchor strength (big parks deserve corridors)
    if area_a >= 100_000:
        score += 1
    if area_b >= 100_000:
        score += 1

    # Urban assumption: road connectivity exists
    score += 1

    return score


def find_candidate_corridors(gdf):
    """
    Finds AI-recommended green corridors between green anchors
    """
    corridors = []
    gdf = gdf.reset_index(drop=True)

    for i in range(len(gdf)):
        for j in range(i + 1, len(gdf)):

            geom_a = gdf.loc[i, "geometry"]
            geom_b = gdf.loc[j, "geometry"]

            # Use centroids for routing logic
            a = geom_a.centroid
            b = geom_b.centroid

            dist = geodesic((a.y, a.x), (b.y, b.x)).meters
            if dist > MAX_DISTANCE:
                continue

            # Corridor geometry
            line = LineString([a, b])
            midpoint = line.interpolate(0.5, normalized=True)

            base_score = calculate_base_score(
                dist,
                geom_a.area,
                geom_b.area
            )

            priority_score, served = calculate_priority_score(midpoint)
            total_score = base_score + priority_score

            if total_score >= MIN_SCORE_REQUIRED:
                corridors.append({
                    "id": f"corridor_{i}_{j}",
                    "from_anchor": gdf.loc[i, "anchor_id"],
                    "to_anchor": gdf.loc[j, "anchor_id"],
                    "distance_m": round(dist),
                    "score": total_score,
                    "served_locations": served,
                    "upvotes": 0,
                    "status": "AI Recommended",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [a.x, a.y],
                            [b.x, b.y]
                        ]
                    }
                })

    return corridors
