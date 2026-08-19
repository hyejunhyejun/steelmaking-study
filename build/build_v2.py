import os, sys, json, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import docx
from parse_docx import parse_rounds_doc, parse_photos_doc
from images import (extract_images, extract_docx_photos, extract_note_figures,
                    extract_extra_figures, extract_masked_figures)
from imagemap import (TOPIC_IMAGES, ROUND_IMAGE_OVERRIDES, DOCX_PHOTO_NUMS,
                      NO_IMAGE_NEEDED)
from tables import TABLES
from answers import ANSWER_OVERRIDES, ANSWER_UNIFY, QUESTION_TEXT_FIXES
from extras import EXTRA_QUESTIONS, QUESTION_CHOICES, DROP_QUESTIONS
from derive import derive_keywords, normalize


def _lines(path):
    return [p.text for p in docx.Document(path).paragraphs]


def _finish(q, qid, images):
    """qid·그림·표·키워드를 채우고 내부 필드를 정리한다."""
    q["qid"] = qid
    # 문제 문구가 잘못 적힌 문항은 바로잡는다
    if qid in QUESTION_TEXT_FIXES:
        q["text"] = QUESTION_TEXT_FIXES[qid]
    q["images"] = images
    table = TABLES.get(qid)
    if table:
        q["table"] = table
    # 그림자리가 있어도 그림·표로 채워졌거나 그림이 불필요하면 '준비중'이 아니다
    q["imageNeeded"] = (bool(q.get("imagePlaceholders", 0)) and not images
                        and not table and qid not in NO_IMAGE_NEEDED)
    q["imageHint"] = q.get("imageHint", "")
    q["conditions"] = QUESTION_CHOICES.get(qid) or q.get("conditions", [])
    q.pop("imagePlaceholders", None)
    # 워드에 답이 없는 문항만 보강한다(정본은 워드)
    if qid in ANSWER_OVERRIDES and not any(p["answers"] for p in q["parts"]):
        q["parts"] = [dict(p) for p in ANSWER_OVERRIDES[qid]]
    # 회차·유형에 중복 수록된 문항은 한 가지 답으로 통일한다
    if qid in ANSWER_UNIFY:
        q["parts"] = [dict(p) for p in ANSWER_UNIFY[qid]]
        q["unified"] = True
    # 작도 문제(답이 그림 자체)는 답 단락이 없다 → UI 일관성을 위해 빈 파트 보장
    if not q["parts"]:
        q["parts"] = [{"label": "", "answers": []}]
    for p in q["parts"]:
        p["keywords"] = derive_keywords(p["answers"])
    return q


def build(rounds_docx, photos_docx, xlsx, out_dir):
    """워드 2종 + 엑셀 그림 → questions.json v2 데이터."""
    img_map = extract_images(xlsx, os.path.join(out_dir, "images"))

    rounds = parse_rounds_doc(_lines(rounds_docx))
    topics = parse_photos_doc(_lines(photos_docx))

    for r in rounds:
        r["type"] = "exam"
        for q in r["questions"]:
            qid = f"{r['id']}-{q['num']}"
            imgs = ROUND_IMAGE_OVERRIDES.get(qid) or img_map.get((r["id"], q["num"]), [])
            _finish(q, qid, list(imgs))

    # 별표: 정규화 텍스트가 같은 문제가 등장한 서로 다른 회차 수
    buckets = {}
    for r in rounds:
        for q in r["questions"]:
            buckets.setdefault(normalize(q["text"]), set()).add(r["id"])
    for r in rounds:
        for q in r["questions"]:
            key = normalize(q["text"])
            q["stars"] = len(buckets[key])
            q["groupId"] = "g-" + key[:24]
            q["examRefs"] = []

    # 워드에 내장된 실제 사진(스키머·입도분포 등)은 그대로 사용한다
    photos = extract_docx_photos(photos_docx, os.path.join(out_dir, "images"),
                                 DOCX_PHOTO_NUMS)
    # 노트 사진에서 잘라 쓰는 실물 그림(석영 상변태 등)
    extract_note_figures(os.path.join(os.path.dirname(photos_docx), "추가노트사진"),
                         os.path.join(out_dir, "images"))
    # 사용자가 직접 준 깨끗한 원본 그림
    extract_extra_figures(os.path.join(os.path.dirname(photos_docx), "추가그림"),
                          os.path.join(out_dir, "images"))
    # 답이 적힌 도해는 그 자리를 비워 문제용으로 만든다
    extract_masked_figures(os.path.join(os.path.dirname(photos_docx), "추가그림"),
                           os.path.join(out_dir, "images"))

    # 워드에 없는 추가 문항을 지정 위치에 끼워넣는다
    for t in topics:
        for before, q in EXTRA_QUESTIONS.get(t["id"], []):
            idx = next((i for i, x in enumerate(t["questions"]) if x["num"] == before),
                       len(t["questions"]))
            t["questions"].insert(idx, dict(q, parts=[dict(p) for p in q["parts"]]))

    for t in topics:
        # 회차 문제와 겹치는 문항은 뺀다
        t["questions"] = [q for q in t["questions"]
                          if f"{t['id']}-{q['num']}" not in DROP_QUESTIONS]
    topics = [t for t in topics if t["questions"]]

    for t in topics:
        t["type"] = "topic"
        # 유형명에서 앞의 번호를 뗀 짧은 이름(문제 옆 배지에 쓴다)
        t["shortLabel"] = t["label"].split(". ", 1)[-1]
        for q in t["questions"]:
            qid = f"{t['id']}-{q['num']}"
            imgs = ([photos[q["num"]]] if q["num"] in photos
                    else list(TOPIC_IMAGES.get(qid, [])))
            _finish(q, qid, imgs)
            q["topicId"] = t["id"]
            q["topicLabel"] = t["shortLabel"]
            q["stars"] = len(q["examRefs"]) if q["examRefs"] else 1
            q["groupId"] = "g-" + normalize(q["text"])[:24]

    return {"meta": {"generatedAt": datetime.date.today().isoformat(),
                     "source": "docx v2"},
            "rounds": rounds, "topics": topics}


def main():
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    data = build(os.path.join(base, "원본자료", "제선기능장_기출문제_회차별.docx"),
                 os.path.join(base, "원본자료", "제선기능장_문제집_사진정리본_v2.docx"),
                 os.path.join(base, "원본자료", "제선기능장.xlsx"),
                 os.path.join(base, "data"))
    out = os.path.join(base, "data", "questions.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    nr = sum(len(r["questions"]) for r in data["rounds"])
    nt = sum(len(t["questions"]) for t in data["topics"])
    need = sum(1 for c in (data["rounds"] + data["topics"])
               for q in c["questions"] if q["imageNeeded"])
    withimg = sum(1 for c in (data["rounds"] + data["topics"])
                  for q in c["questions"] if q["images"])
    print(f"작성 완료: 회차 {len(data['rounds'])}개/{nr}문제, "
          f"유형 {len(data['topics'])}개/{nt}문제, "
          f"그림 있는 문제 {withimg}건, 그림 미충족 {need}건")


if __name__ == "__main__":
    main()
