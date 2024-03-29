dojo.provide("plugins.sharing.GroupProjects");


dojo.require("dijit.dijit"); // optimize: load dijit layer


// GENERAL FORM MODULES
dojo.require("dijit.form.Button");
dojo.require("dijit.form.ComboBox");
dojo.require("dijit.form.ComboBox");
dojo.require("dojo.data.ItemFileWriteStore");

// DRAG N DROP
dojo.require("dojo.dnd.Source");

// TOOLTIP
//dojo.require("dijit.Tooltip");

// SLIDER
dojo.require("dijit.form.Slider");

// PARSE
dojo.require("dojo.parser");

// INHERITS
dojo.require("plugins.core.Common");

// HAS A
dojo.require("plugins.sharing.GroupProjectRow");


dojo.declare("plugins.sharing.GroupProjects",

	[ dijit._Widget, dijit._Templated, plugins.core.Common ],
{
//Path to the template of this widget. 
templatePath: dojo.moduleUrl("plugins", "sharing/templates/groupprojects.html"),

// Calls dijit._Templated.widgetsInTemplate
widgetsInTemplate : true,
	
//addingSource STATE
addingSource : false,

// OR USE @import IN HTML TEMPLATE
cssFiles : [ "plugins/sharing/css/groupprojects.css" ],

// PARENT WIDGET
parentWidget : null,

/////}}}

// CONSTRUCTOR	
constructor : function(args) {
	// LOAD CSS
	this.loadCSS();		
},

postCreate : function() {
	this.startup();
},

startup : function () {
	//////console.log("GroupProjects.startup    plugins.sharing.GroupProjects.start()");

	// COMPLETE CONSTRUCTION OF OBJECT
	this.inherited(arguments);	 

	// ADD ADMIN TAB TO TAB CONTAINER		
	this.tabContainer.addChild(this.groupprojectsTab);
	this.tabContainer.selectChild(this.groupprojectsTab);

	// SET GROUP COMBO
	this.setGroupCombo();

	// SET DRAG SOURCE - LIST OF SOURCES
	this.setDragSource();

	// SET DRAG SOURCE SLIDER
	this.setDragSourceSlider();
	
	// SET DROP TARGET - SOURCES ALREADY IN THE GROUP
	this.setDropTarget();
	
	// SET TRASH DROP TARGET
	this.setTrash();
	
	// SUBSCRIBE TO UPDATES
	Agua.updater.subscribe(this, "updateGroups");

	// SUBSCRIBE TO UPDATES
	Agua.updater.subscribe(this, "updateProjects");
},

updateGroups : function (args) {
	//console.log("sharing.GroupProjects.updateGroups    sharing.GroupProjects.updateGroups(args)");
	//console.log("sharing.GroupProjects.updateGroups    args:");
	//console.dir(args);
	this.reload();
},

updateProjects : function (args) {
// RELOAD THE GROUP COMBO AND DRAG SOURCE
// (CALLED AFTER CHANGES TO SOURCES OR GROUPS DATA IN OTHER TABS)
	//console.log("sharing.GroupProjects.updateProjects    sharing.GroupProjects.updateProjects(args)");
	//console.log("sharing.GroupProjects.updateProjects    args:");
	//console.dir(args);
	this.reload();
},

reload : function () {
	//console.log("sharing.GroupProjects.reload    sharing.GroupProjects.reload()");
	// SET GROUP COMBO
	this.setGroupCombo();

	// SET DRAG SOURCE - LIST OF SOURCES
	this.setDragSource();

	// SET DROP TARGET - SOURCES ALREADY IN THE GROUP
	this.setDropTarget();
},

// SET GROUP COMBO BOX
setGroupCombo : function () {
	//////console.log("GroupProjects.setGroupCombo     plugins.sharing.GroupProjects.setGroupCombo()");
	// GET GROUP NAMES		
	var groupNames = Agua.getGroupNames();

	// SET STORE
	var data = {identifier: "name", items: []};
	for ( var i = 0; i < groupNames.length; i++ )
	{
		data.items[i] = { name: groupNames[i]	};
	}

	var store = new dojo.data.ItemFileWriteStore(	{	data: data	}	);

	this.groupCombo.popupClass = "groupprojects groupCombo dijitReset dijitMenu";
	this.groupCombo.wrapperClass = "groupprojects dijitPopup";
	this.groupCombo.itemHeight = 30;
	
	// SET COMBO
	this.groupCombo.store = store;
	this.groupCombo.startup();

	// SET COMBO VALUE
	var firstValue = groupNames[0];
	this.groupCombo.setValue(firstValue);
	//////console.log("GroupProjects.setGroupCombo::setCombo     AFTER this.groupCombo.setValue(firstValue)");

	// CONNECT ONCLICK WITH dojo.connect TO BUILD TABLE
	var groupProjectsObjects = this;
	dojo.connect(this.groupCombo, "onChange", function(event) {
		groupProjectsObjects.setDropTarget();
	});
},



setDragSource : function (position) {
	//////console.log("GroupProjects.setDragSource     plugins.sharing.GroupProjects.setDragSource(position)");
	////////console.log("GroupProjects.setDragSource     position: " + position);

	// REMOVE ALL EXISTING CONTENT
	while ( this.dragSourceContainer.firstChild )
	{
		if ( dijit.byNode(this.dragSourceContainer)
			&& dijit.byNode(this.dragSourceContainer).destroy )
		{
			dijit.byNode(this.dragSourceContainer).destroy();
		}
		this.dragSourceContainer.removeChild(this.dragSourceContainer.firstChild);
	}

	// SET position IF NOT DEFINED
	if ( position == null )	position = 0;

	// RETURN IF USER ARRAY IS NULL OR EMPTY
	if ( Agua.getProjects() == null || Agua.getProjects().length == 0 )
	{
		//////console.log("GroupProjects.setDragSource     Agua.getProjects() is null or empty. Returning.");
		return;
	}

	var projectArray = Agua.getProjects();
	//////console.log("GroupProjects.setDragSource     projectArray: " + dojo.toJson(projectArray));
	//////console.log("GroupProjects.setDragSource     projectArray.length: " + projectArray.length);

	// GENERATE USER DATA TO INSERT INTO DND USER TABLE
	var MAXUSERS = this.maxDisplayedProjects;
	var MULTIPLE = ( projectArray.length - MAXUSERS ) / 100;
			MULTIPLE = MULTIPLE ? MULTIPLE : 1;

	var start = parseInt(position * MULTIPLE);
	var end = parseInt( (position * MULTIPLE) + MAXUSERS );
	if ( ! end || end > projectArray.length )	end = projectArray.length;

	//////console.log("GroupProjects.setDragSource     start: " + start);
	//////console.log("GroupProjects.setDragSource     end: " + end);

	// SORT PROJECT ARRAY

	// GENERATE USER DATA TO INSERT INTO DND USER TABLE
	var dataArray = new Array;
	for ( var j = start; j < end; j++ )
	{
		var data = projectArray[j];				
		data.toString = function () { return this.name; }
		dataArray.push( { data: data, type: ["draggableItem"] } );
	}

	// GENERATE DND SOURCE
	var dragSource = new dojo.dnd.Source(
		this.dragSourceContainer,
		{
			copyOnly: true,
			selfAccept: false,
			accept : [ "none" ]
		}
	);
	dragSource.insertNodes(false, dataArray);

	// projects TABLE QUERY:
	// SELECT DISTINCT projectname, firstname, lastname, email, description FROM projects ORDER BY projectname};
	// SET TABLE ROW STYLE IN dojDndItems
	var allNodes = dragSource.getAllNodes();
	for ( var k = 0; k < allNodes.length; k++ )
	{
		//////console.log("GroupProjects.setDragSource     Setting node " + k + " with data: " + dojo.toJson(dataArray[k].data));

		// ADD CLASS FROM type TO NODE
		var node = allNodes[k];

		// SET NODE name AND description
		node.name = dataArray[k].data.name;
		node.description = dataArray[k].data.description;
		if ( node.description == null ) node.description = '';
		
		// CHECK ATTRIBUTES ARE NOT NULL
		if ( node.description == null )
			node.description = '';

		if ( node.name != null && node.name != '' )
		{
			var project = {
				name : node.name,
				description : node.description
			};
			//////console.log("GroupProjects.setDragSource     project: " + dojo.toJson(project));
			project.parentWidget = this;			

			var groupProjectRow = new plugins.sharing.GroupProjectRow(project);
			//groupProjectRow.toggle();
			////////console.log("GroupProjects.setDragSource     groupProjectRow: " + groupProjectRow);
			node.innerHTML = '';
			node.appendChild(groupProjectRow.domNode);
		}
	}

	var sourceObject = this;
	dragSource.creator = function (item, hint)
	{
		//////console.log("GroupProjects.setDragSource dragSource.creator         item: " + dojo.toJson(item));
		//////console.log("GroupProjects.setDragSource dragSource.creator         item: " + dojo.toJson(item));
		////////console.log("GroupProjects.setDragSource dragSource.creator         hint: " + hint);

		var node = dojo.doc.createElement("div");
		node.name = item.name;
		node.description = item.description;

		node.id = dojo.dnd.getUniqueId();
		node.className = "dojoDndItem";

		//////console.log("GroupProjects.setDragSource dragSource.creator         node.name: " + node.name);
		//////console.log("GroupProjects.setDragSource dragSource.creator         node.description: " + node.description);

		// SET FANCY FORMAT IN NODE INNERHTML
		node.innerHTML = "<table> <tr><td> <img src='http://localhost/agua/plugins/sharing/images/users-18.png' <strong style='color: darkred'>" + node.name + "</strong></td></tr><tr><td> " + node.description + "</td></tr></table>";
		////////console.log("GroupProjects.setDragSource dragSource.creator         node: " + node);

		return {node: node, data: item, type: ["text"]};
	};
},

setDragSourceSlider : function () {
	//////console.log("GroupProjects.setDragSourceSlider     plugins.sharing.GroupProjects.setDragSourceSlider()");
	//////console.log("GroupProjects.dragSourceSourceSlider     this.dragSourceSlider: " + this.dragSourceSlider);

	// ONMOUSEUP
	var groupProjectsObject = this;
	dojo.connect(this.dragSourceSlider, "onMouseUp", dojo.hitch(this, function(e)
	{
		var position = parseInt(this.dragSourceSlider.getValue());
		this.setDragSource(position);
	}));
},

setDropTarget : function () {
	//////console.log("GroupProjects.setDropTarget     plugins.sharing.GroupProjects.setDropTarget()");

	// DELETE EXISTING CONTENTS OF DROP TARGET
	while ( this.dropTargetContainer.firstChild )
	{
		this.dropTargetContainer.removeChild(this.dropTargetContainer.firstChild);
	}

	//// GET THE SOURCES IN THIS GROUP
	var groupname = this.groupCombo.getValue();
	var projectArray = Agua.getProjectsByGroup(groupname);
	if ( projectArray == null )
	{
		//////console.log("GroupProjects.setDropTarget     projectArray is null or empty. Returning.");
		return;
	}		
	//////console.log("GroupProjects.setDropTarget     projectArray: " + dojo.toJson(projectArray));

	var dataArray = new Array;
	for ( var j = 0; j < projectArray.length; j++ )
	{
		var data = projectArray[j];				
		data.toString = function () { return this.name; }
		var description = projectArray[j].description;

		dataArray.push( { data: data, type: ["draggableItem"], description: description  } );
	}
	////////console.log("GroupProjects.setDropTarget     dataArray: " + dojo.toJson(dataArray));
	//////console.log("GroupProjects.setDropTarget     dataArray.length: " + dataArray.length);

	// GENERATE DROP TARGET
	var dropTarget = new dojo.dnd.Source(
		this.dropTargetContainer,
		{
			//copyOnly: true,
			//selfAccept: false
			//,
			accept : [ "draggableItem" ]
		}
	);
	dropTarget.insertNodes(false, dataArray );
	//////console.log("GroupProjects.setDropTarget     dropTarget: " + dropTarget);

	// SET TABLE ROW STYLE IN dojDndItems
	var allNodes = dropTarget.getAllNodes();
	//////console.log("GroupProjects.setDropTarget     Sources.setDropTarget    allNodes.length: " + allNodes.length);
	for ( var k = 0; k < allNodes.length; k++ )
	{
		//////console.log("GroupProjects.setDropTarget     Sources.setDropTarget    dataArray[" + k + "]: " + dojo.toJson(dataArray[k]));

		// ADD CLASS FROM type TO NODE
		var node = allNodes[k];
		var nodeClass = dataArray[k].type;
		//////console.log("GroupProjects.setDropTarget     Sources.setDropTarget    nodeClass: " + nodeClass);
		dojo.addClass(node, nodeClass);

		// SET NODE ATTRIBUTES
		node.name = dataArray[k].data.name;
		node.description = dataArray[k].data.description;

		var project = {
			name : node.name,
			description : node.description
		};
		//////console.log("GroupProjects.setDropTarget     project: " + dojo.toJson(project));
		project.parentWidget = this;			

		var groupProjectRow = new plugins.sharing.GroupProjectRow(project);
		//////console.log("GroupProjects.setDropTarget     groupProjectRow: " + groupProjectRow);
		node.innerHTML = '';
		node.appendChild(groupProjectRow.domNode);
	}
	

	// ADD SPECIAL DRAG AVATAR
	var groupProjectsObject = this;
	dropTarget.creator = function (item, hint)
	{
		//////console.log("GroupProjects.setDropTarget dropTarget.creator(item, hint)");
		////////console.log("GroupProjects.setDropTarget dropTarget.creator         item: " + dojo.toJson(item));
		////////console.log("GroupProjects.setDropTarget dropTarget.creator         hint: " + hint);
		
		// item CAN COME FROM THE DRAG SOURCE OR THE DROP TARGET ITSELF
		var name = item.projectname ? item.projectname : item.name;
		var description = item.projectdesc ? item.projectdesc : item.description;

		if ( name == null || name == '' )
		{
			//////console.log("GroupProjects.setDropTarget dropTarget.creator    name is null or empty! Returning.");
			return;
		}
		if ( description == null ) description = '';
		
		// ADD VALUES TO NODE SO THAT THEY GET PASSED TO this.addToGroup
		var node = dojo.doc.createElement("div");
		node.name = name;
		node.description = description;
		node.id = dojo.dnd.getUniqueId();
		node.className = "dojoDndItem";

		var project = {
			name : name,
			description : description
		};
		//////console.log("GroupProjects.setDropTarget    dropTarget.creator    project: " + dojo.toJson(project));
		project.parentWidget = this;			

		var groupProjectRow = new plugins.sharing.GroupProjectRow(project);
		//////console.log("GroupProjects.setDropTarget    dropTarget.creator    groupProjectRow: " + groupProjectRow);
		node.innerHTML = '';
		node.appendChild(groupProjectRow.domNode);

		// ACCEPTABLE NODE DROPPED ONTO SELF --> ADD TO USER GROUP.
		if ( hint != 'avatar' )
		{
			groupProjectsObject.addToGroup(node.name, node.description, node.name);
		}

		return {node: node, data: item, type: ["draggableItem"]};
	};
	

	// ADD NODE IF DROPPED FROM OTHER SOURCE, DELETE IF DROPPED FROM SELF
	dojo.connect(dropTarget, "onDndDrop", function(source, nodes, copy, target)
	{
		// NODE DROPPED FROM SELF --> DELETE NODE
		if ( source == this && target != this )
		{
			for ( var i = 0; i < nodes.length; i++ )
			{
				var node = nodes[i];
				groupProjectsObject.removeFromGroup(node.name, node.description, node.location);
			}
		}			
		else
		{
			// DO NOTHING IF NODE WAS DROPPED FROM DRAG SOURCE
			// ( IT HAS ALREADY BEEN GENERATED BY dropTarget.creator() )
		}			
		
		// REMOVE DUPLICATE NODES
		var currentNodes = dropTarget.getAllNodes();
		if ( currentNodes == null || ! currentNodes )
		{
			console.log("GroupProjects.setDropTarget dojo.connect onDndDrop    currentNodes is null or empty. Returning");
			return;
		}

		// DELETE DUPLICATE NODES
		var names = new Object;
		console.log("GroupProjects.setDropTarget dojo.connect onDndDrop    Checking for duplicate nodes");
		for ( var i = 0; i < currentNodes.length; i++ )
		{
			var node = currentNodes[i];
			if ( ! names[node.name] )
			{
				names[node.name] = 1;
			}
			else
			{
				// HACK TO AVOID THIS ERROR: node.parentNode is null
				try {
					console.log("GroupProjects.setDropTarget dojo.connect onDndDrop    Removing duplicate node: " + node.name );
					node.parentNode.removeChild(node)
					
					// NB: THIS HAS NO EFFECT ON NODES IN dnd.Source
					//currentNodes.splice(i, 1); 
				}
				catch (e) {}
			}
		}
	});
},

addToGroup : function (name, description, location ) {
	//////console.log("GroupProjects.addToGroup    plugins.sharing.GroupProjects.addToGroup(name, description, location)");
	//////console.log("GroupProjects.addToGroup    name: " + name);
	//////console.log("GroupProjects.addToGroup    description: " + description);
	//////console.log("GroupProjects.addToGroup    location: " + location);
	
	var groupObject = new Object;
	groupObject.username = Agua.cookie('username');
	groupObject.name = name;
	groupObject.description = description;
	groupObject.location = location;
	groupObject.username = Agua.cookie('username');
	
	// ADD SOURCE OBJECT TO THE SOURCES IN THIS GROUP
	var groupName = this.groupCombo.getValue();
	//////console.log("GroupProjects.addToGroup     groupName: " + groupName);

	var success = Agua.addProjectToGroup(groupName, groupObject);
	//////console.log("GroupProjects.addToGroup     Agua.addProjectToGroup success: " + success);
	if ( success == false )
	{
		//////console.log("GroupProjects.addToGroup     Failed to add project to group: " + groupObject.name + ". Returning.");
		return;
	}

	// ADD THE SOURCE INTO THE groupprojects TABLE ON THE SERVER
	var data = new Object;
	data.name = name;
	data.description = description;
	data.location = location;
	data.groupname = groupName;
	data.type = "project";
	
	var url = Agua.cgiUrl + "sharing.cgi";
	var query = new Object;
	query.username = Agua.cookie('username');
	query.sessionId = Agua.cookie('sessionId');
	query.data = data;
	query.mode = "addToGroup";

	var queryString = dojo.toJson(query).replace(/undefined/g, '""');
	////////console.log("GroupProjects.addToGroup    queryString: " + queryString);

	// SEND TO SERVER
	dojo.xhrPut(
		{
			url: url,
			contentType: "text",
			sync : false,
			handleAs: "json",
			putData: queryString,
			timeout: 15000,
			load: function(data)
			{
				//////console.log("GroupProjects.addToGroup    JSON loaded okay");
				//////console.log("GroupProjects.addToGroup    data: " + dojo.toJson(data));		
			},
			error: function(response, ioArgs) {
				//////console.log("GroupProjects.addToGroup    Error with JSON Post, response: " + response + ", ioArgs: " + ioArgs);
				return response;
			}
		}
	);
},

removeFromGroup : function (name, description, location ) {
	//////console.log("GroupProjects.removeFromGroup    plugins.sharing.GroupProjects.removeFromGroup(name, description, location)");
	//////console.log("GroupProjects.removeFromGroup    name: " + name);
	////////console.log("GroupProjects.removeFromGroup    description: " + description);
	////////console.log("GroupProjects.removeFromGroup    location: " + location);

	// REMOVE SOURCE FROM THE SOURCES IN THIS GROUP
	var groupName = this.groupCombo.getValue();
	//////console.log("GroupProjects.removeFromGroup     groupName: " + groupName);

	var groupObject = new Object;
	groupObject.name = name;
	groupObject.description = description;
	groupObject.location = location;
	groupObject.username = Agua.cookie('username');
	//////console.log("GroupProjects.removeFromGroup     groupObject: " + dojo.toJson(groupObject));

	if ( Agua.removeProjectFromGroup(groupName, groupObject) == false )
	{
		//////console.log("GroupProjects.removeFromGroup     Failed to remove project from group: " + groupObject.name + ". Returning.");
		return;
	}

	// REMOVE THE SOURCE FROM THE groupprojects TABLE ON THE SERVER
	var data = new Object;
	data.name = String(name);
	data.description = description;
	data.location = location;
	data.groupname = groupName;
	data.type = "project";
	
	var url = Agua.cgiUrl + "sharing.cgi";
	var query = new Object;
	query.username = Agua.cookie('username');
	query.sessionId = Agua.cookie('sessionId');
	query.data = data;
	query.mode = "removeFromGroup";

	var queryString = dojo.toJson(query).replace(/undefined/g, '""');
	////////console.log("GroupProjects.removeFromGroup    queryString: " + queryString);

	// SEND TO SERVER
	dojo.xhrPut(
		{
			url: url,
			contentType: "text",
			sync : false,
			handleAs: "json",
			putData: queryString,
			timeout: 15000,
			load: function(data)
			{
				//////console.log("GroupProjects.removeFromGroup    JSON loaded okay");
				//////console.log("GroupProjects.removeFromGroup    data: " + dojo.toJson(data));		
			},
			error: function(response, ioArgs) {
				//////console.log("GroupProjects.removeFromGroup    Error with JSON Post, response: " + response + ", ioArgs: " + ioArgs);
				return response;
			}
		}
	);
},

setTrash : function () {
//	DELETE NODE IF DROPPED INTO TRASH. ACTUAL REMOVAL FROM THE
//	DATA IS ACCOMPLISHED IN THE onDndDrop LISTENER OF THE SOURCE
	
	//////console.log("GroupProjects.setTrash     plugins.sharing.GroupProjects.setTrash()");

	var trash = new dojo.dnd.Source(
		this.trashContainer,
		{
			accept : [ "draggableItem" ]
		}
	);
	//////console.log("GroupProjects.setTrash     trash: " + trash);
	//////console.log("GroupProjects.setTrash.domNode     trash.domNode: " + trash.domNode);

	// REMOVE DUPLICATE NODES
	dojo.connect(trash, "onDndDrop", function(source, nodes, copy, target){
		
		//////console.log("GroupProjects.setTrash dojo.connect(onDndDrop)    Checking if target == this.");
		////////console.log("GroupProjects.setTrash dojo.connect(onDndDrop)    source: " + source);
		////////console.log("GroupProjects.setTrash dojo.connect(onDndDrop)    nodes: " + nodes);
		////////console.log("GroupProjects.setTrash dojo.connect(onDndDrop)    copy: " + copy);
		////////console.log("GroupProjects.setTrash dojo.connect(onDndDrop)    target: " + target);
		
		// NODE DROPPED ON SELF --> DELETE THE NODE
		if ( target == this )
		{
			//////console.log("GroupProjects.setTrash dojo.connect(onDndDrop)    target == this. Removing dropped nodes");
			var currentNodes = trash.getAllNodes();
			for ( var i = 0; i < currentNodes.length; i++ )
			{
				var node = currentNodes[i];
				// HACK TO AVOID THIS ERROR: node.parentNode is null
				try {
					node.parentNode.removeChild(node)
				}
				catch (e) {
				}
			}
		}
	});
}

}); // plugins.sharing.GroupProjects
