/*jshint maxerr: 10000 */
'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    errorHandler = require('./errors.server.controller'),
    Event = mongoose.model('Event'),
    Testrun = mongoose.model('Testrun'),
    Dashboard = mongoose.model('Dashboard'),
    Product = mongoose.model('Product'),
    _ = require('lodash'),
    graphite = require('./graphite.server.controller'),
    Utils = require('./utils.server.controller'),
    Requirements = require('./testruns.requirements.server.controller'),
    Benchmarks = require('./testruns.benchmarks.server.controller'),
    Metric = mongoose.model('Metric'),
    async = require('async');


exports.benchmarkAndPersistTestRunById = benchmarkAndPersistTestRunById;
exports.testRunsForDashboard = testRunsForDashboard;
exports.testRunsForProduct = testRunsForProduct;
exports.deleteTestRunById = deleteTestRunById;
exports.testRunById = testRunById;
exports.refreshTestrun = refreshTestrun;
exports.updateTestrunsResults = updateTestrunsResults;
//exports.saveTestRunAfterBenchmark = saveTestRunAfterBenchmark;
exports.updateAllDashboardTestRuns = updateAllDashboardTestRuns;
exports.updateAllProductTestRuns = updateAllProductTestRuns;
exports.recentTestRuns = recentTestRuns;
exports.update = update;
exports.addTestRun = addTestRun;

function addTestRun(req, res){

  let testRun = new Testrun(req.body);

  testRun.save(function(err, testRun){

    if (err) {
      return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
    } else {

      benchmarkAndPersistTestRunById(testRun)
      .then(function(testRun){
        res.jsonp(testRun);
      });
    }

  });
}

/**
 * Update a Dashboard
 */
function update (req, res) {
  let testRun = new Testrun(req.body);

  Testrun.update({$and:[
    {productName: req.body.productName},
    {dashboardName: req.body.dashboardName},
    {testRunId: req.body.testRunId}
  ]}, testRun, function (err, testRun) {
    if (err) {
      return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
    } else {
      res.jsonp(testRun);
    }
  });
};


function recentTestRuns(req, res){

  /* Get all test runs from the last 24 hours*/
  var pastDay = new Date() - 1000 * 60 * 60 * 24;

  Testrun.find({end: {$gte: pastDay}}).exec(function (err, testRuns) {

    _.each(testRuns, function(testRun, i){

      testRuns[i].humanReadableDuration = humanReadbleDuration(testRun.end.getTime() - testRun.start.getTime());

    });

      res.jsonp(testRuns);


  });
}



function updateTestrunsResults(req, res) {
  Testrun.find({
    $and: [
      { productName: req.params.productName },
      { dashboardName: req.params.dashboardName }
    ]
  }).exec(function (err, testRuns) {
    if (err) {
      console.log(err);
    } else {
      async.forEachLimit(testRuns, 1, function (testRun, callback) {
          updateMetricInTestrun(req.params.metricId, testRun)
          .then(function(testRun){
            if (req.params.updateRequirements === 'true'){
              Requirements.updateRequirementResults(testRun)
              .then(function (requirementsTestRun){
                if(req.params.updateBenchmarks === 'true'){
                  Benchmarks.updateBenchmarkResults(requirementsTestRun)
                  .then(function(){
                    callback();
                  });
                }else{

                  callback();
                }

              });
            }else{

              if(req.params.updateBenchmarks === 'true'){
                Benchmarks.updateBenchmarkResults(testRun)
                .then(function(){
                  callback();
                });
              }
            }
          });


      }, function (err) {
        if (err)
          console.log(err);
        /* return updated test runs */

        Testrun.find({
          $and: [
            { productName: req.params.productName },
            { dashboardName: req.params.dashboardName }
          ]
        }).exec(function (err, testRuns) {
          if (err) {
            console.log(err);
          } else {
            res.json(testRuns);
          }
        });
      });
    }
  });
}
function  updateMetricInTestrun(metricId, testRun) {

  return new Promise((resolve, reject) => {

      var updatedMetrics = [];
      Metric.findOne({ _id: metricId }).exec(function (err, dashboardMetric) {
        if (err)
          console.log(err);
        _.each(testRun.metrics, function (testrunMetric) {
          if (testrunMetric.alias === dashboardMetric.alias) {
            testrunMetric.requirementOperator = dashboardMetric.requirementOperator;
            testrunMetric.requirementValue = dashboardMetric.requirementValue;
            testrunMetric.benchmarkOperator = dashboardMetric.benchmarkOperator;
            testrunMetric.benchmarkValue = dashboardMetric.benchmarkValue;
          }
          updatedMetrics.push(testrunMetric);
        });
        /* Save updated test run */

        Testrun.findOneAndUpdate({
              $and: [
                {productName: testRun.productName},
                {dashboardName: testRun.dashboardName},
                {testRunId: testRun.testRunId}
              ]
            }, {metrics: updatedMetrics}
            , {upsert: true}, function (err, savedTestRun) {
              if (err) {
                reject(err);
              } else {
                resolve(savedTestRun);
              }

            });


      });
  });
}
function deleteTestRunById(req, res) {
  Testrun.findOne({
    $and: [
      { productName: req.params.productName },
      { dashboardName: req.params.dashboardName },
      { testRunId: req.params.testRunId }
    ]
  }).sort('-end').exec(function (err, testRun) {
    if (err) {
      return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
    } else {
      if (testRun) {
        testRun.remove(function (err) {
          if (err) {
            return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
          }
        });
      }
    }
  });
}
/**
 * select test runs for product
 */
