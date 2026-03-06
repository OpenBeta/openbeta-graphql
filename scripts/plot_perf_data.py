import pandas as pd
import matplotlib.pyplot as plt
import os

def plot_field_resolutions(csv_path, output_path):
    # Read the CSV
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    # Combine parentType and fieldName for a unique field identifier
    df['fullFieldName'] = df['parentType'] + '.' + df['fieldName']

    # 1. Average duration
    avg_durations = df.groupby('fullFieldName')['durationMs'].mean().sort_values(ascending=False).head(25)

    # 2. 90th Percentile (P90)
    p90_durations = df.groupby('fullFieldName')['durationMs'].quantile(0.9).sort_values(ascending=False).head(25)

    # 3. Total resolution time (useful to find bottlenecks)
    total_durations = df.groupby('fullFieldName')['durationMs'].sum().sort_values(ascending=False).head(25)

    # Create plots
    fig, axes = plt.subplots(3, 1, figsize=(12, 24))
    (ax1, ax2, ax3) = axes

    # Plot 1: Top 25 Fields by Average Duration
    avg_durations.plot(kind='barh', ax=ax1, color='skyblue')
    ax1.set_title('Top 25 Fields by Average Resolution Time')
    ax1.set_xlabel('Average Duration (ms)')
    ax1.set_ylabel('Field (ParentType.FieldName)')
    ax1.invert_yaxis()

    # Plot 2: Top 25 Fields by 90th Percentile Duration
    p90_durations.plot(kind='barh', ax=ax2, color='orange')
    ax2.set_title('Top 25 Fields by 90th Percentile Resolution Time (P90)')
    ax2.set_xlabel('P90 Duration (ms)')
    ax2.set_ylabel('Field (ParentType.FieldName)')
    ax2.invert_yaxis()

    # Plot 3: Top 25 Fields by Total Duration
    total_durations.plot(kind='barh', ax=ax3, color='lightgreen')
    ax3.set_title('Top 25 Fields by Total Cumulative Duration')
    ax3.set_xlabel('Total Duration (ms)')
    ax3.set_ylabel('Field (ParentType.FieldName)')
    ax3.invert_yaxis()

    plt.tight_layout()
    plt.savefig(output_path)
    print(f"Plots saved to {output_path}")

if __name__ == "__main__":
    csv_file = './perf-data/field_resolutions.csv'
    output_file = './perf-data/field_resolutions_plots.png'
    plot_field_resolutions(csv_file, output_file)
