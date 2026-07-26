import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from build_v2 import build

BASE = os.path.join(os.path.dirname(__file__), "..", "..")
ROUNDS = os.path.join(BASE, "원본자료", "제선기능장_기출문제_회차별.docx")
PHOTOS = os.path.join(BASE, "원본자료", "제선기능장_문제집_사진정리본.docx")
XLSX = os.path.join(BASE, "원본자료", "제선기능장.xlsx")
DATA = os.path.join(BASE, "data")


def test_structure_counts():
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    assert len(d["rounds"]) == 10
    assert sum(len(r["questions"]) for r in d["rounds"]) == 200
    assert len(d["topics"]) == 62
    assert sum(len(t["questions"]) for t in d["topics"]) == 173
    assert d["rounds"][0]["label"] == "2021년 1회차"
    assert d["rounds"][-1]["label"] == "2025년 2회차"


def test_keywords_and_qid_and_images():
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    r = next(r for r in d["rounds"] if r["id"] == "21-1")
    q4 = next(q for q in r["questions"] if q["num"] == 4)
    assert q4["qid"] == "21-1-4"
    assert q4["images"] == ["images/21-1_0.jpg"]
    assert q4["imageNeeded"] is False
    q1 = next(q for q in r["questions"] if q["num"] == 1)
    assert "회선철" in q1["parts"][0]["keywords"]


def test_topic_image_from_map():
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    t07 = next(t for t in d["topics"] if t["id"] == "t07")
    q = next(q for q in t07["questions"] if q["qid"] == "t07-38")
    assert q["images"] == ["images/21-1_0.jpg"]
    assert q["imageNeeded"] is False


def test_image_needed_flag_when_placeholder_unfilled():
    """그림자리는 있으나 채울 그림이 없으면 imageNeeded=True, 힌트는 남는다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    t12 = next(t for t in d["topics"] if t["id"] == "t12")
    q = next(q for q in t12["questions"] if q["qid"] == "t12-59")
    assert q["images"] == []
    assert q["imageNeeded"] is True
    assert "스키머" in q["imageHint"]


def test_svg_diagrams_are_attached():
    """직접 제작한 SVG 도표가 해당 문제에 연결된다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    by_qid = {q["qid"]: q for c in d["rounds"] + d["topics"] for q in c["questions"]}
    expected = {
        "t01-8": "diagrams/tuyere-zones.svg",
        "t01-9": "diagrams/flue-temp.svg",
        "t03-24": "diagrams/quartz-transition.svg",
        "t05-33": "diagrams/boudouard-pressure.svg",
        "t47-157": "diagrams/grain-distribution.svg",
    }
    for qid, path in expected.items():
        assert by_qid[qid]["images"] == [path], qid
        assert by_qid[qid]["imageNeeded"] is False, qid


def test_every_question_has_at_least_one_part():
    """작도 문제(답이 그림)도 UI가 깨지지 않도록 parts를 하나 보장한다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    for coll in d["rounds"] + d["topics"]:
        for q in coll["questions"]:
            assert len(q["parts"]) >= 1, q["qid"]
            for p in q["parts"]:
                assert "keywords" in p


def test_topic_exam_refs_and_stars():
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    q = next(q for t in d["topics"] for q in t["questions"] if q["examRefs"])
    assert q["stars"] == len(q["examRefs"])


def test_round_stars_count_distinct_rounds():
    """여러 회차에 반복 출제된 문제는 stars>1."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    starred = [q for r in d["rounds"] for q in r["questions"] if q["stars"] > 1]
    assert starred, "반복 출제 문제가 감지되어야 한다"


def test_random_pool_has_no_duplicates():
    """랜덤 풀 = 회차 전체 + 기출표시 없는 유형 문제 → 중복 없음."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    pool = [q["qid"] for r in d["rounds"] for q in r["questions"]]
    pool += [q["qid"] for t in d["topics"] for q in t["questions"] if not q["examRefs"]]
    assert len(pool) == len(set(pool))
    assert len(pool) == 200 + 86


def test_no_leftover_internal_field():
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    for coll in d["rounds"] + d["topics"]:
        for q in coll["questions"]:
            assert "imagePlaceholders" not in q


def test_table_questions_get_table_and_no_pending_image():
    """표 문제는 table 데이터가 붙고 '그림 준비중'으로 표시되지 않는다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    t06 = next(t for t in d["topics"] if t["id"] == "t06")
    q = next(q for q in t06["questions"] if q["qid"] == "t06-35")
    assert q["table"]["headers"] == ["부위", "요구특성", "사용재질"]
    assert len(q["table"]["rows"]) == 3
    assert q["imageNeeded"] is False

    t26 = next(t for t in d["topics"] if t["id"] == "t26")
    q2 = next(q for q in t26["questions"] if q["qid"] == "t26-103")
    assert "비중" in q2["table"]["headers"]
    assert q2["table"]["rows"][0][:2] == ["Fe₂O₃", "적철광"]
    assert q2["imageNeeded"] is False


def test_non_table_questions_have_no_table_key():
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    q = next(q for r in d["rounds"] for q in r["questions"] if q["qid"] == "21-1-1")
    assert "table" not in q
