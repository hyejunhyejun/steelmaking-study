import os, sys, json, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import docx
from parse_docx import parse_rounds_doc, parse_photos_doc
from images import extract_images
from imagemap import TOPIC_IMAGES, ROUND_IMAGE_OVERRIDES
from derive import derive_keywords, normalize


def _lines(path):
    return [p.text for p in docx.Document(path).paragraphs]


def _finish(q, qid, images):
    """qid·그림·키워드를 채우고 내부 필드를 정리한다."""
    q["qid"] = qid
    q["images"] = images
    q["imageNeeded"] = bool(q.get("imagePlaceholders", 0)) and not images
    q["imageHint"] = q.get("imageHint", "")
    q.pop("imagePlaceholders", None)
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

    for t in topics:
        t["type"] = "topic"
        for q in t["questions"]:
            qid = f"{t['id']}-{q['num']}"
            _finish(q, qid, list(TOPIC_IMAGES.get(qid, [])))
            q["stars"] = len(q["examRefs"]) if q["examRefs"] else 1
            q["groupId"] = "g-" + normalize(q["text"])[:24]

    return {"meta": {"generatedAt": datetime.date.today().isoformat(),
                     "source": "docx v2"},
            "rounds": rounds, "topics": topics}


def main():
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    data = build(os.path.join(base, "원본자료", "제선기능장_기출문제_회차별.docx"),
                 os.path.join(base, "원본자료", "제선기능장_문제집_사진정리본.docx"),
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
