# quarto-rust

This is an experiental extension for the [quarto](https://quarto.org)
publishing system, which adds support for the Rust programming language.

## Installation
To install this extension in the current project use `quarto add`:
``` bash
quarto add wurli/quarto-rust
```

Once installed, add the following snippet to your document's YAML frontmatter:
``` yaml
filters: 
  - quarto-rust
```

## Usage:
Currently, _quarto-rust_ only supports running Rust code within the web 
browser, meaning the output format must be `html`. Specify Rust code by using
{playground-rust} in the chunk header like so:

````
```{playground-rust}
// Here's some Rust code
fn main() {
  println!("Hello, world!");
}
```
````

An example quarto document can be found in the 
[examples](examples/hello-world.qmd) folder.

## Implementation
{playground-rust} works by sending code chunks to the 
[Rust playground](https://play.rust-lang.org/?version=stable&mode=debug&edition=2021).
The implementation draws heavily from the source code for 
[mdBook](https://github.com/rust-lang/mdBook/blob/master/src/theme/book.js).

## Future
I'm hoping to expand this project to include code which runs at render
time, perhaps by using the [evcxr](https://github.com/evcxr/evcxr) REPL.


