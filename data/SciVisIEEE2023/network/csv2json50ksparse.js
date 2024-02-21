const fs = require('fs');
const math = require('mathjs');
const csv = require('csv-parser');

const files = fs.readdirSync('.').filter(file => file.endsWith('.csv'));

files.forEach(file => {
    const rows = [];
    const cols = [];
    const values = [];

    //console.log(`Processing ${file}...`)
    fs.createReadStream(file)
        .pipe(csv())
        .on('data', (row) => {
            rows.push(Number(row[0]));
             cols.push(Number(row[1]));
            values.push(Number(row[2]));
        })
        .on('end', () => {
            const matrixSize = 50001;  // Given matrix size
            const sparseMatrix = math.sparse();

            console.log("Finished Reading ${file} ");
            for (let i = 0; i < rows.length; i++) {
                console.log( i, rows[i], cols[2], values[3]  );
                sparseMatrix.set([rows[i], cols[i]], values[i]);
            }

            const outputFilename = file.replace('.csv', '.json');
            fs.writeFileSync(outputFilename, JSON.stringify(sparseMatrix.toJSON()));
            console.log(`File ${outputFilename} has been saved!`);
        });
});
