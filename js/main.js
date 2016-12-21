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
                rows: 12
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
                    rows: 12
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
        var migrate = false;
        if (!tmp.config) {
            tmp.config = storage.config;
            migrate = true;
        }
        if (!tmp.pages) {
            tmp.page = generateUUID();
            tmp.pages = [];
            tmp.pages.push({
                id: tmp.page,
                title: "Default",
                widgets: tmp.widgets
            });
            migrate = true;
        }

        if (migrate) {
            persist();
        }

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

var interactEventDragmove = function(event) {
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
};

/*
 * HTML MANIPULATION
 */
var addToTable = function(widget) {
    var gridcell = $($($('#grid').find('tr')[widget.position.row]).find('td')[widget.position.col]);

    var cellWidth = parseFloat(gridcell.width()) + 2,
        cellHeight = parseFloat(gridcell.height()) + 2,
        cellX = parseFloat(gridcell.position().left),
        cellY = parseFloat(gridcell.position().top);

    var width = widget.dimension.col * cellWidth - 2,
        height = widget.dimension.row * cellHeight - 2;

    var div = $("#widget-templates").find("." + widget.type).clone(), iframe;
    div.attr("id", "widget-" + widget.id);
    div.data("widget-id", widget.id);
    switch (widget.type) {
        case "html-widget":
            div.find("label[for='html-widget-popup-form-url']").attr("for", "html-widget-popup-form-url-" + widget.id);
            div.find("#html-widget-popup-form-url").attr("id", "html-widget-popup-form-url-" + widget.id);
            iframe = div.find(".show-view iframe");
            if (widget.data) {
                iframe.attr("src", widget.data.url);
            }
            iframe[0].height = height;
            iframe[0].width= width;
            break;
        case "grafana-widget":
            div.find("label[for='grafana-widget-popup-form-url']").attr("for", "grafana-widget-popup-form-url-" + widget.id);
            div.find("#grafana-widget-popup-form-url").attr("id", "grafana-widget-popup-form-url-" + widget.id);
            div.find("label[for='grafana-widget-popup-form-dashboard']").attr("for", "grafana-widget-popup-form-dashboard-" + widget.id);
            div.find("#grafana-widget-popup-form-dashboard").attr("id", "grafana-widget-popup-form-dashboard-" + widget.id);
            div.find("label[for='grafana-widget-popup-form-panel']").attr("for", "grafana-widget-popup-form-panel-" + widget.id);
            div.find("#grafana-widget-popup-form-panel").attr("id", "grafana-widget-popup-form-panel-" + widget.id);
            iframe = div.find(".show-view iframe");
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
        .draggable(interactInteractionDraggable)
        .resizable({
            edges: { left: false, right: '.widget-resize-handler', bottom: '.widget-resize-handler', top: false }
        })
        .on('dragmove', interactEventDragmove)
        .on('resizemove', function (event) {
            var target = $(event.target);
            var widgetCol = Math.ceil(event.rect.width / cellWidth);
            var widgetRow = Math.ceil(event.rect.height / cellHeight);
            target.width(widgetCol * cellWidth - 2 + 'px');
            target.height(widgetRow * cellHeight - 2 + 'px');
            // resize iframe
            var iframe = target.find(".show-view iframe");
            iframe[0].width = target.width();
            iframe[0].height = target.height();
            var widget = getWidget(target.data("widget-id"));
            widget.dimension = { col: widgetCol, row: widgetRow };
        })
        .on("resizeend", function(event) {
            persist();
            var iframe = $(event.target).find(".show-view iframe");
            iframe.attr("src", iframe.attr("src"));
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
    sharePageButton;

var refreshPage = function() {

    var page = getPage(storage.page),
        i, len = page.widgets.length;

    grid.remove("div.widget");
    for (i=0; i < len; i += 1) {
        addToTable(page.widgets[i]);
    }
};

$(document).ready(function() {

    var widget,
        currentPageIndex = function() {
            var i, len = storage.pages.length;
            for (i=0; i<len; i+=1) {
                if (storage.page === storage.pages[i].id) {
                    break;
                }
            }
            return i;
        },
        updatePageButtonsVisibility = function() {
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

    grid = $("#grid");
    prevPageButton = $("#page-left-action");
    nextPageButton = $("#page-right-action");
    sharePageButton = $("#page-share-action");

    refreshPage();

    updatePageButtonsVisibility();

    prevPageButton.on("click", function() {
        var i = currentPageIndex();
        if (0 < i) {
            storage.page = storage.pages[i-1].id;
            refreshPage();
            updatePageButtonsVisibility();
            persist();
        }
    });
    nextPageButton.on("click", function() {
        var i = currentPageIndex(), len = storage.pages.length;
        if (i < len - 1) {
            storage.page = storage.pages[i+1].id;
            refreshPage();
            updatePageButtonsVisibility();
            persist();
        }
    });

    new Clipboard("#page-share-action", {
        text: function() {
            return getSharePageUrl();
        }
    });

    $( ".action-edit").click(function(event) {
        $( "body").toggleClass("edit");
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
