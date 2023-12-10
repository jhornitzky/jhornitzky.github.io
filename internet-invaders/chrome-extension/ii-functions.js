iiRunner = {
    hasStarted: false,
    start:function() {
        if (!iiRunner.hasStarted) {
            iiRunner.init();
            iiRunner.hasStarted = true;
        }
    },
    init:function() {
        iiRunner.applyStyles();
    },
    applyStyles:function() {
        var body = document.getElementsByTagName('body')[0];
        body.style.transform = 'perspective(400px) rotateX(45deg) translateY(-400px)';
        body.style.marginLeft = body.getBoundingClientRect.width+'px';

        var images = document.getElementsByTagName('img');
        for (i = 0; i < images.length; i++) {
            images[i].style.transform = 'rotateX(-45deg)';
        }
    },
    didCollide:function(object1, object2) {
        if (object1.x < object2.x + object2.width &&
            object1.x + object1.width > object2.x &&
            object1.y < object2.y + object2.height &&
            object1.height + object1.y > object2.y) {
                return true;
            } else {
                return false;
            }
    }
}