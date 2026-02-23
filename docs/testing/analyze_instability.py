"""
Star Citizen Mining - Instability Data Analysis
================================================
Analyzes rock scan data to discover instability patterns and element groupings.

Usage:
    pip install -r requirements-analysis.txt
    python analyze_instability.py

Data file: instability-rock-data.csv (same directory)
"""

import os
import sys

# Check for required packages
try:
    import pandas as pd
    import numpy as np
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend for saving files
    import matplotlib.pyplot as plt
    import seaborn as sns
except ImportError as e:
    print(f"Missing package: {e}")
    print("Install with: pip install -r requirements-analysis.txt")
    sys.exit(1)

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(SCRIPT_DIR, "instability-rock-data.csv")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "analysis_output")
MIN_SAMPLES_PER_ELEMENT = 10  # Target for unsupervised learning

# Element columns in the CSV (25 elements, excludes jaclium)
ELEMENT_COLS = [
    'agricium', 'aluminum', 'beryl', 'bexalite', 'borase', 'copper',
    'corundum', 'diamond', 'gold', 'hephaestanite', 'ice', 'iron',
    'laranite', 'lindinium', 'quantanium', 'quartz', 'riccite',
    'savrilium', 'silicon', 'stileron', 'taranite', 'tin',
    'titanium', 'torite', 'tungsten'
]

DIFFICULTY_ORDER = ['EASY', 'MEDIUM', 'CHALLENGING', 'HARD', 'IMPOSSIBLE']


def load_data():
    """Load and validate the rock data CSV."""
    if not os.path.exists(DATA_FILE):
        print(f"ERROR: Data file not found: {DATA_FILE}")
        sys.exit(1)

    df = pd.read_csv(DATA_FILE)
    print(f"Loaded {len(df)} rock samples")
    return df


def coverage_report(df):
    """Report element coverage - how many samples contain each element."""
    print("\n" + "=" * 60)
    print("ELEMENT COVERAGE REPORT")
    print("=" * 60)
    print(f"Target: {MIN_SAMPLES_PER_ELEMENT} samples per element\n")

    coverage = {}
    for col in ELEMENT_COLS:
        count = (df[col] > 0).sum()
        coverage[col] = count

    # Sort by count (lowest first to highlight gaps)
    sorted_coverage = sorted(coverage.items(), key=lambda x: x[1])

    print(f"{'Element':<18} {'Count':>5}  {'Status':<12} {'Bar'}")
    print("-" * 55)
    for element, count in sorted_coverage:
        bar = '#' * count + '.' * max(0, MIN_SAMPLES_PER_ELEMENT - count)
        if count >= MIN_SAMPLES_PER_ELEMENT:
            status = "SUFFICIENT"
        elif count >= 5:
            status = "LOW"
        elif count >= 2:
            status = "VERY LOW"
        else:
            status = "CRITICAL"
        print(f"{element.capitalize():<18} {count:>5}  {status:<12} [{bar}]")

    total_elements = len(ELEMENT_COLS)
    sufficient = sum(1 for c in coverage.values() if c >= MIN_SAMPLES_PER_ELEMENT)
    print(f"\nCoverage: {sufficient}/{total_elements} elements at target ({MIN_SAMPLES_PER_ELEMENT}+ samples)")

    # Identify gaps
    gaps = [(e, c) for e, c in sorted_coverage if c < MIN_SAMPLES_PER_ELEMENT]
    if gaps:
        print(f"\nElements needing more data:")
        for element, count in gaps:
            needed = MIN_SAMPLES_PER_ELEMENT - count
            print(f"  - {element.capitalize()}: need {needed} more (have {count})")

    return coverage


def asteroid_type_analysis(df):
    """Analyze instability patterns by asteroid type."""
    print("\n" + "=" * 60)
    print("ASTEROID TYPE ANALYSIS")
    print("=" * 60)

    type_stats = df.groupby('asteroid_type').agg(
        count=('instability', 'count'),
        mean_instability=('instability', 'mean'),
        std_instability=('instability', 'std'),
        min_instability=('instability', 'min'),
        max_instability=('instability', 'max'),
        mean_mass=('mass', 'mean'),
        mean_resistance=('resistance_pct', 'mean'),
    ).round(2)

    print(f"\n{'Type':<6} {'N':>3} {'Instability':>12} {'Std':>8} {'Range':>18} {'Avg Mass':>10} {'Avg Res':>8}")
    print("-" * 70)
    for type_name, row in type_stats.iterrows():
        rng = f"{row['min_instability']:.1f}-{row['max_instability']:.1f}"
        print(f"{type_name:<6} {int(row['count']):>3} {row['mean_instability']:>12.2f} {row['std_instability']:>8.2f} {rng:>18} {row['mean_mass']:>10.0f} {row['mean_resistance']:>8.1f}%")


