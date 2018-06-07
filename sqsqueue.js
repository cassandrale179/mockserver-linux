#!/usr/bin/env node



const home_dir=require('os').homedir();
const shortener = require('shorteners');
const fs = require('fs');
const exec = require('child_process').exec;
const promise = require('promise');



self.getHostName("","heartbeat");


//--------------- FUNCTION TO GET IP ADDRESS -------------
function getIP(){
	return new Promise((resolve,reject) => {
		var os = require('os');
		var ifaces = os.networkInterfaces();
		Object.keys(ifaces).forEach(ifname => {
			var alias = 0;
			if ('IPv4' !== iface.family || iface.internal !== false) {
			  return;
			}
			ifaces[ifname].forEach(iface => {
				if (alias >= 1) {
				  // this single interface has multiple ipv4 addresses
				  console.log(ifname + ':' + alias, iface.address);

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
