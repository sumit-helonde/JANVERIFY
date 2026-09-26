"""AST-based missing-import reporter for Phase 3 model modules.

Imports nothing (files are compile-clean but not import-clean yet), parses each
module with `ast`, and reports every Name that is *used* at column/def level but
never imported or defined in that module. The result is appended to
IN_FILE-relative OUT env var so the runner reads it as ground truth.
"""
import ast
import io
import os
import sys

from datetime import datetime

OUT = os.environ.get(
    "SANJANV_OUT",
    os.path.join(os.environ.get("TEMP", "."), "janv_missing_imports.txt"),
)

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(BACKEND_ROOT, "app", "models")

BUILTINS = set(dir(__builtins__)) if isinstance(__builtins__, dict) else set(dir(__builtins__))

SQLA_TYPES = {
    "BigInteger", "Boolean", "CheckConstraint", "Date", "DateTime", "Enum",
    "ForeignKey", "Identity", "JSON", "Numeric", "String", "Text", "Integer",
    "SmallInteger", "UniqueConstraint", "Index", "ARRAY", "func", "text",
    "Float", "DateTime", "DateTime", "LargeBinary", "DefaultClause",
}
ORM_SYMS = {"Mapped", "mapped_column", "relationship", "back_populates", "backref", "declarative_base"}
GEO_SYMS = {"Geometry", "Geography", "Point", "WKTElement"}


def imported_names(module):
    names = set()
    for node in ast.walk(module):
        if isinstance(node, ast.Import):
            for a in node.names:
                names.add(a.asname or a.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            for a in node.names:
                names.add(a.asname or a.name)
    return names


def defined_names(module):
    names = set()
    for node in module.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
        elif isinstance(node, (ast.Assign, ast.AnnAssign)):
            for t in node.targets if isinstance(node, ast.Assign) else [node.target]:
                if isinstance(t, ast.Name):
                    names.add(t.id)
    return names


def used_names(module):
    names = set()
    for node in ast.walk(module):
        if isinstance(node, ast.Name):
            names.add(node.id)
    known = imported_names(module) | defined_names(module) | BUILTINS
    bad = sorted(
        s for s in names
        if s not in known and s in (SQLA_TYPES | ORM_SYMS | GEO_SYMS | {"datetime", "Optional", "List", "Mapped"})
    )
    return bad


lines = ["MISSING_IMPORT_REPORT_WROTE_AT=" + datetime.now().isoformat()]
for fname in sorted(os.listdir(MODELS_DIR)):
    if not fname.endswith(".py") or fname == "base.py" or fname.startswith("__"):
        continue
    path = os.path.join(MODELS_DIR, fname)
    try:
        with open(path, "r", encoding="utf-8") as fh:
            src = fh.read()
        tree = ast.parse(src)
        bad = used_names(tree)
        if bad:
            lines.append(f"{fname}: {', '.join(bad)}")
    except SyntaxError as exc:
        lines.append(f"{fname}: SYNTAX ERROR {exc}")

with open(OUT, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines) + "\n")
print(f"REPORT_FILE={OUT}")
