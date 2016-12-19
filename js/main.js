$( ".action-edit").click(function() {
    $( "main").toggleClass("edit");
});

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

        // update the posiion attributes
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    })
    .on( "dragend", function(event) {
        console.log('dropped: ', event.target);
    });

interact( "#grid td" )
    .dropzone({
        accept: '.widget',
        overlap: 0.2,
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
            console.log('dropped ', event.relatedTarget, ' to ', event.target);
        },
        ondropdeactivate: function(event) {
            // Maybe do something
        }
    });
