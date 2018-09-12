"use strict";

const path = require("path");

function areUnitTestFilesPresent(files, repoUrl) {
  const testRegexFile = /\.?test\.?/
  
  return files
    .map(file => file.blob_url)
    .map(url => path.dirname(url))
    .map(url => url.substring(repoUrl.length))
    .some(url => (url.includes("spec") || url.includes("cypress") || url.match(testRegexFile)));
}

function areNotExcludedFilesPresent(file, excludedFilesArray){
    var arrKeys = excludedFilesArray.length;
    var match = false;
    var patt;
    for(var i = 0; i < arrKeys; i++ ){
        patt=new RegExp(excludedFilesArray[i]);
        if(patt.test(file))
           match = true;
    }
    return match;
}

function isNoTestsLabelPresent(label, labelsArray){
    var arrKeys = labelsArray.length;
    var match = false;
    var patt;
    for(var i = 0; i < arrKeys; i++ ){
        patt=new RegExp(labelsArray[i].name);
        if(patt.test(label))
           match = true;
    }
    return match;
}

async function autoLabel(context) {
  const config = await context.config('no-tests-label-app-config.yml')
  const label = "no tests"
  let exclude
  
  for (const property in config) {
    exclude = config[property]
  }

  const { data: allFiles } = await context.github.pullRequests.getFiles(context.issue());
  const issue = await context.github.issues.get(context.issue()).then(res => res.data);
  
  var booleanArray = [];
  
  return Promise.all(allFiles.map(async file => {
    var booleanMatch = areNotExcludedFilesPresent(file.filename, exclude)
    booleanArray.push(booleanMatch)
    
    var result = true;
    for (var i = 0; i < booleanArray.length; i++) {
      result = result && booleanArray[i]
    }

    if (!areUnitTestFilesPresent(allFiles, context.payload.repository.html_url)) {
      if (!result) {
          await context.github.issues.addLabels(context.issue({ labels: [label] }));
          console.log('no tests')
        } else if (isNoTestsLabelPresent(label, issue.labels)) {
          await context.github.issues.removeLabel(context.issue({ name: label }));
          console.log('tests added')
        } else {
          console.log('file is excluded')
        }
    } else if (isNoTestsLabelPresent(label, issue.labels)) {
      await context.github.issues.removeLabel(context.issue({ name: label }));
      console.log('tests added')
    } else {
      console.log('tests are present')
    }
  }))  
}

module.exports = robot => {
  robot.on('pull_request.opened', autoLabel)
  robot.on('pull_request.reopened', autoLabel)
  robot.on("pull_request.synchronize", autoLabel);
}
