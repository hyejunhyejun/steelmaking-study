"""사진정리본(유형별) 문제 ↔ 그림 매핑.

qid 형식: f"{topic_id}-{question_num}"  예: "t07-37"
- 워드에 내장된 실제 사진은 build 단계에서 자동 추출해 우선 사용한다(DOCX_PHOTO_NUMS).
- 그 외에는 엑셀 그림(images/…) 또는 직접 제작한 SVG(diagrams/…)를 연결한다.
"""

# 워드에 실제 사진이 들어 있어 그대로 쓰는 문제 번호
DOCX_PHOTO_NUMS = {58, 155}

TOPIC_IMAGES = {
    # --- 직접 제작한 SVG 도표 ---
    "t01-8": ["diagrams/tuyere-zones.svg"],          # 풍구 앞 A·B·C 영역
    "t01-9": ["diagrams/flue-temp.svg"],             # Flue별 온도분포(PS~CS), ⓐ 편차
    "t05-33": ["diagrams/boudouard-pressure.svg"],   # 부두아 압력 증가→우측 이동(문제/답)
    "t12-57": ["diagrams/slag-ternary.svg"],         # 슬래그 삼원도 A·B점

    # --- 노트 사진에서 잘라낸 실물 그림 ---
    "t03-24": ["images/note_quartz.jpg"],   # 석영 상변태 곡선(톱니형 실물)

    # --- 엑셀에서 가져온 그림(답안 라벨 체계까지 일치 확인) ---
    "t07-37": ["images/21-1_0.jpg"],   # 고로 부위/구역 명칭 (가~바)
    "t11-54": ["images/24-2_2.jpg"],   # 노정장입물 형상·가스온도·성분 4패널
    "t26-103": ["images/25-2_1.jpg"],  # Gieseler 시성곡선 a·b·c
}

# 그림 없이 문제·답만으로 충분한 문항(‘그림 준비중’ 표시를 띄우지 않는다)
NO_IMAGE_NEEDED = {"22-1-16"}

# 회차 문제는 (회차, 번호) 자동 매칭이 전량 정확해 보정이 필요 없다.
ROUND_IMAGE_OVERRIDES = {}
