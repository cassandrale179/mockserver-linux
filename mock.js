//------ EXPORT FUNCTION -------
module.exports = mock;

//------- LIBRARY TO INSTALL --------
const program = require('commander');
const fs = require('fs');
const util = require('util');
const tunnel = require('tunnel');
const moment = require('moment');
const AWS = require('aws-sdk');
const os = require('os');
const { URL } = require('url');
const config = os.homedir() + "//.aws/config";
const read_promise = util.promisify(fs.readFile);
const write_promise = util.promisify(fs.writeFile);

//------- LIST OF MODULES ------
const readconfigModule = require('./readconfig.js');
const getkeyModule = require('./getkey.js');
const writecredModule = require('./writecred.js');
const snsqueueModule = require('./snsqueue.js');

//----- OPTIONS PARSING -------
program
    .version('0.1.0')
    .option('-v, --verbose', 'Verbose')
    .option('-s, --silent', 'Silent')
    .parse(process.argv);


//------ GLOBAL VARIABLES -----
var timeouts = [];

//------ CHECK FOR UNHANDLED REJECTION PROMISE --------
process.on("unhandledRejection", (reason,p) => { console.log(p);});

//------ MOCK FUNCTION BEGIN HERE --------
function mock(){

    //------- BUILD A TUNNEL FOR THE PORT --------------
    if (process.env.http_proxy != undefined){
        var proxy = new URL(process.env.http_proxy);
        var tunnelingAgent = tunnel.httpsOverHttp({
            proxy: {
                host: proxy.hostname,
                port: proxy.port
            }
        });
        AWS.config.httpOptions = { agent: tunnelingAgent };
        callConfig();
    }
    else{
        if (program.verbose)
            console.error("[Error: ] The proxy is not defined. For Windows machine, please set HTTP_PROXY to BMS server. If you are running this on Unix machine, please set http_proxy to BMS server");
    }



    //------- HAVE A WATCH FUNCTION THAT MONITOR CHANGE ----
    fs.watchFile(config, (curr, prev) => {
      if (prev.mtime) callConfig();
    });


    //------- GET PROFILE FROM CONFIG FILE -----
    function callConfig(){
        readconfigModule.read_config().then(datacsv => {
            if (datacsv.length <= 0)
                console.log('[Warning:] Your config file is empty');


            //-------- WHEN CONFIG IS MODIFIED, MODIFY TIMEOUT -----
            var timeoutTarget = timeouts.map(x => x.target);
            var datacsvTarget = datacsv.map(x => x.target);

            //------- IF USER REMOVE A PROFILE ON CONFIG --------
            timeouts = timeouts.filter(x => {
                if (!datacsvTarget.includes(x.target))
                    clearTimeout(x.timeout);
                return datacsvTarget.includes(x.target);
            });


            //------ IF USER ADD A NEW PROFILE ON CONFIG ------
            datacsv.forEach(p => {
                if (!timeoutTarget.includes(p.target)){
                    if (p.target != undefined){
                        timeouts.push({
                            target: p.target,
                            setTimeout: setTimeout(Processor, 0, [p, datacsv])
                        });
                    }
                }
            });
        }).catch(err => {
            if (program.verbose)
                console.log('[Error: ] Unable to read your configuration file. Either the file does not exist or it is empty');
            reject(err);
        });
    }

    //----- WRITE TO CRED FILE -----
    async function execute(args){
        writecredModule.writeFile(args);
    }

    function Processor(args){
        var localargs = args;
        return getkeyModule.getJSON(localargs).then(async function (retVal){
        	if (typeof retVal == 'string'){
                try{ retVal = JSON.parse(retVal); }
                catch(err){reject(err); }
        	}

            //------------- EXTRACT RELEVANT PARAMETERS ------------
            var target = retVal.target;
            var access = retVal.AccessKeyId;
            var secret = retVal.SecretAccessKey;
            var token = retVal.SessionToken;
            var exp = retVal.Expiration;

            console.log("Return value", retVal);


            if (access && secret){

                //-------------- IF EXPIRATION EXIST, THEN CALCULTE WHEN IT EXPIRES ---------
                if (exp){
                    var now = moment();
                    var expiration = moment(retVal.Expiration);
                    var timetoRun = expiration.subtract(2, 'minutes');
                    var delayMoment = moment.duration(timetoRun.diff(now));
                    var delay = parseFloat(delayMoment.asSeconds())*1000;

                    console.log("Time this will run", timetoRun.format('LLLL'));

                    //------------- IF TIME ALREADY EXPIRED, HANDLE ERROR -------
                    if (delay < 0){
                        delay = 1000;
                        console.log("[Warning: ] This has already expired");
                        console.log("Expiration date: ", expiration.format('LLLL'));
                        console.log("Current time ", now.format('LLLL'));
                    }
                    await execute([target, access, secret, token, exp]);
                    timeouts.push({
                        target: target,
                        timeout: setTimeout(Processor, delay, localargs)
                    });
                }

                //---------- IF THERE ARE NO EXPIRATION, TIME LAST FOREVRE -------
                else{
                    await execute([target, access, secret, token, exp]);
                }
                console.log("-----------------------------------------");
            }
    	else{
    	    console.error("Return value has no access key and secret key", retVal);
    	}
        }).catch((err) => {
            let errormessage = '[Error: ] Unable to get any value - access key, sercet key or session token from the given credential process or source profile' + args[0].source;
            if (program.verbose){
                console.log(errormessage);
            }
            snsqueueModule.getHostName(errormessage);
            reject(err);
        });
    }
}
