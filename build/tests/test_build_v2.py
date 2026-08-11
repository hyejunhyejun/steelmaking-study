import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from build_v2 import build

BASE = os.path.join(os.path.dirname(__file__), "..", "..")
ROUNDS = os.path.join(BASE, "원본자료", "제선기능장_기출문제_회차별.docx")
PHOTOS = os.path.join(BASE, "원본자료", "제선기능장_문제집_사진정리본_v2.docx")
XLSX = os.path.join(BASE, "원본자료", "제선기능장.xlsx")
DATA = os.path.join(BASE, "data")


def test_structure_counts():
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    assert len(d["rounds"]) == 10
    assert sum(len(r["questions"]) for r in d["rounds"]) == 200
    assert len(d["topics"]) == 62
    assert sum(len(t["questions"]) for t in d["topics"]) == 172  # 워드 171 + 추가 1
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
    labels = [k["label"] for k in q1["parts"][0]["keywords"]]
    assert "회선철" in labels


def test_topic_image_from_map():
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    t07 = next(t for t in d["topics"] if t["id"] == "t07")
    q = next(q for q in t07["questions"] if q["qid"] == "t07-37")
    assert q["images"] == ["images/21-1_0.jpg"]
    assert q["imageNeeded"] is False


def test_no_pending_images_left():
    """모든 그림자리가 그림·표로 채워졌거나 그림 불필요로 정리되었다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    pending = [q["qid"] for c in d["rounds"] + d["topics"]
               for q in c["questions"] if q["imageNeeded"]]
    assert pending == [], pending


def test_question_marked_no_image_needed():
    """그림 없이 문제·답만으로 충분한 문항은 '준비중'을 띄우지 않는다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    r = next(r for r in d["rounds"] if r["id"] == "22-1")
    q = next(q for q in r["questions"] if q["qid"] == "22-1-16")
    assert q["images"] == []
    assert q["imageNeeded"] is False


def test_svg_diagrams_are_attached():
    """직접 제작한 SVG 도표가 해당 문제에 연결된다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    by_qid = {q["qid"]: q for c in d["rounds"] + d["topics"] for q in c["questions"]}
    expected = {
        "t05-33": "diagrams/boudouard-pressure.svg",
        "t12-57": "diagrams/slag-ternary.svg",
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
    assert len(pool) == 200 + 87  # 추가 문항 1개 포함


def test_no_leftover_internal_field():
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    for coll in d["rounds"] + d["topics"]:
        for q in coll["questions"]:
            assert "imagePlaceholders" not in q


def test_table_questions_get_table_and_no_pending_image():
    """표 문제는 table 데이터가 붙고 '그림 준비중'으로 표시되지 않는다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    t26 = next(t for t in d["topics"] if t["id"] == "t26")
    q2 = next(q for q in t26["questions"] if q["qid"] == "t26-102")
    assert "비중" in q2["table"]["headers"]
    assert q2["table"]["rows"][0][:2] == ["Fe₂O₃", "적철광"]


def test_non_table_questions_have_no_table_key():
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    q = next(q for r in d["rounds"] for q in r["questions"] if q["qid"] == "21-1-1")
    assert "table" not in q


def test_real_figures_replace_svg_where_available():
    """실물 그림이 있는 문항은 SVG 대신 사진을 쓴다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    by_qid = {q["qid"]: q for c in d["rounds"] + d["topics"] for q in c["questions"]}
    assert by_qid["t03-24"]["images"] == ["images/fig_quartz.jpg"]
    assert by_qid["t01-8"]["images"] == ["images/fig_tuyere.jpg"]
    assert by_qid["t01-9"]["images"] == ["images/fig_flue.jpg"]
    assert by_qid["t07-40"]["images"] == ["images/fig_coke_rate.jpg"]
    assert by_qid["t12-58"]["images"] == ["images/photo_58.jpg"]
    assert by_qid["t47-155"]["images"] == ["images/photo_155.jpg"]


def test_duplicate_questions_share_one_answer():
    """회차·유형에 중복 수록된 문항은 같은 답을 보여준다(외우기 쉽게)."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    by_qid = {q["qid"]: q for c in d["rounds"] + d["topics"] for q in c["questions"]}
    for a, b in [("t13-64", "23-1-16"), ("t14-66", "22-2-9"),
                 ("t14-67", "25-2-3"), ("t01-5", "24-2-11")]:
        assert by_qid[a]["parts"] == by_qid[b]["parts"], (a, b)


