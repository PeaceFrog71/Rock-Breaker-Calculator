"""
Star Citizen Mining Scan Scanner
=================================
Scans folders of screenshots for mining SCAN RESULTS panels,
extracts data via OCR, and outputs to CSV.

Also includes a Reddit scraper for community mining screenshots.

Usage:
    # Scan local folder
    python scan_scanner.py --local "path/to/screenshots"

    # Scan both ref data folders
    python scan_scanner.py --local-all

    # Scrape Reddit for mining screenshots
    python scan_scanner.py --reddit

    # Full run: local + reddit
    python scan_scanner.py --all

Requirements:
    pip install -r requirements-analysis.txt
    pip install pytesseract Pillow opencv-python requests beautifulsoup4
    Tesseract OCR must be installed (winget install UB-Mannheim.TesseractOCR)
"""

import os
import re
import sys
import csv
import json
import argparse
import glob
from pathlib import Path
from typing import Optional

try:
    import cv2
    import numpy as np
    from PIL import Image, ImageEnhance, ImageFilter
    import pytesseract
    import requests
    from bs4 import BeautifulSoup
except ImportError as e:
    print(f"Missing package: {e}")
    print("Install with: pip install pytesseract Pillow opencv-python requests beautifulsoup4")
    sys.exit(1)

# Configure Tesseract path for Windows
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
REF_DATA = PROJECT_ROOT / "ref data"
INSTABILITY_SHOTS = REF_DATA / "Instability Shots"
RANDOM_SHOTS = REF_DATA / "Random Shots"
OUTPUT_CSV = SCRIPT_DIR / "instability-rock-data.csv"
SCRAPED_DIR = SCRIPT_DIR / "scraped_images"

# Known elements in Star Citizen mining (all 25)
KNOWN_ELEMENTS = [
    'agricium', 'aluminum', 'beryl', 'bexalite', 'borase', 'copper',
    'corundum', 'diamond', 'gold', 'hephaestanite', 'ice', 'iron',
    'laranite', 'lindinium', 'quantanium', 'quartz', 'riccite',
    'savrilium', 'silicon', 'stileron', 'taranite', 'tin',
    'titanium', 'torite', 'tungsten'
]

# Known asteroid types
ASTEROID_TYPES = ['C', 'E', 'M', 'P', 'Q', 'S']

# Known difficulty labels
DIFFICULTY_LABELS = ['EASY', 'MEDIUM', 'CHALLENGING', 'HARD', 'IMPOSSIBLE']

# Known deposit types (names shown in scan panel instead of asteroid type letters)
DEPOSIT_TYPES = [
    'IGNEOUS', 'ATACAMITE', 'GNEISS', 'FELSIC', 'OBSIDIAN',
    'QUANTANIUM', 'SEDIMENTARY', 'METAMORPHIC',
]

# Minimum image width for OCR - images smaller than this get scaled up
MIN_OCR_WIDTH = 600
SCALE_TARGET_WIDTH = 900  # Target width after scaling


def scale_if_needed(img: np.ndarray) -> np.ndarray:
    """Scale up small images for better OCR accuracy."""
    h, w = img.shape[:2]
    if w < MIN_OCR_WIDTH:
        scale = SCALE_TARGET_WIDTH / w
        return cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    return img