function testRunsForProduct(req, res) {
  Testrun.find({productName: req.params.productName}).sort({eventTimestamp: 1}).exec(function (err, testRuns) {
    if (err) {
      return res.status(400).send({message: errorHandler.getErrorMessage(err)});
    } else {

      _.each(testRuns, function(testRun, i){

        testRuns[i].humanReadableDuration = humanReadbleDuration(testRun.end.getTime() - testRun.start.getTime());

      });

      res.jsonp(testRuns);

    }
  });
}

  function createTestRunSummaryFromEvents(events, callback) {
    var testRuns = [];
    for (var i = 0; i < events.length; i++) {
      if (events[i].eventDescription === 'start') {
        for (var j = 0; j < events.length; j++) {
          if (events[j].eventDescription === 'end' && events[j].testRunId == events[i].testRunId) {
            testRuns.push({
              start: events[i].eventTimestamp,
              startEpoch: events[i].eventTimestamp.getTime(),
              end: events[j].eventTimestamp,
              endEpoch: events[j].eventTimestamp.getTime(),
              productName: events[i].productName,
              dashboardName: events[i].dashboardName,
              testRunId: events[i].testRunId,
              humanReadbleDuration: humanReadbleDuration(events[j].eventTimestamp.getTime() - events[i].eventTimestamp.getTime()),
              duration: events[j].eventTimestamp.getTime() - events[i].eventTimestamp.getTime()
            });

            break;
          }
        }
      }
    }

    callback(testRuns);
  }

  function humanReadbleDuration(durationInMs){

    var date = new Date(durationInMs);
    var readableDate = '';
    if(date.getUTCDate()-1 > 0) readableDate += date.getUTCDate()-1 + " days, ";
    if(date.getUTCHours() > 0) readableDate += date.getUTCHours() + " hours, ";
    readableDate += date.getUTCMinutes() + " minutes";
    return readableDate;
  }
/**
 * select test runs for dashboard
 */
