from geopy.distance import geodesic
from shapely.geometry import LineString
from priority_locations import PRIORITY_LOCATIONS

MAX_DISTANCE = 1500  # meters

def calculate_priority_score(midpoint):
    score = 0
    served = []

    for loc in PRIORITY_LOCATIONS:
        dist = geodesic(
            (midpoint.y, midpoint.x),
            (loc["lat"], loc["lon"])
        ).meters

        if dist <= 500:
            score += loc["weight"]
            served.append(loc["name"])

    return score, served


def calculate_base_score(distance):
    score = 0
    if distance <= 300:
        score += 3
    elif distance <= 500:
        score += 2

    score += 2  # road feasibility assumption
    return score


def find_candidate_corridors(gdf):
    corridors = []
    anchors = list(gdf.geometry)

    for i in range(len(anchors)):
        for j in range(i + 1, len(anchors)):
            a = anchors[i].centroid
            b = anchors[j].centroid

            dist = geodesic((a.y, a.x), (b.y, b.x)).meters
            if dist > MAX_DISTANCE:
                continue

            midpoint = LineString([a, b]).interpolate(0.5, normalized=True)
            base_score = calculate_base_score(dist)
            priority_score, served = calculate_priority_score(midpoint)

            total_score = base_score + priority_score

            if total_score >= 6:
                corridors.append({
                    "id": f"corridor_{i}_{j}",
                    "distance_m": round(dist),
                    "score": total_score,
                    "served_locations": served,
                    "upvotes": 0,
                    "status": "AI Recommended"
                })

    return corridors
