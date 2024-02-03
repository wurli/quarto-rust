"use strict";

// Adapted from mdBook: https://github.com/rust-lang/mdBook/blob/master/src/theme/book.js

// Global variable, shared between modules
function playground_text(playground, hidden = true) {
    let code_block = playground.querySelector("code");

    if (window.ace && code_block.classList.contains("editable")) {
        let editor = window.ace.edit(code_block);
        return editor.getValue();
    } else if (hidden) {
        return code_block.textContent;
    } else {
        return code_block.innerText;
    }
}

function fetch_with_timeout(url, options, timeout = 6000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
    ]);
}

var playgrounds = Array.from(document.querySelectorAll(".playground"));
if (playgrounds.length > 0) {
    fetch_with_timeout("https://play.rust-lang.org/meta/crates", {
        headers: {
            'Content-Type': "application/json",
        },
        method: 'POST',
        mode: 'cors',
    })
    .then(response => response.json())
    .then(response => {
        // get list of crates available in the rust playground
        let playground_crates = response.crates.map(item => item["id"]);
        playgrounds.forEach(block => handle_crate_list_update(block, playground_crates));
    });
}

function handle_crate_list_update(playground_block, playground_crates) {
    // update the play buttons after receiving the response
    update_play_button(playground_block, playground_crates);

    // and install on change listener to dynamically update ACE editors
    if (window.ace) {
        let code_block = playground_block.querySelector("code");
        if (code_block.classList.contains("editable")) {
            let editor = window.ace.edit(code_block);
            editor.addEventListener("change", function (e) {
                update_play_button(playground_block, playground_crates);
            });
            // add Ctrl-Enter command to execute rust code
            editor.commands.addCommand({
                name: "run",
                bindKey: {
                    win: "Ctrl-Enter",
                    mac: "Ctrl-Enter"
                },
                exec: _editor => run_rust_code(playground_block)
            });
        }
    }
}

// updates the visibility of play button based on `no_run` class and
// used crates vs ones available on http://play.rust-lang.org
function update_play_button(pre_block, playground_crates) {
    var play_button = pre_block.querySelector(".play-button");

    // skip if code is `no_run`
    if (pre_block.querySelector('code').classList.contains("no_run")) {
        play_button.classList.add("hidden");
        return;
    }

    // get list of `extern crate`'s from snippet
    var txt = playground_text(pre_block);
    var re = /extern\s+crate\s+([a-zA-Z_0-9]+)\s*;/g;
    var snippet_crates = [];
    var item;
    while (item = re.exec(txt)) {
        snippet_crates.push(item[1]);
    }

    // check if all used crates are available on play.rust-lang.org
    var all_available = snippet_crates.every(function (elem) {
        return playground_crates.indexOf(elem) > -1;
    });

    if (all_available) {
        play_button.classList.remove("hidden");
    } else {
        play_button.classList.add("hidden");
    }
}

function run_rust_code(code_block) {
    var result_block = code_block.querySelector(".result");
    if (!result_block) {
        result_block = document.createElement('code');
        result_block.className = 'result hljs language-bash';

        code_block.append(result_block);
    }

    let text = playground_text(code_block);
    let classes = code_block.querySelector('code').classList;
    let edition = "2015";
    if (classes.contains("edition2018")) {
        edition = "2018";
    } else if (classes.contains("edition2021")) {
        edition = "2021";
    }
    var params = {
        version: "stable",
        optimize: "0",
        code: text,
        edition: edition
    };

    if (text.indexOf("#![feature") !== -1) {
        params.version = "nightly";
    }

    result_block.innerText = "Running...";

    fetch_with_timeout("https://play.rust-lang.org/evaluate.json", {
        headers: {
            'Content-Type': "application/json",
        },
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(params)
    })
    .then(response => response.json())
    .then(response => {
        if (response.result.trim() === '') {
            result_block.innerText = "No output";
            result_block.classList.add("result-no-output");
        } else {
            result_block.innerText = response.result;
            result_block.classList.remove("result-no-output");
        }
    })
    .catch(error => result_block.innerText = "Playground Communication: " + error.message);
}

