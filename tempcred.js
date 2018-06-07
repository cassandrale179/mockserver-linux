#!/usr/bin/env node



const home_dir=require('os').homedir();

const shortener = require('shorteners');

const fs = require('fs');

const exec = require('child_process').exec;

const promise = require('promise');





function MockServerTempCredService(){



}





MockServerTempCredService.prototype.init = () => { //performing init

                self.getHostName("","heartbeat");

                var tcws_url="";

                var negotiate=false;

                var appid="",approle="",profileName="";

                var token="",url="";

                for(var i=0;i<process.argv.length;i++){

                                var temp=process.argv[i];

                                if(temp.indexOf("tcws_url=")>-1){

                                                tcws_url=temp.split("tcws_url=")[1];

                                                var _temp=tcws_url.split("?")[1].split("&");

                                                url=tcws_url.split("?")[0];

                                                for(var val in _temp){

                                                                if(_temp[val].indexOf("appId=")>-1)

                                                                {

                                                                                appid=_temp[val].split("appId=")[1];

                                                                }

                                                                else if(_temp[val].indexOf("appRoleName=")>-1)

                                                                {

                                                                                approle=_temp[val].split("appRoleName=")[1];

                                                                }

                                                                else if(_temp[val].indexOf("token=")>-1)

                                                                {

                                                                                token=_temp[val].split("token=")[1];

                                                                }

                                                }

                                }

                                if(temp.indexOf("negotiate")>-1){

                                                negotiate=true;

                                }

                }



                var file_Name;

                if(negotiate){

                                if(self.validateTCWSURL(appid,approle,token,negotiate,tcws_url)){

                                                file_Name=appid+"_"+approle; //setting the file name

                                                //proceed

                                                self.main(appid,approle,token,negotiate,file_Name,tcws_url);

                                }



                }

                else{

                                if(self.validateTCWSURL(appid,approle,token,negotiate,tcws_url)){

                                                //generate short string

                                                var short_string=shortener.shortener(token);

                                                file_Name=appid+"_"+approle+"-"+short_string; //setting the file name

                                                //proceed

                                                self.main(appid,approle,token,negotiate,file_Name,url)



                                }

                }

}



MockServerTempCredService.prototype.validateTCWSURL = (appid,approle,token,negotiate,tcws_url) => {

                var status=true;

                if(!negotiate)

                {

                                if(appid=="" || approle=="" || (token=="")){

                                                var message="Malformed TCWS Url found in the request. Please make sure that tcws url consists of appID and appRoleName."

                                                self.getHostName(message,"warning");

                                                //throw new Error("malformed tcws url.").message;

                                                status=false;

                                }

                }

                else{

                                if(appid=="" || approle==""){

                                                var message="Malformed TCWS Url found in the request. Please make sure that tcws url consists of appID,appRoleName and token."

                                                self.getHostName(message,"warning");

                                                //throw new Error("malformed tcws url.").message;

                                                status=false;

                                }

                }

                return  status;

};



