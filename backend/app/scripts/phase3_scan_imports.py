"""AST scanner: report identifiers used but not satisfied in each model file.

Writes to JANV_SCAN env-var path (default %TEMP%\\janv_scan.txt). No app code
imported — this is pure static analysis so it can inspect broken files.
"""
import ast
import os
import sys

OUT = os.environ.get(
    "JANV_SCAN",
    os.path.join(os.environ.get("TEMP", "."), "janv_scan.txt"),
)

BACKEND_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
MODELS_DIR = os.path.join(BACKEND_ROOT, "app", "models")

BUILTIN = set(dir(__builtins__ if isinstance(__builtins__, dict) else __builtins__))

SQLA = {
    "BigInteger", "Boolean", "CheckConstraint", "Date", "DateTime",
    "Enum", "Float", "ForeignKey", "Identity", "Index", "Integer",
    "JSON", "LargeBinary", "Numeric", "SmallInteger", "String",
    "Text", "Time", "Unicode", "UniqueConstraint", "func", "text",
    "and_", "or_", "not_", "cast", "case", "ARRAY", "BooleanType",
}
ORM = {
    "Mapped", "mapped_column", "relationship", "back_populates",
    "backref", "foreign", "remote", "joinedload", "selectinload",
    "Session", "sessionmaker", "declarative_base", "DeclarativeBase",
}
GEO = {"Geometry", "Geography", "Point", "LineString", "Polygon", "WKTElement"}
EXTRA = {"Optional", "Sequence", "List", "Dict", "Set", "Tuple", "Any"}
COVERED = BUILTIN | SQLA | ORM | GEO | EXTRA


def sym_sources(tree):
    """Names introduced by imports or defs in this file."""
    defined = set()

    def imp(name, alias):
        defined.add(alias or name)

    for node in tree.body:
        if isinstance(node, ast.Import):
            for a in node.names:
                imp(a.name.split(".")[0], a.asname)
        elif isinstance(node, ast.ImportFrom):
            for a in node.names:
                imp(a.name, a.asname)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            defined.add(node.name)
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    defined.add(t.id)
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            defined.add(node.target.id)
        elif isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            pass
    return defined


def used_names(tree):
    used = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
            used.add(node.id)
    return used


report = []
for fname in sorted(os.listdir(MODELS_DIR)):
    if not fname.endswith(".py"):
        continue
    path = os.path.join(MODELS_DIR, fname)
    with open(path, "r", encoding="utf-8") as fh:
        source = fh.read()
    if "class " not in source:
        continue
    try:
        tree = ast.parse(source, filename=fname)
    except SyntaxError as exc:
        report.append(f"{fname}: SYNTAX {exc}")
        continue
    defined = sym_sources(tree)
    missing = sorted((used_names(tree) - defined) & (COVERED - defined))
    if missing:
        report.append(f"{fname}: MISSING_IMPORTS: {', '.join(missing)}")

with open(OUT, "w", encoding="utf-8") as fh:
    fh.write("\n".join(report) + "\n")

print("SCAN_WROTE=" + OUT)
