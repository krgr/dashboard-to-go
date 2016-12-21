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

var defaultPage = generateUUID(),
    storage = {
        page: defaultPage,
        pages: [
            {
                id: defaultPage,
                title: "Default",
                widgets: []
            }
        ],
        config: {
            page: {
                cols: 26,
                rows: 16
            },
            widgets: {
                grafana: {
                    base: {
                        api: 'https://alpha.zmon.zalan.do/rest/grafana/api/',
                        widget: 'https://alpha.zmon.zalan.do/grafana/dashboard-solo/'
                    }
                }
            }
        }
    },
    // Some defaults we can offer to the user for configuration
    defaults = {
        config: {
            page: {
                landscape : {
                    cols: 26,
                    rows: 16
                },
                portrait: {
                    cols: 12,
                    rows: 26
                }
            }
        }
    };

/*
 * LOCAL STORAGE
 */
var persist = function() {
    if (typeof(Storage) !== "undefined") {
        localStorage.dashboard2go = JSON.stringify(storage);
    }
};

if (typeof(Storage) !== "undefined") {
    var tmp;
    if (localStorage.dashboard2go) {
        tmp = JSON.parse(localStorage.dashboard2go);
    }
    if (tmp) {
        storage = tmp;
    }
}

/*
 * INTERACTION HELPER
 */
var interactInteractionDraggable = {
    inertia: true,
    autoScroll: true,
    restrict: {
        restriction: document.getElementById( "grid" ),
        endOnly: true
    }
};

var getCanvasScale = function() {
    var canvas = document.getElementById("canvas");
    var matrix = window.getComputedStyle(canvas).transform;
    return parseFloat(matrix.replace(/[^0-9\-.,]/g, '').split(',')[0]);
}

var interactEventDragmove = function(event) {
    var scale = getCanvasScale();
    var target = event.target,
        // keep the dragged position in the data-x/data-y attributes
        x = (parseFloat(target.getAttribute('data-x')) || 0) + (event.dx / scale),
        y = (parseFloat(target.getAttribute('data-y')) || 0) + (event.dy / scale);
    // translate the element
    target.style.webkitTransform =
        target.style.transform =
            'translate(' + x + 'px, ' + y + 'px)';

    // update the position attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
};

/*
 * HTML MANIPULATION
 */