function testRunsForDashboard(req, res) {
  Testrun.find({
    $and: [
      { productName: req.params.productName },
      { dashboardName: req.params.dashboardName }
    ]
  }).sort('-end').exec(function (err, testRuns) {
    if (err) {
      return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
    } else {

      _.each(testRuns, function(testRun, i){

        testRuns[i].humanReadableDuration = humanReadbleDuration(testRun.end.getTime() - testRun.start.getTime());

      });

      res.jsonp(testRuns);

    }
  });
  function persistTestrunsFromEvents(testRuns, testRunsFromEvents, callback) {
    var persistedTestRuns = [];
    var testRunsToBePersisted = [];
    var testRunsToBenchmark = [];
    _.each(testRunsFromEvents, function (testRunFromEvents) {
      var exists = false;
      _.each(testRuns, function (testRun) {
        if (testRun.testRunId === testRunFromEvents.testRunId) {
          exists = true;
          persistedTestRuns.push(testRun);
          return exists;
        }
      });
      if (exists === false) {
        testRunsToBePersisted.push(testRunFromEvents);
      }
    });
    async.forEachLimit(testRunsToBePersisted, 16, function (testRun, callback) {
      getDataForTestrun(testRun.productName, testRun.dashboardName, testRun, function (metrics) {
        saveTestrun(testRun, metrics, function (savedTestrun) {
          console.log('test run saved: ' + savedTestrun.testRunId);
          testRunsToBenchmark.push(savedTestrun);
          callback();
        });
      });
    }, function (err) {
      if (err)
        return next(err);
      testRunsToBenchmark.sort(Utils.dynamicSort('-start'));
      async.forEachLimit(testRunsToBenchmark, 1, function (testRun, callback) {
        Requirements.setRequirementResultsForTestRun(testRun, function (requirementsTestrun) {
          if (requirementsTestrun)
            console.log('Requirements set for: ' + requirementsTestrun.productName + '-' + requirementsTestrun.dashboardName + 'testrunId: ' + requirementsTestrun.testRunId);
          Benchmarks.setBenchmarkResultsPreviousBuildForTestRun(requirementsTestrun, function (benchmarkPreviousBuildTestrun) {
            if (benchmarkPreviousBuildTestrun)
              console.log('Benchmark previous build done for: ' + benchmarkPreviousBuildTestrun.productName + '-' + benchmarkPreviousBuildTestrun.dashboardName + 'testrunId: ' + benchmarkPreviousBuildTestrun.testRunId);
            Benchmarks.setBenchmarkResultsFixedBaselineForTestRun(benchmarkPreviousBuildTestrun, function (benchmarkFixedBaselineTestrun) {
              if (benchmarkFixedBaselineTestrun)
                console.log('Benchmark fixed baseline done for: ' + benchmarkFixedBaselineTestrun.productName + '-' + benchmarkFixedBaselineTestrun.dashboardName + 'testrunId: ' + benchmarkFixedBaselineTestrun.testRunId);
              benchmarkFixedBaselineTestrun.save(function (err) {
                if (err) {
                  console.log(err);
                  callback(err);
                } else {
                  persistedTestRuns.push(benchmarkFixedBaselineTestrun);
                  callback();
                }
              });
            });
          });
        });
      }, function (err) {
        if (err)
          console.log(err);
        callback(persistedTestRuns);
      });
    });
  }
}
function testRunById(req, res) {
  Testrun.findOne({
    $and: [
      { productName: req.params.productName },
      { dashboardName: req.params.dashboardName },
      { testRunId: req.params.testRunId }
    ]
  }).sort('-end').exec(function (err, testRun) {
    if (err) {
      return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
    } else {
      if (testRun) {
        var testRunEpoch = testRun.toObject();
        testRunEpoch.startEpoch = testRun.startEpoch;
        testRunEpoch.endEpoch = testRun.endEpoch;
        //res.setHeader('Last-Modified', (new Date()).toUTCString()); //to prevent http 304's
        res.jsonp(testRunEpoch);
      } else {
        return res.status(404).send({ message: 'No test run with id ' + req.params.testRunId + 'has been found for this dashboard' });
      }
    }
  });
}
function refreshTestrun(req, res) {
  Testrun.findOne({
    $and: [
      { productName: req.params.productName },
      { dashboardName: req.params.dashboardName },
      { testRunId: req.params.testRunId }
    ]
  }).exec(function (err, testRun) {
    if (err)
      console.log(err);
    benchmarkAndPersistTestRunById(testRun)
    .then(function(updatedTestRun){
      res.jsonp(updatedTestRun);
    });


  });
}
exports.getTestRunById = function (productName, dashboardName, testRunId, callback) {
  Testrun.findOne({
    $and: [
      { productName: productName },
      { dashboardName: dashboardName },
      { testRunId: testRunId }
    ]
  }).sort('-end').exec(function (err, testRun) {
    if (err) {
      return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
    } else {
      if (testRun) {
        callback(testRun);
      } else {
        Event.find({
          $and: [
            { productName: productName },
            { dashboardName: dashboardName },
            { testRunId: testRunId }
          ]
        }).sort('-end').exec(function (err, events) {
          if (err) {
            return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
          } else {
            if (events.length > 0) {
              createTestrunFromEvents(productName, dashboardName, events, function(testRun){
                benchmarkAndPersistTestRunById(productName, dashboardName, testRun[0], function(persistedTestRun){
                  callback(persistedTestRun);
                });
              });
            } else {
              callback(null);
            }
          }
        });
      }
    }
  });
};

