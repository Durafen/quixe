/* GiLoad -- a game-file loader for Quixe
 * Designed by Andrew Plotkin <erkyrath@eblong.com>
 * <http://eblong.com/zarf/glulx/quixe/>
 * 
 * This Javascript library is copyright 2010 by Andrew Plotkin. You may
 * copy and distribute it freely, by any means and under any conditions,
 * as long as the code and documentation is not changed. You may also
 * incorporate this code into your own program and distribute that, or
 * modify this code and use and distribute the modified version, as long
 * as you retain a notice in your program or documentation which mentions
 * my name and the URL shown above.
 *
####
 */

/*### namespace this */

/* Start with the defaults. These can be modified later by the game_options
   defined in the HTML file. */
var all_options = {
    spacing: 4,      // default spacing between windows
    vm: Quixe,       // default game engine
    io: Glk,         // default display layer
};

/* ### Do this first */
function begin_loading(optobj) {
    if (!optobj)
        optobj = window.game_options;
    if (optobj)
        Object.extend(all_options, optobj); //### prototype-ism

    var gamefile = null;

    var qparams = GetQueryParams();
    gamefile = qparams['story'];

    if (!gamefile)
        gamefile = all_options.default_story;

    if (!gamefile) {
        all_options.io.fatal_error("No story file specified!");
        return;
    }

    var headls = $$('head');
    if (!headls || headls.length == 0) {
        all_options.io.fatal_error("Quixe document has no <head> element!");
        return;
    }
    var head = headls[0];
    var script = new Element('script', 
        { src:gamefile, 'type':"text/javascript" });
    head.insert(script);
}

function GetQueryParams() {
    /* Adapted from querystring.js by Adam Vandenberg */
    var map = {};

    var qs = location.search.substring(1, location.search.length);
    if (qs.length) {
        var args = qs.split('&');

        qs = qs.replace(/\+/g, ' ');
        for (var ix = 0; ix < args.length; ix++) {
            var pair = args[ix].split('=');
            var name = decodeURIComponent(pair[0]);
            
            var value = (pair.length==2)
                ? decodeURIComponent(pair[1])
                : name;
            
            map[name] = value;
        }
    }

    return map;
}

function ParseAsBlorb(image) {
    var len = image.length;
    var pos = 12;

    while (pos < len) {
        var chunktype = String.fromCharCode(image[pos+0], image[pos+1], image[pos+2], image[pos+3]);
        pos += 4;
        var chunklen = (image[pos+0] << 24) | (image[pos+1] << 16) | (image[pos+2] << 8) | (image[pos+3]);
        pos += 4;

        if (chunktype == "GLUL") {
            return image.slice(pos, pos+chunklen);
        }

        pos += chunklen;
        if (pos & 1)
            pos++;
    }

    return null;
}

if (window.atob) {
    Base64ToArray = function(base64data) {
        var data = atob(base64data);
        var image = Array(data.length);
        var ix;
        
        for (ix=0; ix<data.length; ix++)
            image[ix] = data.charCodeAt(ix);
        
        return image;
    }
}
else {
    /* No atob() in Internet Explorer, so we have to invent our own.
       This implementation is adapted from Parchment. */
    var b64decoder = (function() {
            var b64encoder = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            var out = [];
            var ix;
            for (ix=0; ix<b64encoder.length; ix++)
                out[b64encoder.charAt(ix)] = ix;
            return out;
        })();
        
    Base64ToArray = function(base64data) {
        var out = [];
        var c1, c2, c3, e1, e2, e3, e4;
        var i = 0, len = base64data.length;
        while (i < len) {
            e1 = b64decoder[base64data.charAt(i++)];
            e2 = b64decoder[base64data.charAt(i++)];
            e3 = b64decoder[base64data.charAt(i++)];
            e4 = b64decoder[base64data.charAt(i++)];
            c1 = (e1 << 2) + (e2 >> 4);
            c2 = ((e2 & 15) << 4) + (e3 >> 2);
            c3 = ((e3 & 3) << 6) + e4;
            out.push(c1, c2, c3);
        }
        if (e4 == 64)
            out.pop();
        if (e3 == 64)
            out.pop();
        return out;
    }
}

function DecodeGameFile(base64data) {
    var image = Base64ToArray(base64data);
    base64data = null;

    if (image[0] == 0x46 && image[1] == 0x4F && image[2] == 0x52 && image[3] == 0x4D) {
        image = ParseAsBlorb(image);
        if (!image) {
            all_options.io.fatal_error("Blorb file contains no Glulx game!");
            return;
        }
    }

    /* Pass the game image file along to the VM engine. */
    all_options.vm.prepare(image);

    /* Now fire up the display library. This will take care of starting
       the VM engine, once the window is properly set up. */
    all_options.io.init(all_options);
}
/* This is backwards compatibility for the Parchment zcode2js tool. */
processBase64Zcode = DecodeGameFile;


/*### namespace this */
GiLoad = {
    begin_loading: begin_loading,
};
