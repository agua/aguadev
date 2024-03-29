dojo.provide("plugins.core.Common.Util");

/* SUMMARY: THIS CLASS IS INHERITED BY Common.js AND CONTAINS 
	
	UTIL METHODS  
*/

dojo.declare( "plugins.core.Common.Util",	[  ], {

///////}}}

doPut : function (inputs) {
	console.log("    Common.Util.doPut    inputs: ");
	console.dir({inputs:inputs});
	var callback = function (){}
	if ( inputs.callback != null )	callback = inputs.callback;
	//console.log("    Common.Util.doPut    inputs.callback: " + inputs.callback);
	var doToast = true;
	if ( inputs.doToast != null )	doToast = inputs.doToast;
	var url = inputs.url;
	url += "?";
	url += Math.floor(Math.random()*100000);
	var query = inputs.query;
	var timeout = inputs.timeout ? inputs.timeout : null;
	var handleAs = inputs.handleAs ? inputs.handleAs : "json";
	var sync = inputs.sync ? inputs.sync : false;
	//console.log("    Common.Util.doPut     doToast: " + doToast);
	
	// SEND TO SERVER
	dojo.xhrPut(
		{
			url: url,
			contentType: "text",
			preventCache : true,
			sync: sync,
			handleAs: handleAs,
			putData: dojo.toJson(query),
			timeout: timeout,
			load: function(response, ioArgs) {
				console.log("    Common.Util.doPut    response: ");
				console.dir({response:response});

				if ( response.error ) {
					if ( doToast ) {
						console.log("    Common.Util.doPut    DOING Agua.toastMessage ERROR");
						Agua.toastMessage({
							message: response.error,
							type: "error",
							duration: 10000
						});
					}
				}
				else {
					if ( response.status ) {
						if ( doToast ) {
						console.log("    Common.Util.doPut    DOING Agua.toastMessage STATUS");
							Agua.toastMessage({
								message: response.status,
								type: "warning",
								duration: 10000
							})
							if ( Agua.loader != null )	Agua.loader._hide();
						}
					}
					
					//console.log("    Common.Util.doPut    callback: " + callback);
					console.log("    Common.Util.doPut    DOING callback(response, inputs)");
					callback(response, inputs);
				}
			},
			error: function(response, ioArgs) {
				console.log("    Common.Util.doPut    Error with put. Response: " + response);
				return response;
			}
		}
	);	
},
getClassName : function (object) {
	//console.log("    Common.Util.getClassName    object: " + object);
	//console.dir({object:object});
	var className = new String(object);
	var name;
	if ( className.match(/^\[Widget\s+(\S+),/) )
		name = className.match(/^\[Widget\s+(\S+),/)[1];
	//console.log("    Common.Util.getClassName    name: " + name);

	return name;
},	
showMessage : function (message, putData) {
	console.log("    Common.Util.showMessage    Polling message: " + message)	
},
downloadFile : function (filepath, username) {
	//console.log("ParameterRow.downloadFile     plugins.workflow.ParameterRow.downloadFile(filepath, shared)");
	//console.log("ParameterRow.downloadFile     filepath: " + filepath);
	var query = "?mode=downloadFile";

	// SET requestor = THIS_USER IF PROVIDED
	if ( username != null )
	{
		query += "&username=" + username;
		query += "&requestor=" + Agua.cookie('username');
	}
	else
	{
		query += "&username=" + Agua.cookie('username');
	}

	query += "&sessionId=" + Agua.cookie('sessionId');
	query += "&filepath=" + filepath;
	//console.log("ParameterRow.downloadFile     query: " + query);
	
	var url = Agua.cgiUrl + "download.cgi";
	//console.log("ParameterRow.downloadFile     url: " + url);
	
	var args = {
		method: "GET",
		url: url + query,
		handleAs: "json",
		timeout: 10000,
		load: this.handleDownload
	};
	console.log("ParameterRow.downloadFile     args: ", args);

	console.log("ParameterRow.downloadFile     Doing dojo.io.iframe.send(args))");
	var value = dojo.io.iframe.send(args);
},
loadCSS : function (cssFiles) {
// LOAD EITHER this.cssFiles OR A SUPPLIED ccsFiles ARRAY OF FILES ARGUMENT

	//console.log("    Common.Util.loadCSS     plugins.admin.GroupUsers.loadCSS()");
	
	if ( cssFiles == null )
	{
		cssFiles = this.cssFiles;
	}
	//console.log("    Common.Util.loadCSS     cssFiles: " +  dojo.toJson(cssFiles, true));
	
	// LOAD CSS
	for ( var i in cssFiles )
	{
		//console.log("    Common.Util.loadCSS     Loading CSS file: " + this.cssFiles[i]);
		
		this.loadCSSFile(cssFiles[i]);
	}
},
loadCSSFile : function (cssFile) {
// LOAD A CSS FILE IF NOT ALREADY LOADED, REGISTER IN this.loadedCssFiles

	//console.log("    Common.Util.loadCSSFile    *******************");
	//console.log("    Common.Util.loadCSSFile    plugins.core.Common.loadCSSFile(cssFile)");
	//console.log("    Common.Util.loadCSSFile    cssFile: " + cssFile);
	//console.log("    Common.Util.loadCSSFile    this.loadedCssFiles: " + dojo.toJson(this.loadedCssFiles));

	if ( Agua.loadedCssFiles == null || ! Agua.loadedCssFiles )
	{
		//console.log("    Common.Util.loadCSSFile    Creating Agua.loadedCssFiles = new Object");
		Agua.loadedCssFiles = new Object;
	}
	
	if ( ! Agua.loadedCssFiles[cssFile] )
	{
		console.log("    Common.Util.loadCSSFile    Loading cssFile: " + cssFile);
		
		var cssNode = document.createElement('link');
		cssNode.type = 'text/css';
		cssNode.rel = 'stylesheet';
		cssNode.href = cssFile;
		document.getElementsByTagName("head")[0].appendChild(cssNode);

		Agua.loadedCssFiles[cssFile] = 1;
	}
	else
	{
		//console.log("    Common.Util.loadCSSFile    No load. cssFile already exists: " + cssFile);
	}

	//console.log("    Common.Util.loadCSSFile    Returning Agua.loadedCssFiles: " + dojo.toJson(Agua.loadedCssFiles));
	
	return Agua.loadedCssFiles;
},
randomiseUrl : function (url) {
	url += "?dojo.preventCache=1266358799763";
	url += Math.floor(Math.random()*1000000000000);
	
	return url;
},
killPopup : function (combo) {
	//console.log("    Common.Util.killPopup    core.Common.killPopup(combo)");
	var popupId = "widget_" + combo.id + "_dropdown";
	var popup = dojo.byId(popupId);
	if ( popup != null )
	{
		var popupWidget = dijit.byNode(popup.childNodes[0]);
		dijit.popup.close(popupWidget);
	}	
},

});