"""사진정리본(유형별) 문제 ↔ 엑셀 그림 매핑.

엑셀에 **정확히 일치**하는 그림만 등록한다(답안의 라벨 체계까지 일치할 때).
확신이 없으면 등록하지 않고 비워 둔다 — 사용자가 직접 채울 예정.

qid 형식: f"{topic_id}-{question_num}"  예: "t07-38"
"""

TOPIC_IMAGES = {
    # 고로 부위/구역 명칭 — 답이 '가. 노구 / 나. 괴상대 / 다. 연화융착대 …'
    # → (가)~(바)로 구역을 표기한 21-1 Q4 그림과 일치
    "t07-38": ["images/21-1_0.jpg"],

    # 노정장입물 형상·가스온도·가스성분 분포 4패널 (a)(b)(c)(d)
    # → 24-2 Q14 그림과 일치
    "t11-55": ["images/24-2_2.jpg"],

    # 슬래그 삼원도 — 답이 'A / B / C' 조성
    # → A·B·C를 표기한 24-2 Q9 삼각격자와 일치 (21-1 Q17은 가·나·다라서 제외)
    "t12-58": ["images/24-2_1.jpg"],

    # Gieseler 시성곡선 a·b·c(연화개시·최고유동·고화)
    # → 25-2 Q17 그림과 일치
    "t26-104": ["images/25-2_1.jpg"],

    # --- 직접 제작한 SVG 도표(data/diagrams/, 재빌드에도 지워지지 않음) ---
    "t01-8": ["diagrams/tuyere-zones.svg"],          # 풍구 앞 A·B·C 영역
    "t01-9": ["diagrams/flue-temp.svg"],             # Flue별 온도분포(PS~CS), ⓐ 편차
    "t03-24": ["diagrams/quartz-transition.svg"],    # 석영 상변태 573/870/1470/1713℃
    "t05-33": ["diagrams/boudouard-pressure.svg"],   # 부두아 압력 증가→우측 이동
    "t47-157": ["diagrams/grain-distribution.svg"],  # 입도분포 (a)(b)(c)
}

# 회차 문제는 (회차, 번호) 자동 매칭이 전량 정확해 보정이 필요 없다.
ROUND_IMAGE_OVERRIDES = {}