var addToTable = function(widget) {
    var gridcell = $($($('#grid').find('tr')[widget.position.row]).find('td')[widget.position.col]);

    var cellWidth = parseFloat(gridcell.width()) + 2,
        cellHeight = parseFloat(gridcell.height()) + 2;

    var width = widget.dimension.col * cellWidth - 2,
        height = widget.dimension.row * cellHeight - 2;

    var div = $("#widget-templates").find("." + widget.type).clone(),
        iframe, id, ids;
    div.attr("id", "widget-" + widget.id);
    div.data("widget-id", widget.id);
    switch (widget.type) {
        case "html-widget":
            ids = ["html-widget-popup-form-url"];
            div.find("label[for='html-widget-popup-form-url']").attr("for", "html-widget-popup-form-url-" + widget.id);
            div.find("#html-widget-popup-form-url").attr("id", "html-widget-popup-form-url-" + widget.id);
            iframe = div.find(".show-view iframe");
            break;
        case "grafana-widget":
            ids = ["grafana-widget-popup-form-url", "grafana-widget-popup-form-dashboard", "grafana-widget-popup-form-panel"];
            iframe = div.find(".show-view iframe");
            break;
        default:
            iframe = undefined;
            ids = [];
            break;
    }
    for (id in ids) {
        div.find("label[for='" + id + "']").attr("for", id + "-" + widget.id);
        div.find("#" + id).attr("id", id + "-" + widget.id);
    }
    if (iframe) {
        if (widget.data) {
            iframe.attr("src", widget.data.url);
        }
        iframe[0].height = height;
        iframe[0].width= width;
    }
    div.width(width);
    div.height(height);

    div.appendTo(gridcell);

    interact( "#" + div.attr("id") )
        .draggable(interactInteractionDraggable)
        .resizable({
            edges: { left: false, right: '.widget-resize-handler', bottom: '.widget-resize-handler', top: false }
        })
        .on('dragmove', interactEventDragmove)
        .on('resizemove', function (event) {
            var scale = getCanvasScale();
            var iframe, target = $(event.target),
                widgetCol = Math.floor(event.rect.width / cellWidth / scale),
                widgetRow = Math.floor(event.rect.height / cellHeight / scale);
            target.width(widgetCol * cellWidth - 2 + 'px');
            target.height(widgetRow * cellHeight - 2 + 'px');
            // resize iframe
            iframe = target.find(".show-view iframe");
            iframe[0].width = target.width();
            iframe[0].height = target.height();
            getWidget(target.data("widget-id")).dimension = { col: widgetCol, row: widgetRow };
        })
        .on("resizeend", function(event) {
            persist();
            var iframe = $(event.target).find(".show-view iframe");
            iframe.attr("src", iframe.attr("src"));
        })
        .on("tap", function(event) {
            var widgetElement =  $(event.target);
            if (!widgetElement.hasClass("widget")) {
                return;
            }
            widgetElement.data("popover", true);
            var widget = getWidget(widgetElement.data("widget-id")),
                popup = widgetElement.find(".popup");
            if (widget.data) {
                switch (widget.type) {
                    case "html-widget":
                        popup.find("input[name='url']").val(widget.data.url);
                        break;
                    case "grafana-widget":
                        var grafanaInputBase = popup.find("input[name='url']"),
                            grafanaSelectDashboard = popup.find("select[name='dashboard']"),
                            grafanaSelectPanel = popup.find("select[name='panel']");
                        grafanaSelectDashboard.attr("disabled", true);
                        grafanaSelectPanel.attr("disabled", true);
                        grafanaInputBase.val(widget.data.base.api);
                        var refreshDashboards = function() {
                            $.ajax(grafanaInputBase.val() + "search", {
                                crossDomain: true,
                                xhrFields: {
                                    withCredentials: true
                                },
                                success: function(data) {
                                    var i, len = data.length,
                                        dashboard,
                                        found,
                                        title;
                                    grafanaSelectDashboard.empty();
                                    for (i=0; i<len; i+=1) {
                                        dashboard = data[i];
                                        if (widget.data.dashboard === dashboard.uri) {
                                            found = dashboard.uri;
                                        }
                                        title = dashboard.title;
                                        if (!title) {
                                            title = dashboard.id;
                                        }
                                        grafanaSelectDashboard.append("<option value=\"" + dashboard.uri + "\"" + (widget.data.dashboard === dashboard.uri ? " selected=\"selected\"" : "") + ">" + title + "</option>")
                                    }
                                    grafanaSelectDashboard.attr("disabled", false);
                                    if (found) {
                                        refreshPanels(found);
                                    }
                                },
                                error: function(response) {
                                    console.error(response);
                                }
                            })
                        };

                        var refreshPanels = function(dashboard) {
                            $.ajax(grafanaInputBase.val() + "dashboards/" + dashboard, {
                                crossDomain: true,
                                xhrFields: {
                                    withCredentials: true
                                },
                                success: function(data) {
                                    var panels = [],
                                        i, len = data.dashboard.rows.length,
                                        panel,
                                        title;
                                    for (i=0; i<len; i+=1) {
                                        Array.prototype.push.apply(panels,data.dashboard.rows[i].panels);
                                    }
                                    len = panels.length;
                                    grafanaSelectPanel.empty();
                                    for (i=0; i<len; i+=1) {
                                        panel = panels[i];
                                        title = panel.title;
                                        if (!title) {
                                            title = panel.id;
                                        }
                                        grafanaSelectPanel.append("<option value=\"" + panel.id + "\"" + (widget.data.panel === ''+panel.id ? " selected=\"selected\"" : "") + ">" + title + "</option>")
                                    }
                                    grafanaSelectPanel.attr("disabled", false);
                                },
                                error: function(response) {
                                    console.error(response);
                                }
                            })
                        };
                        grafanaInputBase.on("change", function() {
                            refreshDashboards();
                        });
                        grafanaSelectDashboard.on("change", function() {
                            refreshPanels(grafanaSelectDashboard.val());
                        });
                        refreshDashboards();
                        break;
                    default:
                        // Do nothing
                        break;
                }
            }
            popup.toggle();
            event.preventDefault();
        })
        .on("doubletap", function(event) {
            var widgetElement =  $(event.target);
            if (!widgetElement.hasClass("widget")) {
                return;
            }
            var widget = getWidget(widgetElement.data("widget-id"));

            if (widget) {
                removeWidget(widget);
            }
            event.preventDefault();
        });
};

var removeFromTable = function(widget) {
    $("#widget-" + widget.id).remove();
};

var getPage = function(id) {
    var i, len = storage.pages.length;
    for (i=0; i<len; i+=1) {
        if (id === storage.pages[i].id) {
            return storage.pages[i];
        }
    }
};

