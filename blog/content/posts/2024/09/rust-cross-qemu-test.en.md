+++
title = 'Compile Rust with cross-compilation and run the unit tests using QEMU'
date = 2024-09-19T12:00:00+08:00
draft = false
slug = "rust-cross-qemu-test"
category = ["embedded", "Rust"]
tag = ["rust", "gcc", "qemu", "unittest", "cross-compilation", "cross-platform"]
+++

## TL;DR
This post introduces a method to run unit tests for cross-compiled Rust programs on Linux using the `qemu-user-static` tool.

## Why This Need?

Recently, while working on embedded Linux development with Rust, I needed to run unit tests on the target platform after cross-compiling the program to ensure quality. The challenge was that "qemu-user-static" can only translate and execute individual executable files, while Rust's unit tests are typically run using `cargo test`. To solve this, we need to compile the unit tests into one or more executable files for QEMU to run. By observing the execution process of `cargo test`, I found that it actually compiles the unit tests into an executable program, but the name of this executable is appended with a hash of the source code. Therefore, in continuous integration environments, we need to determine the output executable file name.

## Investigating Cargo Test

At this point, the problem shifts to obtaining the test executable file name after Cargo builds. I checked `cargo test --help` and found no such parameter, but two other parameters caught my attention:

`--no-run`: This parameter compiles the test program without actually running the unit tests. This is crucial for cross-compilation results since Cargo cannot directly execute target platform tests locally.

`--message-format=json`: This outputs build information in JSON format to standard output. Running `cargo test --message-format=json` with this parameter, you can observe JSON output like this:

```json
{
    "reason": "compiler-artifact",
    "target": { /* ... */ },
    "profile": {
        "test": true // true here indicates this is a test build
        /*... */
    },
    "features": [ /*...*/  ],
    "filenames": [ /*...*/ ],

    // This is the output test executable file
    "executable": "/YOUR_PROJ/target/YOUR_TARGET/debug/deps/your_executable-9a3afc990e4f7858",
    /* ... */
}
```

This JSON contains all the information we need: whether the output is a test build result and the path to the test program.

## Solution

With the problem clearly defined, the solution becomes straightforward. We can use command-line tools like `jq` to extract the executable file path from the JSON output of `cargo test` and pass it to QEMU for execution. Of course, you can also write a Python script for greater flexibility.

## An Example

Assuming you're on Ubuntu, first install the necessary tools:

```bash
sudo apt-get install qemu qemu-user-static jq
```

Navigate to your Rust project and write a simple Bash script to cross-compile and run tests. Here, we assume the target platform is 32-bit ARM with hardware floating point:

```bash
#!/bin/bash
for exe in $(cargo test --no-run --target armv7-unknown-linux-gnueabihf --message-format=json | tee /dev/stderr | jq -r 'select(.profile.test == true) | .executable'); do
    echo "Running tests in $exe"
    qemu-arm -L /usr/arm-linux-gnueabihf $exe
done
```

This script is simple: it pipes the output of `cargo test` to `tee`, which is optional but useful for debugging by displaying the JSON on the command line. The JSON is then piped to `jq` to extract the executable file path into `$exe` and pass it to QEMU for execution. The loop is necessary because if your project contains multiple crates, Cargo will generate a test program for each crate.

For other architectures like ARM64, simply change the `--target` parameter in Cargo to the corresponding Rust build target and adjust the `qemu-arm` command and `/usr/arm-linux-gnueabihf` path accordingly. A complete example can be found in my open-source project EdgeLink's continuous integration file: <https://github.com/oldrev/edgelink/blob/master/.github/workflows/CICD.yml>