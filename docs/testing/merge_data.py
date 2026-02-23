"""
Merge scanner output + discrepancy corrections into instability-rock-data.csv

This script:
1. Runs the OCR scanner on all screenshots in Instability Shots
2. Loads user-corrected discrepancy data (overrides for scanner errors)
3. Loads existing CSV rows (skip already-transcribed files)
4. Applies G-suffix resistance correction (÷0.7 for green resistance)
5. Appends new rows to the main CSV

Usage:
    python docs/testing/merge_data.py
"""

import csv
import os
import sys
import re
from pathlib import Path

# Add parent dir so we can import scan_scanner
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from scan_scanner import (
    scan_local_folder, extract_scan_data, detect_scan_panel,
    KNOWN_ELEMENTS, preprocess_for_ocr
)

try:
    import cv2
except ImportError:
    print("OpenCV required: pip install opencv-python")
    sys.exit(1)

# Paths
PROJECT_ROOT = SCRIPT_DIR.parent.parent
INSTABILITY_SHOTS = PROJECT_ROOT / "ref data" / "Instability Shots"
MAIN_CSV = SCRIPT_DIR / "instability-rock-data.csv"
DISCREPANCY_CSV = SCRIPT_DIR / "ocr-discrepancies.csv"

# Green resistance modifier (Helix I + 2x Rieger C3)
GREEN_RESIST_MODIFIER = 0.7

# Full element list matching the main CSV columns
ALL_ELEMENTS = [
    'agricium', 'aluminum', 'beryl', 'bexalite', 'borase', 'copper',
    'corundum', 'diamond', 'gold', 'hephaestanite', 'ice', 'iron',
    'laranite', 'lindinium', 'quantanium', 'quartz', 'riccite',
    'savrilium', 'silicon', 'stileron', 'taranite', 'tin',
    'titanium', 'torite', 'tungsten'
]


def load_existing_csv():
    """Load existing main CSV, return set of screenshot IDs already in it."""
    existing_screenshots = set()
    max_id = 0
    if MAIN_CSV.exists():
        with open(MAIN_CSV, 'r', newline='') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # screenshot column contains the timestamp part (e.g., "044343")
                existing_screenshots.add(row.get('screenshot', '').strip())
                rid = int(row.get('rock_id', 0))
                if rid > max_id:
                    max_id = rid
    return existing_screenshots, max_id


