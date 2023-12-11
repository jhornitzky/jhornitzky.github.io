iiRunner = {
    hasStarted: false,
    start:function() {
        if (!iiRunner.hasStarted) {
            iiRunner.init();
            iiRunner.hasStarted = true;
        }
    },
    init:function() {
        iiRunner.createHtml();
        iiRunner.startGame();
    },
    createHtml:function() {
        var body = document.getElementsByTagName('body')[0];
        var div = document.createElement("div");
        div.id = "ii-container";
        div.style = "position:fixed; left:0; right:0; top:0; bottom:0; z-index:999";
        var canvas = document.createElement("canvas");
        canvas.style = "width:100%; height:100%";
        div.appendChild(canvas);
        body.appendChild(div);
    },
    startGame:function() {
        console.log(document.querySelector("#ii-container canvas"));

        // initialize context
        kaboom({
            canvas: document.querySelector("#ii-container canvas")
        });

        //get elements for later
        var images = document.getElementsByTagName('img');
        var SPEED = 480;

        scene("game", () => {
            
            //add baddies (images)
            for (var i = 0; i < images.length; i++) {
                var img = images[i];
                loadSprite(img.src, img.src);
                var scaleImg = (img.getBoundingClientRect().width / img.naturalWidth != NaN) ? img.getBoundingClientRect().width / img.naturalWidth : 1;
                add([
                    sprite(img.src),
                    pos(img.getBoundingClientRect().left, img.getBoundingClientRect().top+400),
                    scale(scaleImg),
                    move(UP, SPEED),
                    'image'
                ]);
            }

            //add player
            /*
            var player = add([
                sprite("player"),
                pos(width() / 2, height() / 2),
                scale(0.5),
                "player"
            ]);
            */


        });
        
        go("game");
    }
}