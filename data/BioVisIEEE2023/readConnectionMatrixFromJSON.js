const fs = require('fs');
const math = require('mathjs');

const filename = 'calcum_rank_0_step_100000_in_network.txt.json';  // Replace with your JSON file path

console.log(`Attempting to read file: ${filename}`);

fs.readFile(filename, 'utf8', (err, jsonString) => {
    if (err) {
        console.error(`Failed to read the file ${filename}. Reason: ${err.message}`);
        return;
    }

    console.log(`Successfully read file: ${filename}`);
    console.log(`Attempting to parse JSON data...`);

    try {
        const jsonData = JSON.parse(jsonString);
        console.log(`Successfully parsed JSON data from ${filename}.`);
        console.log(jsonData);

        console.log(`Attempting to convert parsed JSON data to a sparse matrix...`);
        //const connectionMatrix = math.sparse(jsonData);
        const connectionMatrix = math.SparseMatrix.fromJSON(jsonData);

        console.log(`Successfully created the sparse matrix from JSON data.`);

        console.log(connectionMatrix);  // This will print the sparse matrix. You can do further processing if needed.

    } catch (error) {
        console.error(`Failed to parse the JSON from ${filename} or create the sparse matrix. Reason: ${error.message}`);
    }
});
