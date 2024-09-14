---
title: 使用 GCC 语句表达式模仿异常，简化错误处理
date: 2024-09-15 02:41:32
tags:
---

嵌入式开发里，90% 情况下用的是 GCC，这里介绍一个 GCC 的 C 语言语法扩展，叫“语句表达式”（Statement Expression）。语句表达式，允许在表达式中包含多个语句，并返回最后一个表达式语句的值，比如：

```c
#include <stdio.h>
int main() {
    int a = 5, b = 10;
    
    int result = ({
        printf("Calculating the sum of %d and %d\n", a, b);
        a + b;
    });
    
    printf("The result is %d\n", result);
    return 0;
}
```

在这个例子中，`({ ... })` 是一个语句表达式。它首先会打印一条调试信息，然后计算 `a + b` 并将结果返回给 `result`。

有了这个工具，可以很容易实现一个 `TRY` 宏：

```c
#define TRY(expr, msg) ({ \
    int result = (expr); \
    if (result != 0) { \
        fprintf(stderr, "Error: %s\n", msg); \
        return result; \
    } \
})
```

这个宏里，我们判断 `expr` 是否等于 `0`，如果成功则继续执行，否则打印 `msg` 并提前返回，以下是完整可以跑的示例代码：

```c
#include <stdio.h>

#define TRY(expr, msg) ({ \
    int result = (expr); \
    if (result != 0) { \
        fprintf(stderr, "Error: %s\n", msg); \
        return result; \
    } \
})

int some_function() {
    // 假设这是一个可能失败的函数
    return 0;  // 成功返回 0
    // return -1;  // 失败返回非零值
}

int main() {
    TRY(some_function(), "some_function failed");
    printf("Function succeeded, continuing...\n");
    return 0;
}
```

用这个宏的时候有个要求，`expr` 里的函数或者表达式必须以 `int` 作为返回值。如果你不需要打印错误信息，可以直接去掉 `msg` 参数，返回错误码就好。

基本上 Rust 的 `Ok/Err` 也是一样的原理，这个宏你还可以扩展，比如现在我们的宏里可以使用任何结果为 `int` 的表达式，但你可以更进一步，使用 C 的可变参数宏把函数调用直接展开，并限定第一个参数是函数名，后面是参数，做成 `TRY(some_function, arg1, arg2, "some_function failed");` 这样的效果。顺带提一句，要求每个操作可能出错的函数都返回错误码是一个非常好的实践，比起 `fopen()` 这样返回指针判断 `NULL` 是否出错，然后从全局变量 `errno` 拿错误码要直观很多，而且也免除了全局错误码变量的需求，保证了线程安全、提升了性能。

如果你用 C++，可以做一个泛型 union，把泛型的函数返回值和错误码都封装起来一起作为函数返回值，到了这步，恭喜你重新发明了 Rust 的 `Result`。

这个语句表达式语法扩展除了 MSVC，主流的 GCC 和 LLVM Clang 都支持，这也是 VC 编译不了 Linux 内核的原因之一。如果你想看个 C++ 的例子，可以参考[SerenityOS 里的实现](https://github.com/SerenityOS/serenity/blob/master/AK/Try.h)