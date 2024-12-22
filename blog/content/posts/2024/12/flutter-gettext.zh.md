+++
title = 'Flutter 和 GNU gettext 的 App 国际化翻译最佳实践'
date = 2024-12-22T12:00:00+08:00
draft = false
slug = "flutter-gettext"
category = ["Flutter"]
tag = ["flutter", "dart", "mobile", "app", "i18n"]
+++

## 为什么不用 Flutter 官方的国际化解决方案

我最近学着用 Flutter 搓一个国际范儿的手机 App，需要能够根据用户的手机区域和语言设置自动显示不同语言的界面。

由于这是我第一个 Flutter 项目，我自然先找了下谷歌官方给出的解决方案，这不看不要紧，一看笑死个人。

Flutter 官方的 ARB 语言文件格式要求你提前将所有需要翻译的字符串以程序标识符的形式放入其中。然后，它会在构建过程中生成代码，你才能在程序中使用类似以下的笨拙的方式引用：

```dart
title: Text(AppLocalizations.of(context)!.helloWorld),
```

这都 2024 年末了，21 世纪的“新”语言 Dart 和它的 Flutter 框架居然还在用二十多年 VC6 资源文件类似的解决方案处理界面翻译。也就是说，谷歌方案需要你人工负责维护这个 ARB 文件和代码字符串之间的同步关系，代码有改动时，你需要手动添加、修改或者删除 ARB 里对应的翻译条目。

作为一个专业退堂鼓表演艺术家，看到这样繁琐的操作和巨大工作量，那是万万不可能再深入研究使用了。

## 给 Gettext 一个机会

