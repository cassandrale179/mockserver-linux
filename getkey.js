const fs = require('fs');
const util = require('util');
const os = require('os');
const exec = util.promisify(require('child_process').exec);
const request = require('request');
const AWS = require('aws-sdk');
const tunnel = require('tunnel');
const url = 'http://169.254.169.254/latest/meta-data/iam/security-credentials/';
const http = require('http');

process.on('unhandledRejection', (reason, p) => {console.log(p);});

//--------------- FIX AWS PATH -------------
var AWSPath = "";
if (process.platform == 'win32')
    AWSPath = os.homedir() + "\\.aws\\TempCredScript.js --tcws_url=";
else AWSPath = os.homedir() + "/.aws/TempCredScript.js --tcws_url=";


//---------- get instance metadata ------
function ec2instance(p){
    return new Promise((resolve, reject) => {
        request({'url':url,'proxy':'http://169.254.169.254/'},
        function (error, response, body) {

            //------- IF STATUS IS GOOD, DISPLAY ROLE --------
            if (!error && response.statusCode == 200) {
                var role = body;
                var roleURL = url + role;

                //---------- GET DATA WITH GIVEN ROLE --------
                request({'url':roleURL, 'proxy':'http://169.254.169.254/'},
                function (error2, response2, body2){
                    if (!error && response2.statusCode == 200){
                        var data = JSON.parse(body2);
                        if (data.AccessKeyId && data.SecretAccessKey){
                            console.log("Successfully get JSON data");
                            resolve(data);
                        }
                        else{
                            reject("[Error: ] JSON doesn't contain valid key" + data);
                            return;
                        }
                    }
                    else{
                        reject("[Error: ] Unable to get data with this role " + role);
                        return;
                    }
                });
            }
            else{
                reject("[Error: ] Unable to get data" + body, response);
                return;
            }
        });
    });
}

//-------  GET ASSUME ROLE INFORMATION ------
function checkFileRole(p, json){
    return new Promise((resolve, reject) => {

        //---------- CREATE PARAMETER ----------
        if (p.role_session_name == '')
            p.role_session_name = os.hostname();
        var accesskey = json.AccessKeyId;
        var secretkey = json.SecretAccessKey;
        var token = json.SessionToken;
        var params = {
            RoleArn: p.assume_role_arn,
            RoleSessionName: p.role_session_name
        };

        //---------- CHECK IF ACCESS KEY AND SECRET KEY EXIST ------------
		if (acceskskey == undefined || secretkey == undefined){
		    reject("ACCESS KEY IS UNDEFINED FOR THIS JSON" + JSON.stringify(json));
		}
        else if (accesskey && secretkey){
            var creds = {accessKeyId: accesskey, secretAccessKey: secretkey};
            if (token) creds.sessionToken= token;
            var sts = new AWS.STS(creds);

            //----------- GET DATA FROM STS --------
            sts.assumeRole(params, function(err, data) {
                if (err) console.log("[Error: ] User cannot assume this role", err);
                else {
                    if (data.Credentials){
                        data.Credentials.target = p.target;
                        console.log("Data credentials", data.Credentials);
                        resolve(data.Credentials);
                    }
                    else{
                        reject("Unable to Assume Role ", params);
                    }
                }
            });
        }
    });
}



//----------- GET JSON FILE -----------
function getJSON(args){

    var promise = new Promise((resolve, reject ) => {
        p = args[0]; datacsv = args[1];

        //------- IF IT'S A CREDENTIAL PROCESS -------
        if (p.hasOwnProperty("credential_process")){
            var localContextFunction = function(p2){ return function (output) {
                var stdout = output.stdout;
                var stderr = output.stderr;
		        var result = JSON.parse(stdout);
                if (result){
                    if (typeof result == 'string') result = JSON.parse(result);
                    result.target = p2.target;
		            console.log("Result of credential process", result);
                    resolve(result);
		            return;
                }
                else{
                    reject("Execute failed to return JSON ", p2.credential_process, result);
		            return;
                }
            };
        };

            var ind = p.credential_process.indexOf("tcws_url=");
            var url = p.credential_process.substring(ind+9, p.credential_process.length);
            var command = "node " + AWSPath + url;
            exec(command).then(localContextFunction(p));
        }

        //------- IF IT'S A CREDENTIAL SOURCE -------
        else if (p.hasOwnProperty("credential_source")){
            if (p.credential_source == 'Ec2InstanceMetadata')
                return ec2instance(p);
        }

        //-------- IF IT'S A SOURCE PROFILE --------
        else if (p.hasOwnProperty("source_profile")){
            datacsv.forEach(parent => {
                if (parent.source == p.source_profile){
                    return getJSON([parent, datacsv]);
                }
            });
        }

        else{
	    // this shouldn't happen here.... Catch it at parsing, not in processor.
	    reject("credential_source, source_profile or credential_process not found for "+p);
	    return;
        }
    });


    //------------ IF IT HAS AN ASSUME ROLE, CALLED CHECK FILE ROLE ---------
    promise.then(json => {
        return new Promise(function(resolve2, reject2){
        if (!json){
    	    reject2("JSON IS UNDEFINED");
    	    return;
        }

    	//----------- CONVERT JSON IN CASE IT'S NOT AN OBJECT ---------
    	if (typeof json == 'string'){
        	try{json =  JSON.parse(json);}
        	catch(err){reject2 (err)}
        }

    	//------------- IF USER IS UNAUTHORIZED TO GET DATA ----------
    	if (json.hasOwnProperty('SecretAccessKey')== false){
    	    reject2("NO KEY RECEIVED, json is " + JSON.stringify(json));
    	    return;
    	}

    	//------------- IF THERE ARE ASSUME ROLE ------------
        if (args[0].assume_role_arn && json){
            console.log("ASSUME ROLE AND JSON ARE VALID TO MAKE CALL", json);
            return checkFileRole(args[0], json);
        }
        else return (json);
    	});
    }).catch(err => {
    	console.log("Error", err);
    });
    return promise;
}
exports.getJSON = getJSON;
