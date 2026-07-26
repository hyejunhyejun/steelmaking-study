import re

ROUND_RE = re.compile(r"^20(\d\d)년 (\d)회$")
# 문제 번호 뒤 구분자는 '.' 또는 ','(원문 오타). 단 바로 뒤에 숫자가 오면
# 소수(1.8 ~ 2.2)·천단위(1,300도)이므로 문제로 보지 않는다.
MAIN_RE = re.compile(r"^(\d+)[.,](?!\d)\s*(.+)$", re.S)
SUB_RE = re.compile(r"^(\d+)-(\d+)\.\s*(.+)$", re.S)
ANSWER_PREFIX = "답"
IMG_MARK = "그림 삽입 위치"


def parse_rounds_doc(lines):
    """회차별 워드 문서의 단락 리스트 → 회차 dict 리스트.

    반환: [{"id":"21-1","label":"2021년 1회차",
            "questions":[{"num":int,"text":str,"imagePlaceholders":int,
                          "parts":[{"label":str,"answers":[str]}]}]}]
    """
    rounds = []
    cur = None
    q = None
    part = None
    in_answer = False
    for raw in lines:
        s = raw.strip()
        if not s:
            continue
        m = ROUND_RE.match(s)
        if m:
            cur = {"id": f"{m.group(1)}-{m.group(2)}",
                   "label": f"20{m.group(1)}년 {m.group(2)}회차",
                   "questions": []}
            rounds.append(cur)
            q = part = None
            in_answer = False
            continue
        if cur is None:
            continue
        if IMG_MARK in s:
            if q is not None:
                q["imagePlaceholders"] += 1
            in_answer = False
            continue
        ms = SUB_RE.match(s)
        if ms:
            part = {"label": ms.group(3).strip(), "answers": []}
            if q is not None:
                q["parts"].append(part)
            in_answer = False
            continue
        mm = MAIN_RE.match(s)
        if mm:
            q = {"num": int(mm.group(1)), "text": mm.group(2).strip(),
                 "imagePlaceholders": 0, "parts": []}
            cur["questions"].append(q)
            part = None
            in_answer = False
            continue
        if s.startswith(ANSWER_PREFIX):
            body = s[len(ANSWER_PREFIX):].strip()
            if q is None:
                continue
            if part is None:
                part = {"label": "", "answers": []}
                q["parts"].append(part)
            if body:
                part["answers"].append(body)
            in_answer = True
            continue
        if in_answer and part is not None:
            part["answers"].append(s)
    return rounds
