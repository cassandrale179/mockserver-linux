# mockserver-linux
Mockserver is a Node.js program that allow user to refresh their AWS credential file based on a given configuration file on EC2 instances. 

## Prerequesites 
1. Node v.8.11 or higher
2. curl 
3. Installing the following node module packages:   

```
npm install moment
npm install request
npm install tunnel
npm install aws-sdk 
``` 

Before running the program, please set the proxy, for example, on Linux:
```
export http_proxy=http://name-of-your-proxy.com:8080
export https_proxy=http://name-of-your-proxy.com:8080 
``` 

A configuration file name “config”, a credential file “credentials” (can be blank), TempCredScript.js, and its node modules must be located at your home directory under .aws folder. To check, change directory to that folder and list the content (for example, on Mac OS):  

```
cd $HOME/.aws && ls 
> config    credentials   TempCredScript.js    node_modules 
``` 

To run the program simply located the folder and type: 
 ```
 $ node mock.js 
 ``` 
 
 
