"""
OCR Engine Benchmark: Tesseract vs PaddleOCR vs Google Cloud Vision

Compares OCR accuracy on the "problem children" - screenshots where
our Tesseract scanner produced incorrect results that needed manual correction.

Ground truth comes from instability-rock-data.csv (manually verified values).

Usage:
    python docs/testing/benchmark_ocr.py
"""

import csv
import os
import re
import sys
import time
from pathlib import Path

# Add parent dir so we can import scan_scanner
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

try:
    import cv2
    import numpy as np
except ImportError:
    print("OpenCV required: pip install opencv-python")
    sys.exit(1)

try:
    import pytesseract
except ImportError:
    print("pytesseract required: pip install pytesseract")
    sys.exit(1)

try:
    from paddleocr import PaddleOCR
    HAS_PADDLE = True
except ImportError:
    print("WARNING: PaddleOCR not available, skipping Paddle benchmark")
    HAS_PADDLE = False

try:
    from google.cloud import vision as gvision
    HAS_GVISION = True
except ImportError:
    print("WARNING: Google Cloud Vision not available, skipping GCV benchmark")
    print("  Install: pip install google-cloud-vision")
    HAS_GVISION = False

# Google Cloud Vision credentials path
# Set via env var or hardcoded fallback for local benchmarking
GVISION_KEY_PATH = os.environ.get(
    'GOOGLE_APPLICATION_CREDENTIALS',
    r'D:\OneDrive\Documents\Business\PeaceFrog Gaming\Security\Google Keys'
    r'\zeta-environs-485615-q4-897f792542cd.json'
)
if HAS_GVISION and not os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'):
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = GVISION_KEY_PATH

from scan_scanner import (
    detect_scan_panel, extract_scan_data, preprocess_for_ocr,
    KNOWN_ELEMENTS
)

# Paths
PROJECT_ROOT = SCRIPT_DIR.parent.parent
INSTABILITY_SHOTS = PROJECT_ROOT / "ref data" / "Instability Shots"
MAIN_CSV = SCRIPT_DIR / "instability-rock-data.csv"
PROCESSED_LOG = SCRIPT_DIR / "processed-files.txt"

# Fields we benchmark
BENCHMARK_FIELDS = ['mass', 'resistance_pct', 'instability']


