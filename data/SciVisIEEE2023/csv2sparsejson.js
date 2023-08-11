const fs = require('fs');
const math = require('mathjs');
const csv = require('csv-parser');

const files = fs.readdirSync('.').filter(file => file.endsWith('.csv'));

files.forEach(file => {
    const rows = [];
    const cols = [];
    const values = [];

    fs.createReadStream(file)
        .pipe(csv())
        .on('data', (row) => {
            if (isNaN(row[0]) || isNaN(row[1]) || isNaN(row[2])) {
                console.error(`Error in file ${file}: Encountered NaN value in row:`, row);
                return;
            }

            rows.push(Number(row[0]));
            cols.push(Number(row[1]));
            values.push(Number(row[2]));
        })
        .on('end', () => {
            const matrixSize = 50000;  // Given matrix size
            const sparseMatrix = math.sparse();

            for (let i = 0; i < rows.length; i++) {
                sparseMatrix.set([rows[i], cols[i]], values[i]);
            }

            const outputFilename = file.replace('.csv', '.json');
            fs.writeFileSync(outputFilename, JSON.stringify(sparseMatrix.toJSON()));
            console.log(`File ${outputFilename} has been saved!`);
        })
        .on('error', err => {
            console.error(`Error occurred while processing file ${file}:`, err.message);
        });
});

