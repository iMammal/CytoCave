const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3273; // 8080;

app.use(bodyParser.json());

let annotations = {};

app.post('/api/annotate', (req, res) => {
  const { node, note } = req.body;
  annotations[node] = note;
  res.sendStatus(200);
  console.log(`CytoCave backend received POST request.`);
});

app.get('/api/annotations', (req, res) => {
  res.json(annotations);
  console.log(`CytoCave backend received GET request:${req},${res}.`);
  
});

app.get('/visualization', (req, res) => {
  res.sendFile(path.join(__dirname,'visualization.html'));
  console.log(`CytoCave backend received GET request for visualization:${req},${res}.`);
  
});

app.use(express.static('.'));  // <-- serves your built frontend from Webpack
app.listen(port, () => {
  console.log(`CytoCave backend running on http://localhost:${port}`);
});

