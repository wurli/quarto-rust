"use strict";

// Adapted from mdBook: https://github.com/rust-lang/mdBook/blob/master/src/theme/book.js

// Global variable, shared between modules
function playground_text(playground, hidden = true) {
    return playground.querySelector("code").innerText;
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
        result_block.className = 'result language-bash';
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
    runCodeButton.className = 'run-rust-code-button play-button';

    runCodeButton.title = 'Run this code';
    runCodeButton.setAttribute('aria-label', runCodeButton.title);

    buttons.insertBefore(runCodeButton, buttons.firstChild);
    runCodeButton.addEventListener('click', function (e) {
        run_rust_code(pre_block);
    });

    let code_block = pre_block.querySelector("code");
});