def preprocess_for_ocr(img: np.ndarray) -> list[np.ndarray]:
    """
    Preprocess image for better OCR on Star Citizen's sci-fi UI.
    Returns multiple preprocessed versions to try.
    Automatically scales up small images first.
    """
    # Scale up small images (biggest single improvement for OCR accuracy)
    img = scale_if_needed(img)
    versions = []

    # Convert to grayscale if needed
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()

    # Version 1: Enhanced contrast then threshold (good general purpose)
    enhanced = cv2.convertScaleAbs(gray, alpha=2.5, beta=-150)
    _, thresh1 = cv2.threshold(enhanced, 80, 255, cv2.THRESH_BINARY)
    versions.append(thresh1)

    # Version 2: Color-based isolation (best for SC's orange/green/red UI text)
    if len(img.shape) == 3:
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        kernel = np.ones((2, 2), np.uint8)

        # Orange/amber text (main UI text)
        orange_mask = cv2.inRange(hsv, np.array([5, 80, 150]), np.array([30, 255, 255]))
        # Green text (difficulty labels, some values)
        green_mask = cv2.inRange(hsv, np.array([35, 80, 100]), np.array([85, 255, 255]))
        # Red text (IMPOSSIBLE, warnings)
        red_mask1 = cv2.inRange(hsv, np.array([0, 80, 100]), np.array([10, 255, 255]))
        red_mask2 = cv2.inRange(hsv, np.array([170, 80, 100]), np.array([180, 255, 255]))
        # Bright white/cyan text
        _, bright_mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)

        # Combine all text colors
        all_text = cv2.bitwise_or(orange_mask, green_mask)
        all_text = cv2.bitwise_or(all_text, red_mask1)
        all_text = cv2.bitwise_or(all_text, red_mask2)
        all_text = cv2.bitwise_or(all_text, bright_mask)
        all_text = cv2.dilate(all_text, kernel, iterations=1)
        versions.append(all_text)

    # Version 3: Simple threshold (fallback)
    _, thresh3 = cv2.threshold(gray, 120, 255, cv2.THRESH_BINARY)
    versions.append(thresh3)

    # Version 4: OTSU threshold (adaptive)
    _, thresh4 = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    versions.append(thresh4)

    return versions


def detect_scan_panel(img: np.ndarray) -> Optional[np.ndarray]:
    """
    Detect and crop the SCAN RESULTS panel from a full screenshot.
    Returns the cropped panel region, or None if not found.
    """
    h, w = img.shape[:2]

    # Strategy 1: If image is small enough, it's likely already a cropped panel
    if w < 800 and h < 800:
        return img

    # Strategy 2: The scan panel is typically on the right side of the screen
    # Try the right 40% of the image
    right_region = img[:, int(w * 0.55):]

    for preprocessed in preprocess_for_ocr(right_region):
        text = pytesseract.image_to_string(preprocessed, config='--psm 6')
        text_upper = text.upper()
        if 'SCAN' in text_upper and ('RESULT' in text_upper or 'MASS' in text_upper):
            return right_region

    # Strategy 3: Try the full image (panel might be centered or left)
    for preprocessed in preprocess_for_ocr(img):
        text = pytesseract.image_to_string(preprocessed, config='--psm 6')
        text_upper = text.upper()
        if 'SCAN' in text_upper and ('RESULT' in text_upper or 'MASS' in text_upper):
            return img

    return None


def extract_scan_data(img: np.ndarray, filename: str = "") -> Optional[dict]:
    """
    Extract mining scan data from an image using OCR.
    Returns a dict with parsed fields, or None if extraction fails.
    """
    results = []

    # Try all preprocessing versions
    for i, preprocessed in enumerate(preprocess_for_ocr(img)):
        # Try different PSM modes
        for psm in [6, 4, 3]:
            config = f'--psm {psm} --oem 3'
            try:
                text = pytesseract.image_to_string(preprocessed, config=config)
                parsed = parse_scan_text(text, filename)
                if parsed:
                    # Score the result by completeness
                    score = sum([
                        bool(parsed.get('asteroid_type')),
                        bool(parsed.get('mass')),
                        bool(parsed.get('resistance_pct') is not None),
                        bool(parsed.get('instability')),
                        bool(parsed.get('elements')),
                    ])
                    results.append((score, parsed))
            except Exception:
                continue

    if not results:
        return None

    # Return the best scoring result
    results.sort(key=lambda x: x[0], reverse=True)
    return results[0][1]


