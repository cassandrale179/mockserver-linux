//------- LIBRARY TO INSTALL --------
const fs = require('fs');
const os = require('os');
const inquirer = require('inquirer');
const util = require('util');
const AutoComplete = require('prompt-autocompletion');
const readconfigModule = require('./readconfig.js');
const config = os.homedir() + "//.aws/config";
const exec = require('child_process').exec;
const write_promise = util.promisify(fs.writeFile);

//--------- LIST OF GLOBAL VARIABLES ------
var data = [];
var options = [];
var p  = "";

//--------- CAPTURE ARGUMENT ON CLI -------
if (process.argv.length >= 2){
    p = process.argv[2];
}

//--------- PARSING THE CONFIG AND CREDENTIAL FILE --------
readconfigModule.read_config().then(datacsv => {
    datacsv.forEach(profile => {
        if (profile.source) profile.source = profile.source.substring(0, profile.source.length -1);
        if (profile.source) data.push(profile.source);
        if (profile.target){
            var targetArray = profile.target.split(",");
            targetArray.forEach(target => {
                target = target.trim();
                data.push(target);
            });
        }
    });

    //----------- FILTER ARRAY ----------
    if (p){
        result = data.filter(word => word.toLowerCase().indexOf(p) != -1);
        data = result;
    }

    //----------- AUTOCOMPLETE FORM ----------
    var autocomplete = new AutoComplete({
      type: 'autocomplete',
      name: 'from',
      message: 'Select a profile: ',
      source: searchProfiles
    });



    autocomplete.run().then(function(answer) {
        if (os.platform == 'win32'){
          var command = 'set AWS_PROFILE=' + answer;
          write_promise('win.bat', command, 'utf8').then(success =>{
              console.log("Successfully set profile");
          });
        }
        else{
        var command = 'export AWS_PROFILE=' + answer;
      write_promise('tst', command, 'utf8').then(success => {
        console.log("Successful write to tst");
      });
        }
    });



    //----------- FUNCTION TO FILTER AND FIND PROFILE ----------
    function searchProfiles(answers, input) {
        return new Promise(function(resolve) {
          resolve(data.filter(filter(input)));
        });
    }
    function filter(input) {
        return function(state) {
          return new RegExp(input, 'i').exec(state) !== null;
        };
    }
}).catch(err => {
    console.log('[Error: ] Unable to read config file');
});