以前 Python 里用过 gettext，非常的自动化，应该也是绝大多数开源软件的标准国际化解决方案，为了确定大方向是否可行（翻译：有人替我把基础的东西做好了），我查找了下 `pub.dev`，确定了 Dart 这边有 [`gettext`](https://pub.dev/packages/gettext) 和 [`flutter_gettext`](https://pub.dev/packages/flutter_gettext) 两个包来支持。

没听过 `gettext` 的让我先介绍下 `gettext` 是什么：

> gettext 是一个广泛使用的国际化和本地化（i18n 和 l10n）框架，最初由 GNU 项目开发，现已成为许多编程语言和平台的标准国际化工具。它提供了一套完整的工具链，用于从源代码中提取需要翻译的字符串，生成翻译文件，并将翻译应用到应用程序中。

### Gettext 的核心概念

- POT 文件（Portable Object Template）：这是一个模板文件，包含了从源代码中提取的所有需要翻译的字符串。POT 文件通常是 .pot 格式。
- PO 文件（Portable Object）：这是 POT 文件的翻译版本，包含了每个字符串的翻译内容。PO 文件通常是 .po 格式。
- MO 文件（Machine Object）：这是 PO 文件的二进制版本，用于在运行时快速加载和应用翻译。MO 文件通常是 .mo 格式。
- `xgettext`：用于从源代码中提取需要翻译的字符串，并生成 POT 文件。
- `msgmerge`：用于将新的 POT 文件与现有的 PO 文件合并，以便更新翻译内容。
- `msgfmt`：用于将 PO 文件编译为 MO 文件。

### Gettext 的优势

- 自动化提取字符串：通过 `xgettext` 工具，可以自动从源代码中提取需要翻译的字符串，减少手动维护的工作量。
- 简洁的语法：通常只需要在需要翻译的字符串前加上你用语言的某个翻译函数即可，语法简洁明了。
- 成熟的生态系统：`gettext` 有丰富的工具链支持，包括 `msgmerge`、`msgfmt` 等，可以帮助你更高效地管理和维护翻译文件。
- 跨平台支持：`gettext` 不仅支持多种编程语言，还支持多种操作系统和平台，是一个非常成熟的国际化解决方案。

### 安装 Gettext 和 Flutter 的对应包

后续操作之前需要先安装 `gettext` 工具包并确保 `gettext` 的各个命令行工具在 `$PATH` 或者 `%PATH%` 环境变量中可用。

Linux 不说了 `apt` 之类的就解决了，Windows 的话用 Chocolatey 最简单：

```powershell
choco install gettext
```

Flutter 项目里安装对应的包：

```bash
flutter pub add flutter_gettext
flutter pub add flutter_localizations --sdk=flutter
```

### Flutter 源代码里的翻译

在需要使用翻译字符串的地方导入包并调用 `context.translate()`：

```dart
import 'package:gettext_i18n/gettext_i18n.dart';

Widget builld(Build context) {
    return Text(
        context.translate('Hello world') // 这里就自动翻译了，没有对应的语言或者其他的就自动保持英语
    );
}
```

更复杂的语法，比如支持复数之类的参考 [`flutter_gettext`](https://pub.dev/packages/flutter_gettext) 文档即可。


## 写个 Python 脚本自动化操作

我首先运行了下 `flutter_gettext` 包的例子，果然是可用的。但难受的是它只涉及 `.PO` 文件，没有用到 `.pot` 的消息模板文件，也就是说没有用到自动翻译文本提取，到这步基本跟官方的 `.arb` 方案类似，无非就是换了个格式，对于我这样的懒人来说是不能接受的。

所以一番折腾以后，我写了个 Python 脚本，可以自动从指定的 Flutter 项目的 `lib` 源码目录下面扫描所有的源文件，然后会将你全部调用 `context.translate('xxx')` 的地方生成翻译文本模板 `messages.pot` 及各个语言对应的 `.po` 文件。

如果 `.pot` 和 `.po` 文件存在，脚本会自动调用 `msgmerge` 合并它们，也就是在你下次代码改动之后，你之前的翻译也不会白费。


#### 脚本源码

```python
#!/bin/python
import os
import subprocess
import argparse
import sys

__LANGUAGES = [
    'en',
    'zh',
]

# Function to run shell commands and check for errors
def run_command(command):
    print(f"Executing: {command}")
    result = subprocess.run(command, shell=True, text=True, capture_output=True)
    if result.returncode != 0:
        print(f"Error occurred: {result.stderr}", file=sys.stderr)
        exit(result.returncode)

# Function to find all .dart files and generate messages.pot
def generate_pot(project_path):
    lib_path = os.path.join(project_path, "lib")  # Dart source code path
    assets_path = os.path.join(project_path, "assets", "i18n")  # Translation files directory
    languages = __LANGUAGES

    # Step 1: Find all Dart files recursively
    dart_files = []
    for root, dirs, files in os.walk(lib_path):
        for file in files:
            if file.endswith(".dart"):
                dart_files.append(os.path.relpath(os.path.join(root, file), lib_path))

    if not dart_files:
        print(f"No Dart files found in {lib_path}!")
        exit(1)

    # Step 2: Sort Dart files lexicographically
    dart_files.sort()

    # Ensure assets directory exists
    os.makedirs(assets_path, exist_ok=True)

    # Step 3: Generate .pot file
    pot_output_path = os.path.join(assets_path, "messages.pot")
    dart_files_string = " ".join(dart_files)
    command = f"xgettext --from-code=UTF-8 -L Python --keyword=translate --output={pot_output_path} --directory={lib_path} {dart_files_string}"
    run_command(command)

    # Step 4: Use msginit to create .po files for each language
    for lang in languages:
        po_file = os.path.join(assets_path, f"{lang}.po")

        # Create .po file using msginit
        if not os.path.exists(po_file) :
            print(f"Creating new .po file for {lang} at {po_file}")
            command = f"msginit --no-translator --input={pot_output_path} --locale={lang}.UTF-8 --output={po_file}"
            run_command(command)
        else:
            # Update the .po file with new translations using msgmerge
            print(f"Updating .po file for {lang}...")
            update_command = f"msgmerge --backup=off --previous --update {po_file} {pot_output_path}"
            run_command(update_command)

    # 未来如果 flutter_gettext 支持 .mo 文件的话
    # Step 5: Compile .po files to .mo
    # for lang in languages:
    #     print(f"Compiling .mo file for {lang}...")
    #     po_file = os.path.join(assets_path, f"{lang}.po")
    #     mo_file = os.path.join(assets_path, f"{lang}.mo")
    #     compile_command = f"msgfmt {po_file} -o {mo_file}"
    #     run_command(compile_command)

    print("Translation update complete!")

# Main function to parse command line arguments
def main():
    parser = argparse.ArgumentParser(description="Generate and update translation files.")
    parser.add_argument('project_path', help="The path to the Flutter project")
    args = parser.parse_args()

    # Run the script with the provided project path
    generate_pot(args.project_path)

if __name__ == "__main__":
    main()
```

你可能你会奇怪里面 `xgettext` 为什么把源代码语言指定为 Python，这是因为 `xgettext` 不支持 Dart，而 Python 的字符串表示和函数调用语法最接近 Dart，JavaScript/TypeScript 虽然更像 Dart，但不支持三引号多行字符串。

假设这个脚本命名成 `update_translations.py`，那么你只需要执行：

```bash
python update_translations.py YOUR_PROJECT_DIR
```

脚本会在你的 Flutter 项目的 `assets/i18n` 下面生成 `messages.pot`, `en.pot`, `zh.pot`，需要其他语言的你也可以自己修改脚本增加，甚至可以接入类似 ChatGPT API 之类的来自动翻译。

一般来说软件界面默认用英文开发，然后翻译成多语言，那这里你只需要用文本编辑器打开 `zh.pot` 按照它的格式翻译就完事儿了。当然更推荐专用的编辑器，例如 PoEdit 之类，或者你也可以将 `.pot` 文件上传到 `crowdin.com` 之类的在线服务让别人给你翻译。

后续开发中，代码如果有变化，多次执行这个脚本不会覆盖你之前的翻译，而是会自动合并修改，因此非常适合在持续集成中自动运行。

还有个重要的点，这个脚本提取翻译的时候是将文件排序过的，因此多人合作开发的时候生成的 `.pot` 和 `.po` 文件不容易引起冲突。

## 集成到 Flutter

当你 `assets/i18n/.po` 文件准备好以后，记得修改 `pubspec.yaml`，在里面的 `assets` 这节增加 `i18n` 目录，否则翻译不会打包进 App：

```yaml
flutter:
  assets:
    - assets/i18n/
```

就参考 `flutter_gettext` 的例子，在 App 中初始化：

``` dart
class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
        locale: const Locale('en'), // 默认英文，当然也可以去掉根据系统
        supportedLocales: const [
            Locale('en'),
            Locale('zh'), // 这里只用了语言没用国家代码，确保与 .po 文件名一致，如果需要加上国家代码，则需要修改下生成脚本
        ],
        localizationsDelegates: [
            GettextLocalizationsDelegate(),
            GlobalMaterialLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
        ],
        home: const HomePage(),
    );
  }
}

```

启动程序即可看到翻译后的界面，至于是让用户配置语言还是跟随系统这就由你决定了。

需要注意的是前面的内容针对的是 Flutter 应用的翻译，需要 `BuildContext`，如果是纯 Dart 没有 `BuildContext` 的部分，那就等我用到了再来更新这篇文章。


最后，玩得开心。