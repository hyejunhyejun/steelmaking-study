import re

HEADER_PREFIX = "○"
MAIN_RE = re.compile(r"^\s*(\d+)\.\s*(.+)", re.S)
SUB_RE = re.compile(r"^\s*(\d+)-(\d+)\.\s*(.+)", re.S)


def _is_header(v):
    return isinstance(v, str) and v.strip().startswith(HEADER_PREFIX)


def parse_rows(rows):
    """(b, c, d) 튜플 리스트 → 문제 dict 리스트.

    반환: [{"num": int, "text": str, "source": str|None,
            "parts": [{"label": str, "answers": [str]}]}]
    """
    questions = []
    source = None
    q = None
    part = None
    for b, c, d in rows:
        if _is_header(b):
            source = b.strip().lstrip(HEADER_PREFIX).strip()
            continue
        cs = c.strip() if isinstance(c, str) else None
        if cs and SUB_RE.match(cs):
            m = SUB_RE.match(cs)
            part = {"label": m.group(3).strip(), "answers": []}
            if q is not None:
                q["parts"].append(part)
            continue
        if cs and MAIN_RE.match(cs):
            m = MAIN_RE.match(cs)
            q = {"num": int(m.group(1)), "text": m.group(2).strip(),
                 "source": source, "parts": []}
            questions.append(q)
            part = None
            continue
        if d is not None and q is not None:
            if part is None:
                part = {"label": "", "answers": []}
                q["parts"].append(part)
            part["answers"].append(str(d).strip())
    return questions
