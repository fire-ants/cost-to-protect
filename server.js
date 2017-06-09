const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const pug = require('pug');
const webshot = require('webshot');

const app = express();
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
var views = __dirname + '/views/';
app.use(express.static(process.cwd() + '/public'));

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log('listening on '+port)
})

app.get('/', (req, res) => {
  res.render('ddInput', {ddMenu: true, url: req._parsedOriginalUrl, query: req.query})
})


app.get('/datadomain', (req, res) => {
  res.render('ddInput', {ddMenu: true, url: req._parsedOriginalUrl, query: req.query})
})

app.get('/datadomain/graph', (req, res) => {
  res.render('ddOutput', {ddMenu:true, query: req.query, url: req._parsedOriginalUrl, solution: getDataDomainSolution(req.query)})
})

app.get('/datadomain/graph/png', (req, res) => {
  const html = pug.renderFile('./views/ddExport.pug', {query: req.query, solution: getDataDomainSolution(req.query)});

  const path = `./graph${new Date().getTime()}.png`;
  webshot(html, path, {siteType:'html', quality:150}, (err) => {
    console.log(`File created: ${path}`);
    res.download(path, 'ddgraph.png', (err) => {
      console.log(`File deleted: ${path}`)
      fs.unlinkSync(path);
    });
  });
})


app.get('/datadomain-ecs', (req, res) => {
  res.render('ddEcsInput', {ddEcsMenu: true, query: req.query, url: req._parsedOriginalUrl})
})

app.get('/datadomain-ecs/graph', (req, res) => {
  res.render('ddEcsOutput', {ddEcsMenu: true, query: req.query, url: req._parsedOriginalUrl, solution: getDataDomainEcsSolution(req.query)})
})


app.get('/datadomain-virtustream', (req, res) => {
  res.render('ddVirtustreamInput', {ddVirtustreamMenu: true, query: req.query, url: req._parsedOriginalUrl})
})

app.get('/datadomain-virtustream/graph', (req, res) => {

  res.render('ddVirtustreamOutput', {ddVirtustreamMenu: true, query: req.query, url: req._parsedOriginalUrl, solution: getDataDomainVirtustreamSolution(req.query)})
})


const getDataDomainVirtustreamSolution = function(query) {
  const months = query.duration * 12;

  const solution = {};
  solution.size = calcGrowthArray(query.dataSet, query.growth, months);
  solution.ddSize = calcGrowthArray(query.dataSet * (1 - (query.archive * 0.01)), query.growth, months);
  solution.virtustreamSize = calcGrowthArray(query.dataSet * (query.archive * 0.01), query.growth, months);
  solution.label = [];
  solution.protectedCap = [];
  solution.ddMoCost = [];
  solution.cloudTierMoCost = [];
  solution.virtustreamMoCost = [];
  solution.virtustreamStorageType = getVirtustreamType(query.virtustreamCost);
  solution.totalCost = [];

  for (i = 0; i < months; i++) {
    const totalGb = solution.size[i] * 1024;
    const ddGb = solution.ddSize[i] * 1024;
    const virtustreamGb = solution.virtustreamSize[i] * 1024;

    solution.protectedCap.push(query.dedupRate * solution.size[i]);
    solution.ddMoCost.push(query.ddCost / months / query.dedupRate / ddGb);
    solution.cloudTierMoCost.push(query.cloudTierCost / months / query.dedupRate / virtustreamGb);
    solution.virtustreamMoCost.push(query.virtustreamCost * 1);
    solution.totalCost.push(solution.ddMoCost[i] + solution.cloudTierMoCost[i] + solution.virtustreamMoCost[i]);

    solution.label.push(i+1);
  }

  solution.avgCost = calcAverage(solution.totalCost).toLocaleString('en-US', {minimumFractionDigits: 4});

  return solution;
}

const getDataDomainEcsSolution = function(query) {
  const months = query.duration * 12;

  const solution = {};
  solution.size = calcGrowthArray(query.dataSet, query.growth, months);
  solution.ddSize = calcGrowthArray(query.dataSet * (1 - (query.archive * 0.01)), query.growth, months);
  solution.ecsSize = calcGrowthArray(query.dataSet * (query.archive * 0.01), query.growth, months);
  solution.label = [];
  solution.protectedCap = [];
  solution.ddMoCost = [];
  solution.ecsMoCost = [];
  solution.totalCost = [];

  for (i = 0; i < months; i++) {
    const totalGb = solution.size[i] * 1024;
    const ddGb = solution.ddSize[i] * 1024;
    const ecsGb = solution.ecsSize[i] * 1024;

    solution.protectedCap.push(query.dedupRate * solution.size[i]);
    solution.ddMoCost.push(query.ddCost / months / query.dedupRate / ddGb);
    solution.ecsMoCost.push(query.ecsCost / months / query.dedupRate / ecsGb);
    solution.totalCost.push(solution.ddMoCost[i] + solution.ecsMoCost[i]);

    solution.label.push(i+1);
  }

  solution.avgCost = calcAverage(solution.totalCost).toLocaleString('en-US', {minimumFractionDigits: 4});

  return solution;
}

const getDataDomainSolution = function(query) {
  const months = query.duration * 12;
  const solution = {};
  solution.size = calcGrowthArray(query.dataSet, query.growth, months);
  solution.label = [];
  solution.protectedCap = [];
  solution.ddMoCost = [];
  solution.totalCost = [];

  for (i = 0; i < months; i++) {
    const totalGb = solution.size[i] * 1024;

    solution.protectedCap.push(query.dedupRate * solution.size[i]);
    solution.ddMoCost.push(query.ddCost / months / query.dedupRate / totalGb);
    solution.totalCost.push(solution.ddMoCost[i]);
    solution.label.push(i+1);
  }

  solution.avgCost = calcAverage(solution.totalCost).toLocaleString('en-US', {minimumFractionDigits: 4});

  return solution;
}

const calcGrowthArray = function(size, growthRate, term) {
  const array = [size * 1.0];
  for (i = 0; i < term-1; i++) {
    array.push(array[i]*(1+growthRate/1200));
  }
  return array;
}

const calcAverage = function(array) {
  var sum = 0;
  for( var i = 0; i < array.length; i++ ){
    sum += array[i];
  }

  var avg = sum/array.length;
  return avg;
}

const getVirtustreamType = function(cost) {
  if (cost == 0.004167) {
    return "Standard Infrequent Access"
  }
  else if (cost == 0.008333) {
    return "Premium Infrequent Access"
  }
  else if(cost == 0.009831) {
    return "Standard"
  }
  else if (cost == 0.019336) {
    return "Premium"
  }
  return ""
}
