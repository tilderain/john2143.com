"use strict";

var http = require("http");
var fs = require("fs");
var querystring = require("querystring");
var url = require("url");

class request{
	constructor(req, res){
		this.req = req;
		this.res = res;
	}

	denyFavicon(){
		if(this.req.url === "/favicon.ico"){
			this.res.writeHead(200, {"Content-Type": "image/x-icon"});
			this.res.end();
			return true;
		}
		return false;
	}

	createURLData(){
		this.urldata = url.parse(this.req.url, true);
		//Filter all empty or null parameters
		this.urldata.path = this.urldata.path.split("/").filter((x) => x);
	}

	logConnection(){
		console.log(
			Date() + " | " +
			this.req.connection.remoteAddress + " | " +
			this.urldata.path.join("/")
		);
	}

	doRedirect(redir){
		this.res.writeHead(302, {
			"Content-Type": "text/html",
			"Location": redir,
		});
		this.res.end("Redirecting to '" + redir + "'...");
	}

	doHTML(html){
		this.res.writeHead(200, {"Content-Type": "text/html"});
		this.res.end(html);
	}
}

class server{
	constructor(dat){
		this.ip = dat.ip || "0.0.0.0";
		this.port = dat.port || 80;
		this.redirs = dat.redirs || {};
		this.extip = null;
		this.server = http.createServer((req, res) => {
			this.route(new request(req, res));
		});

		try{
			this.server.listen(this.port, this.ip);
		}catch(err){
			console.log("There was an error starting the server. Are you sure you can access that port?");
		}

		this.getExtIP(function(ip){
			console.log("EXTIP is " + String(ip));
		});
	}

	route(reqx){
		if(reqx.denyFavicon()) return;

		reqx.createURLData();
		reqx.logConnection();

		var filepath = __dirname + "/pages" + reqx.req.url + ".html";
		fs.stat(filepath, function(err, stats){
			if(err){
				var dat = reqx.urldata.path[0];
				var redir;

				if(dat){
					redir = this.redirs[dat];
				}else{
					redir = this.redirs[this.redirs._def]; //Default to default action defined by the redirect table
				}

				if(redir){
					if(typeof redir === "function"){
						redir(this, reqx);
					}else{
						reqx.doRedirect(redir);
					}
				}else{
					fs.readFile(__dirname + "/pages/404.html", "utf8", function(err, dat){
						reqx.doHTML(dat);
					});
				}
			}else{
				//TODO transform into pipe
				fs.readFile(filepath, "utf8", function(err, dat){
					reqx.doHTML(dat);
				});
			}
		}.bind(this));
	}

	getExtIP(callback, doreset){
		if(doreset || !this.extip){
			http.get({
				host: "myexternalip.com",
				port: 80,
				path: "/raw"
			}, function(r){
				r.setEncoding("utf8");
				r.on("data", function(d){
					this.extip = d;
					callback(this.extip);
				});
			}) .setTimeout(2000, function(){
				callback(false);
			});
		}else{
			callback(this.extip);
		}
	}
}

module.exports = server;
