import re

_ENUM_RE = re.compile(r"^[\s]*[①-⑳0-9]+[.)]?\s*")
_NUM_PREFIX_RE = re.compile(r"^\s*\d+(-\d+)?\.\s*")


def derive_keywords(answers):
    """답 문자열들을 채점용 핵심어 리스트로 분해."""
    out = []
    for a in answers:
        for piece in re.split(r"[,、]", str(a)):
            piece = _ENUM_RE.sub("", piece).strip()
            if piece:
                out.append(piece)
    return out


def normalize(text):
    """문제 텍스트 비교용 정규화(번호·공백·기호 제거)."""
    t = _NUM_PREFIX_RE.sub("", str(text))
    t = re.sub(r"[\s\W_]+", "", t, flags=re.UNICODE)
    return t.lower()


def compute_groups(items):
    """(round_id, text) 리스트 → 각 원소 {stars, groupId}(입력순).

    stars = 해당 문제(정규화 일치)를 가진 서로 다른 round_id 개수.
    """
    buckets = {}
    for rid, text in items:
        buckets.setdefault(normalize(text), []).append(rid)
    result = []
    for rid, text in items:
        key = normalize(text)
        stars = len(set(buckets[key]))
        result.append({"stars": stars, "groupId": "g-" + key[:24]})
    return result
