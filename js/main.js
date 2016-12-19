/*
 * HELPER FUNCTIONS
 */

function generateUUID(){
    var d = new Date().getTime();
    if(window.performance && typeof window.performance.now === "function"){
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
}

/*
 * HTML MANIPULATION
 */
var addToTable = function(widget) {
    var gridcell = $($($('#grid').find('tr')[widget.position.row]).find('td')[widget.position.col]);

    var cellWidth = parseInt(gridcell.width()),
        cellHeight = parseInt(gridcell.height());

    var width = widget.dimension.col * cellWidth + 1,
        height = widget.dimension.row * cellHeight + 1;

    var div = $('<div class="widget ' + widget.type +'"></div>');
    div.width(width);
    div.height(height);

    div.appendTo(gridcell);
};

var storage = {
        widgets: []
    },
    tmp;

/*
 * LOCAL STORAGE
 */
if (typeof(Storage) !== "undefined") {
    if (localStorage.dashboard2go) {
        tmp = JSON.parse(localStorage.dashboard2go);
    }
    if (tmp) {
        storage = tmp;
        var widget,
            i,
            len = tmp.widgets.length;
        for (i=0; i < len; i += 1) {
            addToTable(tmp.widgets[i]);
        }
    }
}

var persist = function() {
    if (typeof(Storage) !== "undefined") {
        localStorage.dashboard2go = JSON.stringify(storage);
    }
};

var addWidget = function(widget) {
    widget.id = generateUUID();
    storage.widgets.push(widget);
    addToTable(widget);
    persist();
};

$( ".action-edit").click(function() {
    $( "main").toggleClass("edit");
});

// TODO That's just a shortcut for development
$( "main").toggleClass("edit");

/*
 * interact.js related stuff
 */
interact( "#widget-bar .widget" )
    .draggable({
        inertia: true,
        autoScroll: true,
        restrict: {
            restriction: document.getElementById( "grid" ),
            endOnly: true
        }
    })
    .on( "dragmove", function(event) {
        var target = event.target,
            // keep the dragged position in the data-x/data-y attributes
            x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
            y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        // translate the element
        target.style.webkitTransform =
            target.style.transform =
                'translate(' + x + 'px, ' + y + 'px)';

        // update the position attributes
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    });

interact( "#grid td" )
    .dropzone({
        accept: '.widget',
        overlap: 0.1,
        ondropactivate: function(event) {
            // Maybe do something
        },
        ondragenter: function(event) {
            event.target.classList.add('drop-target');
            event.relatedTarget.classList.add('can-drop');
        },
        ondragleave: function(event) {
            event.target.classList.remove('drop-target');
            event.relatedTarget.classList.remove('can-drop');
        },
        ondrop: function(event) {
            event.target.classList.remove('drop-target');
            event.relatedTarget.classList.remove('can-drop');

            var gridcell = $(event.target),
                element = $(event.relatedTarget);
            var minCol = (parseInt(element.data( "min-width" )) || 2),
                minRow = (parseInt(element.data( "min-height" )) || 2);

            var col = gridcell.index();
            var row = gridcell.parents().index();

            addWidget({
                position: {
                    col: col,
                    row: row
                },
                dimension: {
                    col: minCol,
                    row: minRow
                },
                type: element.data('widgetType')
            });

            var relatedTarget = event.relatedTarget;
            relatedTarget.setAttribute('data-x', 0);
            relatedTarget.setAttribute('data-y', 0);
            relatedTarget.style.webkitTransform =
                relatedTarget.style.transform =
                    'translate(0px, 0px)';
        },
        ondropdeactivate: function(event) {
            // Maybe do something
        }
    });