let removeAndSaveTestRun = function(testRun){

  return new Promise((resolve, reject) => {

    Testrun.findOneAndUpdate({$and:[
      {productName: testRun.productName},
      {dashboardName: testRun.dashboardName},
      {testRunId: testRun.testRunId}
    ]}, {metrics: testRun.metrics,
        meetsRequirement: testRun.meetsRequirement,
        benchmarkResultFixedOK: testRun.benchmarkResultFixedOK,
        benchmarkResultPreviousOK: testRun.benchmarkResultPreviousOK,
        baseline: testRun.baseline,
        previousBuild: testRun.previousBuild}
        , {upsert:true}, function(err, savedTestRun){
      if (err) {
        reject(err);
      } else {

        resolve(savedTestRun);
      }

    });
 });
}

function benchmarkAndPersistTestRunById(testRun) {

  return new Promise((resolve, reject) => {

    flushMemcachedForTestRun(testRun)
    .then(getDataForTestrun)
    .then(Requirements.setRequirementResultsForTestRun)
    .then(Benchmarks.setBenchmarkResultsPreviousBuildForTestRun)
    .then(Benchmarks.setBenchmarkResultsFixedBaselineForTestRun)
    .then(removeAndSaveTestRun)
    .then(function(completedTestrun){
      resolve(completedTestrun);
    })
    .catch(testRunErrorHandler);
  });
}

let testRunErrorHandler = function(err){

  console.log('Error in test run chain: ' + err.stack);
}


function flushMemcachedForTestRun(testRun, callback){

  return new Promise((resolve, reject) => {

    Product.findOne({ name: testRun.productName}).exec(function(err, product){

    if(err){
      reject(err);
    }else{

      Dashboard.findOne({$and:[{name: testRun.dashboardName}, {productId: product._id}]})
          .populate({path: 'metrics', options: { sort: { tag: 1, alias: 1 } } })
          .exec(function (err, dashboard) {
            if (err){
              reject(err);
            }else{

              _.each(dashboard.toObject().metrics, function(metric){

                _.each(metric.targets, function(target){

                  graphite.flushMemcachedKey(graphite.createMemcachedKey(Math.round(testRun.start / 1000), Math.round(testRun.end / 1000), target), function(){

                    });
                });

              });

            resolve(testRun);
            }

      });

      }
    });
  })

}


