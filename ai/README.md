# AI services

Python code in this folder (`llm`, `ocr`, `speech-to-text`) is linted and formatted with [Ruff](https://docs.astral.sh/ruff/).
The configuration lives in [`ruff.toml`](ruff.toml).

## Install

```bash
pipx install ruff        # or: uv tool install ruff / pip install ruff
```

## Usage

Run from the repository root:

```bash
ruff check ai              # lint: show problems
ruff check ai --fix        # fix what can be fixed automatically
ruff format ai --check     # check formatting (like prettier --check)
ruff format ai             # format files (like prettier --write)
```

From inside the `ai` folder, replace `ai` with `.` (e.g. `ruff check .`).

## Rules

| Code      | What it checks                                  |
| --------- | ----------------------------------------------- |
| `E`, `W`  | PEP 8 style                                     |
| `F`       | real errors: unused variables, missing imports… |
| `I`       | import ordering                                 |
| `B`       | common bugs (flake8-bugbear)                    |
| `UP`      | modern syntax for Python 3.12                   |

Target version is Python 3.12 (same as the Dockerfiles) and line length is 120 (same as Prettier).
