+++
title = '用 QEMU 执行 Rust 交叉编译的单元测试'
date = 2024-09-19T12:00:00+08:00
draft = false
slug = "rust-cross-qemu-test"
category = ["嵌入式开发", "Rust"]
tag = ["rust", "gcc", "qemu", "单元测试", "交叉编译", "跨平台"]
+++

## TL;DR
本文介绍一种在 Linux 下通过 `qemu-user-static` 工具对交叉编译的 Rust 程序执行单元测试的方法。

## 为何有此需求？

最近用 Rust 做嵌入式 Linux 开发的时候，交叉编译完程序以后，为了保证质量，还需要对目标平台执行单元测试。问题来了，“qemu-user-static”只能转译执行单个可执行文件，而一般 Rust 程序的单元测试是通过 `cargo test` 来执行的。解决这个问题的思路我们需要把单元测试编译成一个或者多个可执行文件让 QEMU 来执行，通过观察普通 `cargo test` 的执行过程，我发现它本身就是把单元测试编译成一个可执行程序来执行的，只是该可执行文件的名称会在后面加上源码的哈希值，所以在持续集成等环境下，我们需要确定输出的可执行文件名。

## 调研 Cargo Test

到了这一步，问题转换成了获取 Cargo 构建后测试可执行文件名，我看了下 `cargo test --help` 发现并没有此项参数，但是另外两个参数引起了我的注意：

`--no-run`：此参数仅编译生成可执行的测试程序，而不实际执行单元测试。这对于交叉编译后的结果尤为重要，因为 Cargo 无法直接在本地执行目标平台的测试。

`--message-format=json` 表示使用 JSON 格式来输出构建信息到标准输出，带上这个参数执行 `cargo test --message-format=json`，可以观察到最后输出了类似如下的 JSON 内容：

```javascript
{
    "reason": "compiler-artifact",
    "target": { /* ... */ },
    "profile": {
        "test": true // 这里为 true 表示编译的 profile 就是测试
        /*... */
    },
    "features": [ /*...*/  ],
    "filenames": [ /*...*/ ],

    // 这里就是输出的测试可执行文件
    "executable": "/YOUR_PROJ/target/YOUR_TARGET/debug/deps/your_executable-9a3afc990e4f7858",
    /* ... */
}
```

这段 JSON 其实就包含所有我们需要的信息：这个输出结果是否是测试构建的结果，和测试程序路径。

## 解决方案
问题明确后，解决方法变得简单明了。我们可以使用 jq 等命令行工具从 cargo test 的 JSON 输出中提取可执行文件路径，并交由 QEMU 执行。当然，你也可以编写一个 Python 脚本，以获得更大的灵活性。

## 一个例子

假设你用的是 Ubuntu，先装上需要的工具：

```bash
sudo apt-get install qemu qemu-user-static jq
```

进入你的 Rust 项目，编写个简单 Bash 脚本交叉编译测试，这里假设目标平台为 32 位硬件浮点 ARM：

```bash
#!/bin/bash
for exe in $(cargo test --no-run --target armv7-unknown-linux-gnueabihf --message-format=json | tee /dev/stderr | jq -r 'select(.profile.test == true) | .executable'); do
    echo "Running tests in $exe"
    qemu-arm -L /usr/arm-linux-gnueabihf $exe
done
```

这个脚本很简单，把 `cargo test` 的结果通过管道传给 `tee`，`tee` 这里是可选的，作用是把处理通过管道继续把 JSON 传给后面的 `jq` 以外，还在命令行显示出来，便于我们调试编译错误。

管道最后通过 `jq` 提取可执行文件存入 `$exe` 然后交给 QEMU 执行。这里之所以要用循环，是因为如果有多个 crates 在你的项目里 cargo 就会为每个 crate 产生一个测试程序。

对于 ARM64 等其他架构，只需将 Cargo 的 --target 参数改为相应的 Rust 构建目标，并将 qemu-arm 改为 qemu-aarch64，同时调整 /usr/arm-linux-gnueabihf 路径即可。完整的示例可参考我的开源项目 EdgeLink 的持续集成文件：<https://github.com/oldrev/edgelink/blob/master/.github/workflows/CICD.yml>

Have fun!