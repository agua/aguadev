dojo.provide("plugins.workflow.RunStatus");

// TITLE PANE
dojo.require("dijit.TitlePane");

// HAS A
dojo.require("plugins.workflow.StageStatus");
dojo.require("plugins.workflow.ClusterStatus");
dojo.require("plugins.dijit.ConfirmDialog");

// INHERITS
dojo.require("plugins.core.Common");

dojo.declare( "plugins.workflow.RunStatus",
	[ dijit._Widget, dijit._Templated, plugins.core.Common ], {

//Path to the template of this widget. 
templatePath: dojo.moduleUrl("plugins", "workflow/templates/runstatus.html"),

// Calls dijit._Templated.widgetsInTemplate
widgetsInTemplate : true,

// OR USE @import IN HTML TEMPLATE
cssFiles : [ dojo.moduleUrl("plugins") + "/workflow/css/runstatus.css" ],

// TIMER OBJECT
timer: null,

// TIMER INTERVAL
timerInterval: 20000,

// POLLING STATUS
polling : false,

// CORE WORKFLOW OBJECTS
core : null,

// delay: integer
// Default delay between polls
delay : 21000,

// deferreds: array
// Array of xhr deferred objects
deferreds : [],

/////}
constructor : function(args) {
	console.log("RunStatus.constructor    plugins.workflow.RunStatus.constructor(args)");

	// GET ARGS
	this.core = args.core || {};
	this.core.runstatus = this;
	console.log("RunStatus.constructor    args.parentWidget: " + args.parentWidget);
	console.log("RunStatus.constructor    args.attachNode: " + args.attachNode);

	if ( args.parentWidget	)	this.parentWidget = args.parentWidget;
	if ( args.attachNode	)	this.attachNode = args.attachNode;

	if ( args.cgiUrl != null )
		this.cgiUrl = args.cgiUrl;
	if ( this.cgiUrl == null )
		this.cgiUrl = 	Agua.cgiUrl + "workflow.cgi";

	if ( args.timerInterval	)	this.timerInterval = args.timerInterval;
	
	// LOAD CSS
	this.loadCSS();		
},
postMixInProperties: function() {
	console.log("RunStatus.postMixInProperties    plugins.workflow.RunStatus.postMixInProperties()");
},
postCreate: function() {
	console.log("RunStatus.postCreate    plugins.workflow.RunStatus.postCreate()");

	this.startup();
},
startup : function () {
	console.log("RunStatus.startup    plugins.workflow.RunStatus.startup()");

	// SET UP THE ELEMENT OBJECTS AND THEIR VALUE FUNCTIONS
	this.inherited(arguments);
	
	console.log("RunStatus.startup    this.attachNode: " + this.attachNode);
	console.log("RunStatus.startup    this.stagesTab: " + this.stagesTab);
	console.log("RunStatus.startup    this.clusterTab: " + this.clusterTab);
	console.log("RunStatus.startup    this.queueTab: " + this.queueTab);
	
	// ADD TO TAB CONTAINER		
	if ( this.attachNode.addChild != null ) {
		this.attachNode.addChild(this.stagesTab);
		this.attachNode.addChild(this.queueTab);
	}
    // OTHERWISE, WE ARE TESTING SO APPEND TO DOC BODY
	else {
		var div = dojo.create('div');
		document.body.appendChild(div);
		div.appendChild(this.stagesTab.domNode);
		div.appendChild(this.queueTab.domNode);
	}
	//this.attachNode.selectChild(this.mainTab);	
	
	// START UP CONFIRM DIALOGUE
	this.setConfirmDialog();

	// INSTANTIATE SEQUENCE (POLLING DELAY)
	this.setSequence();

	// SET CLUSTER STATUS
	this.setClusterStatus();
},

// RUN WORKFLOW
runWorkflow : function (runner) {
// RUN WORKFLOW, QUIT IF ERROR, PROMPT FOR stopRun IF ALREADY RUNNING
	console.group("runStatus-" + this.id + "    runWorkflow");
	console.log("RunStatus.runWorkflow      runner: ");
	console.dir(runner);

	// SELECT THIS TAB NODE
	this.attachNode.selectChild(this.stagesTab);

	// SET this.runner AS RUNNER IF PROVIDED
	if ( runner != null ){
		delete this.runner;
		this.runner = runner;
	}
	
	var project		=	runner.project;
	var workflow	=	runner.workflow;
	var start		=	runner.start;	
	console.log("RunStatus.runWorkflow      project: " + project);
	console.log("RunStatus.runWorkflow      workflow: " + workflow);
	console.log("RunStatus.runWorkflow      start: " + start);

	// SET MESSAGE
	this.notifier.innerHTML = "Running workflow...";

	// GET URL 
	var url = Agua.cgiUrl + "workflow.cgi";
	console.log("RunStatus.runWorkflow      url: " + url);		

	// GET submit
	var submit = Agua.getWorkflowSubmit(this.runner);

	// GENERATE QUERY JSON FOR THIS WORKFLOW IN THIS PROJECT
	var query = new Object;
	query.project			=	this.runner.project;
	query.workflow			=	this.runner.workflow;
	query.workflownumber	=	this.runner.workflownumber;
	query.start				=	this.runner.start;
	query.stop				=	this.runner.stop;
	query.username 			= 	Agua.cookie('username');
	query.sessionId	 		= 	Agua.cookie('sessionId');
	query.mode 				= 	"executeWorkflow";
	query.submit			=	submit;
	
	// SET CLUSTER 
	query.cluster			=	this.runner.cluster;
	if ( query.cluster != '' )	query.cluster = query.username + "-" + query.cluster;
    else query.cluster = '';
	console.log("RunStatus.runWorkflow     query: " + dojo.toJson(query));

	//// CLEAR DEFERREDS
	//this.clearDeferreds();
	
	// RUN WORKFLOW
	var thisObject = this;
	var deferred = dojo.xhrPut(
		{
			url: url,
			putData: dojo.toJson(query),
			handleAs: "json",
			sync: false,
			handle: function(response){
				console.log("RunStatus.runWorkflow     response: ");
				console.dir({response:response});
				
				// QUIT IF ERROR
				if ( response.error ) {
					// CLEAR DEFERREDS (KILL PENDING POLL STATUS)
					thisObject.clearDeferreds();
					thisObject.polling = false;
					thisObject.displayNotPolling();
					
					if ( response.error == "running" ) {
				console.log("RunStatus.runWorkflow    Doing this.confirmStopWorkfkow()");

						thisObject.confirmStopWorkflow(project, workflow);
					}
					
					console.groupEnd("runStatus-" + thisObject.id + "    runWorkflow");
					return;
				}
				
				Agua.toast(response);
			}
		}
	);

	this.deferreds.push(deferred);

	// SET POLLING TO TRUE
	this.polling = true;

	// DO DELAYED POLL WORKFLOW STATUS
	// (KILLED IF runWorkflow CALL RETURNS ERROR)
	var singleton = false;
	this.delayedQueryStatus(this.runner, singleton);
},
checkRunning : function (project, workflow, callback) {
// PERIODICALLY CHECK THE STATUS OF THE WORKFLOW
	console.group("runStatus-" + this.id + "    checkRunning");

	console.log("RunStatus.checkRunning     project: " + project);
	console.log("RunStatus.checkRunning     workflow: " + workflow);
	console.log("RunStatus.checkRunning     callback: " + callback);

	// GET URL 
	var url = Agua.cgiUrl + "workflow.cgi";
	console.log("RunStatus.checkRunning     url: " + url);		

	// GENERATE QUERY
	var query = new Object;
	query.username 	= Agua.cookie('username');
	query.sessionId = Agua.cookie('sessionId');
	query.project 	= project;
	query.workflow 	= workflow;
	query.mode 		= "getStatus";
	console.log("RunStatus.checkRunning    query: " + dojo.toJson(query));

	// CLEAR DEFERREDS
	this.clearDeferreds();
	
	// RUN WORKFLOW
	
	
	// DO DELAYED POLL WORKFLOW STATUS
	// (KILLED IF runWorkflow CALL RETURNS ERROR)

	var thisObject = this;
	var deferred = dojo.xhrPut(
		{
			url: url,
			putData: dojo.toJson(query),
			handleAs: "json",
			sync: false,
			handle: function(response) {
				console.log("RunStatus.checkRunning    response: ");
				console.dir({response:response});
				
				var isRunning = false;
				if ( response.stages == null )	return false;
				for ( var i = 0; i < response.stages.length; i++ ) {
					if ( response.stages[i].status == "running" ) {
						isRunning = true;
						console.log("RunStatus.checkRunning    stage " + i + " (" + response.stages[i].name + ") is running.");
						break;
					}
				}
				console.log("RunStatus.checkRunning    Doing  callback " + callback + "(" + isRunning + ")");

				thisObject[callback](project, workflow, isRunning);

				console.groupEnd("runStatus-" + thisObject.id + "    checkRunning");

			}
		}
	);
	
	this.deferreds.push(deferred);
},
createRunner : function (startNumber, stopNumber) {
	console.group("RunStatus-" + this.id + "    createRunner");
	if ( ! this.core.userWorkflows.dropTarget ) {
		console.log("workflow.RunStatus.createRunner    Returning without childNodes because this.core.userWorkflows.dropTarget is null");
		console.groupEnd("RunStatus-" + this.id + "    createRunner");
		return runner;
	}
	
	var childNodes = this.core.userWorkflows.dropTarget.getAllNodes();
	
	if ( startNumber == null )	startNumber = 1;
	if ( stopNumber == null )	stopNumber = childNodes.length;
    console.log("workflow.RunStatus.createRunner    startNumber: " + startNumber);
    console.log("workflow.RunStatus.createRunner    stopNumber: " + stopNumber);

	var projectName 	= this.core.userWorkflows.getProject();
	var workflowName 	= this.core.userWorkflows.getWorkflow();
	var workflowNumber 	= Agua.getWorkflowNumber(projectName, workflowName);
    console.log("workflow.RunStatus.createRunner    workflowNumber: " + workflowNumber);

	var clusterName		= this.core.userWorkflows.getCluster();
    console.log("workflow.RunStatus.createRunner    clusterName: " + clusterName);
	
	var runner 			= new Object;
    runner.username 	= Agua.cookie('username');
    runner.sessionId 	= Agua.cookie('sessionId');
    runner.project 		= projectName;
	runner.workflow 	= workflowName;
	runner.cluster 		= clusterName;
	runner.start 		= startNumber;
	runner.stop 		= stopNumber;
	runner.workflownumber = workflowNumber;
	runner.childNodes = childNodes;
	
    console.log("workflow.RunStatus.createRunner    runner: ");
	console.dir({runner:runner});
	
	console.groupEnd("RunStatus-" + this.id + "    createRunner");
	return runner;
},

// GET STATUS
getStatus : function (runner, singleton) {
// KEEP POLLING SERVER FOR RUN STATUS UNTIL COMPLETE
	console.group("RunStatus-" + this.id + "    getStatus");
	console.log("RunStatus.getStatus    runner: ");
	console.dir({runner:runner});
	console.log("RunStatus.getStatus      singleton: " + singleton);
	console.log("RunStatus.getStatus     this.polling: " + this.polling);

	if ( this.polling == true ) {
		console.log("RunStatus.getStatus     Returning because this.polling is TRUE");
		console.groupEnd("RunStatus-" + this.id + "    getStatus");
		return;
	}
	this.polling = true;
	
	// SET this.runner FOR LATER USE (E.G., IN ClusterStatus.js)
	this.runner = runner;
	if ( ! this.runner )  {
		console.log("RunStatus.getStatus    Doing this.runner	= this.createRunner(stageNumber)");
		var stageNumber = 1;
		this.runner	= this.createRunner(stageNumber);
	}
	this.clusterStatus.runner = this.runner;

	if ( ! this.runner.childNodes && this.core.userWorkflows.dropTarget) {
		this.runner.childNodes = this.core.userWorkflows.dropTarget.getAllNodes();
	}

    dojo.removeClass(this.toggle, 'pollingStopped');
    dojo.addClass(this.toggle, 'pollingStarted');
	
	// SET MESSAGE
	this.notifier.innerHTML = "Getting run status...";

	var project		=	this.runner.project;
	var workflow	=	this.runner.workflow;
	var start		=	this.runner.start;
	var childNodes	=	this.runner.childNodes;
	console.log("RunStatus.getStatus      project: " + project);
	console.log("RunStatus.getStatus      workflow: " + workflow);
	console.log("RunStatus.getStatus      start: " + start);
	console.log("RunStatus.getStatus      childNodes.length: " + childNodes.length);

	// SANITY CHECKS
	if ( project == null
		||	workflow == null
		||	start == null ) {
		console.groupEnd("RunStatus-" + this.id + "    getStatus");
		return;
	}
	if ( childNodes == null || ! childNodes || childNodes.length == 0 )
	{
		console.log("RunStatus.getStatus      No childNodes in dropTarget. Returning...");
		console.groupEnd("RunStatus-" + this.id + "    getStatus");
		return;
	}

    // FIRST QUERY
    this.queryStatus(this.runner, singleton);

//	console.groupEnd("RunStatus-" + this.id + "    getStatus");
},
queryStatus : function (runner, singleton) {
// QUERY RUN STATUS ON SERVER
	if ( this.queryStatus.caller )
		console.log("RunStatus.queryStatus    caller: " + this.queryStatus.caller.nom);

	console.log("RunStatus.queryStatus    passed runner: ");
	console.dir({runner:runner});
	console.log("RunStatus.queryStatus    passed singleton: " + singleton);

	// GENERATE QUERY FOR THIS WORKFLOW
	var url 		= this.cgiUrl;
	var query 		= new Object;
	query.username  = runner.username;
	query.sessionId = runner.sessionId;
	query.project   = runner.project;
	query.workflow  = runner.workflow;
	query.mode = "getStatus";
	console.log("RunStatus.queryStatus    query: " + dojo.toJson(query));

	// CLEAR DEFERREDS
	this.clearDeferreds();
	
	var thisObject = this;
	var deferred = dojo.xhrPut(
	{
		url: url,
		putData: dojo.toJson(query),
		handleAs: "json",
		sync: false,
		handle: function(response) {
			if ( thisObject.runCompleted(response) ) {
				console.log("RunStatus.getStatus    response:");
				console.dir({response:response});

				thisObject.handleStatus(runner, response)
				console.groupEnd("RunStatus-" + thisObject.id + "    getStatus");
				if ( ! singleton )
					thisObject.delayedQueryStatus(runner, singleton);
				else
					thisObject.stopPolling();
			}
			else if ( ! singleton ) {
				thisObject.delayedQueryStatus(runner, singleton);
			}
			else
				thisObject.stopPolling();
		}
	});

	this.deferreds.push(deferred);
},
clearDeferreds : function () {
	console.log("RunStatus.clearDeferreds    No. deferreds: " + this.deferreds.length);
	
	dojo.forEach(this.deferreds, function(deferred, index) {
		console.log("RunStatus.clearDeferreds    Clearing deferred " + index + ": " + deferred.callback.toString());
		
		deferred.callback = function() {
			console.log("RunStatus.clearDeferreds    deleted callback");
		}
		
		console.log("RunStatus.clearDeferreds    BEFORE deferred.destroy deferred:");
		console.dir({deferred:deferred});
		
		//deferred.destroy();
	});
	
	this.deferreds = [];
	
	// STOP this.sequence IF ALREADY SET
	console.log("RunStatus.clearDeferreds    Doing this.sequence.stop()");
	this.sequence.stop();

},
showMessage : function (message) {
	console.log("RunStatus.showMessage    message: " + message);	
	console.log("RunStatus.showMessage    Doing queryStatus after delay: " + this.delay);	
},
delayedQueryStatus : function (runner, singleton) {
	console.log("_GroupDragPane.delayedQueryStatus    runner:");
	console.dir({runner:runner});
	console.log("_GroupDragPane.delayedQueryStatus    singleton: " + singleton);
	console.log("_GroupDragPane.delayedQueryStatus    this.polling: " + this.polling);
	
	if ( ! this.polling ) {
		console.log("_GroupDragPane.delayedQueryStatus    this.polling is FALSE. Returning");
		return;
	}
	
	var delay = this.delay;

	// CLEAR COUNTDOWN
	this.clearCountdown();

	// START COUNTDOWN
	var delayInteger = parseInt(delay/1000);
	this.delayCountdown(delayInteger);
	
	// DO DELAY
	var commands = [
		{ func: [ this.showMessage, this, "RunStatus.delayedQueryStatus"], pauseAfter: delay },
		{ func: [ this.queryStatus, this, runner, singleton ] } 
	];
	console.log("_GroupDragPane.delayedPollCopy    commands: ");
	console.dir({commands:commands});
	
	this.sequence.go(commands, function() {
		console.log('RunStatus.delayedQueryStatus    Doing this.sequence.go(commands)');
	});	
},
runCompleted : function (response) {
	var completed = true;
	for ( var i = 0; i < response.length; i++ ) {
		console.log("RunStatus.runCompleted    response.stages[" + i + "].status: " + response.stages[i].status);
		if ( response.stages[i].status == "completed" )
			completed = false;
	}
	
	return completed;
},
handleStatus : function (runner, response) {
	console.group("RunStatus-" + this.id + "    handleStatus");
	var project		=	this.runner.project;
	var workflow	=	this.runner.workflow;
	var start		=	this.runner.start;
	var childNodes	=	this.runner.childNodes;

	console.log("RunStatus.handleStatus     response: ");
	console.dir({response:response});
	
	console.log("RunStatus.handleStatus      this.polling: " + this.polling);
	if ( ! this.polling )	return false;
	
	if ( ! response )	return false;

	// SET MESSAGE
	this.notifier.innerHTML = "Processing run status...";

	// SAVE RESPONSE
	this.response = response;

	// SET COMPLETED FLAG
	this.completed = true;
	
	// SET THE NODE CLASSES BASED ON STATUS
	console.log("RunStatus.handleStatus    Setting class of " + response.stagestatus.length  + " stage nodes");
	
	// CHANGE CSS ON RUN NODES
	var startIndex = runner.start - 1;
	if ( startIndex < 0 ) startIndex = 0;
	console.log("RunStatus.handleStatus    startIndex: " + startIndex);
	for ( var i = startIndex; i < response.stagestatus.length; i++ ) {
		var nodeClass = response.stagestatus[i].status;
		console.log("RunStatus.handleStatus   response.stagestatus[" + i + "].status: " + response.stagestatus[i].status);
		//console.log("RunStatus.handleStatus    response nodeClass " + i + ": " + nodeClass);
		//console.log("RunStatus.handleStatus    runner.childNodes[" + i + "]: " + runner.childNodes[i]);

		// SKIP IF NODE NOT DEFINED
		if ( ! runner.childNodes[i] )
			continue;

		dojo.removeClass(runner.childNodes[i], 'stopped');
		dojo.removeClass(runner.childNodes[i], 'waiting');
		dojo.removeClass(runner.childNodes[i], 'running');
		dojo.removeClass(runner.childNodes[i], 'completed');
		dojo.addClass(runner.childNodes[i], nodeClass);
		
		// UNSET COMPLETED FLAG IF ANY NODE IS NOT COMPLETED
		if ( nodeClass != "completed" ) {
			console.log("RunStatus.handleStatus    Setting this.completed = false");
			this.completed = false;
		}
	}

	if ( this.completed == true ) {
		this.stopPolling();
	}
	console.log("RunStatus.handleStatus    this.completed: " + this.completed);

	console.log("RunStatus.handleStatus     BEFORE Agua.updateStagesStatus(startIndex, response)");
	Agua.updateStagesStatus(response.stagestatus);
	console.log("RunStatus.handleStatus     AFTER Agua.updateStagesStatus(startIndex, response)");

	console.log("RunStatus.handleStatus     BEFORE this.showStatus(startIndex, response)");
	this.showStatus(response);
	console.log("RunStatus.handleStatus     AFTER this.showStatus(startIndex, response)");

	console.groupEnd("RunStatus-" + this.id + "    handleStatus");
	
	return null;
},

// POLLING
clearCountdown : function () {
	if ( this.delayCountdownTimeout )
		clearTimeout(this.delayCountdownTimeout);
	this.toggle.innerHTML = "";
},
delayCountdown : function (countdown) {
	//console.log("RunStatus.delayCountdown    countdown: " + countdown);
	if ( countdown == 1 ) {
		// DOING POLL
		this.notifier.innerHTML = "Getting run status ..."
	}
	countdown -= 1;
	this.toggle.innerHTML = countdown;
	if ( countdown < 1 )	return;
	
	var magicNumber = 850; // 1 sec. ADJUSTED FOR RUN DELAY
	var thisObject = this;
	this.delayCountdownTimeout = setTimeout( function() {
		thisObject.delayCountdown(countdown);
	},
	magicNumber,
	this);
},
togglePoller : function () {
// START TIME IF STOPPED OR STOP IT IF ITS RUNNING 
	console.log("RunStatus.togglePoller      plugins.workflow.RunStatus.togglePoller()");
	console.log("RunStatus.togglePoller      this.polling: " + this.polling);

	if ( this.polling )
	{
		console.log("RunStatus.togglePoller      Setting this.polling to FALSE and this.completed to FALSE");
		this.polling = false;
		this.completed = false;
		this.stopPolling();
	}
	else {
		console.log("RunStatus.togglePoller      Setting this.polling to TRUE and this.completed to TRUE");
		this.polling = true;
		this.completed = true;
		if ( ! this.runner ) {
			this.runner = this.createRunner(1, null);
		}
		
		this.startPolling();
	}
},
displayPolling : function () {
	dojo.removeClass(this.toggle, 'pollingStopped');
	dojo.addClass(this.toggle, 'pollingStarted');
},
displayNotPolling : function () {
	dojo.removeClass(this.toggle, 'pollingStarted');
	dojo.addClass(this.toggle, 'pollingStopped');
},
stopPolling : function () {
// STOP POLLING THE SERVER FOR RUN STATUS
	console.log("RunStatus.stopPolling      plugins.workflow.RunStatus.stopPolling()");

	console.log("RunStatus.stopPolling      Setting this.polling to FALSE");
	this.polling = false;

	// CLEAR COUNTDOWN
	this.clearCountdown();
	this.clearDeferreds();
	
	// UPDATE DISPLAY
	this.displayNotPolling();
},
startPolling : function () {
// RESTART POLLING THE SERVER FOR RUN STATUS
	console.log("RunStatus.startPolling      plugins.workflow.RunStatus.startPolling()");
	console.log("RunStatus.startPolling      this.polling: " + this.polling);
	console.log("RunStatus.togglePoller      Setting this.polling to FALSE (ahead of check this.polling in getStatus)");
    this.polling = false;

	if ( ! this.runner ) {
		console.log("RunStatus.startPolling      this.runner is null. Returning");
		this.polling = false;
		return;
	}

	// UPDATE DISPLAY
	this.displayPolling();

	console.log("RunStatus.togglePoller      Doing this.getStatus(null, false)");
	this.getStatus(null, false);
},

// SHOW STATUS
showStatus : function (response) {
// POPULATE THE 'STATUS' PANE WITH RUN STATUS INFO
	console.log("RunStatus.showStatus      response: ");
	console.dir({response:response});
    if ( ! response ) return;
	
	// SET TIME AT TOP OF STATUS PANEL
	this.setTime(response.stagestatus[0]);

	// SHOW STAGES STATUS
	console.log("RunStatus.showStatus      Doing this.displayStageStatus(response.stages)");
	this.displayStageStatus(response.stagestatus);

	// SHOW CLUSTER STATUS
	console.log("RunStatus.showStatus      Doing this.displayRunStatus(response.clusterstatus)");
	this.displayClusterStatus(response.clusterstatus);

	// SHOW QUEUE STATUS
	console.log("RunStatus.showStatus      Doing this.displayQueueStatus(response.queuestatus)");
	this.displayQueueStatus(response.queuestatus);
},
displayStageStatus : function (stages) {
	console.log("RunStatus.displayStageStatus      plugins.workflow.RunStatus.displayStageStatus(stages)");
	console.log("RunStatus.displayStageStatus      stages: ");
	console.dir({stages:stages});
	
	// REMOVE ANY EXISTING STATUS TABLE
	while ( this.stagesStatusContainer.firstChild )
	{
		this.stagesStatusContainer.removeChild(this.stagesStatusContainer.firstChild);
	}
	console.log("RunStatus.displayStageStatus      AFTER clear status table");
	
	// BUILD TABLE
    delete this.stageStatus;
    this.stageStatus = new plugins.workflow.StageStatus({
        attachNode: this.stagesStatusContainer,
        stages: stages
    });
	console.log("RunStatus.displayStageStatus      this.stageStatus: " + this.stageStatus);
    
	this.stagesStatusContainer.appendChild(this.stageStatus.stageTable);
},
displayClusterStatus : function (status) {
	this.clusterStatus.displayStatus(status);
},
displayQueueStatus : function (queue) {
	console.log("RunStatus.displayQueueStatus      queue: " + queue);
	if ( ! queue )	queue = "No output available";
	
	// REMOVE ANY EXISTING STATUS TABLE
	while ( this.queueStatusContainer.firstChild )
	{
		this.queueStatusContainer.removeChild(this.queueStatusContainer.firstChild);
	}
	
	this.queueStatusContainer.innerHTML = "<PRE>" + queue + "</PRE>";
},
clear : function () {
	console.log("RunStatus.clear      plugins.workflow.RunStatus.clear()");
	this.queueStatusContainer.innerHTML = "";
	this.clusterStatus.clearStatus();
	while ( this.stagesStatusContainer.firstChild )
	{
		this.stagesStatusContainer.removeChild(this.stagesStatusContainer.firstChild);
	}	
},
setTime : function (stage) {
	console.log("RunStatus.setTime    stage: "  + dojo.toJson(stage));

	this.notifier.innerHTML = stage.now;			
},

// WORKFLOW CONTROLS
pauseWorkflow : function () {
	console.log("RunStatus.pauseWorkflow    ");
	var project = this.core.userWorkflows.getProject();
	var workflow = this.core.userWorkflows.getWorkflow();
	this.checkRunning(project, workflow, "confirmPauseWorkflow");
},
stopWorkflow : function () {
	console.log("RunStatus.stopWorkflow    ");
	var project = this.core.userWorkflows.getProject();
	var workflow = this.core.userWorkflows.getWorkflow();
	this.checkRunning(project, workflow, "confirmStopWorkflow");
},
startWorkflow : function () {
	console.log("RunStatus.startWorkflow    ");
	var project = this.core.userWorkflows.getProject();
	var workflow = this.core.userWorkflows.getWorkflow();
	this.checkRunning(project, workflow, "confirmStartWorkflow");
},
confirmPauseWorkflow : function (project, workflow, isRunning) {
	// EXIT IF NO STAGES ARE CURRENTLY RUNNING
	console.log("RunStatus.confirmPauseWorkflow    project: " + project);
	console.log("RunStatus.confirmPauseWorkflow    workflow: " + workflow);
	console.log("RunStatus.confirmPauseWorkflow    isRunning: " + isRunning);
	if ( ! isRunning )	return;

	// ASK FOR CONFIRMATION TO STOP THE WORKFLOW
	var noCallback = function (){
		console.log("WorkflowMenu.confirmPauseWorkflow    noCallback()");
	};
	var yesCallback = dojo.hitch(this, function()
		{
			console.log("WorkflowMenu.confirmPauseWorkflow    yesCallback()");
			this.doPauseWorkflow();
		}								
	);

	// GET THE INDEX OF THE FIRST RUNNING STAGE
	var indexOfRunningStage = this.core.userWorkflows.indexOfRunningStage();
	console.log("RunStatus.confirmPauseWorkflow   indexOfRunningStage: " + indexOfRunningStage);
	this.runner = this.core.runStatus.createRunner(indexOfRunningStage);	

	// SET TITLE AND MESSAGE
	var title = project + "." + workflow + " is running";
	var message = "Are you sure you want to stop it?";

	// SHOW THE DIALOG
	this.loadConfirmDialog(title, message, yesCallback, noCallback);
},
confirmStartWorkflow : function (project, workflow, isRunning) {
	console.log("RunStatus.confirmStartWorkflow    project: " + project);
	console.log("RunStatus.confirmStartWorkflow    workflow: " + workflow);
	console.log("RunStatus.confirmStartWorkflow    isRunning: " + isRunning);

	// EXIT IF STAGES ARE CURRENTLY RUNNING
	if ( isRunning )	return;

	// ASK FOR CONFIRMATION TO STOP THE WORKFLOW
	var noCallback = function (){
		console.log("RunStatus.startWorkflow    noCallback()");
	};
	var yesCallback = dojo.hitch(this, function()
		{
			console.log("RunStatus.startWorkflow    yesCallback()");
			this.doStartWorkflow();
		}								
	);

	// SET TITLE AND MESSAGE
	var title = "Run " + project + "." + workflow + " from start to finish";
	var message = "Please confirm (click Yes to run)";

	// SHOW THE DIALOG
	this.loadConfirmDialog(title, message, yesCallback, noCallback);

},
confirmStopWorkflow : function (project, workflow, isRunning) {
	console.log("RunStatus.confirmStopWorkflow    project: " + project);
	console.log("RunStatus.confirmStopWorkflow    workflow: " + workflow);
	console.log("RunStatus.confirmStopWorkflow    isRunning: " + isRunning);
	// EXIT IF NO STAGES ARE CURRENTLY RUNNING
	if ( ! isRunning )	return;
	
	// OTHERWISE, ASK FOR CONFIRMATION TO STOP THE WORKFLOW
	var noCallback = function (){
		console.log("RunStatus.startWorkflow    noCallback()");
	};
	var yesCallback = dojo.hitch(this, function()
		{
			console.log("RunStatus.startWorkflow    yesCallback()");
			this.doStartWorkflow();
		}								
	);
	
	// SET TITLE AND MESSAGE
	var title = "Run " + project + "." + workflow + " from start to finish";
	var message = "Please confirm (click Yes to run)";

	// SHOW THE DIALOG
	this.loadConfirmDialog(title, message, yesCallback, noCallback);
},
doPauseWorkflow : function () {
	console.log("RunStatus.doPauseWorkflow    plugins.workflow.RunStatus.pauseWorkflow");
	this.pauseRun();	
},
doStartWorkflow : function () {
	console.log("RunStatus.doStartWorkflow    plugins.workflow.RunStatus.startWorkflow");
	this.runner = this.core.runStatus.createRunner(1);	
	this.runWorkflow(this.runner);		
},
doStopWorkflow : function () {
	console.log("RunStatus.stopWorkflow    plugins.workflow.RunStatus.stopWorkflow()");	
	var project		=	this.runner.project;
	var workflow	=	this.runner.workflow;
	var cluster		=	this.runner.cluster;
	var start		=	this.runner.start;

	var username = Agua.cookie('username');
	var sessionId = Agua.cookie('sessionId');

	// SET TIMER CSS 
	dojo.removeClass(this.toggle, 'pollingStopped');
	dojo.addClass(this.toggle, 'pollingStarted');

	// SET MESSAGE
	this.notifier.innerHTML = "Running workflow...";

	// GET URL 
	var url = Agua.cgiUrl + "workflow.cgi";
	console.log("RunStatus.stopWorkflow      url: " + url);		
	
	// GENERATE QUERY JSON FOR THIS WORKFLOW IN THIS PROJECT
	var query = new Object;
	query.username = username;
	query.sessionId = sessionId;
	query.project = project;
	query.workflow = workflow;
	query.cluster = username + "-" + cluster;
	query.mode = "stopWorkflow";
	query.start = start;
	console.log("RunStatus.stopWorkflow     query: " + dojo.toJson(query));
	
	// CLEAR DEFERREDS
	this.clearDeferreds();

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
	
	this.deferreds.push(deferred);
},
stopRun : function () {
	// STOP POLLING
	console.log("RunStatus.stopRun    DOING this.stopPolling()");
	this.stopPolling();

	if ( ! this.core.userWorkflows.dropTarget ) {
		console.log("workflow.RunStatus.stopRun    Returning because this.core.userWorkflows.dropTarget is null");
		return;
	}

	console.log("RunStatus.stopRun      this.stageStatus: " + this.stageStatus);
	console.dir({stageStatus: this.stageStatus});

	if ( this.stageStatus == null
		|| this.stageStatus.rows == null
		|| this.stageStatus.rows.length == 0 )	return;

	// SET ROWS IN STAGE TABLE
	for ( var i = 0; i < this.stageStatus.rows; i++ )
	{
		var row  = this.stageStatus.rows[i];
		console.log("RunStatus.stopRun    row.status " + i + ": " + row.status);
		if ( row.status == 'running' )
			row.status = "stopped";
	}

	// SET CSS IN STAGES dropTarget
	var stageNodes = this.core.userWorkflows.dropTarget.getAllNodes();
	for ( var i = 0; i < this.stageNodes; i++ )
	{
		var node = this.stageNodes[i];
		console.log("RunStatus.stopRun    node " + i + ": " + node);
		if ( dojo.hasClass(node, 'running') )
		{
			dojo.removeClass(node, 'running');
			dojo.addClass(node, 'stopped');
		}
	}

	// SEND STOP SIGNAL TO SERVER
	this.stopWorkflow();	
},	
pauseRun : function () {
// STOP AT THE CURRENT STAGE. TO RESTART FROM  STAGE, HIT 'START' BUTTON
	// STOP POLLING
	console.log("RunStatus.pauseRun      DOING this.stopPolling()");
	this.stopPolling();

	// SEND STOP SIGNAL TO SERVER
	this.stopWorkflow();	

	if ( this.response == null )	return;
	
	// SET THE NODE CLASSES BASED ON STATUS
	console.log("RunStatus.pauseRun    Checking " + this.response.length  + " stage nodes");
	for ( var i = 0; i < this.response.length; i++ )
	{
		// SET this.runner.start TO FIRST RUNNING OR WAITING STAGE
		// SO THAT IF 'RUN' BUTTON IS HIT, WORKFLOW WILL RESTART FROM
		// THAT STAGE (I.E., IT WON'T START OVER FROM THE BE)
		if ( this.response[i].status == "completed" )	continue;
		this.runner.start = (startIndex + 1);

		dojo.removeClass(childNodes[i], 'waiting');
		dojo.removeClass(childNodes[i], 'running');
		dojo.removeClass(childNodes[i], 'completed');
		dojo.addClass(childNodes[i], 'waiting');
		break;
	}
},

// CONFIRM DIALOG
confirmStopWorkflow : function (project, workflow) {
	console.log("RunStatus.confirmStopWorkflow    project " + project + ", workflow " + workflow + " isRunning is true. Loading confirm dialog.");

	// CALLBACKS
	var noCallback = function (){};
	var yesCallback = dojo.hitch(this, function()
		{
			this.stopRun();
		}								
	);

	// SET TITLE AND MESSAGE
	var title = project + "." + workflow + " is already running";
	var message = "Do you want to stop it?";

	// SHOW THE DIALOG
	this.loadConfirmDialog(title, message, yesCallback, noCallback);
},
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
},

// SETTERS
setSequence : function () {
	this.sequence = new dojox.timing.Sequence({});
},
setClusterStatus : function () {
	this.clusterStatus = new plugins.workflow.ClusterStatus({
		core: this.core,
		attachNode	: this.attachNode
	});	
}

});	// plugins.workflow.RunStatus


