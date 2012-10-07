dojo.provide("plugins.admin.Admin");

dojo.require("plugins.core.Common");

// DISPLAY DIFFERENT PAGES TO ALLOW THE admin AND ORDINARY
// USERS TO MODIFY THEIR SETTINGS

// DnD
dojo.require("dojo.dnd.Source"); // Source & Target
dojo.require("dojo.dnd.Moveable");
dojo.require("dojo.dnd.Mover");
dojo.require("dojo.dnd.move");

// comboBox data store
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dijit.form.ComboBox");
dojo.require("dijit.layout.ContentPane");

// rightPane buttons
dojo.require("dijit.form.Button");

dojo.declare( "plugins.admin.Admin", 
	[ dijit._Widget, dijit._Templated, plugins.core.Common ], {
//Path to the template of this widget. 
templatePath: dojo.moduleUrl("plugins", "admin/templates/admin.html"),

// Calls dijit._Templated.widgetsInTemplate
widgetsInTemplate : true,

// PANE WIDGETS
paneWidgets : null,

// CORE WORKFLOW OBJECTS
core : new Object,

cssFiles : [
	dojo.moduleUrl("plugins", "admin/css/admin.css")
],

/////}}
constructor : function(args) {	
	// LOAD CSS
	this.loadCSS();		
},
postCreate : function() {
	////console.log("Controller.postCreate    plugins.admin.Controller.postCreate()");

	this.startup();
},
startup : function () {
	//console.log("Controller.startup    plugins.admin.Controller.startup()");

    // ADD THIS WIDGET TO Agua.widgets
    Agua.addWidget("admin", this);

	// ADD ADMIN TAB TO TAB CONTAINER		
	Agua.tabs.addChild(this.mainTab);
	Agua.tabs.selectChild(this.mainTab);

	// CREATE HASH TO HOLD INSTANTIATED PANE WIDGETS
	this.paneWidgets = new Object;

	// LOAD HEADINGS FOR THIS USER
	this.headings = Agua.getAdminHeadings();
	console.log("Admin.startup    this.headings:");
	console.dir({this_headings:this.headings});
	
	// LOAD PANES
	this.loadPanes();
},
reload : function (target) {
// RELOAD A WIDGET, WIDGETS IN A PANE OR ALL WIDGETS
	////console.log("Admin.reload     plugins.admin.Admin.reload(target)");
	////console.log("Admin.reload     target: " + target);

	if ( target == "all" )
	{
		for ( var mainPane in this.headings )
		{
			for ( var i in this.headings[mainPane] )
			{
				this.reloadWidget(this.headings[mainPane][i]);
			}
		}
	}
	else if ( target == "leftPane"
			|| target == "middlePane"
			|| target == "rightPane" )
	{
		for ( var i in this.headings[target] )
		{
			this.reloadWidget(this.headings[target][i]);
		}
	}
	
	// OTHERWISE, THE target MUST BE A PANE NAME
	else
	{
		try {
			this.reloadWidget(target);
		}
		catch (e) {}
	}		
},
reloadWidget : function (paneName) {
// REINSTANTIATE A PANE WIDGET
	////console.log("Admin.reloadWidget     Reloading pane: " + paneName);

	delete this.paneWidgets[paneName];

	var adminObject = this;
	this.paneWidgets[paneName] = new plugins.admin[paneName](
		{
			parentWidget: adminObject,
			tabContainer : adminObject.leftTabContainer
		}
	);
},
loadPanes : function () {
	var panes = ["left", "middle", "right"];
	for ( var i = 0; i < panes.length; i++ )
	{
		this.loadPane(panes[i]);
	}
},
loadPane : function(side) {
	//console.log("Admin.loadPane     plugins.admin.Admin.loadPane(side)");
	//console.log("Admin.loadPane     side: " + dojo.toJson(side));
	var pane = side + "Pane";
	var tabContainer = side + "TabContainer";
	if ( this.headings == null || this.headings[pane] == null )	return;
	for ( var i = 0; i < this.headings[pane].length; i++ )
	{
		//console.log("Admin.loadLeftPane     LOADING PANE this.headings[pane][" + i + "]: " + this.headings[pane][i]);

		var tabPaneName = this.headings[pane][i];
		console.log("Admin.loadPane    dojo.require tabPaneName: " + tabPaneName);
		var moduleName = "plugins.admin." + tabPaneName;
		console.log("Admin.loadPane    BEFORE dojo.require moduleName: " + moduleName);
		dojo["require"](moduleName);
		console.log("Admin.loadPane    AFTER dojo.require moduleName: " + moduleName);
		
		var adminObject = this;
		var tabPane = new plugins["admin"][tabPaneName](
			{
				parentWidget: adminObject,
				tabContainer : adminObject[tabContainer]
			}
		);
		
		// REGISTER THE NEW TAB PANE IN this.paneWidgets 
		if( this.paneWidgets[moduleName] == null )
			this.paneWidgets[moduleName] = new Array;
		this.paneWidgets[moduleName].push(tabPane);
	}
},
destroyRecursive : function () {
	console.log("Admin.destroyRecursive    this.mainTab: ");
	console.dir({this_mainTab:this.mainTab});

	if ( Agua && Agua.tabs )
		Agua.tabs.removeChild(this.mainTab);
	
	this.inherited(arguments);
}

}); // end of plugins.admin.Admin

