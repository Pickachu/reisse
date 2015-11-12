JsOsaDAS1.001.00bplist00�Vscript_O/* By default ignore trashed todos */
var config = {
    /* import from these things-focus-lists */
    lists: ['Inbox', 'Today', 'Next', 'Scheduled', 'Someday', 'Logbook'],
    progressDescription: 'Exporting tasks from Cultured Code Things',
    exportFile: '~/Desktop//things.json',
};

var things = things2json(config);
writeObjectToFile(things, config.exportFile);

/* ========================================================================== */

function writeObjectToFile(object, fileName) {
    var expandedExportfile = $.NSString.alloc.initWithUTF8String(fileName).stringByExpandingTildeInPath;
    var bridgedString = $.NSString.alloc.initWithUTF8String(JSON.stringify(object));
    bridgedString.writeToFileAtomicallyEncodingError(expandedExportfile, true, $.NSUTF8StringEncoding, null);
}

/* ========================================================================== */

function things2json(config) {
    'use strict';

    var result = {
        config: {},
        data: {},
        contacts: {}
    };

    var  app = Application('Things'),
    isTrashed = todoFilter(app, 'Trash');

    // only an approximation, there may be less or more steps
    // the progressbar handles higher values graceful
    var todoCount = 0;
    config.lists.forEach(function(listName) {
        todoCount += app.lists[listName].toDos.length;
    });

    Progress.totalUnitCount = todoCount;
    Progress.additionalDescription = config.progressDescription;

    // fill the configure block with life
    configureResult(result);

    // create the time based lists
    config.lists.forEach(function(listName) {
        handleList(listName, result.data, app.lists[listName].toDos);
    });

    // create the contact based lists
    var contacts = app.contacts;
    if (contacts) {
        for (var h = 0; h < contacts.length; h++) {
            var currentContact = contacts[h];
            handleList(currentContact.name(), result.contacts, currentContact.toDos);
        }
    }

    return result;

    /* ====================================================================== */

    function handleList(listName, parentNode, outerTodos) {
        parentNode[listName] = {
            todos: {},
            projects: {}
        };

        var outerTodosLength = outerTodos.length;
        for (var i = 0; i < outerTodosLength; i++) {
            Progress.completedUnitCount++;

            var currentOuterTodo = outerTodos[i];
            if (!currentOuterTodo.project() && !currentOuterTodo.toDos.length) {
                /* simple todo, not in a project */
                if (!isTrashed(currentOuterTodo)) {
                    parentNode[listName].todos[currentOuterTodo.id()] = (objectForTodo(currentOuterTodo));
                }
            } else if (currentOuterTodo.project()) {
                /* simple todo within a project */
                appendProjectToNode(currentOuterTodo.project(), parentNode[listName].projects);
            } else if (currentOuterTodo.toDos.length) {
                /* i am a project */
                appendProjectToNode(currentOuterTodo, parentNode[listName].projects);
            }
        }
    }

    function configureResult(result) {
        result.config.areas = [];

        var areas = app.areas;
        var areasLength = app.areas.length;
        for (var i = 0; i < areasLength; i++) {
            var currentArea = areas[i];
            result.config.areas.push(
				{
				    id: currentArea.id(),
				    name: currentArea.name()
				}
			);
        }
    }

    function appendProjectToNode(project, node) {
        var id = project.id();
        if (!node[id]) {
            node[id] = objectForTodo(project);
            node[id].todos = {};
            appendOpenTodosToNode(project.toDos, node[id].todos);
        }
    }

    function appendOpenTodosToNode(todos, node) {
        var length = todos.length;
        for (var j = 0; j < length; j++) {
            var currentTodo = todos[j];
            if (!isTrashed(currentTodo)) {
                node[currentTodo.id()] = objectForTodo(currentTodo);
            }
        }
    }

    function objectForTodo(todo) {
        var object = {
            id                : todo.id(),
            name              : todo.name(),
            status            : todo.status(),
            notes             : todo.notes(),
            creationDate      : todo.creationDate(),
            modificationDate  : todo.modificationDate(),
        };

        var tagNames = todo.tagNames();
        if (tagNames) {
            object.tagNames = tagNames.split(/,\s*/);
        }

        var area = todo.area();
        if (area) {
            object.area = {
                id: area.id(),
                name: area.name()
            };
        }

        var dueDate = todo.dueDate();
        if (dueDate) {
            object.dueDate = dueDate;
        }

        var activationDate = todo.activationDate();
        if (activationDate) {
            object.activationDate = activationDate;
        }
		
        var completionDate = todo.completionDate();
        if (completionDate) {
            object.completionDate = completionDate;
        }
		
		var cancellationDate = todo.cancellationDate();
        if (cancellationDate) {
            object. cancellationDate = cancellationDate;
        }
								
        return object;
    }

    function todoFilter(app, listName) {
        var map = {},
            todos = app.lists[listName].toDos,
            length = todos.length;

        for (var i = 0; i < length; i++) {
            var id = todos[i].id();
            map[id] = true;
        }

        return function(todo) {
            return !!map[todo.id()];
        };
    }
}                              e jscr  ��ޭ