import os
import json

def validate_json_files(root_dir):
    for root, dirs, files in os.walk(root_dir):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.next' in dirs:
            dirs.remove('.next')
        for file in files:
            if file.endswith('.json'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        json.load(f)
                except json.JSONDecodeError as e:
                    print(f"INVALID JSON: {path}")
                    print(f"Error: {e}")
                except Exception as e:
                    print(f"ERROR reading {path}: {e}")

if __name__ == "__main__":
    validate_json_files(r"c:\Users\rithi\Downloads\b_jz5Rrpys4ZK")
