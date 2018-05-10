//-------------- LIBRARY TO INSTALL ----------------
const program = require('commander');
const fs = require('fs');
const util = require('util');
const os = require('os');
const exec = util.promisify(require('child_process').exec);
const request = require('request');
const AWS = require('aws-sdk');
const tunnel = require('tunnel');
const url = 'http://169.254.169.254/latest/meta-data/iam/security-credentials/';
const http = require('http');
const snsqueueModule = require('./snsqueue.js');

//----------- TURN ON PROCESS TO CATCH UNHANDLED PROMISE ----------
process.on('unhandledRejection', (reason, p) => {console.log(p);});

//----- OPTIONS PARSING -------
program
    .version('0.1.0')
    .option('-v, --verbose', 'Verbose')
    .option('-s, --silent', 'Silent')
    .parse(process.argv);


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
			                data.target = p.target;
                            resolve(data);
                        }
                        else{
                            if (program.verbose)
                                console.error('[Error: ] JSON does not contain valid key' + data);
                            reject(data);
                            return;
                        }
                    }

                    //---------- UNABLE TO GET WITH GIVEN ROLE --------
                    else{
                        if (program.verbose)
                            console.error('[Error: ] Unable to get data with this role' + role);
                        snsqueueModule.getHostName('[Error: ] Unable to get data with this role ' + role);
                        reject(role);
                        return;
                    }
                });
            }
            else{
                let errormessage = '[Error: ] Unable to make a GET request to 169.254.169.254. The error code is ' + resposne.statusCode.toString() + 'and the response is ' + response;
                if (program.verbose){
                    console.error(errormessage);
                }
                snsqueueModule.getHostName(errormessage);
                reject(response);
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

        //---------- IF ACCESS KEY AND SECRET KEY DO NOT EXIST ------------
		if (acceskskey == undefined || secretkey == undefined){
            if (program.verbose){
                console.error("[Error: ] Access key or secret key are undefined for this json " + JSON.stringify(json));
            }
		    reject(json);
		}

        //---------- CHECK IF ACCESS KEY AND SECRET KEY EXIST ------------
        else if (accesskey && secretkey){
            var creds = {accessKeyId: accesskey, secretAccessKey: secretkey};
            if (token) creds.sessionToken= token;
            var sts = new AWS.STS(creds);

            //----------- GET DATA FROM STS --------
            sts.assumeRole(params, function(err, data) {
                if (err) console.error("[Error: ] User cannot assume this role", err);
                else {
                    if (data.Credentials){
                        data.Credentials.target = p.target;
                        resolve(data.Credentials);
                    }
                    else{
                        if (program.verbose)
                            console.error('[Error: ] Cannot get credentials with this roleArn ' + p.assume_role_arn);
                        snsqueueModule.getHostName('[Error: ] Cannot get credentials with this roleArn ' + p.assume_role_arn);
                        reject(params);
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
                    resolve(result);
		            return;
                }
                else{
                    if (program.verbose){
                        console.error("[Error: ] Execute failed to return JSON for this target" + p2);
                    }
                    reject(result);
		            return;
                }
            };
        };

            //------- EXTRACT THE TCWS URL FROM THE CREDENTIAL PROCESS -------
            var ind = p.credential_process.indexOf("tcws_url=");
            var url = p.credential_process.substring(ind+9, p.credential_process.length);
            var command = 'jwt.cmd "--tcws_url=' + url;
            exec(command)
            .then(localContextFunction(p))
            .catch(err => {
                let errorMessage = '[Error: ] Unable to execute the credential process associated with this credential ' + p.source;
                if (program.verbose) console.error(err);
                console.error(errorMessage);
                snsqueueModule.getHostName(errorMessage);
            });
        }

        //------- IF IT'S A CREDENTIAL SOURCE -------
        else if (p.hasOwnProperty("credential_source")){
            if (p.credential_source == 'Ec2InstanceMetadata')
                resolve(ec2instance(p));
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
            let unfoundprocess = '[Error: ] credential_source, source_profile or credential_process not found for ' + p;
            if (program.verbose)
                console.error(unfoundprocess);
            snsqueueModule.getHostName(unfoundprocess);
            reject(p);
            return;
        }
    });


    //------------ IF IT HAS AN ASSUME ROLE, CALLED CHECK FILE ROLE ---------
    promise.then(json => {
        return new Promise(function(resolve2, reject2){
            if (!json){
                console.error("[Error: ] Return value is undefined. Unable to get any secret key, access key or token with credential process or source profile ");
        	    reject2(json);
        	    return;
            }

        	//----------- CONVERT JSON IN CASE IT'S NOT AN OBJECT ---------
        	if (typeof json == 'string'){
            	try{json =  JSON.parse(json);}
            	catch(err){reject2 (err);}
            }

        	//------------- IF USER IS UNAUTHORIZED TO GET DATA ----------
        	if (json.hasOwnProperty('SecretAccessKey')== false){
                if (program.verbose){
                    console.error('[Error: ] No key received for this json ' + JSON.stringify(json));
                }
                snsqueueModule.getHostName('[Error: ] You do not have access to this profile' + args[0]);
        	    reject2(json);
        	    return;
        	}

    	//------------- IF THERE ARE ASSUME ROLE ------------
            if (args[0].assume_role_arn && json) return checkFileRole(args[0], json);
            else return (json);
    	});
    }).catch(err => {
        if (program.verbose){
            console.error("Error", err);
        }
        reject(err);
    });
    return promise;
}
exports.getJSON = getJSON;
