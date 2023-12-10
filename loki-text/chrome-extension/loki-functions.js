lokiTextRunner = {
    interval: null,
    lokiEnabled: false,
    runLokiStep: function () {
        const fonts = [
            'American Typewriter',
            'Andale Mono',
            'Arial',
            'Arial Black',
            'Arial Narrow',
            'Arial Rounded MT Bold',
            'Arial Unicode MS',
            'Avenir',
            'Avenir Next',
            'Avenir Next Condensed',
            'Baskerville',
            'Big Caslon',
            'Bodoni 72',
            'Bodoni 72 Oldstyle',
            'Bodoni 72 Smallcaps',
            'Bradley Hand',
            'Brush Script MT',
            'Chalkboard',
            'Chalkboard SE',
            'Chalkduster',
            'Charter',
            'Cochin',
            'Comic Sans MS',
            'Copperplate',
            'Courier',
            'Courier New',
            'Didot',
            'DIN Alternate',
            'DIN Condensed',
            'Futura',
            'Geneva',
            'Georgia',
            'Gill Sans',
            'Helvetica',
            'Helvetica Neue',
            'Herculanum',
            'Hoefler Text',
            'Impact',
            'Lucida Grande',
            'Luminari',
            'Marker Felt',
            'Menlo',
            'Microsoft Sans Serif',
            'Monaco',
            'Noteworthy',
            'Optima',
            'Palatino',
            'Papyrus',
            'Phosphate',
            'Rockwell',
            'Savoye LET',
            'SignPainter',
            'Skia',
            'Snell Roundhand',
            'Tahoma',
            'Times',
            'Times New Roman',
            'Trattatello',
            'Trebuchet MS',
            'Verdana',
            'Zapfino',
        ];

        const pageElements = document.querySelectorAll('h1,h2,h3,h4,h5,h6,a,p,code,li,figcaption,input,textarea,button,label,time,div');

        for (i = 0; i < pageElements.length; i++) {
            min = 0;
            max = fonts.length;
            const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
            pageElements[i].style.fontFamily = fonts[randomNumber];
        }
    },
    toggleLoki: function () {
        if (lokiTextRunner.lokiEnabled) {
            lokiTextRunner.lokiEnabled = false;
            clearInterval(lokiTextRunner.interval);
        } else {
            lokiTextRunner.lokiEnabled = true;
            lokiTextRunner.interval = setInterval(lokiTextRunner.runLokiStep, 700);
        }
    }
}