def test_ore_calculation_typo_fixed():
    """광석량 계산의 품위 오타(0.067)와 결과값이 바로잡혔다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    q = next(q for r in d["rounds"] for q in r["questions"] if q["qid"] == "24-1-10")
    text = " ".join(a for p in q["parts"] for a in p["answers"])
    assert "0.607" in text and "0.067" not in text
    assert "1,616.22kg" in text


def test_long_answers_are_split_into_core_terms():
    """긴 서술형 답도 채점 가능한 핵심어로 쪼개진다(문장 통째 매칭 금지)."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    units = [k for c in d["rounds"] + d["topics"] for q in c["questions"]
             for p in q["parts"] for k in p["keywords"]]
    import re
    assert units, "채점 단위가 있어야 한다"
    # 한글로만 된 핵심어는 짧아야 한다(문장이 통째로 남으면 못 맞춘다).
    # 반응식·고유명사(영문·숫자 포함)는 통째로 맞히는 게 맞으므로 제외한다.
    korean_only = [t for u in units for t in u["terms"]
                   if not re.search(r"[A-Za-z0-9₀-₉→+]", t)]
    assert korean_only
    assert max(len(t) for t in korean_only) <= 12
    # 한 단위가 요구하는 핵심어는 8개를 넘지 않는다
    assert max(len(u["terms"]) for u in units) <= 8


def test_fuel_ratio_question_and_answer_agree():
    """24-1-9: 문제 수치(회분7·휘발분5·수분3)와 답(85%, 17)이 일치한다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    q = next(q for r in d["rounds"] for q in r["questions"] if q["qid"] == "24-1-9")
    assert "휘발분 5%" in q["text"] and "수분 3%" in q["text"]
    text = " ".join(a for p in q["parts"] for a in p["answers"])
    assert "= 85%" in text
    assert "85% / 5% = 17" in text
    assert "29.33" not in text


def test_extra_blending_question_inserted_before_25():
    """워드에 없는 블렌딩 문항이 배합 유형 맨 앞(25번 앞)에 들어간다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    t04 = next(t for t in d["topics"] if t["id"] == "t04")
    assert t04["questions"][0]["text"].startswith("블렌딩")
    assert t04["questions"][1]["num"] == 25


def test_topic_answer_fixes_applied():
    """이외 기출문제 수정분이 반영된다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    by = {q["qid"]: q for t in d["topics"] for q in t["questions"]}
    assert "(*불고기적수)" not in by["t03-13"]["text"]
    assert by["t03-24"]["parts"][0]["answers"] == ["573℃", "870℃", "1,470℃", "1,713℃"]
    assert "통액성 불량" in " ".join(by["t03-23"]["parts"][0]["answers"])
    assert by["t07-37"]["parts"][2]["answers"] == ["출선구에서 장입기준선까지의 용적"]
    assert [p["label"] for p in by["t02-11"]["parts"]][-1] == "노상부"
    # 38번은 기출(22-2-10)과 같은 답
    r = {q["qid"]: q for c in d["rounds"] for q in c["questions"]}
    assert by["t07-38"]["parts"] == r["22-2-10"]["parts"]


def test_same_question_same_answer_across_sections():
    """회차와 이외 기출문제에 겹치는 문항은 같은 문장으로 답한다."""
    d = build(ROUNDS, PHOTOS, XLSX, DATA)
    by = {q["qid"]: q for c in d["rounds"] + d["topics"] for q in c["questions"]}
    # 코크스 역할: 개수만 다르고 앞에서부터 같은 순서
    role4 = by["t03-14"]["parts"][0]["answers"]
    assert by["23-2-5"]["parts"][0]["answers"] == role4
    assert by["22-1-11"]["parts"][0]["answers"] == role4[:3]
    # 예열탄 장점 2가지
    assert (by["21-1-7"]["parts"][1]["answers"]
            == by["t17-76"]["parts"][1]["answers"])
