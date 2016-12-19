$( ".action-edit").click(function() {
    $( "main").toggleClass("edit");
});

// TODO That's just a shortcut for development
$( "main").toggleClass("edit");

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

            var grid = $(event.target),
                element = $(event.relatedTarget);
            var minCol = (parseInt(element.data( "min-width" )) || 2),
                minRow = (parseInt(element.data( "min-height" )) || 2);
            var cellWidth = parseInt(grid.width()),
                cellHeight = parseInt(grid.height());

            var width = minCol * cellWidth,
                height = minRow * cellHeight;

            var widget = $('<div class="widget"></div>');
            widget.width(width);
            widget.height(height);

            if ('html-widget' === element[0].id)
            switch (element[0].id) {
                case 'html-widget':
                    widget[0].innerHTML = 'HTML Widget';
                    break;
                default:
                    console.log(element);
                    break;
            }

            widget.appendTo(grid);

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
