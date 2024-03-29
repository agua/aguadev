dojo.provide("plugins.view.jbrowse.js.LazyPatricia");

dojo.declare( "plugins.view.jbrowse.js.LazyPatricia", null,
{
});


/*
  Implements a lazy PATRICIA tree.

  This class is a map where the keys are strings.  The map supports fast
  queries by key string prefix ("show me all the values for keys that
  start with "abc").  It also supports lazily loading subtrees.

  Each edge is labeled with a substring of a key string.
  Each node in the tree has one or more children, each of which represents
    a potential completion of the string formed by concatenating all of the
    edge strings from that node up to the root.
    Nodes also have zero or one data items.
  Leaves have zero or one data items.

  Each loaded node is an array.
    element 0 is the edge string;
    element 1 is the data item, or null if there is none;
    any further elements are the child nodes, sorted lexicographically
      by their edge string

  Each lazy node is an array where the first element is the number of
  data items in the subtree rooted at that node, and the second element
  is the edge string for that node.
    when the lazy node is loaded, the lazy array gets replaced with
    a loaded node array; lazy nodes and loaded nodes can be distinguished by:
    "string" == typeof loaded_node[0]
    "number" == typeof lazy_node[0]

  e.g., for the mappings:
    abc   => 0
    abcd  => 1
    abce  => "baz"
    abfoo => [3, 4]
    abbar (subtree to be loaded lazily)

  the structure is:

  [, , ["ab", ,
        [3, "bar"],
        ["c", 0, ["d", 1],
         ["e", "baz"]],
        ["foo", [3, 4]]
        ]
   ]

  The main goals for this structure were to minimize the JSON size on
  the wire (so, no type tags in the JSON to distinguish loaded nodes,
  lazy nodes, and leaves) while supporting lazy loading and reasonably
  fast lookups.
 */

function LazyTrie(baseURL, rootURL) {
    //console.log("js.LazyPatricia.LazyTrie    baseURL: " + baseURL);
    //console.log("js.LazyPatricia.LazyTrie    rootURL: " + rootURL);

    this.baseURL = baseURL;
    var trie = this;

    dojo.xhrGet({url: rootURL,
                 handleAs: "json",
                 load: function(o) {
                     if (!o) {
                         //console.log("failed to load trie");
                         return;
                     }
                     trie.root = o;
                     trie.extra = o[0];
                     if (trie.deferred) {
                         trie.deferred.callee.apply(trie, trie.deferred);
                         delete trie.deferred;
                     }
                 }
        });
}

LazyTrie.prototype.pathToPrefix = function(path) {
    var node = this.root;
    var result = "";
    loop: for (var i = 0; i < path.length; i++) {
        switch(typeof node[path[i]][0]) {
        case 'string': // regular node
            result += node[path[i]][0];
            break;
        case 'number': // lazy node
            result += node[path[i]][1];
            break loop;
        }
        node = node[path[i]];
    }
    return result;
};

LazyTrie.prototype.valuesFromPrefix = function(query, callback) {
    var trie = this;
    this.findNode(query, function(prefix, node) {
            callback(trie.valuesFromNode(node));
        });
};

LazyTrie.prototype.mappingsFromPrefix = function(query, callback) {
    var trie = this;
    this.findNode(query, function(prefix, node) {
            callback(trie.mappingsFromNode(prefix, node));
        });
};

LazyTrie.prototype.mappingsFromNode = function(prefix, node) {
    var results = [];
    if (node[1] !== null)
        results.push([prefix, node[1]]);
    for (var i = 2; i < node.length; i++) {
        if ("string" == typeof node[i][0]) {
            results = results.concat(this.mappingsFromNode(prefix + node[i][0],
                                                           node[i]));
        }
    }
    return results;
};

LazyTrie.prototype.valuesFromNode = function(node) {
    var results = [];
    if (node[1] !== null)
        results.push(node[1]);
    for (var i = 2; i < node.length; i++)
        results = results.concat(this.valuesFromNode(node[i]));
    return results;
};

LazyTrie.prototype.exactMatch = function(key, callback) {
    var trie = this;
    this.findNode(key, function(prefix, node) {
            if ((prefix.toLowerCase() == key.toLowerCase()) && node[1])
                callback(node[1]);
        });
};

LazyTrie.prototype.findNode = function(query, callback) {
    var trie = this;
    this.findPath(query, function(path) {
        var node = trie.root;
        for (i = 0; i < path.length; i++)
            node = node[path[i]];
        var foundPrefix = trie.pathToPrefix(path);
        callback(foundPrefix, node);
    });
};

LazyTrie.prototype.findPath = function(query, callback) {
    if (!this.root) {
        this.deferred = arguments;
        return;
    }
    query = query.toLowerCase();
    var node = this.root;
    var qStart = 0;
    var childIndex;

    var path = [];

    while(true) {
        childIndex = this.binarySearch(node, query.charAt(qStart));
        if (childIndex < 0) return;
        path.push(childIndex);

        if ("number" == typeof node[childIndex][0]) {
            // lazy node
            var trie = this;
            //console.log("js.LazyPatricia.LazyTrie.findPath    DOING xhrGet this.baseURL + this.pathToPrefix(path) + .json : " + this.baseURL + this.pathToPrefix(path) + ".json");
            dojo.xhrGet({url: this.baseURL + this.pathToPrefix(path) + ".json",
                         handleAs: "json",
                         load: function(o) {
                             node[childIndex] = o;
                             trie.findPath(query, callback);
                         }
                        });
            return;
        }

        node = node[childIndex];

        // if the current edge string doesn't match the
        // relevant part of the query string, then there's no
        // match
        if (query.substr(qStart, node[0].length)
            != node[0].substr(0, Math.min(node[0].length,
                                          query.length - qStart)))
            return;

        qStart += node[0].length;
        if (qStart >= query.length) {
            // we've reached the end of the query string, and we
            // have some matches
            callback(path);
            return;
        }
    }
};

LazyTrie.prototype.binarySearch = function(a, firstChar) {
    var low = 2; // skip edge string (in 0) and data item (in 1)
    var high = a.length - 1;
    var mid, midVal;
    while (low <= high) {
        mid = (low + high) >>> 1;
        switch(typeof a[mid][0]) {
        case 'string': // regular node
            midVal = a[mid][0].charAt(0);
            break;
        case 'number': // lazy node
            midVal = a[mid][1].charAt(0);
            break;
        }

        if (midVal < firstChar) {
            low = mid + 1;
        } else if (midVal > firstChar) {
            high = mid - 1;
        } else {
            return mid; // key found
        }
    }

    return -(low + 1);  // key not found.
};

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
