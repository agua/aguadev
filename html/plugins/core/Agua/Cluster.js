dojo.provide("plugins.core.Agua.Cluster");

/* SUMMARY: THIS CLASS IS INHERITED BY Agua.js AND CONTAINS 
	
	CLUSTER METHODS  
*/

dojo.declare( "plugins.core.Agua.Cluster",	[  ], {

/////}}}

getClusterObject : function (clusterName) {
	console.log("Agua.Cluster.getClusterObject    plugins.core.Data.getClusterObject(clusterName)");
	console.log("Agua.Cluster.getClusterObject    clusterName: " + clusterName);
	var clusters = this.getClusters();
	console.log("Agua.Cluster.getClusterObject    clusters: " + dojo.toJson(clusters));
	if ( clusters == null )	return [];
	var keyArray = ["cluster"];
	var valueArray = [clusterName];
	clusters = this.filterByKeyValues(clusters, keyArray, valueArray);
	console.log("Agua.Cluster.getClusterObject    FILTERED clusters: " + dojo.toJson(clusters));
	
	if ( clusters != null && clusters.length != 0 )
		return clusters[0];
	return null;
},
getClusters : function () {
// RETURN A COPY OF THE clusters ARRAY
	//console.log("Agua.Cluster.getClusters    plugins.core.Data.getClusters()");
	return this.cloneData("clusters");
},
getClusterByWorkflow : function (projectName, workflowName) {
// RETURN THE CLUSTER FOR THIS WORKFLOW, OR "" IF NO CLUSTER ASSIGNED
	//console.log("Agua.Cluster.getClusterByWorkflow    plugins.core.Data.getClusterByWorkflow(projectName, workflowName)");
	//console.log("Agua.Cluster.getClusterByWorkflow    projectName: " + projectName);
	//console.log("Agua.Cluster.getClusterByWorkflow    workflowName: " + workflowName);

	var clusterworkflows = this.cloneData("clusterworkflows");
	//console.log("Agua.Cluster.getClusterObjectByWorkflow   clusterworkflows: " + dojo.toJson(clusterworkflows));
    clusterworkflows = this.filterByKeyValues(clusterworkflows, ["project", "workflow"], [projectName, workflowName]);
	//console.log("Agua.Cluster.getClusterObjectByWorkflow   clusterworkflows: " + dojo.toJson(clusterworkflows));
    
	if ( clusterworkflows != null && clusterworkflows.length > 0 )
        return clusterworkflows[0].cluster;
		
    return null;
},
isClusterWorkflow : function (clusterObject) {
// RETURN 1 IF THE ENTRY ALREADY EXISTS IN clusterworkflows, 0 OTHERWISE
	//console.log("Agua.Cluster.isClusterWorkflow    plugins.core.Data.isClusterWorkflow(clusterObject)");
	//console.log("Agua.Cluster.isClusterWorkflow    clusterObject: " + dojo.toJson(clusterObject));

	var clusterworkflows = this.cloneData("clusterworkflows");
	//console.log("Agua.Cluster.isClusterWorkflow    BEFORE clusterworkflows: " + dojo.toJson(clusterworkflows));
    clusterworkflows = this.filterByKeyValues(clusterworkflows, ["project", "workflow", "cluster"], [clusterObject.project, clusterObject.workflow, clusterObject.cluster]);
	//console.log("Agua.Cluster.isClusterWorkflow    AFTER clusterworkflows: " + dojo.toJson(clusterworkflows));
    
	if ( clusterworkflows != null && clusterworkflows.length > 0 )
        return 1;
		
    return 0;
},
getClusterObjectByWorkflow : function (projectName, workflowName) {

	var clusterName = this.getClusterByWorkflow(projectName, workflowName);
	if ( clusterName == null || ! clusterName) 	return null;
	console.log("Agua.Cluster.getClusterObjectByWorkflow    clusterName: " + clusterName);
	
	return this.getClusterObject(clusterName);
},
getClusterLongName : function (cluster) {
	var username = this.cookie("username");
	var clusterName = "";
	if ( cluster != null && cluster ) clusterName = username + "-" + cluster;
	
	return clusterName;
},
isCluster : function (clusterName) {
// RETURN true IF A CLUSTER EXISTS
	//console.log("Agua.Cluster.isCluster    plugins.core.Data.isCluster(clusterName)");
	//console.log("Agua.Cluster.isCluster    clusterName: *" + clusterName + "*");

	var clusterObjects = this.getClusters();
	var inArray = this._objectInArray(clusterObjects, { cluster: clusterName }, ["cluster"]);	
	//console.log("Agua.Cluster.isCluster    inArray: " + inArray);
	//console.log("Agua.Cluster.isCluster    clusterObjects: " + dojo.toJson(clusterObjects));

	return inArray;
},
addCluster : function (clusterObject) {
	this._removeCluster(clusterObject);
	this._addCluster(clusterObject);

	// SAVE ON REMOTE DATABASE
	var url = this.cgiUrl + "workflow.cgi?";
	clusterObject.username = this.cookie("username");	
	clusterObject.sessionId = this.cookie("sessionId");	
	clusterObject.mode = "addCluster";
	console.log("Agua.Cluster.addCluster    clusterObject: " + dojo.toJson(clusterObject));
	
	this.doPut({ url: url, query: clusterObject, sync: false, timeout: 15000 });
},
newCluster : function (clusterObject) {
	console.log("Agua.Cluster.newCluster    core.Data.newCluster(clusterObject)");
	console.log("Agua.Cluster.newCluster    clusterObject: " + dojo.toJson(clusterObject));

	this._removeCluster(clusterObject);
	this._addCluster(clusterObject);

	// SAVE ON REMOTE DATABASE
	var url = this.cgiUrl + "workflow.cgi?";
	clusterObject.username = this.cookie("username");	
	clusterObject.sessionId = this.cookie("sessionId");	
	clusterObject.mode = "newCluster";
	console.log("Agua.Cluster.newCluster    clusterObject: " + dojo.toJson(clusterObject));
	
	this.doPut({
		url: url,
		query: clusterObject,
		sync: false,
		timeout: 15000,
		callback: dojo.hitch(this, "toast")
	});
},
removeCluster : function (clusterObject) {
	//console.log("Agua.Cluster.removeCluster    Agua.removeCluster(clusterObject)");
	//console.log("Agua.Cluster.removeCluster    clusterObject: " + dojo.toJson(clusterObject));

	var success = this._removeCluster(clusterObject)
	if ( success == false ) {
		console.log("this.removeCluster    this._removeCluster(clusterObject) returned false for cluster: " + clusterObject.cluster);
		return;
	}
	
	var url = this.cgiUrl + "workflow.cgi?";
	clusterObject.username = this.cookie("username");
	clusterObject.sessionId = this.cookie("sessionId");
	clusterObject.mode = "removeCluster";
	console.log("this.removeCluster    clusterObject: " + dojo.toJson(clusterObject));

	this.doPut({ url: url, query: clusterObject, sync: false, timeout: 15000 });	
},
_removeCluster : function (clusterObject) {
// REMOVE A CLUSTER OBJECT FROM THE clusters ARRAY
	console.log("Agua.Cluster._removeCluster    plugins.core.Data._removeCluster(clusterObject)");
	console.log("Agua.Cluster._removeCluster    clusterObject: " + dojo.toJson(clusterObject));
	var requiredKeys = ["cluster"];
	return this.removeData("clusters", clusterObject, requiredKeys);
},
_addCluster : function (clusterObject) {
// ADD A CLUSTER TO clusters AND SAVE ON REMOTE SERVER
	console.log("Agua.Cluster._addCluster    plugins.core.Data._addCluster(clusterObject)");
	//console.log("Agua.Cluster._addCluster    clusterObject: " + dojo.toJson(clusterObject));

	// DO THE ADD
	var requiredKeys = ["cluster"];
	return this.addData("clusters", clusterObject, requiredKeys);
},
_removeClusterWorkflow : function (clusterObject) {
// REMOVE A CLUSTER OBJECT FROM THE clusters ARRAY
	console.log("Agua.Cluster._removeClusterWorkflow    plugins.core.Data._removeClusterWorkflow(clusterObject)");
	var requiredKeys = ["project", "workflow"];
	return this.removeData("clusterworkflows", clusterObject, requiredKeys);
},
_addClusterWorkflow : function (clusterObject) {
// ADD A CLUSTER TO clusters AND SAVE ON REMOTE SERVER
	console.log("Agua.Cluster._addClusterWorkflow    plugins.core.Data._addClusterWorkflow(clusterObject)");
	console.log("Agua.Cluster._addClusterWorkflow    clusterObject: " + dojo.toJson(clusterObject));

	// DO THE ADD
	var requiredKeys = ["cluster", "project", "workflow"];
	return this.addData("clusterworkflows", clusterObject, requiredKeys);
},
getAmis : function () {
// RETURN A COPY OF THE amis ARRAY
	//console.log("Agua.Cluster.getAmis    plugins.core.Data.getAmis()");
	return this.cloneData("amis");
},
getAmiObjectById : function (amiid) {
	//console.log("Agua.Cluster.getAmiObjectById    plugins.core.Data.getAmiObjectById()");
	var amis = this.getAmis();	
	//console.log("Agua.Cluster.getAmiObjectById    amis: " + dojo.toJson(amis));
	return this._getObjectByKeyValue(amis, ["amiid"], amiid);	
},
addAmi : function (amiObject) {
	this._removeAmi(amiObject);
	this._addAmi(amiObject);

	// SAVE ON REMOTE DATABASE
	var url = this.cgiUrl + "workflow.cgi?";
	amiObject.username = this.cookie("username");	
	amiObject.sessionId = this.cookie("sessionId");	
	amiObject.mode = "addAmi";
	console.log("Agua.Cluster.addAmi    amiObject: " + dojo.toJson(amiObject));
	
	this.doPut({ url: url, query: amiObject, sync: false, timeout: 15000 });
},
removeAmi : function (amiObject) {
	console.log("Agua.Cluster.removeAmi    Agua.removeAmi(amiObject)");
	//console.log("Agua.Cluster.removeAmi    amiObject: " + dojo.toJson(amiObject));

	var success = this._removeAmi(amiObject)
	if ( success == false ) {
		console.log("this.removeAmi    this._removeAmi(amiObject) returned false for ami: " + amiObject.ami);
		return;
	}
	
	var url = this.cgiUrl + "sharing.cgi?";
	amiObject.username = this.cookie("username");
	amiObject.sessionId = this.cookie("sessionId");
	amiObject.mode = "removeAmi";
	//console.log("this.removeAmi    amiObject: " + dojo.toJson(amiObject));

	this.doPut({ url: url, query: amiObject, sync: false, timeout: 15000 });	
},
_removeAmi : function (amiObject) {
// REMOVE A CLUSTER OBJECT FROM THE amis ARRAY
	console.log("Agua.Cluster._removeAmi    plugins.core.Data._removeAmi(amiObject)");
	//console.log("Agua.Cluster._removeAmi    amiObject: " + dojo.toJson(amiObject));
	var requiredKeys = ["amiid"];
	return this.removeData("amis", amiObject, requiredKeys);
},
_addAmi : function (amiObject) {
// ADD A CLUSTER TO amis AND SAVE ON REMOTE SERVER
	console.log("Agua.Cluster._addAmi    plugins.core.Data._addAmi(amiObject)");
	//console.log("Agua.Cluster._addAmi    amiObject: " + dojo.toJson(amiObject));

	// DO THE ADD
	var requiredKeys = ["amiid"];
	return this.addData("amis", amiObject, requiredKeys);
}


});