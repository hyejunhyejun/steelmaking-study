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
                 "imagePlaceholders": 0, "conditions": [], "parts": []}
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
        elif q is not None:
            # 문제와 첫 답 사이의 줄 = 계산 조건·보기 (버리면 문제가 성립하지 않는다)
            q["conditions"].append(s)
    return rounds


TOPIC_RE = re.compile(r"^(\d\d)\.\s+(.+)$")
PHOTO_Q_RE = re.compile(r"^문제\s*(\d+)\.\s*(.+)$", re.S)
EXAM_PREFIX = "기출 출제:"
EXAM_REF_RE = re.compile(r"(\d\d)년\s*(\d)회")
# 새 정리본 형식: 소문제는 '(1) 라벨', 답은 '→ 답: 내용'
PAREN_SUB_RE = re.compile(r"^\((\d+)\)\s*(.+)$", re.S)
ARROW_ANSWER_RE = re.compile(r"^→\s*답\s*[:：]?\s*(.*)$", re.S)


def _exam_refs(text):
    """'기출 출제: 21년 1회 · 22년 1회' → ['21-1', '22-1']"""
    return [f"{y}-{n}" for y, n in EXAM_REF_RE.findall(text)]


def parse_photos_doc(lines):
    """사진정리본 워드 문서의 단락 리스트 → 유형 dict 리스트.

    반환: [{"id":"t01","label":"01. 열풍로",
            "questions":[{"num":int,"text":str,"examRefs":[str],
                          "imagePlaceholders":int,"imageHint":str,
                          "parts":[{"label":str,"answers":[str]}]}]}]
    """
    topics = []
    cur = None
    q = None
    part = None
    in_answer = False
    for raw in lines:
        s = raw.strip()
        if not s:
            continue
        mq = PHOTO_Q_RE.match(s)
        if mq:
            if cur is None:
                continue
            q = {"num": int(mq.group(1)), "text": mq.group(2).strip(),
                 "examRefs": [], "imagePlaceholders": 0, "imageHint": "",
                 "parts": []}
            cur["questions"].append(q)
            part = None
            in_answer = False
            continue
        mt = TOPIC_RE.match(s)
        if mt:
            cur = {"id": f"t{mt.group(1)}", "label": s, "questions": []}
            topics.append(cur)
            q = part = None
            in_answer = False
            continue
        if cur is None:
            continue
        if s.startswith(EXAM_PREFIX):
            if q is not None:
                q["examRefs"] = _exam_refs(s)
            in_answer = False
            continue
        if IMG_MARK in s:
            if q is not None:
                q["imagePlaceholders"] += 1
                hint = s.split("］", 1)[-1].strip()
                if hint:
                    q["imageHint"] = hint
            in_answer = False
            continue
        ma = ARROW_ANSWER_RE.match(s)
        if ma and q is not None:
            if part is None:
                part = {"label": "", "answers": []}
                q["parts"].append(part)
            body = ma.group(1).strip()
            if body:
                part["answers"].append(body)
            in_answer = True
            continue
        mp = PAREN_SUB_RE.match(s)
        if mp and q is not None:
            part = {"label": mp.group(2).strip(), "answers": []}
            q["parts"].append(part)
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
    return topics
