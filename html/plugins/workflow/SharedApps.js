dojo.provide("plugins.workflow.SharedApps");

// ALLOW THE USER TO SELECT APPLICATIONS BELONGING TO OTHER USERS AND DRAG THEM INTO WORKFLOWS

// NB: USERS CAN MANAGE THEIR APPS IN THE 'ADMIN' TAB

// INTERNAL MODULES
dojo.require("plugins.workflow.Apps");

dojo.declare("plugins.workflow.SharedApps",
	[ plugins.workflow.Apps ],
{

//Path to the template of this widget. 
templatePath: dojo.moduleUrl("plugins", "workflow/templates/sharedapps.html"),

/////}

startup : function() {
	console.log("SharedApps.startup    workflow.SharedApps.startup()");

	this.inherited(arguments);
},

setRefreshButton : function () {
	dojo.connect(this.refreshButton, "onclick", this, "refresh");	
},

refresh : function () {
	////console.log("SharedApps.refresh     plugins.workflow.SharedApps.refresh()");

	this.updateApps();
},

updateApps : function (args) {
	////console.log("SharedApps.refresh     plugins.workflow.SharedApps.refresh()");
	console.log("SharedApps.updateApps    Doing Agua.getTable(sharedapps)");
	this.closePanes();

	// ALLOW TIME FOR PANES TO CLOSE THEN GET TABLE DATA	
	setTimeout(function(thisObj) {
		Data.getTable("sharedApps,sharedParameters");
		//Agua.warning("Completed reloading shared applications");
		thisObj.loadAppSources();
	}, 500, this);
},

getApps : function () {
	return Agua.getSharedApps();
}
	
}); // plugins.workflow.SharedApps

/*

loadAppSources : function () {
	console.log("SharedApps.loadAppSources     plugins.workflow.SharedApps.loadAppSources()");	
	console.log("SharedApps.loadAppSources     caller: " + this.loadAppSources.caller.nom);

	// DELETE EXISTING CONTENT
	//while ( this.dragSource.firstChild )
	//	this.dragSource.removeChild(this.dragSource.firstChild);
	this.clearDragSource();

	var apps = this.getApps();
	console.log("SharedApps.loadAppSources     apps: " + dojo.toJson(apps));
	var types = Agua.getAppTypes(apps);
	console.log("SharedApps.loadAppSources     types: " + dojo.toJson(types));

	//for ( var i = 0; i < types.length; i++ )
	for ( var i = 0; i < 1; i++ )
	{
		var type = types[i];
		console.log("SharedApps.loadAppSources     Doing type: " + dojo.toJson(type));		
		var itemArray = Agua.getAppsByType(type, apps);
		console.log("SharedApps.loadAppSources     itemArray: " + dojo.toJson(itemArray));		
		if ( itemArray == null || itemArray.length == 0 )	continue;
		console.log("SharedApps.loadAppSources     type '" + type + "' itemArray: " + dojo.toJson(itemArray));

		// CREATE TITLE PANE
		var appSource = new plugins.workflow.AppSource(
		{
			title		: 	type,
			itemArray 	:	itemArray,
			contextMenu	:	this.contextMenu
		});
		this.appSourcesContainer.appendChild(appSource.domNode);
	}
}
*/
