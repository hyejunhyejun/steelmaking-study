import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from derive import derive_keywords, core_terms, normalize, compute_groups


def labels(ks):
    return [k["label"] for k in ks]


def test_short_items_split_by_comma():
    ks = derive_keywords(["회선철, 백선철, 반선철"])
    assert labels(ks) == ["회선철", "백선철", "반선철"]
    assert ks[0]["terms"] == ["회선철"]


def test_enumerators_are_stripped():
    ks = derive_keywords(["① 장입물 분포 불량", "코크스 품질 불량"])
    assert labels(ks) == ["장입물 분포 불량", "코크스 품질 불량"]


def test_long_sentence_becomes_core_terms():
    """긴 문장은 통째로 두지 않고 핵심어로 쪼개 부분 인정이 가능해야 한다."""
    ks = derive_keywords(["석탄을 코크스로에 장입하기 전 가열하여 수분을 감소시키는 방법"])
    assert len(ks) == 1
    terms = ks[0]["terms"]
    assert "석탄" in terms and "코크스로" in terms and "수분" in terms
    # 조사가 붙은 형태로 남으면 안 된다
    assert "석탄을" not in terms and "수분을" not in terms
    # 문장 전체가 하나의 매칭 단위로 남으면 안 된다
    assert all(len(t) <= 12 for t in terms)


def test_particles_and_stopwords_removed():
    terms = core_terms("장입물이 하강함에 따라 온도가 상승하여 부피가 증가한다")
    assert "장입물" in terms and "온도" in terms and "부피" in terms
    assert "따라" not in terms


def test_chemical_formula_kept_whole():
    ks = derive_keywords(["2CO → CO₂ + C"])
    assert ks[0]["label"] == "2CO → CO₂ + C"
    assert "CO₂" in ks[0]["terms"]


def test_slash_and_middot_split():
    ks = derive_keywords(["내마모성·저기공률 / 점토질·샤모트질"])
    assert labels(ks) == ["내마모성", "저기공률", "점토질", "샤모트질"]


def test_normalize_strips_number_and_symbols():
    a = normalize("1. 선철을 파면의 색깔, 열원, 용도에 따라 각각 분류하시오.")
    b = normalize("선철을 파면의 색깔 열원 용도에 따라 각각 분류하시오")
    assert a == b


def test_compute_groups_counts_distinct_rounds():
    items = [
        ("21-1", "1. 선철 분류하시오"),
        ("23-2", "선철 분류하시오."),
        ("21-1", "2. 다른 문제"),
    ]
    out = compute_groups(items)
    assert out[0]["stars"] == 2
    assert out[1]["stars"] == 2
    assert out[0]["groupId"] == out[1]["groupId"]
    assert out[2]["stars"] == 1
    assert out[2]["groupId"] != out[0]["groupId"]