function getDataForTestrun(testRun) {

  return new Promise((resolve, reject) => {

    Product.findOne({ name: testRun.productName }).exec(function (err, product) {
    if (err)
      console.log(err);
    Dashboard.findOne({
      $and: [
        { productId: product._id },
        { name: testRun.dashboardName }
      ]
    }).populate('metrics').exec(function (err, dashboard) {
      if (err)
        console.log(err);
      var metrics = [];
      async.forEachLimit(dashboard.metrics, 16, function (metric, callbackMetric) {
        let targets = [];
        let value;
        async.forEachLimit(metric.targets, 16, function (target, callbackTarget) {
          graphite.getGraphiteData(Math.round(testRun.start / 1000), Math.round(testRun.end / 1000), target, 900, function (body) {
            _.each(body, function (bodyTarget) {

              value = calculateAverage(bodyTarget.datapoints);
              /* if target has values other than null values only, store it */
              if(value !== null) {
                targets.push({
                  target: bodyTarget.target,
                  value: value
                });
              }
            });
            callbackTarget();
        });
        }, function (err) {
          if (err)
            return next(err);
          if(targets.length > 0) {
            metrics.push({
              _id: metric._id,
              tags: metric.tags,
              alias: metric.alias,
              type: metric.type,
              benchmarkValue: metric.benchmarkValue,
              benchmarkOperator: metric.benchmarkOperator,
              requirementValue: metric.requirementValue,
              requirementOperator: metric.requirementOperator,
              targets: targets
            });

            targets = [];
          }

          callbackMetric();
        });
      }, function (err) {
        if (err) {
          reject(err);
        }else {
          /* save metrics to test run */

          Testrun.findOne({
            $and: [
              {productName: testRun.productName},
              {dashboardName: testRun.dashboardName},
              {testRunId: testRun.testRunId}
            ]
          }).exec(function (err, testRunToUpdate) {
            if (err) {
              reject(err);
            } else {

              console.log('Retrieved data for:' + testRunToUpdate.productName + '-' + testRunToUpdate.dashboardName + 'testrunId: ' + testRunToUpdate.testRunId);

              testRunToUpdate.metrics = metrics;


              testRunToUpdate.save(function(err, savedTestrun){

                if (err) {
                  reject(err);
                } else {

                  resolve(savedTestrun);

                }

              });
            }
          });
        }
      });
    });
  });
 });
}
function calculateAverage(datapoints) {
  var count = 0;
  var total = 0;

  _.each(datapoints, function (datapoint) {
    if (datapoint[0] !== null) {
      count++;
      total += datapoint[0];
    }
  });
  if (count > 0)
    return Math.round(total / count * 100) / 100;
  else
    return null;
}

function TempSaveTestruns(testruns,  callback) {

  var savedTesruns = [];

  _.each(testruns, function(testrun){
  var persistTestrun = new Testrun();
    persistTestrun.productName = testrun.productName;
    persistTestrun.dashboardName = testrun.dashboardName;
    persistTestrun.testRunId = testrun.testRunId;
    persistTestrun.start = testrun.start;
    persistTestrun.end = testrun.end;
    persistTestrun.eventIds = testrun.eventIds;
    persistTestrun.buildResultKey = testrun.buildResultKey;

    savedTesruns.push(persistTestrun);

    persistTestrun.save(function (err) {
      if (err) {
        console.log(err);
        callback(err);
      } else {
        //callback(persistTestrun);
      }
    });
  });

  setTimeout(function(){

    callback(savedTesruns);
  },500);
}