def difficulty_analysis(df):
    """Analyze difficulty label distribution and thresholds."""
    print("\n" + "=" * 60)
    print("DIFFICULTY LABEL ANALYSIS")
    print("=" * 60)

    # Order difficulties
    df['difficulty_ordered'] = pd.Categorical(df['difficulty'], categories=DIFFICULTY_ORDER, ordered=True)

    diff_stats = df.groupby('difficulty', observed=True).agg(
        count=('instability', 'count'),
        mean_instability=('instability', 'mean'),
        min_instability=('instability', 'min'),
        max_instability=('instability', 'max'),
        mean_mass=('mass', 'mean'),
        mean_resistance=('resistance_pct', 'mean'),
    ).round(2)

    # Reindex to show in order
    diff_stats = diff_stats.reindex([d for d in DIFFICULTY_ORDER if d in diff_stats.index])

    print(f"\n{'Difficulty':<13} {'N':>3} {'Avg Instab':>11} {'Range':>18} {'Avg Mass':>10} {'Avg Res':>8}")
    print("-" * 68)
    for diff, row in diff_stats.iterrows():
        rng = f"{row['min_instability']:.1f}-{row['max_instability']:.1f}"
        print(f"{diff:<13} {int(row['count']):>3} {row['mean_instability']:>11.2f} {rng:>18} {row['mean_mass']:>10.0f} {row['mean_resistance']:>8.1f}%")

    print("\nNote: Difficulty is based on BREAKABILITY (power needed), not instability alone.")


def correlation_analysis(df):
    """Analyze correlations between mass, resistance, instability."""
    print("\n" + "=" * 60)
    print("CORRELATION ANALYSIS")
    print("=" * 60)

    # Key correlations
    pairs = [
        ('mass', 'instability', 'Mass vs Instability'),
        ('resistance_pct', 'instability', 'Resistance vs Instability'),
        ('mass', 'resistance_pct', 'Mass vs Resistance'),
        ('composition_scu', 'instability', 'SCU vs Instability'),
    ]

    print(f"\n{'Pair':<30} {'Pearson r':>10} {'Interpretation'}")
    print("-" * 65)
    for col1, col2, label in pairs:
        r = df[col1].corr(df[col2])
        if abs(r) > 0.7:
            interp = "STRONG"
        elif abs(r) > 0.4:
            interp = "MODERATE"
        elif abs(r) > 0.2:
            interp = "WEAK"
        else:
            interp = "NEGLIGIBLE"
        direction = "positive" if r > 0 else "negative"
        print(f"{label:<30} {r:>10.4f} {interp} {direction}")


def element_instability_analysis(df):
    """Analyze instability by dominant element."""
    print("\n" + "=" * 60)
    print("ELEMENT vs INSTABILITY ANALYSIS")
    print("=" * 60)

    # Find dominant element for each rock
    element_data = df[ELEMENT_COLS]
    df['dominant_element'] = element_data.idxmax(axis=1)
    df['dominant_pct'] = element_data.max(axis=1)

    dom_stats = df.groupby('dominant_element').agg(
        count=('instability', 'count'),
        mean_instability=('instability', 'mean'),
        std_instability=('instability', 'std'),
        mean_resistance=('resistance_pct', 'mean'),
    ).round(2).sort_values('mean_instability', ascending=False)

    print(f"\n{'Dominant Element':<18} {'N':>3} {'Avg Instab':>11} {'Std':>8} {'Avg Res':>8}")
    print("-" * 52)
    for elem, row in dom_stats.iterrows():
        std = row['std_instability'] if not pd.isna(row['std_instability']) else 0
        print(f"{elem.capitalize():<18} {int(row['count']):>3} {row['mean_instability']:>11.2f} {std:>8.2f} {row['mean_resistance']:>8.1f}%")

    # Element presence correlation with instability
    print("\nElement PRESENCE correlation with instability:")
    print(f"{'Element':<18} {'r':>8} {'Direction'}")
    print("-" * 38)
    correlations = []
    for col in ELEMENT_COLS:
        present = (df[col] > 0).astype(int)
        if present.sum() >= 2:  # Need at least 2 rocks with element
            r = present.corr(df['instability'])
            correlations.append((col, r))

    correlations.sort(key=lambda x: abs(x[1]), reverse=True)
    for elem, r in correlations:
        direction = "higher instab" if r > 0 else "lower instab"
        print(f"{elem.capitalize():<18} {r:>8.4f} {direction}")