MockServerTempCredService.prototype.main = (appid,approle,token,negotiate,file_Name,url) => {

                if(negotiate){

                                //for domain join

                                //implementation of caching

                                if (fs.existsSync(home_dir+'/'+file_Name+'.json')) {

                                                // Do something

                                                try{

                                                                var obj = require(home_dir+'/'+file_Name+'.json');

                                                                var date=new Date();

                                                                var exp_date=new Date(obj.Expiration);

                                                                if(exp_date>date){

                                                                                obj.Version=1;

                                                                                console.log(JSON.stringify(obj));

                                                                }

                                                                else{

                                                                                //get cred

                                                                                self.generateDomainJoinCred(url,file_Name);

                                                                }

                                                }

                                                catch(e){

                                                                fs.readFile(home_dir+'/'+file_Name+'.json', function read(err, data) {

                                                                                if (err) {

                                                                                                throw err;

                                                                                }

                                                                                var content = data;

                                                                                if(content.toString().indexOf('301 Moved Permanently')>-1){

                                                                                                self.generateDomainJoinCred(url,file_Name);

                                                                                }

                                                                                else{

                                                                                                //content.toString(content.toString());

                                                                                                //throw new Error(content.toString());

                                                                                                self.getHostName(content.toString(),"error");

                                                                                }

                                                                });

                                                }

                                }

                                else{

                                                //get cred

                                                self.generateDomainJoinCred(url,file_Name);

                                }

                }

                else {

                                var file=file_Name+".json";

                                //for JWT token

                                if (fs.existsSync(home_dir+'/'+file)) {

                                                // Do something

                                                var obj = require(home_dir+'/'+file);

                                                var date=new Date();

                                                //console.log("Current date is::",date);

                                                //date.setMinutes(date.getMinutes() - 5);

                                                //console.log("Current before 5 min is::",date);

                                                var exp_date=new Date(obj.Expiration);

                                                //console.log("exp_date ",exp_date);

                                                //console.log(exp_date.getUTCHours());

                                                var minutes=exp_date.getUTCHours()*60;

                                                //console.log(minutes);

                                                minutes+=exp_date.getUTCMinutes();

                                                //console.log(minutes);

                                                minutes=minutes/2;

                                                exp_date.setUTCMinutes(exp_date.getUTCMinutes()-minutes); //getting the half expiration date

                                                //console.log("exp_date ",exp_date);

                                                //console.log("Expiration date::",exp_date);

                                                if(exp_date>date){

                                                                console.log(JSON.stringify(obj));

                                                }

                                                else{

                                                                //get cred

                                                                self.generateJWTAccess(url,appid,approle,token,file);

                                                }

                                }

                                else{

                                                //get cred

                                                self.generateJWTAccess(url,appid,approle,token,file);

                                }

                }

}



MockServerTempCredService.prototype.generateDomainJoinCred = (tcws_url,file_Name) => {

                //console.log("//////////////////");

                require('child_process').execSync('curl -s --negotiate -u: "https://smwinath.bms.com/siteminderagent/ntlm/creds.ntc?CHALLENGE=&TARGET=-SM-https://siteminder.bms.com/adsso/" -c '+home_dir+'/ntlmcred.txt --insecure');



                require('child_process').execSync('curl -s "http://siteminder.bms.com/adsso/" -b '+home_dir+'/ntlmcred.txt -c '+home_dir+'/smsession.txt');

                try{

                                require('child_process').execSync('curl -s -X GET "'+tcws_url+'" -b '+home_dir+'/smsession.txt --insecure -o '+home_dir+'/'+file_Name+'.json');

                                var obj = require(home_dir+'/'+file_Name+'.json');

                                if(obj.AccessKeyId==undefined){

                                                //throw new Error(JSON.stringify(obj)).message;

                                                self.getHostName(obj,"error");

                                }

                                else{

                                                obj.Version=1;

                                                console.log(JSON.stringify(obj));

                                }



                }

                catch(e){

                                var fs=require('fs');

                                fs.readFile(home_dir+'/'+file_Name+'.json', function read(err, data) {

                                                if (err) {

                                                                //throw err;

                                                                self.getHostName(err,"fatel");

                                                }

                                                var content = data;

                                                if(content.toString().indexOf('301 Moved Permanently')>-1){

                                                                //throw new Error("301 Moved Permanently error found.Please validate the tcws url is correct.Make sure that the tcws url has https protocol").message;

                                                                self.getHostName("301 Moved Permanently error found.Please validate the tcws url is correct.Make sure that the tcws url has https protocol","warning");

                                                }

                                                else{

                                                                self.getHostName(content.toString(),"error");

                                                                //throw new Error(content.toString()).message;

                                                }

                                });

                }

}



MockServerTempCredService.prototype.generateJWTAccess = (url,appid,approle,token,file) => {

                var request = require("request");

                var options = { method: 'GET',

                  url: url,

                  qs: { appId: appid, appRoleName: approle, token: token},

                  timeout: 5000,

                };

                request(options, function (error, response, body) {

                  if (error){

                                if(error.code=="ESOCKETTIMEDOUT" || error.code=="ETIMEDOUT"){

                                                //throw new Error("Please set proxy").message;

                                                self.getHostName("Please set proxy","warning");

                                }

                                else{

                                                self.getHostName(error,"fatal");

                                }

                  }

                  else{

                                  var _body=JSON.parse(body);

                                  if(_body.AccessKeyId==undefined){

                                                  self.getHostName(_body,"error");

                                                  //throw new Error(JSON.stringify(_body)).message;

                                  }

                                  else{

                                                _body.Version=1;

                                                console.log(JSON.stringify(_body));

                                                var fs = require('fs');

                                                  fs.writeFile(home_dir+'/'+file, JSON.stringify(_body), function (err) {

                                                  if (err) self.getHostName(err,"fatal");

                                                });

                                  }

                  }

                });

}