function saveTestrun(testrun, metrics, callback) {
  getPreviousBuild(testrun.productName, testrun.dashboardName, testrun.testRunId, function (previousBuild) {
    var persistTestrun = new Testrun();
    persistTestrun.productName = testrun.productName;
    persistTestrun.dashboardName = testrun.dashboardName;
    persistTestrun.testRunId = testrun.testRunId;
    persistTestrun.start = testrun.start;
    persistTestrun.end = testrun.end;
    persistTestrun.baseline = testrun.baseline;
    persistTestrun.previousBuild = previousBuild;
    persistTestrun.buildResultKey = testrun.buildResultKey;
    persistTestrun.eventIds = testrun.eventIds;
    persistTestrun.metrics = metrics;
    persistTestrun.save(function (err) {
      if (err) {
        console.log(err);
        callback(err);
      } else {
        callback(persistTestrun);
      }
    });
  });
}
function getPreviousBuild(productName, dashboardName, testrunId, callback) {
  var previousBuild;
  Event.find({
    $and: [
      { productName: productName },
      { dashboardName: dashboardName }
    ]
  }).sort({ eventTimestamp: -1 }).exec(function (err, events) {
    if (err) {
      return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
    } else {
      createTestrunFromEvents(productName, dashboardName, events, function (testruns) {
        _.each(testruns, function (testrun, i) {
          if (testrun.testRunId === testrunId) {
            if (i + 1 === testruns.length) {
              return null;
            } else {
              previousBuild = testruns[i + 1].testRunId;
              return previousBuild;
            }
          }
        });
        callback(previousBuild);
      });
    }
  });
}
function createTestrunFromEvents(productName, dashboardName, events, callback) {
  var testRuns = [];
  var baseline;
  var dashboardBaseline;
  Product.findOne({ name: productName }).exec(function (err, product) {
    if (err)
      console.log(err);
    Dashboard.findOne({
      $and: [
        { productId: product._id },
        { name: dashboardName }
      ]
    }).exec(function (err, dashboard) {
      if (err) {
        console.log(err);
      } else {
        dashboardBaseline = dashboard.baseline ? dashboard.baseline : baseline;
        for (var i = 0; i < events.length; i++) {
          if (events[i].eventDescription === 'start') {
            for (var j = 0; j < events.length; j++) {
              if (events[j].eventDescription === 'end' && events[j].testRunId == events[i].testRunId) {
                /* If no baseline has been set for this dashboard, set the first test run as baseline*/
                if (!dashboardBaseline && !baseline) {
                  baseline = events[i].testRunId;
                  dashboardBaseline = events[i].testRunId;
                } else {
                  baseline = dashboardBaseline;
                }
                if (events[i].buildResultKey) {
                  testRuns.push({
                    start: events[i].eventTimestamp,
                    startEpoch: events[i].eventTimestamp.getTime(),
                    end: events[j].eventTimestamp,
                    endEpoch: events[j].eventTimestamp.getTime(),
                    productName: events[i].productName,
                    dashboardName: events[i].dashboardName,
                    testRunId: events[i].testRunId,
                    buildResultKey: events[i].buildResultKey,
                    eventIds: [
                      events[i].id,
                      events[j].id
                    ],
                    //meetsRequirement: null,
                    //benchmarkResultFixedOK: null,
                    //benchmarkResultPreviousOK: null,
                    baseline: baseline
                  });
                } else {
                  testRuns.push({
                    start: events[i].eventTimestamp,
                    startEpoch: events[i].eventTimestamp.getTime(),
                    end: events[j].eventTimestamp,
                    endEpoch: events[j].eventTimestamp.getTime(),
                    productName: events[i].productName,
                    dashboardName: events[i].dashboardName,
                    testRunId: events[i].testRunId,
                    eventIds: [
                      events[i].id,
                      events[j].id
                    ],
                    //meetsRequirement: null,
                    //benchmarkResultFixedOK: null,
                    //benchmarkResultPreviousOK: null,
                    baseline: baseline
                  });
                }
                break;
              }
            }
          }
        }
        /* If no baseline has been set for this dashboard, set the first test run as baseline*/
        if (!dashboard.baseline && testRuns) {
          dashboard.baseline = dashboardBaseline;
          dashboard.save(function (err) {
            if (err) {
              console.log(err);
            } else {
              callback(testRuns);
            }
          });
        } else {
          callback(testRuns);
        }
      }
    });
  });
}
function updateAllDashboardTestRuns(req, res){

  var regExpDashboardName = new RegExp(req.params.oldDashboardName, 'igm');

  Testrun.find({
    $and: [
      { productName: req.params.oldProductName },
      { dashboardName: req.params.oldDashboardName }
    ]}).exec(function(err, testruns){
    if (err) {
      return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
    } else {

      _.each(testruns, function(testrun){


        testrun.dashboardName = req.params.newDashboardName;
        testrun.testRunId = testrun.testRunId.replace(regExpDashboardName, req.params.newDashboardName);

        testrun.save(function (err) {
          if (err) {
            return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
          } else {
            //res.jsonp(testrun);
          }
        });
      });

      res.jsonp(testruns);
    }



  });
}

function updateAllProductTestRuns(req, res){

  var regExpProductName = new RegExp(req.params.oldProductName, 'igm');

  Testrun.find({productName: req.params.oldProductName}).exec(function(err, testruns){
    if (err) {
      return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
    } else {

      _.each(testruns, function(testrun){


        testrun.productName = req.params.newProductName;
        testrun.testRunId = testrun.testRunId.replace(regExpProductName,req.params.newProductName);

        testrun.save(function (err) {
          if (err) {
            return res.status(400).send({ message: errorHandler.getErrorMessage(err) });
          } else {
            //res.jsonp(testrun);
          }
        });
      });

      res.jsonp(testruns);
    }
  });
}
