const express = require('express');
const bodyParser = require('body-parser');

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
  const months = req.query.duration * 12;

  const solution = {};
  solution.size = calcGrowthArray(req.query.dataSet, req.query.growth, months);
  solution.label = [];
  solution.protectedCap = [];
  solution.ddMoCost = [];
  solution.totalCost = [];

  for (i = 0; i < months; i++) {
    const totalGb = solution.size[i] * 1024;

    solution.protectedCap.push(req.query.dedupRate * solution.size[i]);
    solution.ddMoCost.push(req.query.ddCost / months / req.query.dedupRate / totalGb);
    solution.totalCost.push(solution.ddMoCost[i]);

    solution.label.push(i+1);
  }

  solution.avgCost = calcAverage(solution.totalCost).toLocaleString('en-US', {minimumFractionDigits: 4});

  res.render('ddOutput', {ddMenu:true, query: req.query, url: req._parsedOriginalUrl, solution: solution})
})

app.get('/datadomain-ecs', (req, res) => {
  res.render('ddEcsInput', {ddEcsMenu: true, query: req.query, url: req._parsedOriginalUrl})
})

app.get('/datadomain-ecs/graph', (req, res) => {
  const months = req.query.duration * 12;

  const solution = {};
  solution.size = calcGrowthArray(req.query.dataSet, req.query.growth, months);
  solution.ddSize = calcGrowthArray(req.query.dataSet * (1 - (req.query.archive * 0.01)), req.query.growth, months);
  solution.ecsSize = calcGrowthArray(req.query.dataSet * (req.query.archive * 0.01), req.query.growth, months);
  solution.label = [];
  solution.protectedCap = [];
  solution.ddMoCost = [];
  solution.ecsMoCost = [];
  solution.totalCost = [];

  for (i = 0; i < months; i++) {
    const totalGb = solution.size[i] * 1024;
    const ddGb = solution.ddSize[i] * 1024;
    const ecsGb = solution.ecsSize[i] * 1024;

    solution.protectedCap.push(req.query.dedupRate * solution.size[i]);
    solution.ddMoCost.push(req.query.ddCost / months / req.query.dedupRate / ddGb);
    solution.ecsMoCost.push(req.query.ecsCost / months / req.query.dedupRate / ecsGb);
    solution.totalCost.push(solution.ddMoCost[i] + solution.ecsMoCost[i]);

    solution.label.push(i+1);
  }

  solution.avgCost = calcAverage(solution.totalCost).toLocaleString('en-US', {minimumFractionDigits: 4});

  res.render('ddEcsOutput', {ddEcsMenu: true, query: req.query, url: req._parsedOriginalUrl, solution: solution})
})


app.get('/datadomain-virtustream', (req, res) => {
  res.render('ddVirtustreamInput', {ddVirtustreamMenu: true, query: req.query, url: req._parsedOriginalUrl})
})

app.get('/datadomain-virtustream/graph', (req, res) => {
  const months = req.query.duration * 12;

  const solution = {};
  solution.size = calcGrowthArray(req.query.dataSet, req.query.growth, months);
  solution.ddSize = calcGrowthArray(req.query.dataSet * (1 - (req.query.archive * 0.01)), req.query.growth, months);
  solution.virtustreamSize = calcGrowthArray(req.query.dataSet * (req.query.archive * 0.01), req.query.growth, months);
  solution.label = [];
  solution.protectedCap = [];
  solution.ddMoCost = [];
  solution.cloudTierMoCost = [];
  solution.virtustreamMoCost = [];
  solution.virtustreamStorageType = getVirtustreamType(req.query.virtustreamCost);
  solution.totalCost = [];

  for (i = 0; i < months; i++) {
    const totalGb = solution.size[i] * 1024;
    const ddGb = solution.ddSize[i] * 1024;
    const virtustreamGb = solution.virtustreamSize[i] * 1024;

    solution.protectedCap.push(req.query.dedupRate * solution.size[i]);
    solution.ddMoCost.push(req.query.ddCost / months / req.query.dedupRate / ddGb);
    solution.cloudTierMoCost.push(req.query.cloudTierCost / months / req.query.dedupRate / virtustreamGb);
    solution.virtustreamMoCost.push(req.query.virtustreamCost * 1);
    solution.totalCost.push(solution.ddMoCost[i] + solution.cloudTierMoCost[i] + solution.virtustreamMoCost[i]);

    solution.label.push(i+1);
  }

  solution.avgCost = calcAverage(solution.totalCost).toLocaleString('en-US', {minimumFractionDigits: 4});

  res.render('ddVirtustreamOutput', {ddVirtustreamMenu: true, query: req.query, url: req._parsedOriginalUrl, solution: solution})
})


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
