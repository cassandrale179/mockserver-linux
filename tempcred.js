#!/usr/bin/env node

const home_dir=require('os').homedir();
const shortener = require('shorteners');
const fs = require('fs');
const exec = require('child_process').exec;
const AWS = require('aws-sdk');
const sns = new AWS.SNS({apiVersion: '2010-03-31',region:'us-east-1'});

//performing init
function init(){
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
		if(validateTCWSURL(appid,approle,token,negotiate)){
			file_Name=appid+"_"+approle; //setting the file name
			//proceed
			main(appid,approle,token,negotiate,file_Name,tcws_url);
		}
		
	}
	else{
		if(validateTCWSURL(appid,approle,token,negotiate)){
			//generate short string 
			var short_string=shortener.shortener(token);
			file_Name=appid+"_"+approle+"-"+short_string; //setting the file name
			//proceed
			main(appid,approle,token,negotiate,file_Name,url)
			
		}
	}
}


//validating tcws url format
function validateTCWSURL(appid,approle,token,negotiate){
	var status=true;
	if(!negotiate)
	{
		if(appid=="" || approle=="" || (token=="")){
			throw new Error("malformed tcws url.").message;
			status=false;
		}
	}
	else{
		if(appid=="" || approle==""){
			throw new Error("malformed tcws url.").message;
			status=false;
		}
	}
	return  status;
}

//starting code execution
function main(appid,approle,token,negotiate,file_Name,url){
	if(negotiate){
		//for domain join
		//implementation of caching 
		if (fs.existsSync(home_dir+'//'+file_Name+'.json')) {
			// Do something
			var obj = require(home_dir+'//'+file_Name+'.json');
			var date=new Date();
			var exp_date=new Date(obj.Expiration);
			if(exp_date>date){
				obj.Version=1;
				console.log(JSON.stringify(obj));
			}
			else{
				//get cred
				generateDomainJoinCred(url,file_Name);
			}
		}
		else{
			//get cred
			generateDomainJoinCred(url,file_Name);
		}
	}
	else {
		var file=file_Name+".json";
		//for JWT token
		if (fs.existsSync(home_dir+'//'+file)) {
			// Do something
			var obj = require(home_dir+'//'+file);
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
				generateJWTAccess(url,appid,approle,token,file);
			}
		}
		else{
			//get cred
			generateJWTAccess(url,appid,approle,token,file);
		}
	}
	
}

function generateDomainJoinCred(tcws_url,file_Name){
	 require('child_process').execSync('curl -s --negotiate -u: "https://smwinath.bms.com/siteminderagent/ntlm/creds.ntc?CHALLENGE=&TARGET=-SM-https://siteminder.bms.com/adsso/" -c '+home_dir+'\\ntlmcred.txt --insecure');

	require('child_process').execSync('curl -s "http://siteminder.bms.com/adsso/" -b '+home_dir+'\\ntlmcred.txt -c '+home_dir+'\\smsession.txt');
	require('child_process').execSync('curl -s -X GET "'+tcws_url+'" -b '+home_dir+'\\smsession.txt --insecure -o '+home_dir+'\\'+file_Name+'.json'); 
	var obj = require(home_dir+'//'+file_Name+'.json');
	obj.Version=1;
	console.log(JSON.stringify(obj));
}

function generateJWTAccess(url,appid,approle,token,file){
	var request = require("request");     
	var options = { method: 'GET',
	  url: url,
	  qs: { appId: appid, appRoleName: approle, token: token},
	  timeout: 5000,
	 };
	request(options, function (error, response, body) {
	  if (error){
		if(error.code=="ESOCKETTIMEDOUT" || error.code=="ETIMEDOUT"){
			throw new Error("Please set proxy").message;
		}
		else{
			getHostName("Server error");
		}
	  }
	  else{
		  var _body=JSON.parse(body);
		  _body.Version=1;
		  console.log(JSON.stringify(_body)); 
		  var fs = require('fs');
		  fs.writeFile(home_dir+'//'+file, JSON.stringify(_body), function (err) {
			if (err) throw err;
		  });
	  }
	});
}

//getting instance details
function getHostName(_error) {
	var hostname;
	var endpoint="http://169.254.169.254/latest/meta-data/hostname";
	var request = require("request");     
	var options = { method: 'GET',
	  url: endpoint,
	  timeout: 5000,
	 };
	request(options, function (error, response, body) {
	  if (error){
		if(error.code=="ESOCKETTIMEDOUT" || error.code=="ETIMEDOUT"){
			var host_name=require('os').hostname();
			hostname=host_name;
		}
		else{
			throw new Error(_error).message;
		}
	  }
	  else{
		hostname=data;
	  }
	  //console.log(hostname);
	  sendNotification(_error,hostname);
	}); 
}

//sending an error notification
function sendNotification(_error,hostname) {
	var subject="JWT Error Notification--"+hostname
	var msg={
		"Subject":subject,
		"Error":_error
	};
	var endpoint="https://sqs.us-east-1.amazonaws.com/315327487940/mock-service-error-messages?Action=SendMessage&MessageBody="+JSON.stringify(msg)+""
	console.log(endpoint);
	var request = require("request");     
	var options = { method: 'GET',
	  url: endpoint
	 };
	request(options, function (error, response, body) {
	  if (error){
		throw new Error(_error).message;
	  }
	  else{
		  console.log(body);
	  }
	});
}


//executing code
init();
