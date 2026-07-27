import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from parse_docx import parse_rounds_doc, parse_photos_doc


def test_round_header_and_subquestions():
    lines = [
        "2021년 1회",
        "1. 선철을 파면의 색깔, 열원, 용도에 따라 각각 분류하시오.",
        "1-1. 파면의 색깔",
        "답  회선철, 백선철, 반선철",
        "1-2. 열원",
        "답  목탄 선철, 코크스 선철, 전기 선철",
    ]
    rounds = parse_rounds_doc(lines)
    assert len(rounds) == 1
    r = rounds[0]
    assert r["id"] == "21-1"
    assert r["label"] == "2021년 1회차"
    q = r["questions"][0]
    assert q["num"] == 1
    assert q["text"].startswith("선철을 파면의 색깔")
    assert [p["label"] for p in q["parts"]] == ["파면의 색깔", "열원"]
    assert q["parts"][0]["answers"] == ["회선철, 백선철, 반선철"]


def test_answer_continuation_lines_grouped():
    lines = [
        "2021년 1회",
        "5. 행잉의 원인 5가지",
        "답  장입물 분포 불량",
        "코크스 품질 불량",
        "통기 불량",
    ]
    q = parse_rounds_doc(lines)[0]["questions"][0]
    assert q["parts"] == [
        {"label": "", "answers": ["장입물 분포 불량", "코크스 품질 불량", "통기 불량"]}
    ]


def test_question_number_without_space():
    """'12.고로의 구조에서' 처럼 번호 뒤 공백이 없어도 대문제로 인식."""
    lines = [
        "2022년 1회",
        "11. 고로 내 코크스의 역할 3가지",
        "답  열원",
        "12.고로의 구조에서 해당하는 명칭을 쓰고, 유효내용적 설명",
        "［ 그림 삽입 위치 ］",
        "12-1. 고로 구조 명칭",
        "답  1) 노구 : Throat",
    ]
    qs = parse_rounds_doc(lines)[0]["questions"]
    assert [q["num"] for q in qs] == [11, 12]
    assert qs[1]["text"].startswith("고로의 구조에서")
    assert qs[1]["imagePlaceholders"] == 1


def test_decimal_answer_is_not_a_question():
    """'1.8 ~ 2.2' 같은 소수 답변 줄을 문제 번호로 오인하지 않는다."""
    lines = [
        "2025년 2회",
        "14. 고로 출선비 정의와 단위, 일반적인 고로 출선비",
        "답  고로 내용적 당 1일 용선 출선량",
        "ton/day/㎥",
        "1.8 ~ 2.2",
    ]
    qs = parse_rounds_doc(lines)[0]["questions"]
    assert [q["num"] for q in qs] == [14]
    assert "1.8 ~ 2.2" in qs[0]["parts"][0]["answers"]


def test_question_number_with_comma_separator():
    """'16, Slag Ratio 구하시오' 처럼 번호 뒤가 쉼표여도 대문제로 인식."""
    lines = [
        "2021년 2회",
        "15. 탈인 조건 4가지",
        "답  염기도 높인다",
        "16, Slag Ratio 구하시오 (내용적 2,850㎥)",
        "답  Slag Ratio = Slag 발생량 / 출선량",
    ]
    qs = parse_rounds_doc(lines)[0]["questions"]
    assert [q["num"] for q in qs] == [15, 16]
    assert qs[1]["text"].startswith("Slag Ratio 구하시오")


def test_thousands_separator_in_answer_is_not_a_question():
    """'1,300도 고온 송풍 가능' 같은 천단위 쉼표 답변을 문제로 오인하지 않는다."""
    lines = [
        "2025년 2회",
        "13. 고온 송풍의 효과",
        "답  1,200 ~ 1,300 ℃",
        "1,300도 고온 송풍 가능",
    ]
    qs = parse_rounds_doc(lines)[0]["questions"]
    assert [q["num"] for q in qs] == [13]
    assert qs[0]["parts"][0]["answers"] == ["1,200 ~ 1,300 ℃", "1,300도 고온 송풍 가능"]


def test_multiple_rounds_and_labels():
    lines = ["2021년 1회", "1. 가", "답  ㄱ", "2025년 2회", "1. 나", "답  ㄴ"]
    rounds = parse_rounds_doc(lines)
    assert [r["id"] for r in rounds] == ["21-1", "25-2"]
    assert [r["label"] for r in rounds] == ["2021년 1회차", "2025년 2회차"]


