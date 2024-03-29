dojo.provide("plugins.workflow.ClusterStatus");

// TITLE PANE
dojo.require("dijit.TitlePane");

// HAS A
dojo.require("plugins.dijit.ConfirmDialog");

// INHERITS
dojo.require("plugins.core.Common");

dojo.declare( "plugins.workflow.ClusterStatus",
	[ dijit._Widget, dijit._Templated, plugins.core.Common ], {

//Path to the template of this widget. 
templatePath: dojo.moduleUrl("plugins", "workflow/templates/clusterstatus.html"),

// Calls dijit._Templated.widgetsInTemplate
widgetsInTemplate : true,

// OR USE @import IN HTML TEMPLATE
cssFiles : [ dojo.moduleUrl("plugins") + "/workflow/css/clusterstatus.css" ],

// CORE WORKFLOW OBJECTS
core : null,

// status: string
// CLUSTER STATUS ('', 'starting', 'running', 'pausing', 'paused', 'stopping', 'stopped')
status : '',

// runner: object
// RUNNER OBJECT SET IN RunStatus
runner : null,

/////}
constructor : function(args) {
	console.log("ClusterStatus.constructor    args:");
	console.dir({args:args});

	// GET ARGS
	this.core = args.core;
	this.attachNode = args.attachNode;

	if ( args.cgiUrl != null )
		this.cgiUrl = args.cgiUrl;
	else
		this.cgiUrl = 	Agua.cgiUrl + "workflow.cgi";
	
	// LOAD CSS
	this.loadCSS();		
},
postCreate: function() {
	console.log("ClusterStatus.postCreate    plugins.workflow.ClusterStatus.postCreate()");

	this.startup();
},
startup : function () {
	console.log("ClusterStatus.startup    plugins.workflow.ClusterStatus.startup()");

	// SET UP THE ELEMENT OBJECTS AND THEIR VALUE FUNCTIONS
	this.inherited(arguments);
	
	console.log("ClusterStatus.startup    this.attachNode: " + this.attachNode);
	console.log("ClusterStatus.startup    this.stagesTab: " + this.stagesTab);
	console.log("ClusterStatus.startup    this.queueTab: " + this.queueTab);
	
	// ADD TO TAB CONTAINER		
	if ( this.attachNode.addChild != null )
		this.attachNode.addChild(this.mainTab);

    // OTHERWISE, WE ARE TESTING SO APPEND TO DOC BODY
	else {
		var div = dojo.create('div');
		document.body.appendChild(div);
		div.appendChild(this.mainTab.domNode);
	}
	this.attachNode.selectChild(this.mainTab);	
	
	// START UP CONFIRM DIALOGUE
	this.setConfirmDialog();
},
// SHOW STATUS
clearStatus : function () {
	console.log("ClusterStatus.clearStatus      plugins.workflow.ClusterStatus.clearStatus()");
	this.clusterList.innerHTML = "";
	this.clusterLog.innerHTML = "";
	
	while ( this.clusterList.firstChild )
		this.clusterList.removeChild(this.clusterList.firstChild);
	// REMOVE EXISTING STATUS 
	while ( this.clusterLog.firstChild )
		this.clusterLog.removeChild(this.clusterLog.firstChild);
},
displayStatus : function (reponse) {
	console.log("ClusterStatus.displayStatus      reponse:");
	console.dir({reponse:reponse});
	if ( ! reponse ) {
		reponse = {
			clusterList : "No nodes running",
			clusterLog: "No log output available"
		};
	}
	
	// REMOVE EXISTING STATUS 	
	this.clearStatus();

	// DISPLAY STATUS
	this.clusterList.innerHTML = "<PRE>" + reponse.clusterList + "</PRE>";
	this.clusterLog.innerHTML = "<PRE>" + reponse.clusterLog + "</PRE>";
	this.clusterName.innerHTML = reponse.cluster;
	this.status = reponse.status;
	this.clusterStatus.innerHTML = reponse.status;
},
// WORKFLOW CONTROLS
pauseCluster : function () {
	console.log("ClusterStatus.pauseCluster    ");
	var project = this.core.userWorkflows.getProject();
	var workflow = this.core.userWorkflows.getCluster();
	this.checkRunning(project, workflow, "confirmPauseCluster");
},
stopCluster : function () {
	console.log("ClusterStatus.stopCluster    this.status: " + this.status);
	var cluster = this.runner.cluster;
	console.log("ClusterStatus.stopCluster    cluster: " + cluster);
	
	if ( ! cluster )
		Agua.toastInfo("Cluster not defined");
	else if ( ! this.status
		|| this.status == "stopping"
		|| this.status == "stopped" ) {
		Agua.toastInfo("Cluster is already stopped");
	}
	else
		this.confirmStopCluster(cluster);
},
startCluster : function () {
	var cluster = this.runner.cluster;
	console.log("ClusterStatus.startCluster    cluster: " + cluster);
	console.log("ClusterStatus.startCluster    this.status: " + this.status);
	
	if ( ! cluster )
		Agua.toastInfo("Cluster not defined");
	else if ( this.status == "running" ) {
		Agua.toastInfo("Cluster is already running");
	}
	else if ( this.status == "starting" ) {
		Agua.toastInfo("Cluster is already starting");
	}
	else
		this.confirmStartCluster(cluster);
},
confirmPauseCluster : function (project, workflow, isRunning) {
	// EXIT IF NO STAGES ARE CURRENTLY RUNNING
	console.log("ClusterStatus.confirmPauseCluster    project: " + project);
	console.log("ClusterStatus.confirmPauseCluster    workflow: " + workflow);
	console.log("ClusterStatus.confirmPauseCluster    isRunning: " + isRunning);
	if ( ! isRunning )	return;

	// ASK FOR CONFIRMATION TO STOP THE WORKFLOW
	var noCallback = function (){
		console.log("ClusterMenu.confirmPauseCluster    noCallback()");
	};
	var yesCallback = dojo.hitch(this, function()
		{
			console.log("ClusterMenu.confirmPauseCluster    yesCallback()");
			this.doPauseCluster();
		}								
	);

	// GET THE INDEX OF THE FIRST RUNNING STAGE
	var indexOfRunningStage = this.core.userWorkflows.indexOfRunningStage();
	console.log("ClusterStatus.confirmPauseCluster   indexOfRunningStage: " + indexOfRunningStage);
	this.runner = this.core.runStatus.createRunner(indexOfRunningStage);	

	// SET TITLE AND MESSAGE
	var title = project + "." + workflow + " is running";
	var message = "Are you sure you want to stop it?";

	// SHOW THE DIALOG
	this.loadConfirmDialog(title, message, yesCallback, noCallback);
},
confirmStartCluster : function (cluster) {
	console.log("ClusterStatus.confirmStartCluster    cluster: " + cluster);

	// ASK FOR CONFIRMATION TO STOP THE WORKFLOW
	var noCallback = function () {};
	var yesCallback = dojo.hitch(this, function() {
		console.log("ClusterStatus.startCluster    yesCallback()");
		this.doStartCluster();
	});

	// SET TITLE AND MESSAGE
	var title = "Are you sure you want to start cluster '" + cluster + "'?";
	var message = "Cloud fees apply as soon as the cluster is started";

	// SHOW THE DIALOG
	this.loadConfirmDialog(title, message, yesCallback, noCallback);
},
confirmStopCluster : function (cluster) {
	console.log("ClusterStatus.confirmStopCluster    cluster " + cluster);

	// CALLBACKS
	var noCallback = function (){};
	var yesCallback = dojo.hitch(this, function() {
		this.doStopCluster();
	});

	// SET TITLE AND MESSAGE
	var title = "Are you sure you want to stop cluster '" + cluster + "'?";
	var message = "Any workflows currently running on it will be stopped";

	// SHOW THE DIALOG
	this.loadConfirmDialog(title, message, yesCallback, noCallback);
},
doPauseCluster : function () {
	console.log("ClusterStatus.doPauseCluster    plugins.workflow.ClusterStatus.doPauseCluster");
	this.pauseRun();	
},
doStartCluster : function () {
	console.log("ClusterStatus.doStartCluster    this.runner:");
	console.dir({this_runner:this.runner});
	var project		=	this.runner.project 	|| '';
	var workflow	=	this.runner.workflow 	|| '';
	var cluster		=	this.runner.cluster 	|| '';
	var start		=	this.runner.start 		|| '';
	var username 	= 	this.runner.username	|| '';
	var sessionId 	= 	this.runner.sessionId	|| '';

	// SET MESSAGE
	this.clusterStatus.innerHTML = "starting";

	// SET STATUS
	this.status = "starting";
	
	// GET URL 
	var url = Agua.cgiUrl + "workflow.cgi";
	
	// GENERATE QUERY JSON FOR THIS WORKFLOW IN THIS PROJECT
	var query = new Object;
	query.username = username;
	query.sessionId = sessionId;
	query.project = project;
	query.workflow = workflow;
	query.cluster = username + "-" + cluster;
	query.mode = "startCluster";
	query.start = start;
	console.log("ClusterStatus.startCluster     query: " + dojo.toJson(query));
	
	var deferred = dojo.xhrPut(
		{
			url: url,
			putData: dojo.toJson(query),
			handleAs: "json",
			sync: false,
			load: function(response){
				Agua.toast(response);
			}
		}
	);
},
doStopCluster : function () {
	console.log("ClusterStatus.doStopCluster    this.runner:");
	console.dir({this_runner:this.runner});

	var project		=	this.runner.project 	|| '';
	var workflow	=	this.runner.workflow 	|| '';
	var cluster		=	this.runner.cluster 	|| '';
	var start		=	this.runner.start 		|| '';
	var username 	= 	this.runner.username	|| '';
	var sessionId 	= 	this.runner.sessionId	|| '';

	// SET MESSAGE
	this.clusterStatus.innerHTML = "stopping";

	// SET STATUS
	this.status = "stopping";
	
	// GET URL 
	var url = Agua.cgiUrl + "workflow.cgi";
	
	// GENERATE QUERY JSON FOR THIS WORKFLOW IN THIS PROJECT
	var query = new Object;
	query.username = username;
	query.sessionId = sessionId;
	query.project = project;
	query.workflow = workflow;
	query.cluster = username + "-" + cluster;
	query.mode = "stopCluster";
	query.start = start;
	console.log("ClusterStatus.stopCluster     query: " + dojo.toJson(query));
	
	var deferred = dojo.xhrPut(
		{
			url: url,
			putData: dojo.toJson(query),
			handleAs: "json",
			sync: false,
			load: function(response){
				Agua.toast(response);
			}
		}
	);
},
// CONFIRM DIALOG
setConfirmDialog : function () {
	var yesCallback = function (){};
	var noCallback = function (){};
	var title = "Dialog title";
	var message = "Dialog message";
	
	this.confirmDialog = new plugins.dijit.ConfirmDialog(
		{
			title 				:	title,
			message 			:	message,
			parentWidget 		:	this,
			yesCallback 		:	yesCallback,
			noCallback 			:	noCallback
		}			
	);
},
loadConfirmDialog : function (title, message, yesCallback, noCallback) {
	console.log("FileMenu.loadConfirmDialog    yesCallback.toString(): " + yesCallback.toString());
	console.log("FileMenu.loadConfirmDialog    title: " + title);
	console.log("FileMenu.loadConfirmDialog    message: " + message);
	console.log("FileMenu.loadConfirmDialog    yesCallback: " + yesCallback);
	console.log("FileMenu.loadConfirmDialog    noCallback: " + noCallback);

	this.confirmDialog.load(
		{
			title 				:	title,
			message 			:	message,
			yesCallback 		:	yesCallback,
			noCallback 			:	noCallback
		}			
	);
}

});	// plugins.workflow.ClusterStatus


