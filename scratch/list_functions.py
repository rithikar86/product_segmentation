import ast

file_path = r"c:\Users\rithi\Downloads\b_jz5Rrpys4ZK\backend\backend.py"

with open(file_path, "r", encoding="utf-8") as f:
    source = f.read()
    tree = ast.parse(source)

for node in ast.iter_child_nodes(tree):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        print(f"Function {node.name} at {node.lineno}")
    elif isinstance(node, ast.ClassDef):
        print(f"Class {node.name} at {node.lineno}")
    else:
        # Check if it's a top-level assignment or expression
        if hasattr(node, 'lineno'):
             # print(f"Top-level {type(node).__name__} at {node.lineno}")
             pass
