import re

_ENUM_RE = re.compile(r"^[\s]*[①-⑳]\s*|^[\s]*\d+[.)]\s*")
_NUM_PREFIX_RE = re.compile(r"^\s*\d+(-\d+)?\.\s*")

# 답을 나누는 구분자 — 반응식의 '→'나 소수점은 건드리지 않는다
_SPLIT_RE = re.compile(r"[,、/·]|\s\|\s")

# 짧은 항목은 그대로 채점 단위로 쓴다(이 길이를 넘으면 핵심어로 쪼갠다)
SHORT_ITEM_LEN = 14
# 한 채점 단위가 요구하는 핵심어 최대 개수(너무 많으면 사실상 못 맞춘다)
MAX_TERMS = 8
# '명칭 : 노흉각' 처럼 앞의 안내어는 떼고 뒤의 실제 답만 채점한다
_LEAD_LABEL_RE = re.compile(r"^(명칭|이유|정의|방법|목적|효과|의미|단위|값|답)\s*[:：]\s*")

# 조사·어미 (긴 것부터 떼어낸다)
_PARTICLES = [
    "시키도록", "하기위해", "에서의", "으로써", "으로서", "에게서", "이라고",
    "시키는", "시켜서", "시킨다", "시킴", "하도록", "되도록", "내리도록",
    "하여야", "하여", "되어", "하기", "되기", "하고", "되고", "하며", "되며",
    "하면", "되면", "한다", "된다", "하는", "되는", "이며", "이고", "라고",
    "에서", "에게", "으로", "까지", "부터", "보다", "마다", "조차", "처럼",
    "와의", "과의", "로써", "로서", "이나", "거나", "지만", "도록",
    "을", "를", "이", "가", "은", "는", "에", "의", "로", "와", "과", "도",
    "만", "께", "랑", "나", "며", "고", "함", "임", "됨",
]

# 정보량이 없는 단어 — 핵심어에서 뺀다
_STOPWORDS = {
    "다음", "각각", "위해", "위하여", "하기", "통해", "대한", "대하여", "관한",
    "따라", "때문", "경우", "것", "등", "및", "때", "수", "그", "이것", "저것",
    "있다", "없다", "한다", "된다", "이다", "아니다", "가지", "사항", "설명",
    "쓰시오", "구하시오", "적으시오", "나열", "무엇", "어떤", "해당", "다른",
    "매우", "가장", "더욱", "함께", "모두", "또는", "그리고", "하지만",
    "되도록", "위함", "때문에", "이하", "이상", "정도",
}


def _strip_particle(word):
    """단어 끝의 조사·어미를 뗀다(어간이 2자 이상 남을 때만)."""
    for p in _PARTICLES:
        if word.endswith(p) and len(word) - len(p) >= 2:
            return word[: -len(p)]
    return word


def core_terms(text):
    """문장에서 채점에 쓸 핵심어만 뽑는다(많으면 긴 것 위주로 추린다)."""
    text = _LEAD_LABEL_RE.sub("", _ENUM_RE.sub("", str(text)))
    terms, seen = [], set()
    for raw in re.split(r"[\s,、/·()\[\]{}]+", text):
        w = raw.strip(".:;~-–—")
        if not w:
            continue
        # 화학식·수치·영문 약어는 그대로 둔다
        if re.search(r"[A-Za-z0-9₀-₉]", w):
            cand = w
        else:
            cand = _strip_particle(w)
        if len(cand) < 2 or cand in _STOPWORDS:
            continue
        if cand not in seen:
            seen.add(cand)
            terms.append(cand)
    if len(terms) > MAX_TERMS:
        # 긴 낱말이 대개 전문용어다 — 그중 상위만 남기되 원래 순서를 지킨다
        keep = set(sorted(terms, key=len, reverse=True)[:MAX_TERMS])
        terms = [t for t in terms if t in keep]
    return terms


def derive_keywords(answers):
    """답 문자열들을 채점 단위 리스트로 변환.

    반환: [{"label": 화면에 보여줄 문구, "terms": [채점용 핵심어, ...]}]
    - 짧은 항목은 통째로 한 단위(예: "회선철")
    - 긴 문장은 핵심어로 쪼개 부분 인정이 되게 한다
    """
    out = []
    for a in answers:
        text = str(a).strip()
        if not text:
            continue
        # 반응식은 쪼개지 않는다(→ 가 있으면 식 전체가 하나의 답)
        pieces = [text] if "→" in text else _SPLIT_RE.split(text)
        for piece in pieces:
            piece = _ENUM_RE.sub("", piece).strip(" .")
            if not piece:
                continue
            if len(piece) <= SHORT_ITEM_LEN:
                terms = core_terms(piece) or [piece]
                out.append({"label": piece, "terms": terms})
            else:
                terms = core_terms(piece)
                if terms:
                    out.append({"label": piece, "terms": terms})
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
