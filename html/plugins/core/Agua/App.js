dojo.provide("plugins.core.Agua.App");

/* SUMMARY: THIS CLASS IS INHERITED BY Agua.js AND CONTAINS 
	
	APP METHODS  
*/

dojo.declare( "plugins.core.Agua.App",	[  ], {

/////}}}

// APP METHODS
getApps : function () {
	//console.log("Agua.App.getApps    plugins.core.Data.getApps()");
	return this.cloneData("apps");
},
getAppTypes : function (apps) {
// GET SORTED LIST OF ALL APP TYPES
	var typesHash = new Object;
	for ( var i = 0; i < apps.length; i++ )
	{
		typesHash[apps[i].type] = 1;
	}	
	var types = this.hashkeysToArray(typesHash)
	types = this.sortNoCase(types);
	
	return types;
},
getAppType : function (appName) {
// RETURN THE TYPE OF AN APP OWNED BY THE USER
	console.log("Agua.App.getAppType    plugins.core.Data.getAppType(appName)");
	//console.log("Agua.App.getAppType    appName: *" + appName + "*");
	var apps = this.cloneData("apps");
	for ( var i in apps )
	{
		var app = apps[i];
		if ( app.name.toLowerCase() == appName.toLowerCase() )
			return app.type;
	}
	
	return null;
},
hasApps : function () {
	//console.log("Agua.App.hasApps    plugins.core.Data.hasApps()");
	if ( this.getData("apps").length == 0 )	return false;	
	return true;
},
addApp : function (appObject) {
// ADD AN APP OBJECT TO apps
	console.log("Agua.App.addApp    plugins.core.Data.addApp(appObject)");
	//console.log("Agua.App.addApp    appObject: " + dojo.toJson(appObject));
	var result = this.addData("apps", appObject, [ "name" ]);
	if ( result == true ) this.sortData("apps", "name");
	
	// RETURN TRUE OR FALSE
	return result;
},
removeApp : function (appObject) {
// REMOVE AN APP OBJECT FROM apps
	console.log("Agua.App.removeApp    plugins.core.Data.removeApp(appObject)");
	//console.log("Agua.App.removeApp    appObject: " + dojo.toJson(appObject));
	var result = this.removeData("apps", appObject, ["name"]);
	
	return result;
},
isApp : function (appName) {
// RETURN true IF AN APP EXISTS IN apps
	console.log("Agua.App.isApp    plugins.core.Data.isApp(appName, appObject)");
	console.log("Agua.App.isApp    appName: *" + appName + "*");
	
	var apps = this.getApps();
	for ( var i in apps )
	{
		var app = apps[i];
		console.log("Agua.App.isApp    Checking app.name: *" + app.name + "*");
		if ( app.name.toLowerCase() == appName.toLowerCase() )
		{
			return true;
		}
	}
	
	return false;
}

});