def generate_plots(df):
    """Generate visualization plots."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Style
    sns.set_theme(style="darkgrid")
    plt.rcParams['figure.figsize'] = (10, 6)

    # 1. Mass vs Instability scatter (colored by asteroid type)
    fig, ax = plt.subplots()
    for atype in df['asteroid_type'].unique():
        subset = df[df['asteroid_type'] == atype]
        ax.scatter(subset['mass'], subset['instability'], label=f'{atype}-Type', s=60, alpha=0.7)
    ax.set_xlabel('Mass')
    ax.set_ylabel('Instability')
    ax.set_title('Mass vs Instability by Asteroid Type')
    ax.legend()
    fig.savefig(os.path.join(OUTPUT_DIR, '01_mass_vs_instability.png'), dpi=150, bbox_inches='tight')
    plt.close()

    # 2. Resistance vs Instability
    fig, ax = plt.subplots()
    scatter = ax.scatter(df['resistance_pct'], df['instability'], c=df['mass'],
                         cmap='viridis', s=60, alpha=0.7)
    ax.set_xlabel('Resistance (%)')
    ax.set_ylabel('Instability')
    ax.set_title('Resistance vs Instability (color = mass)')
    plt.colorbar(scatter, label='Mass')
    fig.savefig(os.path.join(OUTPUT_DIR, '02_resistance_vs_instability.png'), dpi=150, bbox_inches='tight')
    plt.close()

    # 3. Element coverage bar chart
    coverage = {col: (df[col] > 0).sum() for col in ELEMENT_COLS}
    fig, ax = plt.subplots()
    elements = sorted(coverage.keys(), key=lambda x: coverage[x])
    counts = [coverage[e] for e in elements]
    colors = ['#ff4444' if c < 2 else '#ffaa44' if c < 5 else '#44aa44' if c < 10 else '#2266cc' for c in counts]
    ax.barh([e.capitalize() for e in elements], counts, color=colors)
    ax.axvline(x=MIN_SAMPLES_PER_ELEMENT, color='red', linestyle='--', label=f'Target ({MIN_SAMPLES_PER_ELEMENT})')
    ax.set_xlabel('Number of Rocks Containing Element')
    ax.set_title('Element Coverage')
    ax.legend()
    fig.savefig(os.path.join(OUTPUT_DIR, '03_element_coverage.png'), dpi=150, bbox_inches='tight')
    plt.close()

    # 4. Instability distribution by difficulty
    fig, ax = plt.subplots()
    order = [d for d in DIFFICULTY_ORDER if d in df['difficulty'].values]
    sns.boxplot(data=df, x='difficulty', y='instability', order=order, ax=ax)
    ax.set_title('Instability Distribution by Difficulty Label')
    ax.set_xlabel('Difficulty')
    ax.set_ylabel('Instability')
    fig.savefig(os.path.join(OUTPUT_DIR, '04_instability_by_difficulty.png'), dpi=150, bbox_inches='tight')
    plt.close()

    # 5. Instability by dominant element
    element_data = df[ELEMENT_COLS]
    df['dominant_element'] = element_data.idxmax(axis=1).apply(str.capitalize)
    fig, ax = plt.subplots(figsize=(12, 6))
    dom_order = df.groupby('dominant_element')['instability'].mean().sort_values(ascending=False).index
    sns.stripplot(data=df, x='dominant_element', y='instability', order=dom_order,
                  size=8, alpha=0.7, ax=ax)
    ax.set_title('Instability by Dominant Element')
    ax.set_xlabel('Dominant Element')
    ax.set_ylabel('Instability')
    plt.xticks(rotation=45, ha='right')
    fig.savefig(os.path.join(OUTPUT_DIR, '05_instability_by_element.png'), dpi=150, bbox_inches='tight')
    plt.close()

    # 6. Correlation heatmap
    cols_for_corr = ['mass', 'resistance_pct', 'instability', 'composition_scu'] + ELEMENT_COLS
    corr_matrix = df[cols_for_corr].corr()
    fig, ax = plt.subplots(figsize=(14, 10))
    sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='RdBu_r', center=0,
                square=True, ax=ax, cbar_kws={'shrink': 0.8})
    ax.set_title('Correlation Heatmap')
    plt.xticks(rotation=45, ha='right')
    fig.savefig(os.path.join(OUTPUT_DIR, '06_correlation_heatmap.png'), dpi=150, bbox_inches='tight')
    plt.close()

    print(f"\nPlots saved to: {OUTPUT_DIR}/")


def clustering_analysis(df):
    """Run k-means clustering if enough data."""
    print("\n" + "=" * 60)
    print("CLUSTERING ANALYSIS")
    print("=" * 60)

    if len(df) < 30:
        print(f"\nOnly {len(df)} samples - clustering results will be preliminary.")
        print("Recommend 75+ samples for reliable clusters.")

    try:
        from sklearn.preprocessing import StandardScaler
        from sklearn.cluster import KMeans
        from sklearn.metrics import silhouette_score
    except ImportError:
        print("scikit-learn not installed. Skipping clustering.")
        return

    # Features for clustering
    features = ['mass', 'resistance_pct', 'instability'] + ELEMENT_COLS
    X = df[features].values

    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Try different k values
    print(f"\nClustering on {len(features)} features, {len(df)} samples")
    print(f"\n{'k':>3} {'Silhouette':>12} {'Interpretation'}")
    print("-" * 40)

    best_k = 2
    best_score = -1
    for k in range(2, min(8, len(df) // 3)):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X_scaled)
        score = silhouette_score(X_scaled, labels)
        interp = "good" if score > 0.5 else "fair" if score > 0.3 else "weak"
        print(f"{k:>3} {score:>12.4f} {interp}")
        if score > best_score:
            best_score = score
            best_k = k

    print(f"\nBest k={best_k} (silhouette={best_score:.4f})")

    # Show best clustering
    kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    df['cluster'] = kmeans.fit_predict(X_scaled)

    print(f"\nCluster profiles (k={best_k}):")
    for cluster in range(best_k):
        subset = df[df['cluster'] == cluster]
        print(f"\n  Cluster {cluster} ({len(subset)} rocks):")
        print(f"    Avg mass: {subset['mass'].mean():.0f}")
        print(f"    Avg resistance: {subset['resistance_pct'].mean():.1f}%")
        print(f"    Avg instability: {subset['instability'].mean():.2f}")
        print(f"    Types: {dict(subset['asteroid_type'].value_counts())}")

        # Top elements
        element_means = subset[ELEMENT_COLS].mean().sort_values(ascending=False)
        top = element_means[element_means > 5]
        if len(top) > 0:
            elems = ", ".join(f"{e.capitalize()} ({v:.0f}%)" for e, v in top.items())
            print(f"    Top elements: {elems}")

    # Plot clusters
    fig, ax = plt.subplots()
    for cluster in range(best_k):
        subset = df[df['cluster'] == cluster]
        ax.scatter(subset['mass'], subset['instability'],
                   label=f'Cluster {cluster} (n={len(subset)})', s=60, alpha=0.7)
    ax.set_xlabel('Mass')
    ax.set_ylabel('Instability')
    ax.set_title(f'K-Means Clustering (k={best_k})')
    ax.legend()
    fig.savefig(os.path.join(OUTPUT_DIR, '07_clusters.png'), dpi=150, bbox_inches='tight')
    plt.close()

    return df


def main():
    print("Star Citizen Mining - Instability Data Analysis")
    print("=" * 60)

    df = load_data()

    # Run all analyses
    coverage = coverage_report(df)
    asteroid_type_analysis(df)
    difficulty_analysis(df)
    correlation_analysis(df)
    element_instability_analysis(df)

    # Generate plots
    generate_plots(df)

    # Clustering (if sklearn available)
    clustering_analysis(df)

    # Summary
    print("\n" + "=" * 60)
    print("COLLECTION SUMMARY")
    print("=" * 60)
    total_needed = sum(max(0, MIN_SAMPLES_PER_ELEMENT - (df[col] > 0).sum()) for col in ELEMENT_COLS)
    print(f"Total rocks: {len(df)}")
    types = sorted([t for t in df['asteroid_type'].unique() if pd.notna(t)])
    print(f"Unique asteroid types: {len(types)} ({', '.join(types)})")
    print(f"Elements found: {sum(1 for col in ELEMENT_COLS if (df[col] > 0).any())}/{len(ELEMENT_COLS)}")
    print(f"Total additional samples needed (across all elements): ~{total_needed}")
    print(f"\nInstability range: {df['instability'].min():.2f} - {df['instability'].max():.2f}")
    print(f"Resistance range: {df['resistance_pct'].min()}% - {df['resistance_pct'].max()}%")
    print(f"Mass range: {df['mass'].min()} - {df['mass'].max()}")


if __name__ == '__main__':
    main()
