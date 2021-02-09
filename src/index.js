var worker = new Worker("./worker.js");
var filename = "";
var progress_timout_id;
var animations = [];
var animation_lock = false;

var default_error_message = "Error! An unexpected problem occured.";
var load_error_message = "Error! Could not load the pdf.";
var size_error_message = "Error! Pdf has pages of differing sizes.";

worker.onmessage = function (e) {
    try {
        if (e.data instanceof Uint8Array) {
            if (progress_timout_id)
                clearTimeout(progress_timout_id);
            show_result(() => download(e.data));
        } else if (e.data === "error") {
            show_error();
        } else if (e.data === "load-error"){
            show_error(load_error_message);
        } else if (e.data === "size-error"){
            show_error(size_error_message);
        }
        enable_all();
    } catch (error) {
        show_error();
        throw error;
    }
};


async function convert() {
    try {
        disable_all();

        var data = await loadData();

        if (!data) return;

        show_converting();
        worker.postMessage(data.parameters);
        worker.postMessage(data.buffer);

        progress_timout_id = setTimeout(() => {
            if (!animation_lock)
                show_progress()
        }, 1000);

    } catch (error) {
        show_error();
        throw error;
    }
}

async function loadData() {
    let file = document.getElementById("pdffile").files[0];
    if (file) {
        filename = file.name;
        return {
            buffer: await file.arrayBuffer(),
            parameters: {
                lastpage: document.getElementById("lastpage").checked,
                insertafterfront: document.getElementById("insertafterfront").checked,
                insertbeforeback: document.getElementById("insertbeforeback").checked
            },
        };
    }
}

function toggleInsertbeforeback() {
    let lastpage =  document.getElementById("lastpage");
    let insertbeforeback = document.getElementById("insertbeforeback");
    insertbeforeback.disabled = !lastpage.checked;
    if (!lastpage.checked)
        insertbeforeback.checked = false;
}

function disable_all() {
    document.getElementById("pdffile").disabled = true;
    document.getElementById("lastpage").disabled = true;
    document.getElementById("insertafterfront").disabled = true;
    document.getElementById("insertbeforeback").disabled = true;
}

function enable_all() {
    var lastpage = document.getElementById("lastpage");
    
    lastpage.disabled = false;
    document.getElementById("pdffile").disabled = false;
    document.getElementById("insertafterfront").disabled = false;
    document.getElementById("insertbeforeback").disabled = !lastpage.checked;
}

function download(file) {
    var a = document.getElementById("result");
    a.href = URL.createObjectURL(new Blob([file], {
        type: "application/pdf"
    }));
    a.download = filename.replace(".pdf", "-booklet.pdf");
    a.click();
}

function show_result(callback) {
    animations.push(() => { 
        dissappear(document.getElementById("error")); 
    })
    animations.push(() => { 
        dissappear(document.getElementById("converting")); 
    })
    animations.push(() => { 
        dissappear(document.getElementById("long-converting")); 
    })
    animations.push(() => { 
        appear(document.getElementById("result-container"), callback); 
    })
    if (!animation_lock)
        next_animation();
}

function show_progress() {
    animations.push(() => { 
        dissappear(document.getElementById("error")); 
    })
    animations.push(() => { 
        dissappear(document.getElementById("converting")); 
    })
    animations.push(() => { 
        appear(document.getElementById("long-converting")); 
    })
    if (!animation_lock)
        next_animation();
}

function show_converting(callback) {
    animations.push(() => { 
        dissappear(document.getElementById("error")); 
    })
    animations.push(() => { 
        dissappear(document.getElementById("result-container")); 
    })
    animations.push(() => { 
        appear(document.getElementById("converting"), callback); 
    })
    if (!animation_lock)
        next_animation();
}

function show_error(message) {
    document.getElementById("error-message").innerText = message || default_error_message;
    animations.push(() => { 
        dissappear(document.getElementById("converting")); 
    })
    animations.push(() => { 
        dissappear(document.getElementById("long-converting")); 
    })
    animations.push(() => { 
        dissappear(document.getElementById("result-container")); 
    })
    animations.push(() => { 
        appear(document.getElementById("error")); 
    })
    if (!animation_lock)
        next_animation();
}

function next_animation() {
    if (animations.length > 0) {
        animation_lock = true;
        setTimeout(animations.shift(), 200);
    } else {
        animation_lock = false;
    }
}

function appear(elem, callback) {
    elem.className = "animated hidden-start";
    setTimeout(() => { 
        elem.className = "animated appeared";
        elem.addEventListener("transitionend", () => {
            if (callback)
                callback()
            next_animation();
        }, { once: true });
    }, 10);
}

function dissappear(elem) {
    if (elem.className == "hidden") {
        next_animation();
    } else {
        elem.className = "animated hidden-end";
        elem.addEventListener("transitionend", () => {
            elem.className = "hidden";
            next_animation();
        }, { once: true });
    }
}


