import ast
import os

file_path = r"c:\Users\rithi\Downloads\b_jz5Rrpys4ZK\backend\backend.py"

with open(file_path, "r", encoding="utf-8") as f:
    tree = ast.parse(f.read())

for node in ast.walk(tree):
    if isinstance(node, ast.FunctionDef):
        if node.name == 'register':
            print(f"Function 'register' starts at line {node.lineno}")
            # Find the last line of the function
            last_line = node.lineno
            for item in ast.walk(node):
                if hasattr(item, 'lineno'):
                    last_line = max(last_line, item.lineno)
            print(f"Function 'register' ends at line {last_line}")
