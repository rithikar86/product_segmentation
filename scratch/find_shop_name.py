import ast

with open('backend/backend.py', 'r', encoding='utf-8') as f:
    tree = ast.parse(f.read())

for node in ast.walk(tree):
    if isinstance(node, ast.Name) and node.id == 'shop_name':
        print(f"Found shop_name at line {node.lineno}")