var addWidget = function(widget) {
    widget.id = generateUUID();
    switch (widget.type) {
        case "grafana-widget":
            if (!widget.data) {
                widget.data = {
                    base: storage.config.widgets.grafana.base
                };
            }
            break;
        default:
            break;
    }
    getPage(storage.page).widgets.push(widget);
    persist();
    addToTable(widget);
};

var removeWidget = function(widget) {
    var page = getPage(storage.page),
        i, len = page.widgets.length;
    for (i=0; i< len; i += 1) {
        if (widget.id === page.widgets[i].id) {
            break;
        }
    }
    if (i < len) {
        page.widgets.splice(i, 1);
        persist();
        removeFromTable(widget);
    }
};

var getWidget = function(id) {
    var page = getPage(storage.page),
        i, len = page.widgets.length;
    for (i=0; i< len; i += 1) {
        if (id === page.widgets[i].id) {
            return page.widgets[i];
        }
    }
};

/*
 * SHARING
 */
if (window.location.hash) {
    var scrollV, scrollH,
        data = window.location.hash.substr(1),
        json,
        addOrReplacePage = function(page) {
            var existingPage = getPage(page.id);
            if (existingPage) {
                existingPage.widgets = page.widgets;
                storage.page = page.id;
            }
            else {
                storage.pages.push(json.page);
                storage.page = json.page.id;
            }
        };
    if (data) {
        json = JSON.parse(atob(data));
        if (json.page) {
            addOrReplacePage(json.page);
        }
        else if (json.pages) {
            var i, len = json.pages.length;
            for (i=0; i<len; i+=1) {
                addOrReplacePage(json.pages[i]);
            }
        }
        persist();
    }
    if ("pushState" in history)
        history.pushState("", document.title, window.location.pathname + window.location.search);
    else {
        // Prevent scrolling by storing the page's current scroll offset
        scrollV = document.body.scrollTop;
        scrollH = document.body.scrollLeft;

        location.hash = "";

        // Restore the scroll offset, should be flicker free
        document.body.scrollTop = scrollV;
        document.body.scrollLeft = scrollH;
    }
}

var getSharePageUrl = function() {
    var uri = window.location.href;
    uri += "#" + btoa(JSON.stringify({page: getPage(storage.page)}));
    return uri;
};

var getShareAllPagesUrl = function() {
    var uri = window.location.href;
    uri += "#" + btoa(JSON.stringify({pages: storage.pages}));
    return uri;
};

var grid,
    prevPageButton, nextPageButton,
    addPageButton, removePageButton,
    sharePageButton,
    addRowButton, removeRowButton, addColumnButton, removeColumnButton;

var currentPageIndex = function() {
    var i, len = storage.pages.length;
    for (i=0; i<len; i+=1) {
        if (storage.page === storage.pages[i].id) {
            break;
        }
    }
    return i;
};

var refreshPage = function(grid) {
    var page = getPage(storage.page), widget,
        i, len = page.widgets.length;

    grid.find("div.widget").remove();
    for (i=0; i < len; i += 1) {
        widget = page.widgets[i];
        if (widget.position.col < storage.config.page.cols && widget.position.row < storage.config.page.rows) {
            addToTable(page.widgets[i]);
        }
    }

    if (0 === currentPageIndex()) {
        prevPageButton.hide();
    }
    else {
        prevPageButton.show();
    }
    if (storage.pages.length - 1 === currentPageIndex()) {
        nextPageButton.hide();
    }
    else {
        nextPageButton.show();
    }
};

var refreshCells = function(grid) {
    var i, j, tbody = $("<tbody></tbody>"), row;

    grid.empty();

    for (i=0; i<storage.config.page.rows; i+=1) {
        row = $("<tr></tr>");
        for (j=0; j<storage.config.page.cols; j+=1) {
            $("<td></td>").appendTo(row);
        }
        row.appendTo(tbody);
    }

    tbody.appendTo(grid);

    refreshPage(grid);
};