def fuzzy_element_match(name: str) -> Optional[str]:
    """
    Try to match OCR-garbled element names to known elements.
    OCR often misreads characters in Star Citizen's font.
    """
    name = name.lower().strip()

    # Direct match
    if name in KNOWN_ELEMENTS:
        return name

    # Common OCR misreads
    OCR_FIXES = {
        'ron': 'iron', 'lron': 'iron', 'tron': 'iron', 'irom': 'iron',
        'goid': 'gold', 'go1d': 'gold',
        'bery1': 'beryl', 'beryj': 'beryl',
        'quariz': 'quartz', 'quart2': 'quartz', 'quar': 'quartz',
        'bexaiite': 'bexalite', 'bexaltte': 'bexalite',
        'tarantte': 'taranite', 'tarantte': 'taranite',
        'larantte': 'laranite', 'larantte': 'laranite',
        'hephaestantte': 'hephaestanite',
        'corundum': 'corundum', 'corundun': 'corundum',
        'agriclum': 'agricium', 'agrlcium': 'agricium',
        'aluminun': 'aluminum', 'aluminium': 'aluminum',
        'quantanlum': 'quantanium', 'quantanium': 'quantanium',
        'tltanium': 'titanium', 'titanlum': 'titanium',
        'tungsien': 'tungsten', 'tungsten': 'tungsten',
        'dlamond': 'diamond',
        # New elements added for expanded recognition
        'rlccite': 'riccite', 'ricctte': 'riccite', 'rlcctte': 'riccite',
        'tln': 'tin', 't1n': 'tin',
        '1ce': 'ice', 'lce': 'ice',
        'llndinium': 'lindinium', 'lindlnium': 'lindinium',
        'savrlllum': 'savrilium', 'savrlium': 'savrilium',
        'sllicon': 'silicon', 'silcon': 'silicon',
        'stlleron': 'stileron', 'stlieron': 'stileron',
        'torlte': 'torite', 'tortte': 'torite',
    }
    if name in OCR_FIXES:
        return OCR_FIXES[name]

    # Substring match (for when OCR gets most of the name right)
    for elem in KNOWN_ELEMENTS:
        if len(name) >= 4 and (name in elem or elem in name):
            return elem
        # Check edit distance for close matches (simple: share >60% characters)
        if len(name) >= 4 and len(elem) >= 4:
            common = sum(1 for a, b in zip(name, elem) if a == b)
            if common / max(len(name), len(elem)) > 0.6:
                return elem

    return None


