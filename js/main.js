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

var storage = {
        widgets: []
    };

/*
 * LOCAL STORAGE
 */
if (typeof(Storage) !== "undefined") {
    var tmp;
    if (localStorage.dashboard2go) {
        tmp = JSON.parse(localStorage.dashboard2go);
    }
    if (tmp) {
        storage = tmp;
    }
}

var persist = function() {
    if (typeof(Storage) !== "undefined") {
        localStorage.dashboard2go = JSON.stringify(storage);
    }
};

/*
 * HTML MANIPULATION
 */
var addToTable = function(widget) {
    var gridcell = $($($('#grid').find('tr')[widget.position.row]).find('td')[widget.position.col]);

    var cellWidth = parseFloat(gridcell.width()) + 1,
        cellHeight = parseFloat(gridcell.height()) + 1,
        cellX = parseFloat(gridcell.position().left),
        cellY = parseFloat(gridcell.position().top);

    var width = widget.dimension.col * cellWidth,
        height = widget.dimension.row * cellHeight;

    var div = $("#widget-templates").find("." + widget.type).clone();
    div.attr("id", "widget-" + widget.id);
    div.data("widget-id", widget.id);
    switch (widget.type) {
        case "html-widget":
            div.find("label[for='html-widget-popup-form-url']").attr("for", "html-widget-popup-form-url-" + widget.id);
            div.find("#html-widget-popup-form-url").attr("id", "html-widget-popup-form-url-" + widget.id);
            var iframe = div.find(".show-view iframe");
            if (widget.data) {
                iframe.attr("src", widget.data.url);
            }
            iframe[0].height = height;
            iframe[0].width= width;
            break;
        default:
            // Do nothing
            break;
    }
    div.width(width);
    div.height(height);

    div.appendTo(gridcell);

    interact( "#" + div.attr("id") )
        .resizable({
            edges: { left: false, right: '.widget-resize-handler', bottom: '.widget-resize-handler', top: false }
        })
        .on('resizestart', function (event) {
            console.log("resize start", event);
        })
        .on('resizemove', function (event) {
            // console.log("resize move", event);
            var target = $(event.target);

            var widgetCol = Math.ceil(event.rect.width / cellWidth);
            var widgetRow = Math.ceil(event.rect.height / cellHeight);
            target.width(widgetCol * (cellWidth + 1) - 2 + 'px');
            target.height(widgetRow * (cellHeight + 1) - 2 + 'px');
            var iframe = target.find(".show-view iframe");
            iframe[0].width = target.width();
            iframe[0].height = target.height();
            var widget = getWidget(target.data("widget-id"));
            widget.dimension = { col: widgetCol, row: widgetRow };
            persist();
        })
        .on("resizeend", function(event) {
            console.log("resize end", event);
            // resize iframe
            var target = $(event.target);

        });
};

var removeFromTable = function(widget) {
    $("#widget-" + widget.id).remove();
};

var addWidget = function(widget) {
    widget.id = generateUUID();
    storage.widgets.push(widget);
    persist();
    addToTable(widget);
};

var removeWidget = function(widget) {
    var i, len = storage.widgets.length;
    for (i=0; i< len; i += 1) {
        if (widget.id === storage.widgets[i].id) {
            break;
        }
    }
    if (i < len) {
        storage.widgets.splice(i, 1);
        persist();
        removeFromTable(widget);
    }
};

var getWidget = function(id) {
    var widget,
        i, len = storage.widgets.length;
    for (i=0; i< len; i += 1) {
        if (id === storage.widgets[i].id) {
            widget = storage.widgets[i];
            break;
        }
    }
    return widget;
};

var grid;

$(document).ready(function() {
    var widget,
        i, len = storage.widgets.length;
    for (i=0; i < len; i += 1) {
        addToTable(tmp.widgets[i]);
    }

    grid = $("#grid");

    $( ".action-edit").click(function(event) {
        $( "main").toggleClass("edit");
        $( ".widget" ).toggleClass("show");
    });

    grid.on("click", ".action-edit-widget", function(event) {
        var widgetElement =  $(event.target).parents(".widget");
        var widget = getWidget(widgetElement.data("widget-id")),
            popup = widgetElement.find(".popup");
        if (widget.data) {
            switch (widget.type) {
                case "html-widget":
                    popup.find("input[name='url']").val(widget.data.url);
                    break;
                default:
                    // Do nothing
                    break;
            }
        }
        popup.toggle();
    });
    grid.on("click", ".action-delete-widget", function(event) {
        var widget = getWidget($(event.target).parents(".widget").data("widget-id"));
        if (widget) {
            removeWidget(widget);
        }
    });
    grid.on("click", ".action-cancel-widget-edit", function(event) {
        $(event.target).parents(".popup").toggle();
    });
    grid.on("click", ".action-save-widget-edit", function(event) {
        var widgetElement = $(event.target).parents(".widget");
        widgetElement.find(".popup").toggle();
        var widget = getWidget(widgetElement.data("widget-id"));
        switch (widget.type) {
            case "html-widget":
                if (!widget.data) {
                    widget.data = {};
                }
                widget.data.url = $(event.target).parents(".popup").find("input[name='url']").val();
                widgetElement.find(".show-view iframe").attr("src", widget.data.url);
                break;
            default:
                // Do nothing
                break;
        }
        persist();
    });

    $( "#edit-action").trigger("click");
});

// TODO That's just a shortcut for development
// $( "main").toggleClass("edit");
// $( ".action-edit").click();

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