$(document).ready(function() {
    grid = $("#grid");
    prevPageButton = $("#page-left-action");
    nextPageButton = $("#page-right-action");
    sharePageButton = $("#page-share-action");
    addPageButton = $("#page-add-action");
    removePageButton = $("#page-remove-action");
    addRowButton = $("#row-add-action");
    removeRowButton = $("#row-remove-action");
    addColumnButton = $("#column-add-action");
    removeColumnButton = $("#column-remove-action");

    refreshCells(grid);

    prevPageButton.on("click", function() {
        var i = currentPageIndex();
        if (0 < i) {
            storage.page = storage.pages[i-1].id;
            persist();
            refreshPage(grid);
        }
    });
    nextPageButton.on("click", function() {
        var i = currentPageIndex(), len = storage.pages.length;
        if (i < len - 1) {
            storage.page = storage.pages[i+1].id;
            persist();
            refreshPage(grid);
        }
    });

    addPageButton.on("click", function() {
        console.log('addPageButton');
        var page = {
            id: generateUUID(),
            title: "Default",
            widgets: []
        };
        storage.pages.push(page);
        storage.page = page.id;
        persist();
        refreshPage(grid);
    });

    removePageButton.on("click", function() {
        var i = currentPageIndex();
        if (confirm("Do you really want to remove the current page?")) {
            storage.pages.splice(i,1);
            if (0 === storage.pages.length) {
                addPageButton.trigger("click");
                return;
            }
            if (i === storage.pages.length) {
                i -= 1;
            }
            storage.page = storage.pages[i].id;
            persist();
            refreshPage(grid);
        }
    });

    new Clipboard("#page-share-action", {
            text: function() {
                return getSharePageUrl();
            }
        })
        .on("success", function() {
            var notification = $("<div class=\"notification\">Copied share URL to clipboard!</div>");
            notification.appendTo($("body"));
            setTimeout(function() {
                notification.remove();
            }, 2500);
        });

    addRowButton.on("click", function() {
        storage.config.page.rows += 1;
        persist();
        refreshCells(grid);
    });

    removeRowButton.on("click", function() {
        if (storage.config.page.rows > 0) {
            storage.config.page.rows -= 1;
            persist();
            refreshCells(grid);
        }
    });

    addColumnButton.on("click", function() {
        console.log("add column");
        storage.config.page.cols += 1;
        persist();
        refreshCells(grid);
    });

    removeColumnButton.on("click", function() {
        console.log("remove column");
        if (storage.config.page.cols > 0) {
            storage.config.page.cols -= 1;
            persist();
            refreshCells(grid);
        }
    });

    $( ".action-edit").click(function(event) {
        $( "body").toggleClass("edit");
        $( ".widget" ).toggleClass("show");
    });
    grid.on("click", ".action-cancel-widget-edit", function(event) {
        $(event.target).parents(".popup").toggle();
    });
    grid.on("click", ".action-save-widget-edit", function(event) {
        var widgetElement = $(event.target).parents(".widget");
        var widget = getWidget(widgetElement.data("widget-id"));
        switch (widget.type) {
            case "html-widget":
                if (!widget.data) {
                    widget.data = {};
                }
                widget.data.url = $(event.target).parents(".popup").find("input[name='url']").val();
                widgetElement.find(".show-view iframe").attr("src", widget.data.url);
                break;
            case "grafana-widget":
                if (!widget.data) {
                    widget.data = {};
                }
                var popup = $(event.target).parents(".popup"),
                    panel = popup.find("select[name='panel']").val(),
                    dashboard = popup.find("select[name='dashboard']").val();
                widget.data.url = widget.data.base.widget + dashboard + "?panelId=" + panel + "&fullscreen";
                widget.data.dashboard = dashboard;
                widget.data.panel = panel;
                widgetElement.find(".show-view iframe").attr("src", widget.data.url);
                break;
            default:
                // Do nothing
                break;
        }
        persist();
        widgetElement.find(".popup").toggle();
    });
});

/*
 * interact.js related stuff
 */
interact( "#widget-bar .widget" )
    .draggable(interactInteractionDraggable)
    .on( "dragmove", interactEventDragmove);

interact( "#grid td" )
    .dropzone({
        accept: '.widget',
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

            var col = gridcell.index();
            var row = gridcell.parents().index();

            var widget;

            if (element.hasClass("initial")) {
                var minCol = (parseInt(element.data( "min-width" )) || 2),
                    minRow = (parseInt(element.data( "min-height" )) || 2);

                widget = {
                    position: {
                        col: col,
                        row: row
                    },
                    dimension: {
                        col: minCol,
                        row: minRow
                    },
                    type: element.data('widgetType')
                };

                var relatedTarget = event.relatedTarget;
                relatedTarget.setAttribute('data-x', 0);
                relatedTarget.setAttribute('data-y', 0);
                relatedTarget.style.webkitTransform =
                    relatedTarget.style.transform =
                        'translate(0px, 0px)';
            }
            else {
                widget = getWidget(element.data("widget-id"));
                removeWidget(widget);
                widget.position.col = col;
                widget.position.row = row;
            }

            if (widget) {
                addWidget(widget);
            }
        }
    });