def parse_scan_text(text: str, filename: str = "") -> Optional[dict]:
    """
    Parse OCR text output into structured scan data.
    """
    if not text or len(text) < 20:
        return None

    lines = text.strip().split('\n')
    lines = [l.strip() for l in lines if l.strip()]

    data = {
        'filename': filename,
        'asteroid_type': None,
        'deposit_type': None,
        'mass': None,
        'resistance_pct': None,
        'instability': None,
        'difficulty': None,
        'composition_scu': None,
        'elements': {},
        'inert_pct': 0,
    }

    full_text = ' '.join(lines).upper()

    # Must contain at least some key mining terms
    mining_terms = ['MASS', 'RESISTANCE', 'INSTABILITY', 'COMPOSITION', 'SCAN']
    found_terms = sum(1 for t in mining_terms if t in full_text)
    if found_terms < 2:
        return None

    for line in lines:
        line_upper = line.upper().strip()

        # Asteroid type: "ASTEROID (E-TYPE)" or "E-TYPE"
        type_match = re.search(r'([CEMPQS])\s*[-—–]\s*TYPE', line_upper)
        if type_match:
            data['asteroid_type'] = type_match.group(1)

        # Also try parenthesized format: "(P-TYPE)"
        if not data['asteroid_type']:
            paren_match = re.search(r'\(([CEMPQS])\s*[-—–]\s*TYPE\)', line_upper)
            if paren_match:
                data['asteroid_type'] = paren_match.group(1)

        # Deposit type: "IGNEOUS DEPOSIT", "GNEISS DEPOSIT", etc.
        if not data['deposit_type']:
            for deposit in DEPOSIT_TYPES:
                if deposit in line_upper:
                    data['deposit_type'] = deposit
                    break

        # Mass: "MASS: 12417" or "MASS 12417"
        mass_match = re.search(r'MASS[:\s]+(\d+)', line_upper)
        if mass_match:
            data['mass'] = int(mass_match.group(1))

        # Resistance: "RESISTANCE: 20%" or "RESISTANCE 20%" or "RESISTANCE: 0%"
        resist_match = re.search(r'RESIST\w*[:\s]+(\d+)\s*%?', line_upper)
        if resist_match:
            data['resistance_pct'] = int(resist_match.group(1))

        # Instability: "INSTABILITY: 76.56" or "INSTABILITY 76.56" or OCR variants
        instab_match = re.search(r'INSTAB\w*[:\s]+([\d.]+)', line_upper)
        if instab_match:
            data['instability'] = float(instab_match.group(1))

        # Difficulty label
        for diff in DIFFICULTY_LABELS:
            if diff in line_upper:
                data['difficulty'] = diff
                break

        # Composition SCU: "COMPOSITION 48.59 SCU" or "COMPOSITION: 48.59 SCU"
        scu_match = re.search(r'COMP\w*[:\s]+([\d.]+)\s*SCU', line_upper)
        if scu_match:
            data['composition_scu'] = float(scu_match.group(1))

        # Element lines: "56.76% LARANITE (RAW)" or "56.76% LARANITE" or "56.76% IRON (ORE)"
        # Also handle: "56.76% INERT MATERIALS"
        elem_match = re.search(r'([\d.]+)\s*%?\s+([A-Z][A-Z0-9]+)', line_upper)
        if elem_match:
            pct_str = elem_match.group(1)
            name_raw = elem_match.group(2)

            try:
                pct = float(pct_str)
            except ValueError:
                continue

            # Check for inert materials
            if 'INERT' in line_upper or name_raw == 'INERT':
                data['inert_pct'] = pct
            else:
                # Try fuzzy matching for OCR errors
                matched = fuzzy_element_match(name_raw)
                if matched and 0 < pct <= 100:
                    data['elements'][matched] = pct

    # Validate: must have at least mass or instability
    if not data['mass'] and not data['instability']:
        return None

    return data


def scan_to_csv_row(data: dict, rock_id: int) -> dict:
    """Convert parsed scan data to a CSV row matching our format."""
    row = {
        'rock_id': rock_id,
        'screenshot': data.get('filename', ''),
        'asteroid_type': data.get('asteroid_type', ''),
        'deposit_type': data.get('deposit_type', ''),
        'mass': data.get('mass', 0),
        'resistance_pct': data.get('resistance_pct', 0),
        'instability': data.get('instability', 0),
        'difficulty': data.get('difficulty', ''),
        'composition_scu': data.get('composition_scu', 0),
    }

    # Add element columns
    elements = data.get('elements', {})
    for elem in KNOWN_ELEMENTS:
        row[elem] = elements.get(elem, 0)

    row['inert_pct'] = data.get('inert_pct', 0)
    return row