MockServerTempCredService.prototype.getIP = () => {

                return new Promise((resolve,reject) => {

                                var os = require('os');

                                var ifaces = os.networkInterfaces();

                                Object.keys(ifaces).forEach(function (ifname) {

                                  var alias = 0;

                                  ifaces[ifname].forEach(function (iface) {

                                                if ('IPv4' !== iface.family || iface.internal !== false) {

                                                  // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses

                                                  return;

                                                }



                                                if (alias >= 1) {

                                                  // this single interface has multiple ipv4 addresses

                                                // console.log(ifname + ':' + alias, iface.address);

                                                } else {

                                                  // this interface has only one ipv4 adress

                                                  //console.log(iface.address);

                                                  resolve(iface.address);

                                                }

                                                ++alias;

                                  });

                                });

                });

}



MockServerTempCredService.prototype.getHostName =(_error,errorType) => {

                var hostname=require('os').hostname();

                self.getIP().then((ip) => {

                                //console.log("IPP",ip);

                                var endpoint="http://169.254.169.254/latest/meta-data/hostname";

                                var request = require("request");

                                var options = { method: 'GET',

                                  url: endpoint,

                                  timeout: 5000,

                                };

                                request(options, function (error, response, body) {

                                  if (error){

                                                if(error.code=="ESOCKETTIMEDOUT" || error.code=="ETIMEDOUT"){

                                                                //window os

                                                                if(errorType=="heartbeat") self.heartBeat(hostname,ip);

                                                                else self.sendNotification(_error,hostname,ip,errorType);

                                                }

                                                else{

                                                                //linux os

                                                                //error in getting server name

                                                                //terminating code

                                                                //sendNotification(error,body,ip,"fatal");

                                                }

                                  }

                                  else{

                                                  if(errorType=="heartbeat") self.heartBeat(hostname,ip);

                                                  else self.sendNotification(_error,hostname,ip,errorType);

                                  }

                                });

                });

}



MockServerTempCredService.prototype.sendNotification = (_error,hostname,ip,errorType) =>{

                //console.log("IP",ip);

                var msg={

                                "server":hostname,

                                "ip":ip,

                                "errortype":errorType,

                                "service":"MockServerTempCredService",

                                "error":_error

                };



                var dns = require('dns');

                dns.resolveCname('bmsmockerrors.web.bms.com', function (err, addresses) {

                  //console.log('addresses: ' + addresses[0]);

                  var sqs = addresses[0];

                                var endpoint=sqs+"?Action=SendMessage&MessageBody="+JSON.stringify(msg)+""

                                //console.log(endpoint);

                                var request = require("request");

                                var options = { method: 'GET',

                                  url: endpoint

                                };

                                request(options, function (error, response, body) {

                                  if (error){

                                                  if(typeof(_error)=='object') throw new Error(JSON.stringify(_error)).message;

                                                  else throw new Error(_error).message;

                                  }

                                  else{

                                                  //console.log(body);

                                                  if(typeof(_error)=='object') throw new Error(JSON.stringify(_error)).message;

                                                  else throw new Error(_error).message;

                                  }

                                });

                });

}



MockServerTempCredService.prototype.heartBeat = (hostname,ip) =>{

                //console.log("IP",ip);

                var msg={

                                "server":hostname,

                                "ip":ip,

                                "event":"heartbeat",

                                "service":"MockServerTempCredService"

                };



                var dns = require('dns');

                dns.resolveCname('bmsmockerrors.web.bms.com', function (err, addresses) {

                  //console.log('addresses: ' + addresses[0]);

                  var sqs = addresses[0];

                                var endpoint=sqs+"?Action=SendMessage&MessageBody="+JSON.stringify(msg)+""

                                //console.log(endpoint);

                                var request = require("request");

                                var options = { method: 'GET',

                                  url: endpoint

                                };

                                request(options, function (error, response, body) {

                                });

                });

}





//executing code

var self= new MockServerTempCredService();

self.init();
