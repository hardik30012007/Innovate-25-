import sys
import os

# Ensure backend directory is in python path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.green_zone_processor import process_green_zones

if __name__ == "__main__":
    print("🔄 Starting Green Zone Verification...")
    try:
        gdf = process_green_zones()
        if gdf.empty:
            print("⚠️ No green zones found matching the criteria.")
        else:
            print(f"✅ Found {len(gdf)} green zones.")
            # Verify areas
            gdf_meters = gdf.to_crs(epsg=3857)
            min_area = gdf_meters.geometry.area.min() / 10000 # to hectares
            max_area = gdf_meters.geometry.area.max() / 10000
            print(f"   Smallest area: {min_area:.2f} ha")
            print(f"   Largest area:  {max_area:.2f} ha")
            
            if min_area < 50:
                print("❌ FAIL: Found areas smaller than 50ha!")
            else:
                print("✅ PASS: All areas are >= 50ha.")
                
            # Save properly to data folder
            output_path = "backend/data/existing_green_zones_delhi.geojson"
            os.makedirs("backend/data", exist_ok=True)
            gdf.to_file(output_path, driver="GeoJSON")
            print(f"💾 Saved to {output_path}")
            
    except Exception as e:
        print(f"❌ Error during processing: {e}")