def load_ground_truth():
    """Load ground truth from the main CSV, keyed by screenshot ID."""
    truth = {}
    with open(MAIN_CSV, 'r', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            sid = row['screenshot'].strip()
            truth[sid] = {
                'mass': int(float(row.get('mass', 0) or 0)),
                'resistance_pct': int(float(row.get('resistance_pct', 0) or 0)),
                'instability': float(row.get('instability', 0) or 0),
                'elements': [e for e in KNOWN_ELEMENTS if float(row.get(e, 0) or 0) > 0],
            }
    return truth


def get_problem_files():
    """Get list of CORRECTED files from processed-files.txt."""
    problems = []
    with open(PROCESSED_LOG, 'r') as f:
        for line in f:
            line = line.strip()
            if '| CORRECTED' in line:
                parts = line.split('|')
                filename = parts[0].strip()
                status = parts[1].strip()
                category = status.replace('CORRECTED ', '').strip('()')
                problems.append((filename, category))
    return problems


def extract_screenshot_id(filename):
    """Extract timestamp ID from filename."""
    match = re.search(r'(\d{6}G?)\.png$', filename)
    return match.group(1) if match else None


# ============================================================
# Tesseract extraction (uses our existing scanner pipeline)
# ============================================================

def tesseract_extract(img_path):
    """Run our existing Tesseract scanner pipeline on an image."""
    img = cv2.imread(str(img_path))
    if img is None:
        return None

    panel = detect_scan_panel(img)
    if panel is None:
        return None

    data = extract_scan_data(panel, img_path.name)
    if not data:
        return None

    return {
        'mass': data.get('mass') or 0,
        'resistance_pct': data.get('resistance_pct') if data.get('resistance_pct') is not None else 0,
        'instability': data.get('instability') or 0.0,
        'elements': list((data.get('elements') or {}).keys()),
    }


# ============================================================
# PaddleOCR extraction
# ============================================================

_paddle_ocr = None

def get_paddle_ocr():
    """Lazy-init PaddleOCR (it's slow to initialize)."""
    global _paddle_ocr
    if _paddle_ocr is None:
        _paddle_ocr = PaddleOCR(use_textline_orientation=True, lang='en')
    return _paddle_ocr


def paddle_extract(img_path):
    """Run PaddleOCR on an image and parse mining data from raw text."""
    if not HAS_PADDLE:
        return None

    ocr = get_paddle_ocr()
    result = ocr.ocr(str(img_path))

    if not result or not result[0]:
        return None

    # Collect all text lines with confidence scores
    lines = []
    for line_data in result[0]:
        if line_data and len(line_data) >= 2:
            text = line_data[1][0]  # text string
            conf = line_data[1][1]  # confidence
            lines.append((text, conf))

    # Join all text for parsing
    full_text = '\n'.join(t for t, c in lines)
    full_upper = full_text.upper()

    data = {
        'mass': 0,
        'resistance_pct': 0,
        'instability': 0.0,
        'elements': [],
        'raw_lines': lines,
    }

    # Parse mass
    mass_match = re.search(r'MASS[:\s]*(\d[\d,]*)', full_upper)
    if mass_match:
        data['mass'] = int(mass_match.group(1).replace(',', ''))

    # Parse resistance
    resist_match = re.search(r'RESIST\w*[:\s]*(\d+)\s*%?', full_upper)
    if resist_match:
        data['resistance_pct'] = int(resist_match.group(1))

    # Parse instability
    instab_match = re.search(r'INSTAB\w*[:\s]*([\d]+\.?\d*)', full_upper)
    if instab_match:
        data['instability'] = float(instab_match.group(1))

    # Parse elements - look for known element names
    for elem in KNOWN_ELEMENTS:
        if elem.upper() in full_upper:
            data['elements'].append(elem)

    return data


# ============================================================
# Google Cloud Vision extraction
# ============================================================

_gvision_client = None

def get_gvision_client():
    """Lazy-init Google Cloud Vision client."""
    global _gvision_client
    if _gvision_client is None:
        _gvision_client = gvision.ImageAnnotatorClient()
    return _gvision_client


def gvision_extract(img_path):
    """Run Google Cloud Vision on an image and parse mining data from OCR text."""
    if not HAS_GVISION:
        return None

    client = get_gvision_client()

    # Read image bytes
    with open(str(img_path), 'rb') as f:
        content = f.read()

    image = gvision.Image(content=content)

    # Use document_text_detection for dense text (better than text_detection for panels)
    response = client.document_text_detection(image=image)

    if response.error.message:
        raise Exception(f"GCV API error: {response.error.message}")

    if not response.full_text_annotation:
        return None

    full_text = response.full_text_annotation.text
    full_upper = full_text.upper()

    data = {
        'mass': 0,
        'resistance_pct': 0,
        'instability': 0.0,
        'elements': [],
    }

    # Parse mass - look for "Mass: 1,234" or "MASS 1234" patterns
    # GCV is good at reading commas in numbers
    mass_match = re.search(r'MASS[:\s]*([\d,]+)', full_upper)
    if mass_match:
        data['mass'] = int(mass_match.group(1).replace(',', ''))

    # Parse resistance - "Resistance: 45%" or "RESISTANCE 45 %"
    resist_match = re.search(r'RESIST\w*[:\s]*(\d+)\s*%?', full_upper)
    if resist_match:
        data['resistance_pct'] = int(resist_match.group(1))

    # Parse instability - "Instability: 2.5" or "INSTABILITY 2.50"
    instab_match = re.search(r'INSTAB\w*[:\s]*([\d]+\.?\d*)', full_upper)
    if instab_match:
        data['instability'] = float(instab_match.group(1))

    # Parse elements - look for known element names in the full text
    for elem in KNOWN_ELEMENTS:
        if elem.upper() in full_upper:
            data['elements'].append(elem)

    return data


# ============================================================
# Comparison & Scoring
# ============================================================

def score_field(extracted, truth, field, tolerance):
    """Score a single field extraction.
    Returns: 'exact', 'close', 'wrong', or 'missing'
    """
    if extracted is None:
        return 'missing'

    ext_val = extracted.get(field)
    truth_val = truth.get(field)

    if ext_val is None or ext_val == 0 and truth_val != 0:
        return 'missing'

    if field == 'mass':
        # For mass, allow within tolerance percentage
        if truth_val == 0:
            return 'exact' if ext_val == 0 else 'wrong'
        pct_diff = abs(ext_val - truth_val) / truth_val
        if pct_diff == 0:
            return 'exact'
        elif pct_diff <= tolerance:
            return 'close'
        else:
            return 'wrong'

    elif field == 'resistance_pct':
        diff = abs(ext_val - truth_val)
        if diff == 0:
            return 'exact'
        elif diff <= tolerance:
            return 'close'
        else:
            return 'wrong'

    elif field == 'instability':
        if truth_val == 0:
            return 'exact' if ext_val == 0 else 'wrong'
        pct_diff = abs(ext_val - truth_val) / truth_val
        if pct_diff == 0:
            return 'exact'
        elif pct_diff <= tolerance:
            return 'close'
        else:
            return 'wrong'

    return 'wrong'


def score_elements(extracted, truth):
    """Score element detection. Returns (matched, missed, extra)."""
    if extracted is None:
        return 0, len(truth.get('elements', [])), 0

    ext_elems = set(e.lower() for e in (extracted.get('elements') or []))
    truth_elems = set(e.lower() for e in (truth.get('elements') or []))

    matched = len(ext_elems & truth_elems)
    missed = len(truth_elems - ext_elems)
    extra = len(ext_elems - truth_elems)

    return matched, missed, extra


# Field-specific tolerances
TOLERANCES = {
    'mass': 0.05,         # 5% tolerance for mass
    'resistance_pct': 2,  # ±2 percentage points
    'instability': 0.10,  # 10% tolerance
}


def run_benchmark():
    """Main benchmark function."""
    print("=" * 70)
    print("OCR ENGINE BENCHMARK: Tesseract vs PaddleOCR vs Google Cloud Vision")
    print("=" * 70)

    # Load data
    truth = load_ground_truth()
    problems = get_problem_files()
    print(f"\nGround truth: {len(truth)} rocks in CSV")
    print(f"Problem files: {len(problems)} CORRECTED screenshots")

    # Filter to files that exist and have ground truth
    test_files = []
    for filename, category in problems:
        img_path = INSTABILITY_SHOTS / filename
        sid = extract_screenshot_id(filename)
        # Strip G suffix for CSV lookup
        clean_sid = sid.rstrip('G') if sid else None

        if not img_path.exists():
            continue
        if clean_sid not in truth and sid not in truth:
            continue

        gt_key = sid if sid in truth else clean_sid
        test_files.append((filename, category, img_path, gt_key))

    print(f"Test files with ground truth: {len(test_files)}")

    if not test_files:
        print("No test files found!")
        return

    # Run engines
    engines = {'tesseract': tesseract_extract}
    if HAS_PADDLE:
        engines['paddleocr'] = paddle_extract
    if HAS_GVISION:
        engines['gcloud_vision'] = gvision_extract

    results = {engine: [] for engine in engines}

    print(f"\nRunning {len(engines)} engine(s) on {len(test_files)} files...")
    print("-" * 70)

    for i, (filename, category, img_path, gt_key) in enumerate(test_files):
        gt = truth[gt_key]
        print(f"[{i+1}/{len(test_files)}] {filename} ({category})")

        for engine_name, extract_fn in engines.items():
            start = time.time()
            try:
                extracted = extract_fn(img_path)
            except Exception as e:
                print(f"  {engine_name}: ERROR - {e}")
                extracted = None
            elapsed = time.time() - start

            # Score each field
            scores = {}
            for field in BENCHMARK_FIELDS:
                scores[field] = score_field(extracted, gt, field, TOLERANCES[field])

            # Score elements
            matched, missed, extra = score_elements(extracted, gt)

            results[engine_name].append({
                'filename': filename,
                'category': category,
                'gt': gt,
                'extracted': extracted,
                'scores': scores,
                'elem_matched': matched,
                'elem_missed': missed,
                'elem_extra': extra,
                'time': elapsed,
            })

            # Show per-file result
            field_summary = ' | '.join(
                f"{f}:{s}" for f, s in scores.items()
            )
            ext_display = ""
            if extracted:
                ext_display = (f"M={extracted.get('mass', '?')} "
                              f"R={extracted.get('resistance_pct', '?')} "
                              f"I={extracted.get('instability', '?')}")

            print(f"  {engine_name:12s} [{elapsed:.1f}s] {field_summary} | "
                  f"elems:{matched}/{matched+missed} | {ext_display}")

    # ============================================================
    # Summary Report
    # ============================================================
    print("\n" + "=" * 70)
    print("BENCHMARK RESULTS SUMMARY")
    print("=" * 70)

    for engine_name in engines:
        engine_results = results[engine_name]
        total = len(engine_results)
        total_time = sum(r['time'] for r in engine_results)

        print(f"\n--- {engine_name.upper()} ---")
        print(f"Files tested: {total}")
        print(f"Total time: {total_time:.1f}s (avg {total_time/total:.2f}s/file)")

        # Per-field accuracy
        for field in BENCHMARK_FIELDS:
            scores = [r['scores'][field] for r in engine_results]
            exact = scores.count('exact')
            close = scores.count('close')
            wrong = scores.count('wrong')
            missing = scores.count('missing')
            usable = exact + close  # "good enough" extractions

            print(f"\n  {field}:")
            print(f"    Exact:   {exact:3d}/{total} ({100*exact/total:.0f}%)")
            print(f"    Close:   {close:3d}/{total} ({100*close/total:.0f}%)")
            print(f"    Usable:  {usable:3d}/{total} ({100*usable/total:.0f}%)")
            print(f"    Wrong:   {wrong:3d}/{total} ({100*wrong/total:.0f}%)")
            print(f"    Missing: {missing:3d}/{total} ({100*missing/total:.0f}%)")

        # Element accuracy
        total_matched = sum(r['elem_matched'] for r in engine_results)
        total_missed = sum(r['elem_missed'] for r in engine_results)
        total_extra = sum(r['elem_extra'] for r in engine_results)
        total_expected = total_matched + total_missed
        elem_recall = (100 * total_matched / total_expected) if total_expected > 0 else 0

        print(f"\n  Elements:")
        print(f"    Recall:  {total_matched}/{total_expected} ({elem_recall:.0f}%)")
        print(f"    Extra:   {total_extra} (false positives)")

        # Per-category breakdown
        print(f"\n  By Error Category:")
        categories = {}
        for r in engine_results:
            cat = r['category']
            if cat not in categories:
                categories[cat] = {'total': 0, 'usable': 0}
            categories[cat]['total'] += 1
            # Count as usable if the RELEVANT field for this category is exact or close
            relevant_field = {
                'GARBLED MASS': 'mass',
                'GARBLED RESIST': 'resistance_pct',
                'GARBLED INSTAB': 'instability',
                'NO RESIST': 'resistance_pct',
                'NO INSTAB': 'instability',
            }.get(cat)
            if relevant_field and r['scores'].get(relevant_field) in ('exact', 'close'):
                categories[cat]['usable'] += 1
            elif not relevant_field:
                # For PARTIAL/NO ELEMENTS, count as usable if any field is exact/close
                field_scores = list(r['scores'].values())
                if 'exact' in field_scores or 'close' in field_scores:
                    categories[cat]['usable'] += 1

        for cat in sorted(categories):
            c = categories[cat]
            pct = 100 * c['usable'] / c['total'] if c['total'] > 0 else 0
            print(f"    {cat:20s}: {c['usable']:2d}/{c['total']:2d} usable ({pct:.0f}%)")

    # Head-to-head comparison (all pairwise if multiple engines ran)
    engine_names = list(engines.keys())
    if len(engine_names) >= 2:
        from itertools import combinations
        for e1, e2 in combinations(engine_names, 2):
            print("\n" + "=" * 70)
            print(f"HEAD-TO-HEAD: {e1} vs {e2}")
            print("=" * 70)

            for field in BENCHMARK_FIELDS:
                wins = {e1: 0, e2: 0}
                ties = 0
                for i in range(len(test_files)):
                    s1 = results[e1][i]['scores'][field]
                    s2 = results[e2][i]['scores'][field]
                    v1 = {'exact': 3, 'close': 2, 'wrong': 1, 'missing': 0}[s1]
                    v2 = {'exact': 3, 'close': 2, 'wrong': 1, 'missing': 0}[s2]

                    if v1 > v2:
                        wins[e1] += 1
                    elif v2 > v1:
                        wins[e2] += 1
                    else:
                        ties += 1

                print(f"\n  {field}:")
                print(f"    {e1:15s} wins: {wins[e1]}")
                print(f"    {e2:15s} wins: {wins[e2]}")
                print(f"    {'ties':15s}: {ties}")

    # Write detailed results to CSV
    output_csv = SCRIPT_DIR / "benchmark_results.csv"
    with open(output_csv, 'w', newline='') as f:
        writer = csv.writer(f)
        header = ['filename', 'category',
                  'truth_mass', 'truth_resist', 'truth_instab', 'truth_elements']
        for e in engines:
            header += [f'{e}_mass', f'{e}_resist', f'{e}_instab', f'{e}_elements',
                       f'{e}_mass_score', f'{e}_resist_score', f'{e}_instab_score',
                       f'{e}_time']
        writer.writerow(header)

        for i, (filename, category, _, gt_key) in enumerate(test_files):
            gt = truth[gt_key]
            row = [filename, category,
                   gt['mass'], gt['resistance_pct'], gt['instability'],
                   ';'.join(gt['elements'])]
            for e in engines:
                r = results[e][i]
                ext = r['extracted'] or {}
                row += [
                    ext.get('mass', ''),
                    ext.get('resistance_pct', ''),
                    ext.get('instability', ''),
                    ';'.join(ext.get('elements', [])) if ext else '',
                    r['scores']['mass'],
                    r['scores']['resistance_pct'],
                    r['scores']['instability'],
                    f"{r['time']:.2f}",
                ]
            writer.writerow(row)

    print(f"\nDetailed results saved to: {output_csv}")


if __name__ == '__main__':
    run_benchmark()