def load_discrepancy_corrections():
    """Load user-corrected discrepancy data.
    Returns dict keyed by filename -> corrected values.
    """
    corrections = {}
    if not DISCREPANCY_CSV.exists():
        print(f"Warning: Discrepancy CSV not found: {DISCREPANCY_CSV}")
        return corrections

    with open(DISCREPANCY_CSV, 'r', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            filename = row.get('Filename', '').strip()
            if not filename or filename.startswith('#') or not filename.endswith('.png'):
                continue

            issue = row.get('Issue', '').strip()

            # Skip NO IMAGE entries
            if row.get('OCR_Mass', '').strip() == 'NO IMAGE':
                corrections[filename] = None  # Mark as skip
                continue

            # Parse corrected values
            corrected = {
                'issue': issue,
                'mass': None,
                'resistance_pct': None,
                'instability': None,
                'elements': [],
            }

            # Mass
            mass_str = row.get('OCR_Mass', '').strip()
            if mass_str and mass_str != 'NO IMAGE':
                try:
                    corrected['mass'] = int(mass_str)
                except ValueError:
                    pass

            # Resistance (stored as integer percentage, may have % suffix)
            resist_str = row.get('OCR_Resist', '').strip().rstrip('%')
            if resist_str:
                try:
                    corrected['resistance_pct'] = int(resist_str)
                except ValueError:
                    pass

            # Instability
            instab_str = row.get('OCR_Instab', '').strip()
            if instab_str:
                try:
                    corrected['instability'] = float(instab_str)
                except ValueError:
                    pass

            # Elements (comma-separated names)
            elem_str = row.get('OCR_Elements', '').strip()
            if elem_str:
                corrected['elements'] = [e.strip().lower() for e in elem_str.split(',')]

            corrections[filename] = corrected

    return corrections


def extract_screenshot_id(filename):
    """Extract timestamp ID from screenshot filename.
    'Screenshot 2026-01-26 044343.png' -> '044343'
    'Screenshot 2026-01-26 044343G.png' -> '044343G'
    """
    match = re.search(r'(\d{6}G?)\.png$', filename)
    if match:
        return match.group(1)
    return None


def is_green_resistance(filename):
    """Check if filename indicates green (modified) resistance."""
    return bool(re.search(r'G\.png$', filename))


def scan_all_files():
    """Scan all files and return dict of filename -> scanner data."""
    if not INSTABILITY_SHOTS.exists():
        print(f"Error: Folder not found: {INSTABILITY_SHOTS}")
        return {}

    image_files = sorted(INSTABILITY_SHOTS.glob('*.png'))
    print(f"Scanning {len(image_files)} images...")

    results = {}
    found = 0
    failed = 0

    for img_path in image_files:
        filename = img_path.name
        try:
            img = cv2.imread(str(img_path))
            if img is None:
                continue

            panel = detect_scan_panel(img)
            if panel is None:
                failed += 1
                continue

            data = extract_scan_data(panel, filename)
            if data and data.get('mass'):
                results[filename] = data
                found += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  Error: {filename} - {e}")
            failed += 1

    print(f"Scanner results: {found} extracted, {failed} failed/partial")
    return results


def merge_and_write():
    """Main merge logic."""
    print("=" * 60)
    print("MERGE: Scanner Output + Discrepancy Corrections")
    print("=" * 60)

    # Step 1: Load existing data
    existing_screenshots, max_id = load_existing_csv()
    print(f"\nExisting CSV: {len(existing_screenshots)} rows (max rock_id={max_id})")

    # Step 2: Load discrepancy corrections
    corrections = load_discrepancy_corrections()
    skip_count = sum(1 for v in corrections.values() if v is None)
    print(f"Discrepancy corrections: {len(corrections)} entries ({skip_count} to skip)")

    # Step 3: Scan all files
    scanner_data = scan_all_files()

    # Step 4: Determine which files to add
    all_files = sorted(INSTABILITY_SHOTS.glob('*.png'))
    new_rows = []
    skipped_existing = 0
    skipped_no_image = 0
    skipped_no_data = 0
    used_correction = 0
    used_scanner = 0
    green_corrected = 0

    for img_path in all_files:
        filename = img_path.name
        screenshot_id = extract_screenshot_id(filename)

        if not screenshot_id:
            continue

        # Skip if already in existing CSV
        # The existing CSV uses just the timestamp part (e.g., "044343")
        clean_id = screenshot_id.rstrip('G')
        if clean_id in existing_screenshots or screenshot_id in existing_screenshots:
            skipped_existing += 1
            continue

        # Skip NO IMAGE files
        if filename in corrections and corrections[filename] is None:
            skipped_no_image += 1
            continue

        # Determine data source: correction overrides scanner
        has_correction = filename in corrections and corrections[filename] is not None
        has_scanner = filename in scanner_data

        if not has_correction and not has_scanner:
            skipped_no_data += 1
            print(f"  Warning: No data for {filename}")
            continue

        # Start with scanner data as baseline
        row_data = {
            'mass': 0,
            'resistance_pct': 0,
            'instability': 0.0,
            'difficulty': '',
            'composition_scu': 0,
            'asteroid_type': '',
            'deposit_type': '',
            'elements': {},
            'inert_pct': 0,
        }

        if has_scanner:
            sd = scanner_data[filename]
            row_data['mass'] = sd.get('mass') or 0
            row_data['resistance_pct'] = sd.get('resistance_pct') if sd.get('resistance_pct') is not None else 0
            row_data['instability'] = sd.get('instability') or 0.0
            row_data['difficulty'] = sd.get('difficulty') or ''
            row_data['composition_scu'] = sd.get('composition_scu') or 0
            row_data['asteroid_type'] = sd.get('asteroid_type') or ''
            row_data['deposit_type'] = sd.get('deposit_type') or ''
            row_data['elements'] = sd.get('elements') or {}
            row_data['inert_pct'] = sd.get('inert_pct') or 0
            used_scanner += 1

        # Override with correction values where provided
        if has_correction:
            corr = corrections[filename]
            if corr['mass'] is not None:
                row_data['mass'] = corr['mass']
            if corr['resistance_pct'] is not None:
                row_data['resistance_pct'] = corr['resistance_pct']
            if corr['instability'] is not None:
                row_data['instability'] = corr['instability']
            # For elements from corrections, mark presence (no percentages available)
            # Keep scanner element percentages if available, add new element names
            for elem_name in corr.get('elements', []):
                if elem_name == 'inert':
                    # Don't override inert_pct from scanner
                    pass
                elif elem_name in ALL_ELEMENTS and elem_name not in row_data['elements']:
                    # Element from correction not in scanner - mark as present but no %
                    row_data['elements'][elem_name] = 0
            used_correction += 1

        # Apply G-suffix resistance correction: base = green / 0.7
        if is_green_resistance(filename) and row_data['resistance_pct']:
            original = row_data['resistance_pct']
            base = round(original / GREEN_RESIST_MODIFIER)
            row_data['resistance_pct'] = base
            green_corrected += 1

        # Build CSV row
        max_id += 1
        csv_row = {
            'rock_id': max_id,
            'screenshot': screenshot_id,
            'asteroid_type': row_data['asteroid_type'] or row_data.get('deposit_type', ''),
            'mass': row_data['mass'],
            'resistance_pct': row_data['resistance_pct'],
            'instability': row_data['instability'],
            'difficulty': row_data['difficulty'],
            'composition_scu': row_data['composition_scu'] or 0,
        }

        # Add element columns
        for elem in ALL_ELEMENTS:
            csv_row[elem] = row_data['elements'].get(elem, 0)
        csv_row['inert_pct'] = row_data['inert_pct']

        new_rows.append(csv_row)

    # Step 5: Summary
    print(f"\n{'=' * 40}")
    print(f"MERGE SUMMARY")
    print(f"{'=' * 40}")
    print(f"  Total images:          {len(all_files)}")
    print(f"  Skipped (existing):    {skipped_existing}")
    print(f"  Skipped (no image):    {skipped_no_image}")
    print(f"  Skipped (no data):     {skipped_no_data}")
    print(f"  New rows to add:       {len(new_rows)}")
    print(f"  Used scanner data:     {used_scanner}")
    print(f"  Applied corrections:   {used_correction}")
    print(f"  Green resist corrected:{green_corrected}")

    if not new_rows:
        print("\nNo new rows to add.")
        return

    # Step 6: Write to CSV
    # Read existing CSV content
    existing_rows = []
    if MAIN_CSV.exists():
        with open(MAIN_CSV, 'r', newline='') as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing_rows.append(row)

    # Always use the canonical header with all 25 element columns
    headers = [
        'rock_id', 'screenshot', 'asteroid_type', 'mass', 'resistance_pct',
        'instability', 'difficulty', 'composition_scu'
    ] + ALL_ELEMENTS + ['inert_pct']

    # Ensure existing rows have all element columns (fill missing with 0)
    for row in existing_rows:
        for elem in ALL_ELEMENTS:
            if elem not in row:
                row[elem] = 0

    # Write combined CSV
    all_rows = existing_rows + new_rows
    with open(MAIN_CSV, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers, extrasaction='ignore')
        writer.writeheader()
        for row in all_rows:
            writer.writerow(row)

    print(f"\nWrote {len(all_rows)} total rows to {MAIN_CSV}")
    print(f"  ({len(existing_rows)} existing + {len(new_rows)} new)")

    # Step 7: Show sample of new rows
    print(f"\nSample new rows (first 5):")
    for row in new_rows[:5]:
        elems = [e for e in ALL_ELEMENTS if row.get(e, 0) and row[e] != 0]
        print(f"  #{row['rock_id']}: {row['screenshot']} "
              f"Mass={row['mass']} Resist={row['resistance_pct']}% "
              f"Instab={row['instability']} "
              f"Elements={elems}")


if __name__ == '__main__':
    merge_and_write()
