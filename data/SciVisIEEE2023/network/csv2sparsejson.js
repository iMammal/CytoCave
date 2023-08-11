const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { sparse } = require('mathjs');

const readCSVtoSparseMatrix = (filePath) => {
    return new Promise((resolve, reject) => {
        const rows = [];
        const columns = [];
        const values = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                rows.push(Number(data[0]));
                columns.push(Number(data[1]));
                values.push(Number(data[2]));
            })
            .on('end', () => {
                const maxRow = Math.max(...rows) //+ 1; // Assuming 0-based index
                const maxCol = Math.max(...columns) //+ 1;
                const matrix = sparse();

                for (let i = 0; i < rows.length; i++) {
                    matrix.set([rows[i], columns[i]], values[i]);
                }
                resolve(matrix);
            })
            .on('error', reject);
    });
};

fs.readdir(process.cwd(), (err, files) => {
    if (err) throw err;

    files.forEach(file => {
        if (path.extname(file) === '.csv') {
            readCSVtoSparseMatrix(file).then(matrix => {
                const outputFileName = path.basename(file, '.csv') + '.json';
                fs.writeFileSync(outputFileName, JSON.stringify(matrix.toJSON()));
                console.log(`Written to ${outputFileName}`);
            });
        }
    });
});
