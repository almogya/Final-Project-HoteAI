import os
import argparse
import tiktoken


def generate_file_tree(root_dir):
    tree = ""
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude specified directories

        dirnames[:] = [
            d
            for d in dirnames
            if d
            not in [
                "node_modules",
                ".next",
                ".git",
                ".venv",
                ".vscode",
                "__pycache__",
                "blockchain_data",
            ]
        ]
        # Calculate the relative path from root_dir to dirpath
        relative_dir = os.path.relpath(dirpath, root_dir)
        # Count the number of separators in the relative path to determine the level
        level = 0 if relative_dir == "." else relative_dir.count(os.sep) + 1
        indent = "    " * (level - 1)
        dir_name = os.path.basename(dirpath)
        tree += f"{indent}{dir_name}/\n"
        for f in filenames:
            tree += f"{indent}    {f}\n"
    return tree


def get_all_files(root_dir):
    file_paths = []

    excluded_dirs = {
        "node_modules", ".next", ".git", ".venv", ".vscode", "__pycache__",
        "migrations", "logs", "backups", "public", "tests", "blockchain_data"
    }

    excluded_extensions = {
        ".html", ".svg", ".log", ".md", ".json", ".db", ".sql", ".png", ".jpg",
        ".jpeg", ".css", ".ico", ".webp", ".woff", ".woff2", ".ttf", ".eot"
    }

    excluded_filenames = {
        "package.json", "package-lock.json", "README.txt", "README.md",
        "server_output.txt", "client_output.txt", ".eslintrc.json", ".prettierrc",
        "tsconfig.json", ".python-version", "postcss.config.mjs"
    }

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude folders
        dirnames[:] = [d for d in dirnames if d not in excluded_dirs]

        for f in filenames:
            if f in excluded_filenames:
                continue
            if os.path.splitext(f)[1].lower() in excluded_extensions:
                continue
            full_path = os.path.join(dirpath, f)
            file_paths.append(full_path)

    return file_paths


def read_files(file_paths, root_dir):
    import tiktoken

    content = ""
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit
    encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")

    for i, file_path in enumerate(file_paths):
        relative_path = os.path.relpath(file_path, root_dir)
        print(f"Reading file {i+1}/{len(file_paths)}: {relative_path}")
        content += f"\n---\nFile: {relative_path}\n---\n"

        try:
            if os.path.getsize(file_path) > MAX_FILE_SIZE:
                content += "<File skipped: Too large>\n"
                print(f"  ⛔ Skipped (too large)")
                continue

            with open(file_path, "r", encoding="utf-8") as file:
                file_content = file.read()

            tokens = encoding.encode(file_content, disallowed_special=())
            print(f"  ✅ {len(tokens)} tokens")
            content += file_content

        except UnicodeDecodeError:
            content += "<File skipped: Invalid UTF-8 encoding>\n"
            print("  ⛔ Skipped (invalid UTF-8)")

        except Exception as e:
            content += f"<Could not read file: {e}>\n"
            print(f"  ⛔ Could not read: {e}")

    return content


def count_tokens(text):
    encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
    # Disable special token check
    tokens = encoding.encode(text, disallowed_special=())
    return len(tokens)


def main():
    parser = argparse.ArgumentParser(
        description="Prepare folder contents for LLM prompt."
    )
    parser.add_argument(
        "directory", help="The root directory of your code files.")
    parser.add_argument(
        "-o",
        "--output",
        help="The output TXT file to save the concatenated content. Defaults to 'backend.txt' or 'frontend.txt'.",
        default=None,
    )
    args = parser.parse_args()

    root_dir = os.path.abspath(args.directory)

    # Set output filename based on the directory name (backend or frontend)
    if args.output is None:
        # Default to using directory name as output file
        directory_name = os.path.basename(root_dir)
        output_filename = f"{directory_name}.txt"
    else:
        output_filename = args.output

    # Generate file tree
    print("Generating file tree...")
    file_tree = generate_file_tree(root_dir)

    # Get all file paths
    print("Collecting file paths...")
    file_paths = get_all_files(root_dir)

    # Read all files and get their content
    print("Reading files...")
    files_content = read_files(file_paths, root_dir)

    # Combine file tree and files content
    total_output = f"File Tree:\n\n{file_tree}\nFiles Content:\n{files_content}"

    # Count tokens
    print("Counting tokens...")
    token_count = count_tokens(total_output)

    # Save the concatenated content to a TXT file
    print(f"Saving to {output_filename}...")
    with open(output_filename, "w", encoding="utf-8") as output_file:
        output_file.write(total_output)

    # Print the total token count
    print(f"Total Tokens: {token_count}")
    print(f"All content has been saved to {output_filename}")


if __name__ == "__main__":
    main()
