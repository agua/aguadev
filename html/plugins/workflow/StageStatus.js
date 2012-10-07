dojo.provide("plugins.workflow.StageStatus");

dojo.require("plugins.workflow.StageStatusRow");

dojo.declare("plugins.workflow.StageStatus",
[ dijit._Widget, dijit._Templated ], {
templatePath: dojo.moduleUrl("plugins", "workflow/templates/stagestatus.html"),

widgetsInTemplate : true,

stages : null,

rows: new Array(),

////}}}}
constructor : function(args) {	
	//console.log("StageStatus.constructor    plugins.workflow.StageStatusRow.constructor(args)");
},
postCreate : function() {
	this.startup();
},
startup : function () {
	this.inherited(arguments);
	console.group("StageStatus-" + this.id + "    startup");
	console.log("StageStatus.startup    this.stages: ");
	console.dir({stages:this.stages});

    this.rows = [];
    if ( this.stages == null )  return;
    
	// SET THE NODE CLASSES BASED ON STATUS
	for ( var i = 0; i < this.stages.length; i++ )
	{
		//console.log("RunStatus.displaythis.stagesStatus     Doing this.stages[" + i + "]: ");
		//console.dir({stage:this.stages[i]});

		var tr = document.createElement('tr');
		this.stageTable.appendChild(tr);
		
		this.stages[i].duration = this.calculateDuration(this.stages[i]);
		console.log("RunStatus.displaythis.stagesStatus     this.stages[i].duration: " + this.stages[i].duration);

		this.stages[i].lapsed = this.calculateLapsed(this.stages[i]);
		console.log("RunStatus.displaythis.stagesStatus     this.stages[i].lapsed: " + this.stages[i].lapsed);

		if ( this.stages[i].completed == "0000-00-00 00:00:00" )
			this.stages[i].completed = '';
		if ( this.stages[i].queued == "0000-00-00 00:00:00" )
			this.stages[i].queued = '';
		
		this.stages[i].core = this.core;
		var statusRow = new plugins.workflow.StageStatusRow(this.stages[i]);
        this.rows.push(statusRow);

		var td = document.createElement('td');
		tr.appendChild(td);
		td.appendChild(statusRow.domNode);
	}
	console.groupEnd("StageStatus-" + this.id + "    startup");
},
clearTable : function () {
    console.log("RunStatus.clearTable    DOING stageStatus.clearTable()");
    while ( this.stageTable.childNodes && this.stageTable.childNodes.length ) {
    console.log("RunStatus.clearTable    REMOVING node " + this.stageTable.childNodes[0]);
        this.stageTable.removeChild(this.stageTable.childNodes[0]);
    }
},
stringToDate : function (string) {
// CONVERT 2010-02-21 10:45:46 TO year, month, day, hour, minutes, seconds

	//console.log("StageStatus.stringToDate    string: " + string);
	// FORMAT: 2012-02-2604:24:14
	var array = string.match(/^(\d{4})\D+(\d+)\D+(\d+)\D+(\d+)\D+(\d+)\D+(\d+)/);
	//console.log("StageStatus.arrayToDate    array: ");
	//console.dir({array:array});
	
	// REMOVE FIRST MATCH (I.E., ALL OF MATCHED STRING)
	array.shift();
	
	// MONTH IS ZERO-INDEXED
	array[1]--;

	// GENERATE NEW DATE
	return new Date(array[0],array[1],array[2],array[3],array[4],array[5]);
},
secondsToDuration : function (milliseconds) {
// CONVERT MILLISECONDS TO hours, mins AND secs 
	var duration = '';
	var remainder = 0;

	// IGNORE MILLISECONDS	
	remainder = milliseconds % 1000;
	milliseconds -= remainder;
	milliseconds /= 1000;

	// GET SECONDS	
	remainder = milliseconds % 60;
	if (remainder)
		duration = remainder.toString();
	else
		duration = "0";
	duration = duration + " sec";

	// Strip off last component
	milliseconds -= remainder;
	milliseconds /= 60;

	// GET HOURS	
	remainder = milliseconds % 60;
	duration = remainder.toString() + " min " + duration;

	// Strip off last component
	milliseconds -= remainder;
	milliseconds /= 60;

	// GET DAYS
	return milliseconds.toString() + " hours " + duration;
},
calculateDuration : function (stage) {
	//console.log("StageStatus.calculateDuration    stage.started: " + stage.started);

	var duration = '';
	// IF STARTED, GET THE DURATION
	if ( stage.started
		&& stage.started != "0000-00-00 00:00:00" )
	{
		// GET DURATION BY SUBSTRACTING started FROM completed OR now
		var startedDate = this.stringToDate(stage.started);
		var currentDate;
		if ( ! stage.completed 
			|| stage.completed == "0000-00-00 00:00:00" ) {
			currentDate = this.stringToDate(stage.now);
		}
		else {
			currentDate = this.stringToDate(stage.completed);
		}
		
		// CONVERT DIFFERENCE TO DURATION
		var seconds = currentDate - startedDate;
		duration = this.secondsToDuration(seconds);
	}

	return duration;
},
calculateLapsed : function (stage) {
	console.log("StageStatus.calculateLapsed    stage.completed: " + stage.completed);

	var lapsed = '';
	if ( ! stage || ! stage.completed )	return lapsed;
	
	var completedDate = this.stringToDate(stage.completed);
	var currentDate	= new Date;
	console.log("StageStatus.calculateLapsed    currentDate: " + currentDate);
	console.dir({currentDate:currentDate});
	
	// GET DURATION BY SUBSTRACTING completed FROM CURRENT TIME
	var seconds = currentDate - completedDate;
	console.log("StageStatus.calculateLapsed    seconds: " + seconds);

	lapsed = this.secondsToDuration(seconds);
	console.log("StageStatus.calculateLapsed    lapsed: " + lapsed);
	
	return lapsed;
}



}); // plugins.workflow.StageStatus
