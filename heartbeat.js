#!/usr/bin/env node
const home_dir=require('os').homedir();
const shortener = require('shorteners');
const fs = require('fs');
const exec = require('child_process').exec;
const promise = require('promise');


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
				  resolve(iface.address);
				}
				++alias;
			});
		});
	});
}


//--------------- GET HOST NAME -------------
function getHostName(_error, errorType){
	var hostname=require('os').hostname();
	getIP().then((ip) => {

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
					else sendNotification(_error,hostname,ip,errorType);
				}

				else{

					//linux os
					//error in getting server name
					//terminating code
					//sendNotification(error,body,ip,"fatal");

				}
		}

		//If there is no error, that means heartbeat is good
			else{
				  if(errorType=="heartbeat") heartBeat(hostname,ip);
				  else self.sendNotification(_error,hostname,ip,errorType);
			}
		});
	});
}



//--------- SEND NOTIFICATION TO SQS QUEUE -------------
function sendNotification(_error,hostname,ip,errorType){
    var msg = {
        "server":hostname,
        "ip":ip,
        "errortype":errorType,
        "service":"MockServerTempCredService",
        "error":_error
    };

    var dns = require('dns');
    dns.resolveCname('bmsmockerrors.web.bms.com', function (err, addresses) {
	    var sqs = addresses[0];
		var endpoint=sqs+"?Action=SendMessage&MessageBody="+JSON.stringify(msg)+"";
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
		          if(typeof(_error)=='object') throw new Error(JSON.stringify(_error)).message;
		          else throw new Error(_error).message;
	        }
        });
	 });
}


//--------- SEND HEART BEAT -------------
function heartBeat(hostname,ip){
    var msg={
        "server":hostname,
        "ip":ip,
        "event":"heartbeat",
        "service":"MockServerTempCredService"
    };

    var dns = require('dns');
    dns.resolveCname('bmsmockerrors.web.bms.com', function (err, addresses) {
		var sqs = addresses[0];
		var endpoint=sqs+"?Action=SendMessage&MessageBody="+JSON.stringify(msg)+"";
        var request = require("request");
        var options = { method: 'GET',
          url: endpoint
        };

        request(options, function (error, response, body) {
			if (error) console.log(error);
			console.log("Response from heartbeat", repsonse);
        });
    });
}

exports.getHostName = getHostName;
