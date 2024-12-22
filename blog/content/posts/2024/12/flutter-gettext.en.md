+++
title = 'Best Practices for Using GNU Gettext for Flutter App Localization'
date = 2024-12-22T12:00:00+08:00
draft = false
slug = "flutter-gettext"
category = ["Flutter"]
tag = ["flutter", "dart", "mobile", "app", "i18n"]
+++


## Why Not Use Flutter's Official I18n Solution

Recently, I started creating a globally multilingual mobile app in Flutter. The app needs to automatically display the interface in different languages based on the user's region and language settings.

Since this is my first Flutter project, I naturally looked into the official solution provided by Google. However, once I saw it, first I laughed, then I cried.

Flutter's official ARB file format requires you to predefine all the strings you want to translate as programmatic identifiers. Then, during the build process, it generates code that you can use in your program in an awkward way like this:

```dart
title: Text(AppLocalizations.of(context)!.helloWorld),
```

It's already the end of 2024, yet Dart—this so-called "new" language of the 21st century, for God's sake, the Flutter framework still use an approach similar to the resource files of VC6(Visual C++ 6) from over two decades ago! In other words, Google's solution requires you to manually maintain synchronization between the ARB file and source code strings. If your source changes, you need to manually add, modify, or remove corresponding entries in the ARB file.

As a professional quitter, seeing such a cumbersome process and incredibly hard work ahead, I decided it was impossible to delve deeper into it.


## Giving Gettext a Chance

Having used Gettext in Python before, I found it highly automated and it seems to be the standard internationalization solution for most open-source software. To verify whether this approach is feasible (whether someone has already done the hard-work for me), I checked [pub.dev](https://pub.dev) and found two packages, `gettext` and `flutter_gettext`, available for Dart.

For those unfamiliar with gettext, let me introduce it:

> Gettext is a widely used internationalization and localization (i18n and l10n) framework initially developed by the GNU Project. It has become the standard tool for many programming languages and platforms. It offers a complete toolchain for extracting translatable strings from source code, generating translation files, and applying translations in applications.

### Core Concepts of Gettext

- POT Files (Portable Object Template): A template file containing all the strings extracted from the source code that need translation, usually in .pot format.
- PO Files (Portable Object): The translated version of a POT file containing the translation of each string, typically in .po format.
- MO Files (Machine Object): A binary version of the PO file used for fast runtime loading and application of translations, typically in .mo format.
- `xgettext`: A tool for extracting translatable strings from source code and generating POT files.
- `msgmerge`: A tool for merging new POT files with existing PO files to update translations.
- `msgfmt`: A tool for compiling PO files into MO files.

### Advantages of Gettext

- Automated String Extraction: With xgettext, you can automatically extract translatable strings from the source code, reducing manual maintenance efforts.
Simple Syntax: Typically, you only need to wrap strings with a translation function, making the syntax straightforward and clear.
- Mature Ecosystem: Gettext offers a rich set of tools like msgmerge and msgfmt to efficiently manage and maintain translation files.
- Cross-Platform Support: Gettext supports multiple programming languages, operating systems, and platforms, making it a very mature internationalization solution.

### Installing Gettext and Flutter Packages

Before proceeding, ensure that the Gettext toolkit is installed and its CLI tools are available in `$PATH` or `%PATH%`.

For Linux, apt or similar package managers can handle this easily. On Windows, Chocolatey is the one of your best choice to simplifies the process:

```powershell
choco install gettext
Install the corresponding Flutter packages:
```

```bash
flutter pub add flutter_gettext
flutter pub add flutter_localizations --sdk=flutter
```

### Translation in Flutter Source Code

Import the package and use `context.translate()` wherever translations are needed:

```dart
import 'package:gettext_i18n/gettext_i18n.dart';

Widget build(BuildContext context) {
    return Text(
        context.translate('Hello world') // Automatically translates. Defaults to English if no translation exists.
    );
}
```

For more complex syntax like pluralization, refer to the flutter_gettext documentation.

## Writing a Python Script for Automation

After testing the example provided by the flutter_gettext package, I found it functional but lacking message template .pot files. This means it doesn't utilize automated text extraction. At this stage, it’s similar to the official `.arb` solution, just in a different format, which is unacceptable for someone like me who values automation.

After some experimentation, I wrote a Python script to automatically scan all source files in the lib directory of a Flutter project. It generates a translation template messages.pot and language-specific .po files for all strings wrapped with `context.translate('xxx')`.

If `.pot` and `.po` files already exist, the script uses msgmerge to merge them, ensuring previous translations are preserved after code changes.

#### Script Source Code

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


You may notice that `xgettext` uses Python as the source code language. This is because xgettext doesn’t support Dart, and Python's syntax for strings and function calls is closest to Dart. JavaScript/TypeScript could also work.

Save the script as `update_translations.py` and execute it like this:

```bash
python update_translations.py YOUR_PROJECT_DIR
```

The script generates `messages.pot`, `en.po`, and `zh.po` in the `assets/i18n` directory of your Flutter project. You can modify the script to add additional languages or integrate APIs like ChatGPT for automated translations.

In most cases, you’ll develop the app interface in English by default, then translate it into other languages. Open `zh.po` in a text editor and translate it. For better productivity, use specialized tools like PoEdit or upload the `.pot` files to online services like `crowdin.com`.

When the code changes, re-running this script preserves previous translations and automatically merges updates, making it ideal for use in CI pipelines.

Moreover, this script sorts files before extraction, reducing conflicts during team collaboration.

Integrating with Flutter
Once the `assets/i18n/*.po` files are ready, update `pubspec.yaml` to include the i18n directory under assets. Otherwise, translations won’t be packaged into the app:

```yaml
flutter:
  assets:
    - assets/i18n/
```

Then, initialize translations in your app as shown in the `flutter_gettext` example:

```dart
class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
        locale: const Locale('en'), // Default to English or follow system settings
        supportedLocales: const [
            Locale('en'),
            Locale('zh'), // Language codes must match .po file names. Modify the script for additional region codes.
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

Run the app to see the translated interface. Whether you allow users to configure the language or follow the system settings is up to you.

Note that the above approach applies to translations in Flutter apps with `BuildContext`. For pure Dart code without `BuildContext`, I’ll update this article once I explore it further.

Finally, have fun! 😊