def scan_local_folder(folder: str, existing_ids: set = None) -> list[dict]:
    """Scan a local folder for mining scan screenshots."""
    folder_path = Path(folder)
    if not folder_path.exists():
        print(f"Folder not found: {folder}")
        return []

    image_files = []
    for ext in ['*.png', '*.jpg', '*.jpeg', '*.bmp']:
        image_files.extend(folder_path.glob(ext))

    if not image_files:
        print(f"No images found in: {folder}")
        return []

    print(f"\nScanning {len(image_files)} images in: {folder}")
    results = []
    found = 0
    failed = 0

    for img_path in sorted(image_files):
        filename = img_path.name
        # Skip if already processed
        if existing_ids and filename in existing_ids:
            continue

        try:
            img = cv2.imread(str(img_path))
            if img is None:
                continue

            # Try to detect scan panel
            panel = detect_scan_panel(img)
            if panel is None:
                print(f"  [ ] {filename} - no scan panel detected")
                continue

            # Extract data
            data = extract_scan_data(panel, filename)
            if data and data.get('mass'):
                found += 1
                deposit = data.get('deposit_type', '')
                type_str = data.get('asteroid_type', '?')
                if deposit and type_str == '?':
                    type_str = f'?/{deposit}'
                print(f"  [+] {filename} - "
                      f"Type={type_str}, "
                      f"Mass={data.get('mass', '?')}, "
                      f"Resist={data.get('resistance_pct', '?')}%, "
                      f"Instab={data.get('instability', '?')}, "
                      f"Elements={list(data.get('elements', {}).keys())}")
                results.append(data)
            else:
                failed += 1
                print(f"  [?] {filename} - scan detected but extraction incomplete")

        except Exception as e:
            print(f"  [!] {filename} - error: {e}")

    print(f"\nResults: {found} extracted, {failed} partial, "
          f"{len(image_files) - found - failed} no scan panel")
    return results


