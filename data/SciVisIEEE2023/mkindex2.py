import os

# Name of the index file
index_filename = 'index.txt'

# Open the index file for writing
with open(index_filename, 'w') as index_file:
    # Write the header
    index_file.write('subjectID,network,topology\n')
    print("Header written to index file.")

    # List all the filenames in the current directory
    filenames = os.listdir()
    print(f"Found {len(filenames)} files in the working directory.")

    # Sort the filenames to ensure consistent order
    filenames.sort()

    # Iterate through the sorted filenames
    for filename in filenames:
        # Check if the filename matches the pattern for the network files
        if filename.startswith('rank_0_step') and filename.endswith('network.txt.csv'):
            print(f"Processing network file: {filename}")

            # Extract the step and direction from the filename
            parts = filename.split('_')
            step = parts[2]
            direction = parts[4]  # Extracting the direction 'in' or 'out'

            print(f"  Extracted step: {step}, direction: {direction}")

            # Construct the corresponding final_merged_data filename
            final_merged_filename = f'final_merged_data_{step}_{direction}.csv'
            print(f"  Looking for corresponding topology file: {final_merged_filename}")

            # Check if the corresponding final_merged_data file exists
            if final_merged_filename in filenames:
                print(f"  Found corresponding topology file.")
                # Write the entry to the index file
                subjectID = f'step_{step}_{direction}'
                index_file.write(f'{subjectID},{filename},{final_merged_filename}\n')
                print(f"  Wrote entry to index file.")
            else:
                print(f"  Corresponding topology file not found.")
        else:
            print(f"Skipping file: {filename}")

print(f"Index file {index_filename} written.")