// Syntax highlighting Configuration
hljs.configure({
    tabReplace: '    ', // 4 spaces
    languages: [],      // Languages used for auto-detection
});

let code_nodes = Array
    .from(document.querySelectorAll('code'))
    // Don't highlight `inline code` blocks in headers.
    .filter(function (node) {return !node.parentElement.classList.contains("header"); });

if (window.ace) {
    // language-rust class needs to be removed for editable
    // blocks or highlightjs will capture events
    code_nodes
        .filter(function (node) {return node.classList.contains("editable"); })
        .forEach(function (block) { block.classList.remove('language-rust'); });

    code_nodes
        .filter(function (node) {return !node.classList.contains("editable"); })
        .forEach(function (block) { hljs.highlightBlock(block); });
} else {
    code_nodes.forEach(function (block) { hljs.highlightBlock(block); });
}

// Adding the hljs class gives code blocks the color css
// even if highlighting doesn't apply
code_nodes.forEach(function (block) { block.classList.add('hljs'); });

Array.from(document.querySelectorAll("code.language-rust")).forEach(function (block) {

    var lines = Array.from(block.querySelectorAll('.boring'));
    // If no lines were hidden, return
    if (!lines.length) { return; }
    block.classList.add("hide-boring");

    var buttons = document.createElement('div');
    buttons.className = 'buttons';
    buttons.innerHTML = "<button class=\"fa fa-eye\" title=\"Show hidden lines\" aria-label=\"Show hidden lines\"></button>";

    // add expand button
    var pre_block = block.parentNode;
    pre_block.insertBefore(buttons, pre_block.firstChild);

    pre_block.querySelector('.buttons').addEventListener('click', function (e) {
        if (e.target.classList.contains('fa-eye')) {
            e.target.classList.remove('fa-eye');
            e.target.classList.add('fa-eye-slash');
            e.target.title = 'Hide lines';
            e.target.setAttribute('aria-label', e.target.title);

            block.classList.remove('hide-boring');
        } else if (e.target.classList.contains('fa-eye-slash')) {
            e.target.classList.remove('fa-eye-slash');
            e.target.classList.add('fa-eye');
            e.target.title = 'Show hidden lines';
            e.target.setAttribute('aria-label', e.target.title);

            block.classList.add('hide-boring');
        }
    });
});


// Process playground code blocks
Array.from(document.querySelectorAll(".playground")).forEach(function (pre_block) {
    // Add play button
    var buttons = pre_block.querySelector(".buttons");
    if (!buttons) {
        buttons = document.createElement('div');
        buttons.className = 'buttons';
        pre_block.insertBefore(buttons, pre_block.firstChild);
    }

    var runCodeButton = document.createElement('button');
    runCodeButton.className = 'fa fa-play play-button';
  
    // This was in the original... But don't know why. Disabling it means the 
    // button shows up even when the quarto bootsrap styling is applied.
    // runCodeButton.hidden = true;

    runCodeButton.title = 'Run this code';
    runCodeButton.setAttribute('aria-label', runCodeButton.title);

    buttons.insertBefore(runCodeButton, buttons.firstChild);
    runCodeButton.addEventListener('click', function (e) {
        run_rust_code(pre_block);
    });

    let code_block = pre_block.querySelector("code");
    if (window.ace && code_block.classList.contains("editable")) {
        var undoChangesButton = document.createElement('button');
        undoChangesButton.className = 'fa fa-history reset-button';
        undoChangesButton.title = 'Undo changes';
        undoChangesButton.setAttribute('aria-label', undoChangesButton.title);

        buttons.insertBefore(undoChangesButton, buttons.firstChild);

        undoChangesButton.addEventListener('click', function () {
            let editor = window.ace.edit(code_block);
            editor.setValue(editor.originalCode);
            editor.clearSelection();
        });
    }
});