def test_topic_with_exam_refs_and_hint():
    lines = [
        "01. 열풍로",
        "문제 1.  열풍로의 형식(종류) 2가지와 각각의 특징을 쓰시오.",
        "기출 출제: 21년 1회 · 22년 1회 · 25년 2회",
        "답  내연식(Cowper): 연소실·축열실이 하나의 돔",
        "외연식(Koppers): 열효율 우수",
        "문제 8.  (그림) 풍구 앞 상황을 나타낸 그림이다. A, B, C 각 부분의 가스조성을 쓰시오.",
        "［ 그림 삽입 위치 ］  풍구 앞 A·B·C 영역 구분도",
        "답  A : O₂ + CO₂ + CO + N₂",
    ]
    topics = parse_photos_doc(lines)
    assert len(topics) == 1
    t = topics[0]
    assert t["id"] == "t01"
    assert t["label"] == "01. 열풍로"
    q1, q2 = t["questions"]
    assert q1["num"] == 1
    assert q1["examRefs"] == ["21-1", "22-1", "25-2"]
    assert q1["parts"][0]["answers"] == [
        "내연식(Cowper): 연소실·축열실이 하나의 돔",
        "외연식(Koppers): 열효율 우수",
    ]
    assert q2["examRefs"] == []
    assert q2["imagePlaceholders"] == 1
    assert q2["imageHint"] == "풍구 앞 A·B·C 영역 구분도"


def test_topic_header_not_confused_with_question():
    lines = ["03. 코크스", "문제 13.  제철용 코크스 구비조건 5가지를 쓰시오.", "답  ① 불순물 적을 것"]
    topics = parse_photos_doc(lines)
    assert topics[0]["id"] == "t03"
    assert topics[0]["questions"][0]["num"] == 13


def test_condition_lines_kept_as_question_condition():
    """문제와 답 사이의 조건 줄이 사라지지 않고 조건으로 보존된다."""
    lines = [
        "2023년 1회",
        "1. 선철 1ton을 생산하는 데 필요한 광석량 계산",
        "선철 1ton 중 Fe 함유량 93.0%, 연진발생량 선철 ton당 12kg",
        "광재 중 Fe 함유량 0.5%, 철광석 중 Fe 함유량 57%",
        "답  선철 Fe 양 + 연진 Fe 양 = ...",
        "장입 광석량 x = 1640.17kg",
    ]
    q = parse_rounds_doc(lines)[0]["questions"][0]
    assert q["conditions"] == [
        "선철 1ton 중 Fe 함유량 93.0%, 연진발생량 선철 ton당 12kg",
        "광재 중 Fe 함유량 0.5%, 철광석 중 Fe 함유량 57%",
    ]
    assert q["parts"][0]["answers"] == [
        "선철 Fe 양 + 연진 Fe 양 = ...", "장입 광석량 x = 1640.17kg"]


def test_v2_paren_subquestion_and_arrow_answer():
    """새 사진정리본 형식: '(1) 라벨' 소문제 + '→ 답:' 답."""
    lines = [
        "01. 열풍로",
        "문제 1.  열풍로의 형식(종류) 2가지와 각각의 특징을 쓰시오.",
        "기출 출제: 21년 1회 · 22년 1회",
        "(1) 내연식(Cowper·McClure식)",
        "→ 답: 송풍온도 약 1,150℃, 연소실·축열실 한 탑 구조",
        "(2) 외연식(Koppers·Martin식)",
        "→ 답: 송풍온도 약 1,300℃, 연소실·축열실 분리",
    ]
    q = parse_photos_doc(lines)[0]["questions"][0]
    assert [p["label"] for p in q["parts"]] == [
        "내연식(Cowper·McClure식)", "외연식(Koppers·Martin식)"]
    assert q["parts"][0]["answers"] == ["송풍온도 약 1,150℃, 연소실·축열실 한 탑 구조"]
    assert q["examRefs"] == ["21-1", "22-1"]


def test_v2_plain_answer_with_continuation_and_note():
    """'답 ' 다음 줄들도 같은 답으로 묶이고, '(추가: …)'도 답에 남는다."""
    lines = [
        "01. 열풍로",
        "문제 6.  송풍기 능력 저하 시 비상조치 3가지를 쓰시오.",
        "답  ① 미분탄·산소부화 중지 후 노정압 하향",
        "② 예비 송풍기 가동하여 교체운전",
        "문제 4.  풍구로 취입되는 것 4가지를 쓰시오.",
        "답  열풍, 산소, 중유, 미분탄",
        "(추가: 천연가스, 코크스로 가스)",
    ]
    qs = parse_photos_doc(lines)[0]["questions"]
    assert qs[0]["parts"][0]["answers"] == [
        "① 미분탄·산소부화 중지 후 노정압 하향", "② 예비 송풍기 가동하여 교체운전"]
    assert qs[1]["parts"][0]["answers"] == [
        "열풍, 산소, 중유, 미분탄", "(추가: 천연가스, 코크스로 가스)"]
