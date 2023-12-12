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
    afterDOMLoaded:function() {
        //Everything that needs to happen after the DOM has initially loaded.
    },
    startGame:function() {
        console.log(document.querySelector("#ii-container canvas"));
        window.scrollTo(0,0);

        // initialize context
        kaboom({
            canvas: document.querySelector("#ii-container canvas"),
            background: [0,0,0,0]
        });

        //get elements for later
        //var images = document.getElementsByTagName('img');
        var links = document.getElementsByTagName('a');

        scene("game", () => {
            
            /*
            //add images
            for (var i = 0; i < images.length; i++) {
                var img = images[i];
                loadSprite(img.src, img.src);
                var scaleImg = (img.getBoundingClientRect().width / img.naturalWidth != NaN) ? img.getBoundingClientRect().width / img.naturalWidth : 1;
                add([
                    sprite(img.src),
                    pos(img.getBoundingClientRect().left, img.getBoundingClientRect().top),
                    scale(scaleImg),
                    area(),
                    'image'
                ]);
            }*/
            
            //add links (portals)
            loadSprite('portal', chrome.runtime.getURL("sprites/portal.jpeg"));
            for (var i = 0; i < links.length; i++) {
                var link = links[i];
                if (link.getBoundingClientRect().top < 100) continue; 
                add([
                    sprite('portal'),
                    pos(link.getBoundingClientRect().left, link.getBoundingClientRect().top),
                    scale(0.05),
                    area(),
                    'link',
                    {
                        href: link.href
                    }
                ]);
            }

            //add player
            loadSprite('player', chrome.runtime.getURL("sprites/player.jpeg"));
            var player = add([
                sprite("player"),
                pos(0, 0),
                scale(0.05),
                area(),
                "player"
            ]);

            //player movement
            const SPEED = 240;

            onKeyDown("right", () => {
                player.move(SPEED, 0)
            })
            onKeyDown("left", () => {
                player.move(-SPEED, 0)
            })
            onKeyDown("up", () => {
                player.move(0, -SPEED)
            })
            onKeyDown("down", () => {
                player.move(0, SPEED)
            })

            //player collision with link
            player.onCollide("link", (l) => {
                window.location.href = l.href;
            })
        });
        
        go("game");
    },
    stop:function() {
        console.log("Stopping Internet Invaders");
        var body = document.getElementsByTagName('body')[0];
        var div = document.getElementById("ii-container");
        body.removeChild(div);
        iiRunner.hasStarted = false;
    },
    afterDOMLoaded:function() {
        //Everything that needs to happen after the DOM has initially loaded.
        chrome.storage.local.get("iiRunning", function (data) {
            if (typeof data.iiRunning != "undefined" && data.iiRunning === true) {
                iiRunner.start();
            }
        });
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iiRunner.afterDOMLoaded);
} else {
    iiRunner.afterDOMLoaded();
}