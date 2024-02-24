# Loop from 60000 to 1000000 with a step of 30000
for timestep in $(seq 60000 30000 1000000); do
    # Define the output file name based on the current timestep
    #output_file="details_${timestep}.csv"
    input_file="tempdir/calcium_merged_data_$((timestep+20000))_in.csv"
    output_file="calcium_merged_data_$((timestep+20000))_in.csv"
    #input_file="tempdir/calcium_merged_data_$((timestep+20000))_out.csv"
    #output_file="calcium_merged_data_$((timestep+20000))_out.csv"
    
    # Create the file and add the column heading
    echo "DetailsFile" > tempfile.csv
    
    # Loop 50000 times to generate the required rows
    for i in $(seq 0 49999); do
        # Append the line to the output file
        echo "output-calcium/simstep_${i}_${timestep}.csv" >> tempfile.csv
    done
    paste -d',' "$input_file" tempfile.csv > "$output_file"
    echo paste  "$input_file" tempfile.csv "${timestep}"  "$output_file"
done
