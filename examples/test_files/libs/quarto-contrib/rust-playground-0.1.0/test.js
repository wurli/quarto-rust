
let code_nodes = Array
    .from(document.querySelectorAll('code'))
    .map(function(x) { hljs.highlight(x) }) ;

console.log("nodes:" + code_nodes.length)