def scrape_reddit(subreddit: str = "starcitizen", search_query: str = "mining scan",
                  limit: int = 50) -> list[str]:
    """
    Scrape Reddit for mining scan screenshots.
    Returns list of downloaded image paths.
    """
    print(f"\nSearching Reddit r/{subreddit} for: '{search_query}'")
    SCRAPED_DIR.mkdir(exist_ok=True)

    headers = {
        'User-Agent': 'StarCitizen-MiningScanner/1.0 (research tool)'
    }

    downloaded = []
    try:
        # Search Reddit JSON API
        url = f"https://www.reddit.com/r/{subreddit}/search.json"
        params = {
            'q': search_query,
            'restrict_sr': 'true',
            'sort': 'relevance',
            'limit': limit,
            't': 'all',
        }

        resp = requests.get(url, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        posts = data.get('data', {}).get('children', [])
        print(f"Found {len(posts)} posts")

        for post in posts:
            post_data = post.get('data', {})
            title = post_data.get('title', '')
            post_url = post_data.get('url', '')

            # Check if it's an image link
            if any(post_url.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg']):
                img_name = f"reddit_{post_data.get('id', 'unknown')}.png"
                img_path = SCRAPED_DIR / img_name

                if img_path.exists():
                    downloaded.append(str(img_path))
                    continue

                try:
                    img_resp = requests.get(post_url, headers=headers, timeout=30)
                    img_resp.raise_for_status()
                    img_path.write_bytes(img_resp.content)
                    downloaded.append(str(img_path))
                    print(f"  Downloaded: {title[:60]}...")
                except Exception as e:
                    print(f"  Failed to download: {title[:40]}... ({e})")

            # Check for gallery/preview images
            elif 'preview' in post_data:
                images = post_data['preview'].get('images', [])
                for idx, img_data in enumerate(images):
                    source_url = img_data.get('source', {}).get('url', '')
                    source_url = source_url.replace('&amp;', '&')  # Fix HTML entities

                    if source_url:
                        img_name = f"reddit_{post_data.get('id', 'unknown')}_{idx}.png"
                        img_path = SCRAPED_DIR / img_name

                        if img_path.exists():
                            downloaded.append(str(img_path))
                            continue

                        try:
                            img_resp = requests.get(source_url, headers=headers, timeout=30)
                            img_resp.raise_for_status()
                            img_path.write_bytes(img_resp.content)
                            downloaded.append(str(img_path))
                            print(f"  Downloaded: {title[:60]}...")
                        except Exception:
                            pass

    except Exception as e:
        print(f"Reddit search error: {e}")

    print(f"Downloaded {len(downloaded)} images")
    return downloaded


def load_existing_csv() -> tuple[list[dict], int, set]:
    """Load existing CSV data, return rows, max rock_id, and processed filenames."""
    rows = []
    max_id = 0
    filenames = set()

    if OUTPUT_CSV.exists():
        with open(OUTPUT_CSV, 'r', newline='') as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)
                rid = int(row.get('rock_id', 0))
                if rid > max_id:
                    max_id = rid
                fname = row.get('screenshot', '')
                if fname:
                    filenames.add(fname)

    return rows, max_id, filenames


def append_to_csv(new_data: list[dict], start_id: int):
    """Append new scan data to the CSV file."""
    if not new_data:
        print("No new data to append.")
        return

    # CSV columns
    columns = [
        'rock_id', 'screenshot', 'asteroid_type', 'deposit_type', 'mass',
        'resistance_pct', 'instability', 'difficulty', 'composition_scu'
    ] + KNOWN_ELEMENTS + ['inert_pct']

    file_exists = OUTPUT_CSV.exists()
    existing_rows, _, _ = load_existing_csv() if file_exists else ([], 0, set())

    with open(OUTPUT_CSV, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction='ignore')
        if not file_exists or not existing_rows:
            writer.writeheader()

        for i, data in enumerate(new_data):
            row = scan_to_csv_row(data, start_id + i + 1)
            writer.writerow(row)

    print(f"\nAppended {len(new_data)} new rows to {OUTPUT_CSV}")
    print(f"Total rows: {len(existing_rows) + len(new_data)}")


def main():
    parser = argparse.ArgumentParser(description='Star Citizen Mining Scan Scanner')
    parser.add_argument('--local', type=str, help='Scan a local folder for screenshots')
    parser.add_argument('--local-all', action='store_true',
                        help='Scan both Instability Shots and Random Shots folders')
    parser.add_argument('--reddit', action='store_true',
                        help='Scrape Reddit for mining screenshots')
    parser.add_argument('--all', action='store_true',
                        help='Run all sources (local + reddit)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be extracted without writing CSV')

    args = parser.parse_args()

    if not any([args.local, args.local_all, args.reddit, args.all]):
        parser.print_help()
        print("\nExamples:")
        print(f'  python scan_scanner.py --local "{RANDOM_SHOTS}"')
        print(f'  python scan_scanner.py --local-all')
        print(f'  python scan_scanner.py --reddit')
        print(f'  python scan_scanner.py --all')
        return

    # Load existing data to avoid duplicates
    _, max_id, existing_filenames = load_existing_csv()
    all_new_data = []

    # Local scanning
    if args.local:
        results = scan_local_folder(args.local, existing_filenames)
        all_new_data.extend(results)

    if args.local_all or args.all:
        for folder in [INSTABILITY_SHOTS, RANDOM_SHOTS]:
            results = scan_local_folder(str(folder), existing_filenames)
            all_new_data.extend(results)

    # Reddit scraping
    if args.reddit or args.all:
        # Search for mining scan posts
        for query in ['mining scan results', 'asteroid scan mining', 'mining instability']:
            image_paths = scrape_reddit(search_query=query, limit=25)
            if image_paths:
                results = scan_local_folder(SCRAPED_DIR, existing_filenames)
                all_new_data.extend(results)
                break  # Don't duplicate if we already got results

    # Output
    if all_new_data:
        print(f"\n{'=' * 50}")
        print(f"TOTAL NEW SCANS FOUND: {len(all_new_data)}")
        print(f"{'=' * 50}")

        if args.dry_run:
            print("\n[DRY RUN] Would append these to CSV:")
            for data in all_new_data:
                print(f"  Type={data.get('asteroid_type', '?')}, "
                      f"Mass={data.get('mass', '?')}, "
                      f"Instab={data.get('instability', '?')}")
        else:
            append_to_csv(all_new_data, max_id)
    else:
        print("\nNo new scan data found.")


if __name__ == '__main__':
    main()
