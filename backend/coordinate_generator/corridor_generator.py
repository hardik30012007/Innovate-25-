import geopandas as gpd
from shapely.geometry import LineString

# Maximum distance (meters) to consider a corridor feasible
MAX_CORRIDOR_DISTANCE = 2000  # 2 km


# Constraints
# Constraint
MIN_ANCHOR_AREA = 50000  # 50,000 sqm (approx 5 hectares)
MIN_ZONE_AREA = 100000   # 100,000 sqm (approx 10 hectares) for final result


# -----------------------------------------------------------------------------
# Green Intervention Constants
# -----------------------------------------------------------------------------
INTERVENTIONS = {
    "tree_plantation": {
        "title": "Tree Plantation",
        "description": "Planting native trees along roadsides to create natural cooling, reduce pollution, and improve neighborhood air quality."
    },
    "shaded_walkways": {
        "title": "Shaded Pedestrian Walkways",
        "description": "Adding continuous shade and comfortable paths to make walking safer and more pleasant during hot weather."
    },
    "cycling_track": {
        "title": "Dedicated Cycling Track",
        "description": "Creating marked lanes or separated paths to give cyclists a safe, uninterrupted route away from city traffic."
    },
    "median_greening": {
        "title": "Median Greening",
        "description": "Planting protective green barriers in road dividers to absorb dust, lower emissions, and visually separate traffic lanes."
    }
}

def generate_corridors(green_anchors_gdf):

    """
    Takes green anchors GeoDataFrame
    Returns GeoDataFrame of corridor LineStrings
    """

    if green_anchors_gdf.empty:
        print("[WARN] No green anchors available for corridor generation")
        return gpd.GeoDataFrame()

    # Project to meters for distance calculation
    gdf = green_anchors_gdf.to_crs(epsg=3857)
    
    # 1. First-pass Filter: Only consider meaningful anchors
    if "area_sqm" not in gdf.columns:
        gdf["area_sqm"] = gdf.geometry.area
    
    candidates = gdf[gdf["area_sqm"] >= MIN_ANCHOR_AREA].copy()
    
    if candidates.empty:
        print("[INFO] No anchors meet the minimum size requirement")
        return gpd.GeoDataFrame()

    from shapely.ops import unary_union

    corridor_geoms = []
    participating_anchors_indices = set()

    for i, anchor_a in candidates.iterrows():
        for j, anchor_b in candidates.iterrows():
            if j <= i:
                continue  # avoid duplicates & self-pairs

            # Distance between centroids
            dist = anchor_a.geometry.centroid.distance(
                anchor_b.geometry.centroid
            )

            if dist <= MAX_CORRIDOR_DISTANCE:
                # Create a LineString between centroids
                line = LineString([
                    anchor_a.geometry.centroid,
                    anchor_b.geometry.centroid
                ])
                
                # Buffer the line to create a "Zone" (400m radius = 800m wide corridor)
                # This ensures disjoint areas overlap and merge into a blob
                corridor_zone = line.buffer(400)
                corridor_geoms.append(corridor_zone)
                
                # Mark these anchors as part of a cluster
                participating_anchors_indices.add(i)
                participating_anchors_indices.add(j)

    if not corridor_geoms:
        print("[INFO] No corridors found within distance threshold")
        return gpd.GeoDataFrame()

    # Collect geometries of only anchors that are part of a corridor
    active_anchor_geoms = candidates.loc[list(participating_anchors_indices)].geometry.tolist()

    # Merge all zones into one continuous green belt
    # 1. Union buffers AND participating green anchors
    all_geoms = corridor_geoms + active_anchor_geoms
    merged_geom = unary_union(all_geoms)

    # 2. Morphological closing / Merge nearby components
    # Buffer by extra 100m to bridge gaps, then smooth
    merged_geom = merged_geom.buffer(100)

    # 3. Fill holes (remove internal voids)
    from shapely.geometry import Polygon, MultiPolygon

    def fill_holes(geom):
        if isinstance(geom, Polygon):
            return Polygon(geom.exterior)
        elif isinstance(geom, MultiPolygon):
            return MultiPolygon([Polygon(p.exterior) for p in geom.geoms])
        return geom

    merged_geom = fill_holes(merged_geom)

    # 4. Smooth edges (simplify)
    # Tolerance of 50m removes small spikes/irregularities while keeping the shape
    merged_geom = merged_geom.simplify(50, preserve_topology=True)
    
    # 5. Final Filter: Remove small disjoint blobs
    valid_parts = []
    if isinstance(merged_geom, Polygon):
        if merged_geom.area >= MIN_ZONE_AREA:
            valid_parts.append(merged_geom)
    elif isinstance(merged_geom, MultiPolygon):
        for geom in merged_geom.geoms:
            if geom.area >= MIN_ZONE_AREA:
                valid_parts.append(geom)
    
    if not valid_parts:
        print("[INFO] No generated zones met the minimum area requirement")
        return gpd.GeoDataFrame()
    
    # Return each zone as a separate feature for individual scoring
    corridor_features = []
    for i, geom in enumerate(valid_parts):
        corridor_features.append({
            "from_anchor": "various",
            "to_anchor": "various",
            "distance_m": 0,
            "zone_id": i,
            "geometry": geom
        })
    
    corridors_gdf = gpd.GeoDataFrame(
        corridor_features,
        crs="EPSG:3857"
    )

    # Convert back to lat/lon for frontend
    corridors_gdf = corridors_gdf.to_crs(epsg=4326)

    print(f"[INFO] Generated {len(valid_parts)} Individual Green Zones")

    return corridors_gdf
