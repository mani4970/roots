-- 109_kbs_bible_spacing_corrections_2_1.sql
-- Christian Roots 2.1 Korean Bible paragraph-boundary spacing correction
--
-- Scope:
--   - Correct text only for 508 verified KBS verses.
--   - KRV (84): 251 rows.
--   - NKRV (92): 257 rows.
--   - Require every live row to match its audited pre-fix text before updating.
--   - Preserve schemas, grants, RLS, reflection records, streaks, progress,
--     rewards, badges, and every non-Bible table.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $spacing_fix$
declare
  corrections constant jsonb := $corrections$
[
  {
    "translation_id": 84,
    "book_number": 1,
    "chapter": 4,
    "verse_start": 23,
    "current_text": "라멕이 아내들에게 이르되아다와 씰라여 내 소리를 들으라 라멕의 아내들이여 내 말을 들으라 나의 창상을 인하여 내가 사람을 죽였고 나의 상함을 인하여 소년을 죽였도다",
    "corrected_text": "라멕이 아내들에게 이르되 아다와 씰라여 내 소리를 들으라 라멕의 아내들이여 내 말을 들으라 나의 창상을 인하여 내가 사람을 죽였고 나의 상함을 인하여 소년을 죽였도다"
  },
  {
    "translation_id": 84,
    "book_number": 1,
    "chapter": 4,
    "verse_start": 24,
    "current_text": "가인을 위하여는 벌이 칠배일찐대 라멕을 위하여는 벌이 칠십 칠배이리로다하였더라",
    "corrected_text": "가인을 위하여는 벌이 칠배일찐대 라멕을 위하여는 벌이 칠십 칠배이리로다 하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 1,
    "chapter": 9,
    "verse_start": 25,
    "current_text": "이에 가로되가나안은 저주를 받아 그 형제의 종들의 종이 되기를 원하노라",
    "corrected_text": "이에 가로되 가나안은 저주를 받아 그 형제의 종들의 종이 되기를 원하노라"
  },
  {
    "translation_id": 84,
    "book_number": 1,
    "chapter": 9,
    "verse_start": 26,
    "current_text": "또 가로되셈의 하나님 여호와를 찬송하리로다 가나안은 셈의 종이 되고",
    "corrected_text": "또 가로되 셈의 하나님 여호와를 찬송하리로다 가나안은 셈의 종이 되고"
  },
  {
    "translation_id": 84,
    "book_number": 1,
    "chapter": 9,
    "verse_start": 27,
    "current_text": "하나님이 야벳을 창대케 하사 셈의 장막에 거하게 하시고 가나안은 그의 종이 되게 하시기를 원하노라하였더라",
    "corrected_text": "하나님이 야벳을 창대케 하사 셈의 장막에 거하게 하시고 가나안은 그의 종이 되게 하시기를 원하노라 하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 1,
    "chapter": 25,
    "verse_start": 23,
    "current_text": "여호와께서 그에게 이르시되두 국민이 네 태중에 있구나 두 민족이 네 복중에서부터 나누이리라 이 족속이 저 족속보다 강하겠고 큰 자는 어린 자를 섬기리라하셨더라",
    "corrected_text": "여호와께서 그에게 이르시되 두 국민이 네 태중에 있구나 두 민족이 네 복중에서부터 나누이리라 이 족속이 저 족속보다 강하겠고 큰 자는 어린 자를 섬기리라 하셨더라"
  },
  {
    "translation_id": 84,
    "book_number": 1,
    "chapter": 27,
    "verse_start": 27,
    "current_text": "그가 가까이 가서 그에게 입맞추니 아비가 그 옷의 향취를 맡고 그에게 축복하여 가로되내 아들의 향취는 여호와의 복 주신 밭의 향취로다",
    "corrected_text": "그가 가까이 가서 그에게 입맞추니 아비가 그 옷의 향취를 맡고 그에게 축복하여 가로되 내 아들의 향취는 여호와의 복 주신 밭의 향취로다"
  },
  {
    "translation_id": 84,
    "book_number": 1,
    "chapter": 27,
    "verse_start": 39,
    "current_text": "그 아비 이삭이 그에게 대답하여 가로되너의 주소는 땅의 기름짐에서 뜨고 내리는 하늘 이슬에서 뜰것이며",
    "corrected_text": "그 아비 이삭이 그에게 대답하여 가로되 너의 주소는 땅의 기름짐에서 뜨고 내리는 하늘 이슬에서 뜰것이며"
  },
  {
    "translation_id": 84,
    "book_number": 1,
    "chapter": 27,
    "verse_start": 40,
    "current_text": "너는 칼을 믿고 생활하겠고 네 아우를 섬길 것이며 네가 매임을 벗을 때에는 그 멍에를 네 목에서 떨쳐버리리라하였더라",
    "corrected_text": "너는 칼을 믿고 생활하겠고 네 아우를 섬길 것이며 네가 매임을 벗을 때에는 그 멍에를 네 목에서 떨쳐버리리라 하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 1,
    "chapter": 35,
    "verse_start": 22,
    "current_text": "이스라엘이 그 땅에 유할 때에 르우벤이 가서 그 서모 빌하와 통간하매 이스라엘이 이를 들었더라야곱의 아들은 열둘이라",
    "corrected_text": "이스라엘이 그 땅에 유할 때에 르우벤이 가서 그 서모 빌하와 통간하매 이스라엘이 이를 들었더라 야곱의 아들은 열둘이라"
  },
  {
    "translation_id": 84,
    "book_number": 2,
    "chapter": 15,
    "verse_start": 1,
    "current_text": "이 때에 모세와 이스라엘 자손이 이 노래로 여호와께 노래하니 일렀으되내가 여호와를 찬송하리니 그는 높고 영화로우심이요 말과 그 탄 자를 바다에 던지셨음이로다",
    "corrected_text": "이 때에 모세와 이스라엘 자손이 이 노래로 여호와께 노래하니 일렀으되 내가 여호와를 찬송하리니 그는 높고 영화로우심이요 말과 그 탄 자를 바다에 던지셨음이로다"
  },
  {
    "translation_id": 84,
    "book_number": 2,
    "chapter": 15,
    "verse_start": 18,
    "current_text": "여호와의 다스리심이 영원무궁하시도다하였더라",
    "corrected_text": "여호와의 다스리심이 영원무궁하시도다 하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 2,
    "chapter": 15,
    "verse_start": 21,
    "current_text": "미리암이 그들에게 화답하여 가로되너희는 여호와를 찬송하라 그는 높고 영화로우심이요 말과 그 탄 자를 바다에 던지셨음이로다하였더라",
    "corrected_text": "미리암이 그들에게 화답하여 가로되 너희는 여호와를 찬송하라 그는 높고 영화로우심이요 말과 그 탄 자를 바다에 던지셨음이로다 하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 21,
    "verse_start": 15,
    "current_text": "모든 골짜기의 비탈은 아르 고을을 향하여 기울어지고 모압의 경계에 닿았도다하였더라",
    "corrected_text": "모든 골짜기의 비탈은 아르 고을을 향하여 기울어지고 모압의 경계에 닿았도다 하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 21,
    "verse_start": 17,
    "current_text": "그 때에 이스라엘이 노래하여 가로되우물 물아 솟아나라 너희는 그것을 노래하라",
    "corrected_text": "그 때에 이스라엘이 노래하여 가로되 우물 물아 솟아나라 너희는 그것을 노래하라"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 21,
    "verse_start": 18,
    "current_text": "이 우물은 족장들이 팠고 백성의 귀인들이 홀과 지팡이로 판 것이로다하였더라 광야에서 맛다나에 이르렀고",
    "corrected_text": "이 우물은 족장들이 팠고 백성의 귀인들이 홀과 지팡이로 판 것이로다 하였더라 광야에서 맛다나에 이르렀고"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 21,
    "verse_start": 27,
    "current_text": "그러므로 시인이 읊어 가로되너희는 헤스본으로 올찌어다 시혼의 성을 세워 견고히 할찌어다",
    "corrected_text": "그러므로 시인이 읊어 가로되 너희는 헤스본으로 올찌어다 시혼의 성을 세워 견고히 할찌어다"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 21,
    "verse_start": 30,
    "current_text": "우리가 그들을 쏘아서 헤스본을 디본까지 멸하였고 메드바에 가까운 노바까지 황폐케 하였도다하였더라",
    "corrected_text": "우리가 그들을 쏘아서 헤스본을 디본까지 멸하였고 메드바에 가까운 노바까지 황폐케 하였도다 하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 23,
    "verse_start": 7,
    "current_text": "발람이 노래를 지어 가로되발락이 나를 아람에서, 모압 왕이 동편 산에서 데려다가 이르기를 와서 나를 위하여 야곱을 저주하라, 와서 이스라엘을 꾸짖으라 하도다",
    "corrected_text": "발람이 노래를 지어 가로되 발락이 나를 아람에서, 모압 왕이 동편 산에서 데려다가 이르기를 와서 나를 위하여 야곱을 저주하라, 와서 이스라엘을 꾸짖으라 하도다"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 23,
    "verse_start": 10,
    "current_text": "야곱의 티끌을 뉘 능히 계산하며 이스라엘 사분지 일을 뉘 능히 계수할꼬 나는 의인의 죽음 같이 죽기를 원하며 나의 종말이 그와 같기를 바라도다하매",
    "corrected_text": "야곱의 티끌을 뉘 능히 계산하며 이스라엘 사분지 일을 뉘 능히 계수할꼬 나는 의인의 죽음 같이 죽기를 원하며 나의 종말이 그와 같기를 바라도다 하매"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 23,
    "verse_start": 18,
    "current_text": "발람이 노래를 지어 가로되발락이여 일어나 들을찌어다 십볼의 아들이여 나를 자세히 들으라",
    "corrected_text": "발람이 노래를 지어 가로되 발락이여 일어나 들을찌어다 십볼의 아들이여 나를 자세히 들으라"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 23,
    "verse_start": 24,
    "current_text": "이 백성이 암사자 같이 일어나고 수사자 같이 일어나서 움킨 것을 먹으며 죽인 피를 마시기 전에는 눕지 아니하리로다하매",
    "corrected_text": "이 백성이 암사자 같이 일어나고 수사자 같이 일어나서 움킨 것을 먹으며 죽인 피를 마시기 전에는 눕지 아니하리로다 하매"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 3,
    "current_text": "그가 노래를 지어 가로되브올의 아들 발람이 말하며 눈을 감았던 자가 말하며",
    "corrected_text": "그가 노래를 지어 가로되 브올의 아들 발람이 말하며 눈을 감았던 자가 말하며"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 15,
    "current_text": "노래를 지어 가로되브올의 아들 발람이 말하며 눈을 감았던 자가 말하며",
    "corrected_text": "노래를 지어 가로되 브올의 아들 발람이 말하며 눈을 감았던 자가 말하며"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 19,
    "current_text": "주권자가 야곱에게서 나서 남은 자들을 그 성읍에서 멸절하리로다하고",
    "corrected_text": "주권자가 야곱에게서 나서 남은 자들을 그 성읍에서 멸절하리로다 하고"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 20,
    "current_text": "또 아말렉을 바라보며 노래를 지어 가로되아말렉은 열국중 으뜸이나 종말은 멸망에 이르리로다하고",
    "corrected_text": "또 아말렉을 바라보며 노래를 지어 가로되 아말렉은 열국중 으뜸이나 종말은 멸망에 이르리로다 하고"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 21,
    "current_text": "또 가인 족속을 바라보며 노래를 지어 가로되너의 거처가 견고하니 네 보금자리는 바위에 있도다",
    "corrected_text": "또 가인 족속을 바라보며 노래를 지어 가로되 너의 거처가 견고하니 네 보금자리는 바위에 있도다"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 22,
    "current_text": "그러나 가인이 쇠미하리니 나중에는 앗수르의 포로가 되리로다하고",
    "corrected_text": "그러나 가인이 쇠미하리니 나중에는 앗수르의 포로가 되리로다 하고"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 23,
    "current_text": "또 노래를 지어 가로되슬프다 하나님이 이 일을 행하시리니 그 때에 살 자가 누구이랴",
    "corrected_text": "또 노래를 지어 가로되 슬프다 하나님이 이 일을 행하시리니 그 때에 살 자가 누구이랴"
  },
  {
    "translation_id": 84,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 24,
    "current_text": "깃딤 해변에서 배들이 와서 앗수르를 학대하며 에벨을 괴롭게 하리라마는 그도 멸망하리로다하고",
    "corrected_text": "깃딤 해변에서 배들이 와서 앗수르를 학대하며 에벨을 괴롭게 하리라마는 그도 멸망하리로다 하고"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 10,
    "verse_start": 6,
    "current_text": "( 이스라엘 자손이 브에롯 브네야아간에서 발행하여 모세라에 이르러서는 아론이 거기서 죽고 거기 장사되었고 그 아들 엘르아살이 그를 이어 제사장의 직임을 행하였으며",
    "corrected_text": "(이스라엘 자손이 브에롯 브네야아간에서 발행하여 모세라에 이르러서는 아론이 거기서 죽고 거기 장사되었고 그 아들 엘르아살이 그를 이어 제사장의 직임을 행하였으며"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 2,
    "current_text": "일렀으되여호와께서 시내에서 오시고 세일산에서 일어나시고 바란산에서 비취시고 일만 성도 가운데서 강림하셨고 그 오른손에는 불 같은 율법이 있도다",
    "corrected_text": "일렀으되 여호와께서 시내에서 오시고 세일산에서 일어나시고 바란산에서 비취시고 일만 성도 가운데서 강림하셨고 그 오른손에는 불 같은 율법이 있도다"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 7,
    "current_text": "유다에 대한 축복은 이러하니라 일렀으되여호와여 유다의 음성을 들으시고 그 백성에게로 인도하시오며 그 손으로 자기를 위하여 싸우게 하시고 주께서 도우사 그로 그 대적을 치게 하시기를 원하나이다",
    "corrected_text": "유다에 대한 축복은 이러하니라 일렀으되 여호와여 유다의 음성을 들으시고 그 백성에게로 인도하시오며 그 손으로 자기를 위하여 싸우게 하시고 주께서 도우사 그로 그 대적을 치게 하시기를 원하나이다"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 8,
    "current_text": "레위에 대하여는 일렀으되주의 둠밈과 우림이 주의 경건한 자에게 있도다 주께서 그를 맛사에서 시험하시고 므리바 물 가에서 그와 다투셨도다",
    "corrected_text": "레위에 대하여는 일렀으되 주의 둠밈과 우림이 주의 경건한 자에게 있도다 주께서 그를 맛사에서 시험하시고 므리바 물 가에서 그와 다투셨도다"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 12,
    "current_text": "베냐민에 대하여는 일렀으되여호와의 사랑을 입은 자는 그 곁에 안전히 거하리로다 여호와께서 그를 날이 맟도록 보호하시고 그로 자기 어깨 사이에 처하게 하시리로다",
    "corrected_text": "베냐민에 대하여는 일렀으되 여호와의 사랑을 입은 자는 그 곁에 안전히 거하리로다 여호와께서 그를 날이 맟도록 보호하시고 그로 자기 어깨 사이에 처하게 하시리로다"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 13,
    "current_text": "요셉에 대하여는 일렀으되원컨대 그 땅이 여호와께 복을 받아 하늘의 보물인 이슬과 땅 아래 저장한 물과",
    "corrected_text": "요셉에 대하여는 일렀으되 원컨대 그 땅이 여호와께 복을 받아 하늘의 보물인 이슬과 땅 아래 저장한 물과"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 18,
    "current_text": "스불론에 대하여는 일렀으되스불론이여 너는 나감을 기뻐하라 잇사갈이여 너는 장막에 있음을 즐거워하라",
    "corrected_text": "스불론에 대하여는 일렀으되 스불론이여 너는 나감을 기뻐하라 잇사갈이여 너는 장막에 있음을 즐거워하라"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 20,
    "current_text": "갓에 대하여는 일렀으되갓을 광대케 하시는 자에게 찬송을 부를찌어다 갓이 암사자 같이 엎드리고 팔과 정수리를 찢는도다",
    "corrected_text": "갓에 대하여는 일렀으되 갓을 광대케 하시는 자에게 찬송을 부를찌어다 갓이 암사자 같이 엎드리고 팔과 정수리를 찢는도다"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 22,
    "current_text": "단에 대하여는 일렀으되단은 바산에서 뛰어나오는 사자의 새끼로다",
    "corrected_text": "단에 대하여는 일렀으되 단은 바산에서 뛰어나오는 사자의 새끼로다"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 23,
    "current_text": "납달리에 대하여는 일렀으되은혜가 족하고 여호와의 복이 가득한 납달리여 너는 서방과 남방을 얻을찌로다",
    "corrected_text": "납달리에 대하여는 일렀으되 은혜가 족하고 여호와의 복이 가득한 납달리여 너는 서방과 남방을 얻을찌로다"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 24,
    "current_text": "아셀에 대하여는 일렀으되아셀은 다자한 복을 받으며 그 형제에게 기쁨이 되며 그 발이 기름에 잠길찌로다",
    "corrected_text": "아셀에 대하여는 일렀으되 아셀은 다자한 복을 받으며 그 형제에게 기쁨이 되며 그 발이 기름에 잠길찌로다"
  },
  {
    "translation_id": 84,
    "book_number": 6,
    "chapter": 10,
    "verse_start": 12,
    "current_text": "여호와께서 아모리 사람을 이스라엘 자손에게 붙이시던 날에 여호수아가 여호와께 고하되 이스라엘 목전에서 가로되태양아 너는 기브온 위에 머무르라 달아 너도 아얄론 골짜기에 그리할찌어다하매",
    "corrected_text": "여호와께서 아모리 사람을 이스라엘 자손에게 붙이시던 날에 여호수아가 여호와께 고하되 이스라엘 목전에서 가로되 태양아 너는 기브온 위에 머무르라 달아 너도 아얄론 골짜기에 그리할찌어다 하매"
  },
  {
    "translation_id": 84,
    "book_number": 7,
    "chapter": 5,
    "verse_start": 31,
    "current_text": "여호와여 주의 대적은 다 이와 같이 망하게 하시고 주를 사랑하는 자는 해가 힘있게 돋음 같게 하시옵소서하니라 그 땅이 사십년 동안 태평하였더라",
    "corrected_text": "여호와여 주의 대적은 다 이와 같이 망하게 하시고 주를 사랑하는 자는 해가 힘있게 돋음 같게 하시옵소서 하니라 그 땅이 사십년 동안 태평하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 7,
    "chapter": 15,
    "verse_start": 16,
    "current_text": "가로되나귀의 턱뼈로 한더미, 두더미를 쌓았음이여 나귀의 턱뼈로 내가 일천명을 죽였도다",
    "corrected_text": "가로되 나귀의 턱뼈로 한더미, 두더미를 쌓았음이여 나귀의 턱뼈로 내가 일천명을 죽였도다"
  },
  {
    "translation_id": 84,
    "book_number": 9,
    "chapter": 2,
    "verse_start": 1,
    "current_text": "한나가 기도하여 가로되내 마음이 여호와를 인하여 즐거워하며 내 뿔이 여호와를 인하여 높아졌으며 내 입이 내 원수들을 향하여 크게 열렸으니 이는 내가 주의 구원을 인하여 기뻐함이니이다",
    "corrected_text": "한나가 기도하여 가로되 내 마음이 여호와를 인하여 즐거워하며 내 뿔이 여호와를 인하여 높아졌으며 내 입이 내 원수들을 향하여 크게 열렸으니 이는 내가 주의 구원을 인하여 기뻐함이니이다"
  },
  {
    "translation_id": 84,
    "book_number": 9,
    "chapter": 2,
    "verse_start": 10,
    "current_text": "여호와를 대적하는 자는 산산이 깨어질 것이라 하늘 우뢰로 그들을 치시리로다 여호와께서 땅 끝까지 심판을 베푸시고 자기 왕에게 힘을 주시며 자기의 기름 부음을 받은 자의 뿔을 높이시리로다하니라",
    "corrected_text": "여호와를 대적하는 자는 산산이 깨어질 것이라 하늘 우뢰로 그들을 치시리로다 여호와께서 땅 끝까지 심판을 베푸시고 자기 왕에게 힘을 주시며 자기의 기름 부음을 받은 자의 뿔을 높이시리로다 하니라"
  },
  {
    "translation_id": 84,
    "book_number": 9,
    "chapter": 4,
    "verse_start": 1,
    "current_text": "사무엘의 말이 온 이스라엘에 전파되니라이스라엘은 나가서 블레셋 사람과 싸우려고 에벤에셀 곁에 진 치고 블레셋 사람은 아벡에 진 쳤더니",
    "corrected_text": "사무엘의 말이 온 이스라엘에 전파되니라 이스라엘은 나가서 블레셋 사람과 싸우려고 에벤에셀 곁에 진 치고 블레셋 사람은 아벡에 진 쳤더니"
  },
  {
    "translation_id": 84,
    "book_number": 9,
    "chapter": 13,
    "verse_start": 15,
    "current_text": "사무엘이 일어나 길갈에서 떠나 베냐민 기브아로 올라가니라사울이 자기와 함께한 백성을 계수하니 육백명 가량이라",
    "corrected_text": "사무엘이 일어나 길갈에서 떠나 베냐민 기브아로 올라가니라 사울이 자기와 함께한 백성을 계수하니 육백명 가량이라"
  },
  {
    "translation_id": 84,
    "book_number": 9,
    "chapter": 18,
    "verse_start": 7,
    "current_text": "여인들이 뛰놀며 창화하여 가로되사울의 죽인 자는 천천이요 다윗은 만만이로다한지라",
    "corrected_text": "여인들이 뛰놀며 창화하여 가로되 사울의 죽인 자는 천천이요 다윗은 만만이로다 한지라"
  },
  {
    "translation_id": 84,
    "book_number": 9,
    "chapter": 21,
    "verse_start": 11,
    "current_text": "아기스의 신하들이 아기스에게 고하되 이는 그 땅의 왕 다윗이 아니니이까 무리가 춤추며 이 사람의 일을 창화하여 가로되사울의 죽인 자는 천천이요 다윗은 만만이로다하지 아니하였나이까 한지라",
    "corrected_text": "아기스의 신하들이 아기스에게 고하되 이는 그 땅의 왕 다윗이 아니니이까 무리가 춤추며 이 사람의 일을 창화하여 가로되 사울의 죽인 자는 천천이요 다윗은 만만이로다 하지 아니하였나이까 한지라"
  },
  {
    "translation_id": 84,
    "book_number": 9,
    "chapter": 29,
    "verse_start": 5,
    "current_text": "그들이 춤추며 창화하여 가로되사울의 죽인 자는 천천이요 다윗은 만만이로다하던 이 다윗이 아니니이까",
    "corrected_text": "그들이 춤추며 창화하여 가로되 사울의 죽인 자는 천천이요 다윗은 만만이로다 하던 이 다윗이 아니니이까"
  },
  {
    "translation_id": 84,
    "book_number": 10,
    "chapter": 1,
    "verse_start": 27,
    "current_text": "오호라 두 용사가 엎드러졌으며 싸우는 병기가 망하였도다하였더라",
    "corrected_text": "오호라 두 용사가 엎드러졌으며 싸우는 병기가 망하였도다 하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 10,
    "chapter": 2,
    "verse_start": 4,
    "current_text": "유다 사람들이 와서 거기서 다윗에게 기름을 부어 유다 족속의 왕을 삼았더라혹이 다윗에게 고하여 가로되 사울을 장사한 사람은 길르앗 야베스 사람들이니이다 하매",
    "corrected_text": "유다 사람들이 와서 거기서 다윗에게 기름을 부어 유다 족속의 왕을 삼았더라 혹이 다윗에게 고하여 가로되 사울을 장사한 사람은 길르앗 야베스 사람들이니이다 하매"
  },
  {
    "translation_id": 84,
    "book_number": 10,
    "chapter": 3,
    "verse_start": 33,
    "current_text": "왕이 아브넬을 위하여 애가를 지어 가로되아브넬의 죽음이 어찌하여 미련한 자의 죽음 같은고",
    "corrected_text": "왕이 아브넬을 위하여 애가를 지어 가로되 아브넬의 죽음이 어찌하여 미련한 자의 죽음 같은고"
  },
  {
    "translation_id": 84,
    "book_number": 10,
    "chapter": 3,
    "verse_start": 34,
    "current_text": "네 손이 결박되지 아니하였고 네 발이 착고에 채이지 아니하였거늘 불의한 자식의 앞에 엎드러짐 같이 네가 엎드러졌도다하매 온 백성이 다시 그를 슬퍼하여 우니라",
    "corrected_text": "네 손이 결박되지 아니하였고 네 발이 착고에 채이지 아니하였거늘 불의한 자식의 앞에 엎드러짐 같이 네가 엎드러졌도다 하매 온 백성이 다시 그를 슬퍼하여 우니라"
  },
  {
    "translation_id": 84,
    "book_number": 10,
    "chapter": 12,
    "verse_start": 15,
    "current_text": "나단이 자기 집으로 돌아가니라우리아의 처가 다윗에게 낳은 아이를 여호와께서 치시매 심히 앓는지라",
    "corrected_text": "나단이 자기 집으로 돌아가니라 우리아의 처가 다윗에게 낳은 아이를 여호와께서 치시매 심히 앓는지라"
  },
  {
    "translation_id": 84,
    "book_number": 10,
    "chapter": 19,
    "verse_start": 8,
    "current_text": "왕이 일어나 성문에 앉으매 혹이 모든 백성에게 고하되 왕이 문에 앉아 계시다 하니 모든 백성이 왕의 앞으로 나아오니라이스라엘은 이미 각기 장막으로 도망하였더라",
    "corrected_text": "왕이 일어나 성문에 앉으매 혹이 모든 백성에게 고하되 왕이 문에 앉아 계시다 하니 모든 백성이 왕의 앞으로 나아오니라 이스라엘은 이미 각기 장막으로 도망하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 10,
    "chapter": 20,
    "verse_start": 10,
    "current_text": "아마사가 요압의 손에 있는 칼은 주의치 아니한지라 요압이 칼로 그 배를 찌르매 그 창자가 땅에 흐르니 다시 치지 아니하여도 죽으니라요압과 그 동생 아비새가 비그리의 아들 세바를 쫓을쌔",
    "corrected_text": "아마사가 요압의 손에 있는 칼은 주의치 아니한지라 요압이 칼로 그 배를 찌르매 그 창자가 땅에 흐르니 다시 치지 아니하여도 죽으니라 요압과 그 동생 아비새가 비그리의 아들 세바를 쫓을쌔"
  },
  {
    "translation_id": 84,
    "book_number": 10,
    "chapter": 22,
    "verse_start": 2,
    "current_text": "가로되여호와는 나의 반석이시요 나의 요새시요 나를 건지시는 자시요",
    "corrected_text": "가로되 여호와는 나의 반석이시요 나의 요새시요 나를 건지시는 자시요"
  },
  {
    "translation_id": 84,
    "book_number": 10,
    "chapter": 22,
    "verse_start": 51,
    "current_text": "여호와께서 그 왕에게 큰 구원을 주시며 기름 부음 받은 자에게 인자를 베푸심이여 영원토록 다윗과 그 후손에게로다하였더라",
    "corrected_text": "여호와께서 그 왕에게 큰 구원을 주시며 기름 부음 받은 자에게 인자를 베푸심이여 영원토록 다윗과 그 후손에게로다 하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 10,
    "chapter": 23,
    "verse_start": 1,
    "current_text": "이는 다윗의 마지막 말이라이새의 아들 다윗이 말함이여 높이 올리운 자, 야곱의 하나님에게 기름 부음 받은 자, 이스라엘의 노래 잘하는 자가 말하도다",
    "corrected_text": "이는 다윗의 마지막 말이라 이새의 아들 다윗이 말함이여 높이 올리운 자, 야곱의 하나님에게 기름 부음 받은 자, 이스라엘의 노래 잘하는 자가 말하도다"
  },
  {
    "translation_id": 84,
    "book_number": 10,
    "chapter": 23,
    "verse_start": 7,
    "current_text": "그것들을 만지는 자는 철과 창자루를 가져야 하리니 그것들이 당장에 불사르이리로다하니라",
    "corrected_text": "그것들을 만지는 자는 철과 창자루를 가져야 하리니 그것들이 당장에 불사르이리로다 하니라"
  },
  {
    "translation_id": 84,
    "book_number": 12,
    "chapter": 4,
    "verse_start": 25,
    "current_text": "드디어 갈멜산으로 가서 하나님의 사람에게로 나아가니라하나님의 사람이 멀리서 저를 보고 자기 사환 게하시에게 이르되 저기 수넴 여인이 있도다",
    "corrected_text": "드디어 갈멜산으로 가서 하나님의 사람에게로 나아가니라 하나님의 사람이 멀리서 저를 보고 자기 사환 게하시에게 이르되 저기 수넴 여인이 있도다"
  },
  {
    "translation_id": 84,
    "book_number": 12,
    "chapter": 24,
    "verse_start": 20,
    "current_text": "여호와께서 예루살렘과 유다를 진노하심이 저희를 그 앞에서 쫓아내실 때까지 이르렀더라시드기야가 바벨론 왕을 배반하니라",
    "corrected_text": "여호와께서 예루살렘과 유다를 진노하심이 저희를 그 앞에서 쫓아내실 때까지 이르렀더라 시드기야가 바벨론 왕을 배반하니라"
  },
  {
    "translation_id": 84,
    "book_number": 13,
    "chapter": 16,
    "verse_start": 36,
    "current_text": "여호와 이스라엘의 하나님을 영원부터 영원까지 송축할찌로다하매 모든 백성이 아멘 하고 여호와를 찬양하였더라",
    "corrected_text": "여호와 이스라엘의 하나님을 영원부터 영원까지 송축할찌로다 하매 모든 백성이 아멘 하고 여호와를 찬양하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 13,
    "chapter": 29,
    "verse_start": 22,
    "current_text": "이 날에 무리가 크게 기뻐하여 여호와 앞에서 먹으며 마셨더라무리가 다윗의 아들 솔로몬으로 다시 왕을 삼아 기름을 부어 여호와께 돌려 주권자가 되게 하고 사독에게도 기름을 부어 제사장이 되게 하니라",
    "corrected_text": "이 날에 무리가 크게 기뻐하여 여호와 앞에서 먹으며 마셨더라 무리가 다윗의 아들 솔로몬으로 다시 왕을 삼아 기름을 부어 여호와께 돌려 주권자가 되게 하고 사독에게도 기름을 부어 제사장이 되게 하니라"
  },
  {
    "translation_id": 84,
    "book_number": 16,
    "chapter": 1,
    "verse_start": 1,
    "current_text": "하가랴의 아들 느헤미야의 말이라아닥사스다왕 제 이십년 기슬르월에 내가 수산궁에 있더니",
    "corrected_text": "하가랴의 아들 느헤미야의 말이라 아닥사스다왕 제 이십년 기슬르월에 내가 수산궁에 있더니"
  },
  {
    "translation_id": 84,
    "book_number": 19,
    "chapter": 72,
    "verse_start": 19,
    "current_text": "그 영화로운 이름을 영원히 찬송할찌어다 온 땅에 그 영광이 충만할찌어다 아멘 아멘이새의 아들 다윗의 기도가 필하다",
    "corrected_text": "그 영화로운 이름을 영원히 찬송할찌어다 온 땅에 그 영광이 충만할찌어다 아멘 아멘 이새의 아들 다윗의 기도가 필하다"
  },
  {
    "translation_id": 84,
    "book_number": 20,
    "chapter": 10,
    "verse_start": 1,
    "current_text": "솔로몬의 잠언이라지혜로운 아들은 아비로 기쁘게 하거니와 미련한 아들은 어미의 근심이니라",
    "corrected_text": "솔로몬의 잠언이라 지혜로운 아들은 아비로 기쁘게 하거니와 미련한 아들은 어미의 근심이니라"
  },
  {
    "translation_id": 84,
    "book_number": 20,
    "chapter": 24,
    "verse_start": 23,
    "current_text": "이것도 지혜로운 자의 말씀이라재판할 때에 낯을 보아주는 것이 옳지 못하니라",
    "corrected_text": "이것도 지혜로운 자의 말씀이라 재판할 때에 낯을 보아주는 것이 옳지 못하니라"
  },
  {
    "translation_id": 84,
    "book_number": 22,
    "chapter": 7,
    "verse_start": 9,
    "current_text": "네 입은 좋은 포도주 같을 것이니라이 포도주는 나의 사랑하는 자를 위하여 미끄럽게 흘러 내려서 자는 자의 입으로 움직이게 하느니라",
    "corrected_text": "네 입은 좋은 포도주 같을 것이니라 이 포도주는 나의 사랑하는 자를 위하여 미끄럽게 흘러 내려서 자는 자의 입으로 움직이게 하느니라"
  },
  {
    "translation_id": 84,
    "book_number": 22,
    "chapter": 8,
    "verse_start": 5,
    "current_text": "그 사랑하는 자를 의지하고 거친 들에서 올라 오는 여자가 누구인고너를 인하여 네 어미가 신고한, 너를 낳은 자가 애쓴 그 곳 사과나무 아래서 내가 너를 깨웠노라",
    "corrected_text": "그 사랑하는 자를 의지하고 거친 들에서 올라 오는 여자가 누구인고 너를 인하여 네 어미가 신고한, 너를 낳은 자가 애쓴 그 곳 사과나무 아래서 내가 너를 깨웠노라"
  },
  {
    "translation_id": 84,
    "book_number": 23,
    "chapter": 15,
    "verse_start": 1,
    "current_text": "모압에 관한 경고라하루 밤에 모압 알이 망하여 황폐할 것이며 하루 밤에 모압 길이 망하여 황폐할 것이라",
    "corrected_text": "모압에 관한 경고라 하루 밤에 모압 알이 망하여 황폐할 것이며 하루 밤에 모압 길이 망하여 황폐할 것이라"
  },
  {
    "translation_id": 84,
    "book_number": 23,
    "chapter": 17,
    "verse_start": 1,
    "current_text": "다메섹에 관한 경고라보라 다메섹이 장차 성읍 모양을 이루지 못하고 무너진 무더기가 될 것이라",
    "corrected_text": "다메섹에 관한 경고라 보라 다메섹이 장차 성읍 모양을 이루지 못하고 무너진 무더기가 될 것이라"
  },
  {
    "translation_id": 84,
    "book_number": 23,
    "chapter": 19,
    "verse_start": 1,
    "current_text": "애굽에 관한 경고라보라 여호와께서 빠른 구름을 타고 애굽에 임하시리니 애굽의 우상들이 그 앞에서 떨겠고 애굽인의 마음이 그 속에서 녹으리로다",
    "corrected_text": "애굽에 관한 경고라 보라 여호와께서 빠른 구름을 타고 애굽에 임하시리니 애굽의 우상들이 그 앞에서 떨겠고 애굽인의 마음이 그 속에서 녹으리로다"
  },
  {
    "translation_id": 84,
    "book_number": 23,
    "chapter": 21,
    "verse_start": 1,
    "current_text": "해변 광야에 관한 경고라적병이 광야에서, 두려운 땅에서 남방 회리바람 같이 몰려 왔도다",
    "corrected_text": "해변 광야에 관한 경고라 적병이 광야에서, 두려운 땅에서 남방 회리바람 같이 몰려 왔도다"
  },
  {
    "translation_id": 84,
    "book_number": 23,
    "chapter": 21,
    "verse_start": 11,
    "current_text": "두마에 관한 경고라사람이 세일에서 나를 부르되 파숫군이여 밤이 어떻게 되었느뇨 파숫군이여 밤이 어떻게 되었느뇨",
    "corrected_text": "두마에 관한 경고라 사람이 세일에서 나를 부르되 파숫군이여 밤이 어떻게 되었느뇨 파숫군이여 밤이 어떻게 되었느뇨"
  },
  {
    "translation_id": 84,
    "book_number": 23,
    "chapter": 21,
    "verse_start": 13,
    "current_text": "아라비아에 관한 경고라드단 대상이여 너희가 아라비아 수풀에서 유숙하리라",
    "corrected_text": "아라비아에 관한 경고라 드단 대상이여 너희가 아라비아 수풀에서 유숙하리라"
  },
  {
    "translation_id": 84,
    "book_number": 23,
    "chapter": 22,
    "verse_start": 1,
    "current_text": "이상 골짜기에 관한 경고라네가 지붕에 올라감은 어찜인고",
    "corrected_text": "이상 골짜기에 관한 경고라 네가 지붕에 올라감은 어찜인고"
  },
  {
    "translation_id": 84,
    "book_number": 23,
    "chapter": 23,
    "verse_start": 1,
    "current_text": "두로에 관한 경고라다시스의 선척들아 너희는 슬피 부르짖을찌어다 두로가 황무하여 집이 없고 들어 갈 곳도 없음이요 이 소식이 깃딤 땅에서부터 그들에게 전파되었음이니라",
    "corrected_text": "두로에 관한 경고라 다시스의 선척들아 너희는 슬피 부르짖을찌어다 두로가 황무하여 집이 없고 들어 갈 곳도 없음이요 이 소식이 깃딤 땅에서부터 그들에게 전파되었음이니라"
  },
  {
    "translation_id": 84,
    "book_number": 23,
    "chapter": 30,
    "verse_start": 6,
    "current_text": "남방 짐승에 관한 경고라사신들이 그 재물을 어린 나귀 등에 싣고 그 보물을 약대 제물 안장에 얹고 암사자와 수사자와 독사와 및 날아다니는 불뱀이 나오는 위험하고 곤고한 땅을 지나 자기에게 무익한 민족에게로 갔으나",
    "corrected_text": "남방 짐승에 관한 경고라 사신들이 그 재물을 어린 나귀 등에 싣고 그 보물을 약대 제물 안장에 얹고 암사자와 수사자와 독사와 및 날아다니는 불뱀이 나오는 위험하고 곤고한 땅을 지나 자기에게 무익한 민족에게로 갔으나"
  },
  {
    "translation_id": 84,
    "book_number": 23,
    "chapter": 58,
    "verse_start": 9,
    "current_text": "네가 부를 때에는 나 여호와가 응답하겠고 네가 부르짖을 때에는 말하기를 내가 여기 있다 하리라만일 네가 너희 중에서 멍에와 손가락질과 허망한 말을 제하여 버리고",
    "corrected_text": "네가 부를 때에는 나 여호와가 응답하겠고 네가 부르짖을 때에는 말하기를 내가 여기 있다 하리라 만일 네가 너희 중에서 멍에와 손가락질과 허망한 말을 제하여 버리고"
  },
  {
    "translation_id": 84,
    "book_number": 23,
    "chapter": 59,
    "verse_start": 15,
    "current_text": "성실이 없어지므로 악을 떠나는 자가 탈취를 당하는도다여호와께서 이를 감찰하시고 그 공평이 없은 것을 기뻐 아니하시고",
    "corrected_text": "성실이 없어지므로 악을 떠나는 자가 탈취를 당하는도다 여호와께서 이를 감찰하시고 그 공평이 없은 것을 기뻐 아니하시고"
  },
  {
    "translation_id": 84,
    "book_number": 24,
    "chapter": 3,
    "verse_start": 22,
    "current_text": "배역한 자식들아 돌아오라 내가 너희의 배역함을 고치리라보소서 우리가 주께 왔사오니 주는 우리 하나님 여호와이심이니이다",
    "corrected_text": "배역한 자식들아 돌아오라 내가 너희의 배역함을 고치리라 보소서 우리가 주께 왔사오니 주는 우리 하나님 여호와이심이니이다"
  },
  {
    "translation_id": 84,
    "book_number": 24,
    "chapter": 23,
    "verse_start": 9,
    "current_text": "선지자들에 대한 말씀이라내 중심이 상하며 내 모든 뼈가 떨리며 내가 취한 사람 같으며 포도주에 잡힌 사람 같으니 이는 여호와와 그 거룩한 말씀을 인함이라",
    "corrected_text": "선지자들에 대한 말씀이라 내 중심이 상하며 내 모든 뼈가 떨리며 내가 취한 사람 같으며 포도주에 잡힌 사람 같으니 이는 여호와와 그 거룩한 말씀을 인함이라"
  },
  {
    "translation_id": 84,
    "book_number": 24,
    "chapter": 52,
    "verse_start": 3,
    "current_text": "여호와께서 예루살렘과 유다를 진노하심이 그들을 그 앞에서 쫓아내시기까지에 이르렀더라시드기야가 바벨론 왕을 배반하매",
    "corrected_text": "여호와께서 예루살렘과 유다를 진노하심이 그들을 그 앞에서 쫓아내시기까지에 이르렀더라 시드기야가 바벨론 왕을 배반하매"
  },
  {
    "translation_id": 84,
    "book_number": 31,
    "chapter": 1,
    "verse_start": 1,
    "current_text": "오바댜의 묵시라주 여호와께서 에돔에 대하여 이같이 말씀하시니라 우리가 여호와께로 말미암아 소식을 들었나니 곧 사자가 열국 중에 보내심을 받고 이르기를 너희는 일어날찌어다 우리가 일어나서 그로 더불어 싸우자 하는 것이니라",
    "corrected_text": "오바댜의 묵시라 주 여호와께서 에돔에 대하여 이같이 말씀하시니라 우리가 여호와께로 말미암아 소식을 들었나니 곧 사자가 열국 중에 보내심을 받고 이르기를 너희는 일어날찌어다 우리가 일어나서 그로 더불어 싸우자 하는 것이니라"
  },
  {
    "translation_id": 84,
    "book_number": 32,
    "chapter": 2,
    "verse_start": 2,
    "current_text": "가로되내가 받는 고난을 인하여 여호와께 불러 아뢰었삽더니 주께서 내게 대답하셨고 내가 스올의 뱃속에서 부르짖었삽더니 주께서 나의 음성을 들으셨나이다",
    "corrected_text": "가로되 내가 받는 고난을 인하여 여호와께 불러 아뢰었삽더니 주께서 내게 대답하셨고 내가 스올의 뱃속에서 부르짖었삽더니 주께서 나의 음성을 들으셨나이다"
  },
  {
    "translation_id": 84,
    "book_number": 32,
    "chapter": 2,
    "verse_start": 9,
    "current_text": "나는 감사하는 목소리로 주께 제사를 드리며 나의 서원을 주께 갚겠나이다 구원은 여호와께로서 말미암나이다하니라",
    "corrected_text": "나는 감사하는 목소리로 주께 제사를 드리며 나의 서원을 주께 갚겠나이다 구원은 여호와께로서 말미암나이다 하니라"
  },
  {
    "translation_id": 84,
    "book_number": 35,
    "chapter": 3,
    "verse_start": 19,
    "current_text": "주 여호와는 나의 힘이시라 나의 발을 사슴과 같게 하사 나로 나의 높은 곳에 다니게 하시리로다이 노래는 영장을 위하여 내 수금에 맞춘 것이니라",
    "corrected_text": "주 여호와는 나의 힘이시라 나의 발을 사슴과 같게 하사 나로 나의 높은 곳에 다니게 하시리로다 이 노래는 영장을 위하여 내 수금에 맞춘 것이니라"
  },
  {
    "translation_id": 84,
    "book_number": 38,
    "chapter": 12,
    "verse_start": 1,
    "current_text": "이스라엘에 관한 여호와의 말씀의 경고라여호와 곧 하늘을 펴시며 땅의 터를 세우시며 사람 안에 심령을 지으신 자가 가라사대",
    "corrected_text": "이스라엘에 관한 여호와의 말씀의 경고라 여호와 곧 하늘을 펴시며 땅의 터를 세우시며 사람 안에 심령을 지으신 자가 가라사대"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 1,
    "verse_start": 6,
    "current_text": "이새는 다윗왕을 낳으니라다윗은 우리야의 아내에게서 솔로몬을 낳고",
    "corrected_text": "이새는 다윗왕을 낳으니라 다윗은 우리야의 아내에게서 솔로몬을 낳고"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 1,
    "verse_start": 23,
    "current_text": "보라 처녀가 잉태하여 아들을 낳을 것이요 그 이름은 임마누엘이라 하리라하셨으니 이를 번역한즉 하나님이 우리와 함께 계시다 함이라",
    "corrected_text": "보라 처녀가 잉태하여 아들을 낳을 것이요 그 이름은 임마누엘이라 하리라 하셨으니 이를 번역한즉 하나님이 우리와 함께 계시다 함이라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 2,
    "verse_start": 6,
    "current_text": "또 유대 땅 베들레헴아 너는 유대 고을 중에 가장 작지 아니하도다 네게서 한 다스리는 자가 나와서 내 백성 이스라엘의 목자가 되리라하였음이니이다",
    "corrected_text": "또 유대 땅 베들레헴아 너는 유대 고을 중에 가장 작지 아니하도다 네게서 한 다스리는 자가 나와서 내 백성 이스라엘의 목자가 되리라 하였음이니이다"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 2,
    "verse_start": 15,
    "current_text": "헤롯이 죽기까지 거기 있었으니 이는 주께서 선지자로 말씀하신바 애굽에서 내 아들을 불렀다함을 이루려 하심이니라",
    "corrected_text": "헤롯이 죽기까지 거기 있었으니 이는 주께서 선지자로 말씀하신바 애굽에서 내 아들을 불렀다 함을 이루려 하심이니라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 2,
    "verse_start": 18,
    "current_text": "라마에서 슬퍼하며 크게 통곡하는 소리가 들리니 라헬이 그 자식을 위하여 애곡하는 것이라 그가 자식이 없으므로 위로 받기를 거절하였도다함이 이루어졌느니라",
    "corrected_text": "라마에서 슬퍼하며 크게 통곡하는 소리가 들리니 라헬이 그 자식을 위하여 애곡하는 것이라 그가 자식이 없으므로 위로 받기를 거절하였도다 함이 이루어졌느니라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 3,
    "verse_start": 3,
    "current_text": "저는 선지자 이사야로 말씀하신 자라 일렀으되광야에 외치는 자의 소리가 있어 가로되 너희는 주의 길을 예비하라 그의 첩경을 평탄케 하라하였느니라",
    "corrected_text": "저는 선지자 이사야로 말씀하신 자라 일렀으되 광야에 외치는 자의 소리가 있어 가로되 너희는 주의 길을 예비하라 그의 첩경을 평탄케 하라 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 4,
    "verse_start": 4,
    "current_text": "예수께서 대답하여 가라사대 기록되었으되사람이 떡으로만 살것이 아니요 하나님의 입으로 나오는 모든 말씀으로 살 것이라하였느니라 하시니",
    "corrected_text": "예수께서 대답하여 가라사대 기록되었으되 사람이 떡으로만 살것이 아니요 하나님의 입으로 나오는 모든 말씀으로 살 것이라 하였느니라 하시니"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 4,
    "verse_start": 6,
    "current_text": "가로되 네가 만일 하나님의 아들이어든 뛰어내리라 기록하였으되저가 너를 위하여 그 사자들을 명하시리니 저희가 손으로 너를 받들어 발이 돌에 부딪히지 않게 하리로다하였느니라",
    "corrected_text": "가로되 네가 만일 하나님의 아들이어든 뛰어내리라 기록하였으되 저가 너를 위하여 그 사자들을 명하시리니 저희가 손으로 너를 받들어 발이 돌에 부딪히지 않게 하리로다 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 4,
    "verse_start": 16,
    "current_text": "흑암에 앉은 백성이 큰 빛을 보았고 사망의 땅과 그늘에 앉은 자들에게 빛이 비취었도다하였느니라",
    "corrected_text": "흑암에 앉은 백성이 큰 빛을 보았고 사망의 땅과 그늘에 앉은 자들에게 빛이 비취었도다 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 8,
    "verse_start": 17,
    "current_text": "이는 선지자 이사야로 하신 말씀에우리 연약한 것을 친히 담당하시고 병을 짊어지셨도다함을 이루려 하심이더라",
    "corrected_text": "이는 선지자 이사야로 하신 말씀에 우리 연약한 것을 친히 담당하시고 병을 짊어지셨도다 함을 이루려 하심이더라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 11,
    "verse_start": 10,
    "current_text": "기록된바보라 내가 내 사자를 네 앞에 보내노니 저가 네 길을 네 앞에 예비하리라하신 것이 이 사람에 대한 말씀이니라",
    "corrected_text": "기록된바 보라 내가 내 사자를 네 앞에 보내노니 저가 네 길을 네 앞에 예비하리라 하신 것이 이 사람에 대한 말씀이니라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 12,
    "verse_start": 21,
    "current_text": "또한 이방들이 그 이름을 바라리라함을 이루려 하심이니라",
    "corrected_text": "또한 이방들이 그 이름을 바라리라 함을 이루려 하심이니라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 13,
    "verse_start": 14,
    "current_text": "이사야의 예언이 저희에게 이루었으니 일렀으되너희가 듣기는 들어도 깨닫지 못할 것이요 보기는 보아도 알지 못하리라",
    "corrected_text": "이사야의 예언이 저희에게 이루었으니 일렀으되 너희가 듣기는 들어도 깨닫지 못할 것이요 보기는 보아도 알지 못하리라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 13,
    "verse_start": 15,
    "current_text": "이 백성들의 마음이 완악하여져서 그 귀는 듣기에 둔하고 눈은 감았으니 이는 눈으로 보고 귀로 듣고 마음으로 깨달아 돌이켜 내게 고침을 받을까 두려워함이라하였느니라",
    "corrected_text": "이 백성들의 마음이 완악하여져서 그 귀는 듣기에 둔하고 눈은 감았으니 이는 눈으로 보고 귀로 듣고 마음으로 깨달아 돌이켜 내게 고침을 받을까 두려워함이라 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 13,
    "verse_start": 35,
    "current_text": "이는 선지자로 말씀하신바내가 입을 열어 비유로 말하고 창세부터 감추인 것들을 드러내리라함을 이루려 하심이니라",
    "corrected_text": "이는 선지자로 말씀하신바 내가 입을 열어 비유로 말하고 창세부터 감추인 것들을 드러내리라 함을 이루려 하심이니라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 15,
    "verse_start": 9,
    "current_text": "사람의 계명으로 교훈을 삼아 가르치니 나를 헛되이 경배하는도다하였느니라 하시고",
    "corrected_text": "사람의 계명으로 교훈을 삼아 가르치니 나를 헛되이 경배하는도다 하였느니라 하시고"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 21,
    "verse_start": 5,
    "current_text": "시온 딸에게 이르기를 네 왕이 네게 임하나니 그는 겸손하여 나귀, 곧 멍에 메는 짐승의 새끼를 탔도다 하라하였느니라",
    "corrected_text": "시온 딸에게 이르기를 네 왕이 네게 임하나니 그는 겸손하여 나귀, 곧 멍에 메는 짐승의 새끼를 탔도다 하라 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 21,
    "verse_start": 42,
    "current_text": "예수께서 가라사대 너희가 성경에건축자들의 버린 돌이 모퉁이의 머릿돌이 되었나니 이것은 주로 말미암아 된것이요 우리 눈에 기이하도다함을 읽어 본 일이 없느냐",
    "corrected_text": "예수께서 가라사대 너희가 성경에 건축자들의 버린 돌이 모퉁이의 머릿돌이 되었나니 이것은 주로 말미암아 된것이요 우리 눈에 기이하도다 함을 읽어 본 일이 없느냐"
  },
  {
    "translation_id": 84,
    "book_number": 40,
    "chapter": 22,
    "verse_start": 44,
    "current_text": "주께서 내 주께 이르시되 내가 네 원수를 네 발 아래 둘 때까지 내 우편에 앉았으라 하셨도다하였느냐",
    "corrected_text": "주께서 내 주께 이르시되 내가 네 원수를 네 발 아래 둘 때까지 내 우편에 앉았으라 하셨도다 하였느냐"
  },
  {
    "translation_id": 84,
    "book_number": 41,
    "chapter": 1,
    "verse_start": 2,
    "current_text": "선지자 이사야의 글에보라 내가 내 사자를 네 앞에 보내노니 저가 네 길을 예비하리라",
    "corrected_text": "선지자 이사야의 글에 보라 내가 내 사자를 네 앞에 보내노니 저가 네 길을 예비하리라"
  },
  {
    "translation_id": 84,
    "book_number": 41,
    "chapter": 1,
    "verse_start": 3,
    "current_text": "광야에 외치는 자의 소리가 있어 가로되 너희는 주의 길을 예비하라 그의 첩경을 평탄케 하라기록된 것과 같이",
    "corrected_text": "광야에 외치는 자의 소리가 있어 가로되 너희는 주의 길을 예비하라 그의 첩경을 평탄케 하라 기록된 것과 같이"
  },
  {
    "translation_id": 84,
    "book_number": 41,
    "chapter": 6,
    "verse_start": 6,
    "current_text": "저희의 믿지 않음을 이상히 여기셨더라이에 모든 촌에 두루 다니시며 가르치시더라",
    "corrected_text": "저희의 믿지 않음을 이상히 여기셨더라 이에 모든 촌에 두루 다니시며 가르치시더라"
  },
  {
    "translation_id": 84,
    "book_number": 41,
    "chapter": 7,
    "verse_start": 6,
    "current_text": "가라사대 이사야가 너희 외식하는 자에 대하여 잘 예언하였도다 기록하였으되이 백성이 입술로는 나를 존경하되 마음은 내게서 멀도다",
    "corrected_text": "가라사대 이사야가 너희 외식하는 자에 대하여 잘 예언하였도다 기록하였으되 이 백성이 입술로는 나를 존경하되 마음은 내게서 멀도다"
  },
  {
    "translation_id": 84,
    "book_number": 41,
    "chapter": 7,
    "verse_start": 7,
    "current_text": "사람의 계명으로 교훈을 삼아 가르치니 나를 헛되이 경배하는도다하였느니라",
    "corrected_text": "사람의 계명으로 교훈을 삼아 가르치니 나를 헛되이 경배하는도다 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 41,
    "chapter": 12,
    "verse_start": 10,
    "current_text": "너희가 성경에건축자들의 버린 돌이 모퉁이의 머릿돌이 되었나니",
    "corrected_text": "너희가 성경에 건축자들의 버린 돌이 모퉁이의 머릿돌이 되었나니"
  },
  {
    "translation_id": 84,
    "book_number": 41,
    "chapter": 12,
    "verse_start": 11,
    "current_text": "이것은 주로 말미암아 된 것이요 우리 눈에 기이하도다함을 읽어 보지도 못하였느냐 하시니라",
    "corrected_text": "이것은 주로 말미암아 된 것이요 우리 눈에 기이하도다 함을 읽어 보지도 못하였느냐 하시니라"
  },
  {
    "translation_id": 84,
    "book_number": 41,
    "chapter": 12,
    "verse_start": 36,
    "current_text": "다윗이 성령에 감동하여 친히 말하되주께서 내 주께 이르시되 내가 네 원수를 네 발 아래 둘 때까지 내 우편에 앉았으라 하셨도다하였느니라",
    "corrected_text": "다윗이 성령에 감동하여 친히 말하되 주께서 내 주께 이르시되 내가 네 원수를 네 발 아래 둘 때까지 내 우편에 앉았으라 하셨도다 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 1,
    "verse_start": 46,
    "current_text": "마리아가 가로되내 영혼이 주를 찬양하며",
    "corrected_text": "마리아가 가로되 내 영혼이 주를 찬양하며"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 1,
    "verse_start": 55,
    "current_text": "우리 조상에게 말씀하신 것과 같이 아브라함과 및 그 자손에게 영원히 하시리로다하니라",
    "corrected_text": "우리 조상에게 말씀하신 것과 같이 아브라함과 및 그 자손에게 영원히 하시리로다 하니라"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 1,
    "verse_start": 79,
    "current_text": "어두움과 죽음의 그늘에 앉은 자에게 비취고 우리 발을 평강의 길로 인도하시리로다하니라",
    "corrected_text": "어두움과 죽음의 그늘에 앉은 자에게 비취고 우리 발을 평강의 길로 인도하시리로다 하니라"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 2,
    "verse_start": 14,
    "current_text": "지극히 높은 곳에서는 하나님께 영광이요 땅에서는 기뻐하심을 입은 사람들 중에 평화로다하니라",
    "corrected_text": "지극히 높은 곳에서는 하나님께 영광이요 땅에서는 기뻐하심을 입은 사람들 중에 평화로다 하니라"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 2,
    "verse_start": 32,
    "current_text": "이방을 비추는 빛이요 주의 백성 이스라엘의 영광이니이다하니",
    "corrected_text": "이방을 비추는 빛이요 주의 백성 이스라엘의 영광이니이다 하니"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 3,
    "verse_start": 4,
    "current_text": "선지자 이사야의 책에 쓴바광야에 외치는 자의 소리가 있어 가로되 너희는 주의 길을 예비하라 그의 첩경을 평탄케 하라",
    "corrected_text": "선지자 이사야의 책에 쓴바 광야에 외치는 자의 소리가 있어 가로되 너희는 주의 길을 예비하라 그의 첩경을 평탄케 하라"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 3,
    "verse_start": 6,
    "current_text": "모든 육체가 하나님의 구원하심을 보리라함과 같으니라",
    "corrected_text": "모든 육체가 하나님의 구원하심을 보리라 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 4,
    "verse_start": 10,
    "current_text": "기록하였으되하나님이 너를 위하여 그 사자들을 명하사 너를 지키게 하시리라하였고",
    "corrected_text": "기록하였으되 하나님이 너를 위하여 그 사자들을 명하사 너를 지키게 하시리라 하였고"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 4,
    "verse_start": 11,
    "current_text": "또한저희가 손으로 너를 받들어 네 발이 돌에 부딪히지 않게 하시리라하였느니라",
    "corrected_text": "또한 저희가 손으로 너를 받들어 네 발이 돌에 부딪히지 않게 하시리라 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 4,
    "verse_start": 19,
    "current_text": "주의 은혜의 해를 전파하게 하려 하심이라하였더라",
    "corrected_text": "주의 은혜의 해를 전파하게 하려 하심이라 하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 7,
    "verse_start": 27,
    "current_text": "기록된바보라 내가 내 사자를 네 앞에 보내노니 그가 네 앞에서 네 길을 예비하리라한 것이 이 사람에 대한 말씀이라",
    "corrected_text": "기록된바 보라 내가 내 사자를 네 앞에 보내노니 그가 네 앞에서 네 길을 예비하리라 한 것이 이 사람에 대한 말씀이라"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 8,
    "verse_start": 42,
    "current_text": "이는 자기에게 열 두살 먹은 외딸이 있어 죽어감이러라예수께서 가실 때에 무리가 옹위하더라",
    "corrected_text": "이는 자기에게 열 두살 먹은 외딸이 있어 죽어감이러라 예수께서 가실 때에 무리가 옹위하더라"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 9,
    "verse_start": 43,
    "current_text": "사람들이 다 하나님의 위엄을 놀라니라저희가 다 그 행하시는 모든 일을 기이히 여길쌔 예수께서 제자들에게 이르시되",
    "corrected_text": "사람들이 다 하나님의 위엄을 놀라니라 저희가 다 그 행하시는 모든 일을 기이히 여길쌔 예수께서 제자들에게 이르시되"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 20,
    "verse_start": 17,
    "current_text": "저희를 보시며 가라사대 그러면 기록된바건축자들의 버린 돌이 모퉁이의 머릿돌이 되었느니라함이 어찜이뇨",
    "corrected_text": "저희를 보시며 가라사대 그러면 기록된바 건축자들의 버린 돌이 모퉁이의 머릿돌이 되었느니라 함이 어찜이뇨"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 20,
    "verse_start": 42,
    "current_text": "시편에 다윗이 친히 말하였으되주께서 내 주께 이르시되",
    "corrected_text": "시편에 다윗이 친히 말하였으되 주께서 내 주께 이르시되"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 20,
    "verse_start": 43,
    "current_text": "내가 네 원수를 네 발의 발등상으로 둘 때까지 내 우편에 앉았으라 하셨도다하였느니라",
    "corrected_text": "내가 네 원수를 네 발의 발등상으로 둘 때까지 내 우편에 앉았으라 하셨도다 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 42,
    "chapter": 23,
    "verse_start": 56,
    "current_text": "돌아가 향품과 향유를 예비하더라계명을 좇아 안식일에 쉬더라",
    "corrected_text": "돌아가 향품과 향유를 예비하더라 계명을 좇아 안식일에 쉬더라"
  },
  {
    "translation_id": 84,
    "book_number": 43,
    "chapter": 5,
    "verse_start": 9,
    "current_text": "그 사람이 곧 나아서 자리를 들고 걸어 가니라이 날은 안식일이니",
    "corrected_text": "그 사람이 곧 나아서 자리를 들고 걸어 가니라 이 날은 안식일이니"
  },
  {
    "translation_id": 84,
    "book_number": 43,
    "chapter": 12,
    "verse_start": 36,
    "current_text": "너희에게 아직 빛이 있을 동안에 빛을 믿으라 그리하면 빛의 아들이 되리라예수께서 이 말씀을 하시고 저희를 떠나가서 숨으시니라",
    "corrected_text": "너희에게 아직 빛이 있을 동안에 빛을 믿으라 그리하면 빛의 아들이 되리라 예수께서 이 말씀을 하시고 저희를 떠나가서 숨으시니라"
  },
  {
    "translation_id": 84,
    "book_number": 43,
    "chapter": 12,
    "verse_start": 38,
    "current_text": "이는 선지자 이사야의 말씀을 이루려 하심이라 가로되주여 우리에게 들은 바를 누가 믿었으며 주의 팔이 뉘게 나타났나이까하였더라",
    "corrected_text": "이는 선지자 이사야의 말씀을 이루려 하심이라 가로되 주여 우리에게 들은 바를 누가 믿었으며 주의 팔이 뉘게 나타났나이까 하였더라"
  },
  {
    "translation_id": 84,
    "book_number": 43,
    "chapter": 12,
    "verse_start": 40,
    "current_text": "저희 눈을 멀게 하시고 저희 마음을 완고하게 하셨으니 이는 저희로 하여금 눈으로 보고 마음으로 깨닫고 돌이켜 내게 고침을 받지 못하게 하려 함이니라하였음이더라",
    "corrected_text": "저희 눈을 멀게 하시고 저희 마음을 완고하게 하셨으니 이는 저희로 하여금 눈으로 보고 마음으로 깨닫고 돌이켜 내게 고침을 받지 못하게 하려 함이니라 하였음이더라"
  },
  {
    "translation_id": 84,
    "book_number": 43,
    "chapter": 18,
    "verse_start": 38,
    "current_text": "빌라도가 가로되 진리가 무엇이냐 하더라이 말을 하고 다시 유대인들에게 나가서 이르되 나는 그에게서 아무 죄도 찾지 못하노라",
    "corrected_text": "빌라도가 가로되 진리가 무엇이냐 하더라 이 말을 하고 다시 유대인들에게 나가서 이르되 나는 그에게서 아무 죄도 찾지 못하노라"
  },
  {
    "translation_id": 84,
    "book_number": 43,
    "chapter": 19,
    "verse_start": 24,
    "current_text": "군병들이 서로 말하되 이것을 찢지 말고 누가 얻나 제비 뽑자 하니 이는 성경에저희가 내 옷을 나누고 내 옷을 제비 뽑나이다한 것을 응하게 하려 함이러라 군병들은 이런 일을 하고",
    "corrected_text": "군병들이 서로 말하되 이것을 찢지 말고 누가 얻나 제비 뽑자 하니 이는 성경에 저희가 내 옷을 나누고 내 옷을 제비 뽑나이다 한 것을 응하게 하려 함이러라 군병들은 이런 일을 하고"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 1,
    "verse_start": 20,
    "current_text": "시편에 기록하였으되그의 거처로 황폐하게 하시며 거기 거하는 자가 없게 하소서하였고 또 일렀으되그 직분을 타인이 취하게 하소서하였도다",
    "corrected_text": "시편에 기록하였으되 그의 거처로 황폐하게 하시며 거기 거하는 자가 없게 하소서 하였고 또 일렀으되 그 직분을 타인이 취하게 하소서 하였도다"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 2,
    "verse_start": 21,
    "current_text": "누구든지 주의 이름을 부르는 자는 구원을 얻으리라하였느니라",
    "corrected_text": "누구든지 주의 이름을 부르는 자는 구원을 얻으리라 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 2,
    "verse_start": 25,
    "current_text": "다윗이 저를 가리켜 가로되내가 항상 내 앞에 계신 주를 뵈웠음이여 나로 요동치 않게 하기 위하여 그가 내 우편에 계시도다",
    "corrected_text": "다윗이 저를 가리켜 가로되 내가 항상 내 앞에 계신 주를 뵈웠음이여 나로 요동치 않게 하기 위하여 그가 내 우편에 계시도다"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 2,
    "verse_start": 28,
    "current_text": "주께서 생명의 길로 내게 보이셨으니 주의 앞에서 나로 기쁨이 충만하게 하시리로다하였으니",
    "corrected_text": "주께서 생명의 길로 내게 보이셨으니 주의 앞에서 나로 기쁨이 충만하게 하시리로다 하였으니"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 2,
    "verse_start": 34,
    "current_text": "다윗은 하늘에 올라가지 못하였으나 친히 말하여 가로되주께서 내 주에게 말씀하시기를",
    "corrected_text": "다윗은 하늘에 올라가지 못하였으나 친히 말하여 가로되 주께서 내 주에게 말씀하시기를"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 2,
    "verse_start": 35,
    "current_text": "내가 네 원수로 네 발등상 되게 하기까지 너는 내 우편에 앉았으라 하셨도다하였으니",
    "corrected_text": "내가 네 원수로 네 발등상 되게 하기까지 너는 내 우편에 앉았으라 하셨도다 하였으니"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 4,
    "verse_start": 25,
    "current_text": "또 주의 종 우리 조상 다윗의 입을 의탁하사 성령으로 말씀하시기를어찌하여 열방이 분노하며 족속들이 허사를 경영하였는고",
    "corrected_text": "또 주의 종 우리 조상 다윗의 입을 의탁하사 성령으로 말씀하시기를 어찌하여 열방이 분노하며 족속들이 허사를 경영하였는고"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 4,
    "verse_start": 26,
    "current_text": "세상의 군왕들이 나서며 관원들이 함께 모여 주와 그 그리스도를 대적하도다하신 이로소이다",
    "corrected_text": "세상의 군왕들이 나서며 관원들이 함께 모여 주와 그 그리스도를 대적하도다 하신 이로소이다"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 7,
    "verse_start": 43,
    "current_text": "몰록의 장막과 신 레판의 별을 받들었음이여 이것은 너희가 절하고자 하여 만든 형상이로다 내가 너희를 바벨론 밖에 옮기리라함과 같으니라",
    "corrected_text": "몰록의 장막과 신 레판의 별을 받들었음이여 이것은 너희가 절하고자 하여 만든 형상이로다 내가 너희를 바벨론 밖에 옮기리라 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 7,
    "verse_start": 50,
    "current_text": "이 모든 것이 다 내 손으로 지은 것이 아니냐함과 같으니라",
    "corrected_text": "이 모든 것이 다 내 손으로 지은 것이 아니냐 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 8,
    "verse_start": 1,
    "current_text": "사울이 그의 죽임 당함을 마땅히 여기더라그 날에 예루살렘에 있는 교회에 큰 핍박이 나서 사도 외에는 다 유대와 사마리아 모든 땅으로 흩어지니라",
    "corrected_text": "사울이 그의 죽임 당함을 마땅히 여기더라 그 날에 예루살렘에 있는 교회에 큰 핍박이 나서 사도 외에는 다 유대와 사마리아 모든 땅으로 흩어지니라"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 8,
    "verse_start": 32,
    "current_text": "읽는 성경 귀절은 이것이니 일렀으되저가 사지로 가는 양과 같이 끌리었고 털 깎는 자 앞에 있는 어린 양의 잠잠함과 같이 그 입을 열지 아니하였도다",
    "corrected_text": "읽는 성경 귀절은 이것이니 일렀으되 저가 사지로 가는 양과 같이 끌리었고 털 깎는 자 앞에 있는 어린 양의 잠잠함과 같이 그 입을 열지 아니하였도다"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 8,
    "verse_start": 33,
    "current_text": "낮을 때에 공변된 판단을 받지 못하였으니 누가 가히 그 세대를 말하리요 그 생명이 땅에서 빼앗김이로다하였거늘",
    "corrected_text": "낮을 때에 공변된 판단을 받지 못하였으니 누가 가히 그 세대를 말하리요 그 생명이 땅에서 빼앗김이로다 하였거늘"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 9,
    "verse_start": 19,
    "current_text": "음식을 먹으매 강건하여지니라사울이 다메섹에 있는 제자들과 함께 며칠 있을쌔",
    "corrected_text": "음식을 먹으매 강건하여지니라 사울이 다메섹에 있는 제자들과 함께 며칠 있을쌔"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 10,
    "verse_start": 23,
    "current_text": "베드로가 불러 들여 유숙하게 하니라이튿날 일어나 저희와 함께 갈쌔 욥바 두어 형제도 함께 가니라",
    "corrected_text": "베드로가 불러 들여 유숙하게 하니라 이튿날 일어나 저희와 함께 갈쌔 욥바 두어 형제도 함께 가니라"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 13,
    "verse_start": 41,
    "current_text": "일렀으되보라 멸시하는 사람들아 너희는 놀라고 망하라 내가 너희 때를 당하여 한 일을 행할 것이니 사람이 너희에게 이를찌라도 도무지 믿지 못할 일이라하였느니라 하니라",
    "corrected_text": "일렀으되 보라 멸시하는 사람들아 너희는 놀라고 망하라 내가 너희 때를 당하여 한 일을 행할 것이니 사람이 너희에게 이를찌라도 도무지 믿지 못할 일이라 하였느니라 하니라"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 13,
    "verse_start": 47,
    "current_text": "주께서 이같이 우리를 명하시되내가 너를 이방의 빛을 삼아 너로 땅 끝까지 구원하게 하리라하셨느니라 하니",
    "corrected_text": "주께서 이같이 우리를 명하시되 내가 너를 이방의 빛을 삼아 너로 땅 끝까지 구원하게 하리라 하셨느니라 하니"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 15,
    "verse_start": 18,
    "current_text": "즉 예로부터 이것을 알게 하시는 주의 말씀이라함과 같으니라",
    "corrected_text": "즉 예로부터 이것을 알게 하시는 주의 말씀이라 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 28,
    "verse_start": 26,
    "current_text": "일렀으되이 백성에게 가서 말하기를 너희가 듣기는 들어도 도무지 깨닫지 못하며 보기는 보아도 도무지 알지 못하는도다",
    "corrected_text": "일렀으되 이 백성에게 가서 말하기를 너희가 듣기는 들어도 도무지 깨닫지 못하며 보기는 보아도 도무지 알지 못하는도다"
  },
  {
    "translation_id": 84,
    "book_number": 44,
    "chapter": 28,
    "verse_start": 27,
    "current_text": "이 백성들의 마음이 완악하여져서 그 귀로는 둔하게 듣고 그 눈을 감았으니 이는 눈으로 보고 귀로 듣고 마음으로 깨달아 돌아와 나의 고침을 받을까 함이라하였으니",
    "corrected_text": "이 백성들의 마음이 완악하여져서 그 귀로는 둔하게 듣고 그 눈을 감았으니 이는 눈으로 보고 귀로 듣고 마음으로 깨달아 돌아와 나의 고침을 받을까 함이라 하였으니"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 3,
    "verse_start": 4,
    "current_text": "그럴 수 없느니라 사람은 다 거짓되되 오직 하나님은 참되시다 할찌어다 기록된바주께서 주의 말씀에 의롭다 함을 얻으시고 판단 받으실 때에 이기려 하심이라함과 같으니라",
    "corrected_text": "그럴 수 없느니라 사람은 다 거짓되되 오직 하나님은 참되시다 할찌어다 기록된바 주께서 주의 말씀에 의롭다 함을 얻으시고 판단 받으실 때에 이기려 하심이라 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 3,
    "verse_start": 10,
    "current_text": "기록한바의인은 없나니 하나도 없으며",
    "corrected_text": "기록한바 의인은 없나니 하나도 없으며"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 3,
    "verse_start": 18,
    "current_text": "저희 눈앞에 하나님을 두려워함이 없느니라함과 같으니라",
    "corrected_text": "저희 눈앞에 하나님을 두려워함이 없느니라 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 4,
    "verse_start": 8,
    "current_text": "주께서 그 죄를 인정치 아니하실 사람은 복이 있도다함과 같으니라",
    "corrected_text": "주께서 그 죄를 인정치 아니하실 사람은 복이 있도다 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 8,
    "verse_start": 36,
    "current_text": "기록된바우리가 종일 주를 위하여 죽임을 당케 되며 도살할 양 같이 여김을 받았나이다함과 같으니라",
    "corrected_text": "기록된바 우리가 종일 주를 위하여 죽임을 당케 되며 도살할 양 같이 여김을 받았나이다 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 9,
    "verse_start": 25,
    "current_text": "호세아 글에도 이르기를내가 내 백성 아닌 자를 내 백성이라, 사랑치 아니한 자를 사랑한 자라 부르리라",
    "corrected_text": "호세아 글에도 이르기를 내가 내 백성 아닌 자를 내 백성이라, 사랑치 아니한 자를 사랑한 자라 부르리라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 9,
    "verse_start": 26,
    "current_text": "너희는 내 백성이 아니라 한 그 곳에서 저희가 살아 계신 하나님의 아들이라 부름을 얻으리라함과 같으니라",
    "corrected_text": "너희는 내 백성이 아니라 한 그 곳에서 저희가 살아 계신 하나님의 아들이라 부름을 얻으리라 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 9,
    "verse_start": 29,
    "current_text": "또한 이사야가 미리 말한바만일 만군의 주께서 우리에게 씨를 남겨 두시지 아니하셨더면 우리가 소돔과 같이 되고 고모라와 같았으리로다함과 같으니라",
    "corrected_text": "또한 이사야가 미리 말한바 만일 만군의 주께서 우리에게 씨를 남겨 두시지 아니하셨더면 우리가 소돔과 같이 되고 고모라와 같았으리로다 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 9,
    "verse_start": 33,
    "current_text": "기록된바보라 내가 부딪히는 돌과 거치는 반석을 시온에 두노니 저를 믿는 자는 부끄러움을 당치 아니하리라함과 같으니라",
    "corrected_text": "기록된바 보라 내가 부딪히는 돌과 거치는 반석을 시온에 두노니 저를 믿는 자는 부끄러움을 당치 아니하리라 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 10,
    "verse_start": 18,
    "current_text": "그러나 내가 말하노니 저희가 듣지 아니하였느뇨 그렇지 아니하다그 소리가 온 땅에 퍼졌고 그 말씀이 땅끝까지 이르렀도다하였느니라",
    "corrected_text": "그러나 내가 말하노니 저희가 듣지 아니하였느뇨 그렇지 아니하다 그 소리가 온 땅에 퍼졌고 그 말씀이 땅끝까지 이르렀도다 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 10,
    "verse_start": 19,
    "current_text": "그러나 내가 말하노니 이스라엘이 알지 못하였느뇨 먼저 모세가 이르되내가 백성 아닌 자로써 너희를 시기나게 하며 미련한 백성으로써 너희를 노엽게 하리라하였고",
    "corrected_text": "그러나 내가 말하노니 이스라엘이 알지 못하였느뇨 먼저 모세가 이르되 내가 백성 아닌 자로써 너희를 시기나게 하며 미련한 백성으로써 너희를 노엽게 하리라 하였고"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 10,
    "verse_start": 20,
    "current_text": "또한 이사야가 매우 담대하여 이르되내가 구하지 아니하는 자들에게 찾은바 되고 내게 문의하지 아니하는 자들에게 나타났노라하였고",
    "corrected_text": "또한 이사야가 매우 담대하여 이르되 내가 구하지 아니하는 자들에게 찾은바 되고 내게 문의하지 아니하는 자들에게 나타났노라 하였고"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 11,
    "verse_start": 9,
    "current_text": "또 다윗이 가로되저희 밥상이 올무와 덫과 거치는 것과 보응이 되게 하옵시고",
    "corrected_text": "또 다윗이 가로되 저희 밥상이 올무와 덫과 거치는 것과 보응이 되게 하옵시고"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 11,
    "verse_start": 10,
    "current_text": "저희 눈은 흐려 보지 못하고 저희 등은 항상 굽게 하옵소서하였느니라",
    "corrected_text": "저희 눈은 흐려 보지 못하고 저희 등은 항상 굽게 하옵소서 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 11,
    "verse_start": 26,
    "current_text": "그리하여 온 이스라엘이 구원을 얻으리라 기록된바구원자가 시온에서 오사 야곱에게서 경건치 않은 것을 돌이키시겠고",
    "corrected_text": "그리하여 온 이스라엘이 구원을 얻으리라 기록된바 구원자가 시온에서 오사 야곱에게서 경건치 않은 것을 돌이키시겠고"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 11,
    "verse_start": 27,
    "current_text": "내가 저희 죄를 없이 할 때에 저희에게 이루어질 내 언약이 이것이라함과 같으니라",
    "corrected_text": "내가 저희 죄를 없이 할 때에 저희에게 이루어질 내 언약이 이것이라 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 14,
    "verse_start": 11,
    "current_text": "기록되었으되주께서 가라사대 내가 살았노니 모든 무릎이 내게 꿇을 것이요 모든 혀가 하나님께 자백하리라하였느니라",
    "corrected_text": "기록되었으되 주께서 가라사대 내가 살았노니 모든 무릎이 내게 꿇을 것이요 모든 혀가 하나님께 자백하리라 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 15,
    "verse_start": 9,
    "current_text": "이방인으로 그 긍휼하심을 인하여 하나님께 영광을 돌리게 하려 하심이라 기록된바이러므로 내가 열방 중에서 주께 감사하고 주의 이름을 찬송하리로다함과 같으니라",
    "corrected_text": "이방인으로 그 긍휼하심을 인하여 하나님께 영광을 돌리게 하려 하심이라 기록된바 이러므로 내가 열방 중에서 주께 감사하고 주의 이름을 찬송하리로다 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 15,
    "verse_start": 10,
    "current_text": "또 가로되열방들아 주의 백성과 함께 즐거워하라하였으며",
    "corrected_text": "또 가로되 열방들아 주의 백성과 함께 즐거워하라 하였으며"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 15,
    "verse_start": 11,
    "current_text": "또모든 열방들아 주를 찬양하며 모든 백성들아 저를 찬송하라하였으며",
    "corrected_text": "또 모든 열방들아 주를 찬양하며 모든 백성들아 저를 찬송하라 하였으며"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 15,
    "verse_start": 12,
    "current_text": "또 이사야가 가로되 이새의 뿌리 곧 열방을 다스리기 위하여 일어나시는 이가 있으리니 열방이 그에게 소망을 두리라하였느니라",
    "corrected_text": "또 이사야가 가로되 이새의 뿌리 곧 열방을 다스리기 위하여 일어나시는 이가 있으리니 열방이 그에게 소망을 두리라 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 15,
    "verse_start": 21,
    "current_text": "기록된바주의 소식을 받지 못한 자들이 볼 것이요 듣지 못한 자들이 깨달으리라함과 같으니라",
    "corrected_text": "기록된바 주의 소식을 받지 못한 자들이 볼 것이요 듣지 못한 자들이 깨달으리라 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 45,
    "chapter": 16,
    "verse_start": 20,
    "current_text": "평강의 하나님께서 속히 사단을 너희 발 아래서 상하게 하시리라우리 주 예수의 은혜가 너희에게 있을찌어다",
    "corrected_text": "평강의 하나님께서 속히 사단을 너희 발 아래서 상하게 하시리라 우리 주 예수의 은혜가 너희에게 있을찌어다"
  },
  {
    "translation_id": 84,
    "book_number": 46,
    "chapter": 1,
    "verse_start": 19,
    "current_text": "기록된바내가 지혜 있는 자들의 지혜를 멸하고 총명한 자들의 총명을 폐하리라하였으니",
    "corrected_text": "기록된바 내가 지혜 있는 자들의 지혜를 멸하고 총명한 자들의 총명을 폐하리라 하였으니"
  },
  {
    "translation_id": 84,
    "book_number": 46,
    "chapter": 2,
    "verse_start": 9,
    "current_text": "기록된바하나님이 자기를 사랑하는 자들을 위하여 예비하신 모든 것은 눈으로 보지 못하고 귀로도 듣지 못하고 사람의 마음으로도 생각지 못하였다함과 같으니라",
    "corrected_text": "기록된바 하나님이 자기를 사랑하는 자들을 위하여 예비하신 모든 것은 눈으로 보지 못하고 귀로도 듣지 못하고 사람의 마음으로도 생각지 못하였다 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 47,
    "chapter": 6,
    "verse_start": 2,
    "current_text": "가라사대내가 은혜 베풀 때에 너를 듣고 구원의 날에 너를 도왔다하셨으니 보라 지금은 은혜 받을만한 때요 보라 지금은 구원의 날이로다",
    "corrected_text": "가라사대 내가 은혜 베풀 때에 너를 듣고 구원의 날에 너를 도왔다 하셨으니 보라 지금은 은혜 받을만한 때요 보라 지금은 구원의 날이로다"
  },
  {
    "translation_id": 84,
    "book_number": 47,
    "chapter": 6,
    "verse_start": 16,
    "current_text": "하나님의 성전과 우상이 어찌 일치가 되리요 우리는 살아 계신 하나님의 성전이라 이와 같이 하나님께서 가라사대내가 저희 가운데 거하며 두루 행하여 나는 저희 하나님이 되고 저희는 나의 백성이 되리라하셨느니라",
    "corrected_text": "하나님의 성전과 우상이 어찌 일치가 되리요 우리는 살아 계신 하나님의 성전이라 이와 같이 하나님께서 가라사대 내가 저희 가운데 거하며 두루 행하여 나는 저희 하나님이 되고 저희는 나의 백성이 되리라 하셨느니라"
  },
  {
    "translation_id": 84,
    "book_number": 47,
    "chapter": 9,
    "verse_start": 9,
    "current_text": "기록한바저가 흩어 가난한 자들에게 주었으니 그의 의가 영원토록 있느니라함과 같으니라",
    "corrected_text": "기록한바 저가 흩어 가난한 자들에게 주었으니 그의 의가 영원토록 있느니라 함과 같으니라"
  },
  {
    "translation_id": 84,
    "book_number": 48,
    "chapter": 4,
    "verse_start": 27,
    "current_text": "기록된바잉태치 못한 자여 즐거워하라 구로치 못한 자여 소리질러 외치라 이는 홀로 사는 자의 자녀가 남편 있는 자의 자녀보다 많음이라하였으니",
    "corrected_text": "기록된바 잉태치 못한 자여 즐거워하라 구로치 못한 자여 소리질러 외치라 이는 홀로 사는 자의 자녀가 남편 있는 자의 자녀보다 많음이라 하였으니"
  },
  {
    "translation_id": 84,
    "book_number": 49,
    "chapter": 4,
    "verse_start": 8,
    "current_text": "그러므로 이르기를그가 위로 올라가실 때에 사로잡힌 자를 사로잡고 사람들에게 선물을 주셨다하였도다",
    "corrected_text": "그러므로 이르기를 그가 위로 올라가실 때에 사로잡힌 자를 사로잡고 사람들에게 선물을 주셨다 하였도다"
  },
  {
    "translation_id": 84,
    "book_number": 54,
    "chapter": 3,
    "verse_start": 16,
    "current_text": "크도다 경건의 비밀이여, 그렇지 않다 하는 이 없도다그는 육신으로 나타난 바 되시고 영으로 의롭다 하심을 입으시고 천사들에게 보이시고 만국에서 전파되시고 세상에서 믿은바 되시고 영광 가운데서 올리우셨음이니라",
    "corrected_text": "크도다 경건의 비밀이여, 그렇지 않다 하는 이 없도다 그는 육신으로 나타난 바 되시고 영으로 의롭다 하심을 입으시고 천사들에게 보이시고 만국에서 전파되시고 세상에서 믿은바 되시고 영광 가운데서 올리우셨음이니라"
  },
  {
    "translation_id": 84,
    "book_number": 56,
    "chapter": 1,
    "verse_start": 12,
    "current_text": "그레데인 중에 어떤 선지자가 말하되그레데인들은 항상 거짓말장이며 악한 짐승이며 배만 위하는 게으름장이라하니",
    "corrected_text": "그레데인 중에 어떤 선지자가 말하되 그레데인들은 항상 거짓말장이며 악한 짐승이며 배만 위하는 게으름장이라 하니"
  },
  {
    "translation_id": 84,
    "book_number": 56,
    "chapter": 3,
    "verse_start": 15,
    "current_text": "나와 함께 있는 자가 다 네게 문안하니 믿음 안에서 우리를 사랑하는 자들에게 너도 문안하라은혜가 너희 무리에게 있을찌어다",
    "corrected_text": "나와 함께 있는 자가 다 네게 문안하니 믿음 안에서 우리를 사랑하는 자들에게 너도 문안하라 은혜가 너희 무리에게 있을찌어다"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 5,
    "current_text": "하나님께서 어느 때에 천사 중 누구에게네가 내 아들이라 오늘날 내가 너를 낳았다하셨으며 또 다시나는 그에게 아버지가 되고 그는 내게 아들이 되리라하셨느뇨",
    "corrected_text": "하나님께서 어느 때에 천사 중 누구에게 네가 내 아들이라 오늘날 내가 너를 낳았다 하셨으며 또 다시 나는 그에게 아버지가 되고 그는 내게 아들이 되리라 하셨느뇨"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 6,
    "current_text": "또 맏아들을 이끌어 세상에 다시 들어 오게 하실 때에하나님의 모든 천사가 저에게 경배할찌어다말씀하시며",
    "corrected_text": "또 맏아들을 이끌어 세상에 다시 들어 오게 하실 때에 하나님의 모든 천사가 저에게 경배할찌어다 말씀하시며"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 7,
    "current_text": "또 천사들에 관하여는그는 그의 천사들을 바람으로, 그의 사역자들을 불꽃으로 삼으시느니라하셨으되",
    "corrected_text": "또 천사들에 관하여는 그는 그의 천사들을 바람으로, 그의 사역자들을 불꽃으로 삼으시느니라 하셨으되"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 8,
    "current_text": "아들에 관하여는하나님이여 주의 보좌가 영영하며 주의 나라의 홀은 공평한 홀이니이다",
    "corrected_text": "아들에 관하여는 하나님이여 주의 보좌가 영영하며 주의 나라의 홀은 공평한 홀이니이다"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 9,
    "current_text": "네가 의를 사랑하고 불법을 미워하였으니 그러므로 하나님 곧 너의 하나님이 즐거움의 기름을 네게 부어 네 동류들보다 승하게 하셨도다하였고",
    "corrected_text": "네가 의를 사랑하고 불법을 미워하였으니 그러므로 하나님 곧 너의 하나님이 즐거움의 기름을 네게 부어 네 동류들보다 승하게 하셨도다 하였고"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 10,
    "current_text": "또주여 태초에 주께서 땅의 기초를 두셨으며 하늘도 주의 손으로 지으신바라",
    "corrected_text": "또 주여 태초에 주께서 땅의 기초를 두셨으며 하늘도 주의 손으로 지으신바라"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 12,
    "current_text": "의복처럼 갈아 입을 것이요 그것들이 옷과 같이 변할 것이나 주는 여전하여 연대가 다함이 없으리라하였으나",
    "corrected_text": "의복처럼 갈아 입을 것이요 그것들이 옷과 같이 변할 것이나 주는 여전하여 연대가 다함이 없으리라 하였으나"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 13,
    "current_text": "어느 때에 천사 중 누구에게내가 네 원수로 네 발등상 되게 하기까지 너는 내 우편에 앉았으라하셨느뇨",
    "corrected_text": "어느 때에 천사 중 누구에게 내가 네 원수로 네 발등상 되게 하기까지 너는 내 우편에 앉았으라 하셨느뇨"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 2,
    "verse_start": 6,
    "current_text": "오직 누가 어디 증거하여 가로되사람이 무엇이관대 주께서 저를 생각하시며 인자가 무엇이관대 주께서 저를 권고하시나이까",
    "corrected_text": "오직 누가 어디 증거하여 가로되 사람이 무엇이관대 주께서 저를 생각하시며 인자가 무엇이관대 주께서 저를 권고하시나이까"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 2,
    "verse_start": 8,
    "current_text": "만물을 그 발아래 복종케 하셨느니라하였으니 만물로 저에게 복종케 하셨은즉 복종치 않은 것이 하나도 없으나 지금 우리가 만물이 아직 저에게 복종한 것을 보지 못하고",
    "corrected_text": "만물을 그 발아래 복종케 하셨느니라 하였으니 만물로 저에게 복종케 하셨은즉 복종치 않은 것이 하나도 없으나 지금 우리가 만물이 아직 저에게 복종한 것을 보지 못하고"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 2,
    "verse_start": 12,
    "current_text": "이르시되내가 주의 이름을 내 형제들에게 선포하고 내가 주를 교회 중에서 찬송하리라하셨으며",
    "corrected_text": "이르시되 내가 주의 이름을 내 형제들에게 선포하고 내가 주를 교회 중에서 찬송하리라 하셨으며"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 2,
    "verse_start": 13,
    "current_text": "또 다시내가 그를 의지하리라하시고 또 다시볼찌어다 나와 및 하나님께서 내게 주신 자녀라하셨으니",
    "corrected_text": "또 다시 내가 그를 의지하리라 하시고 또 다시 볼찌어다 나와 및 하나님께서 내게 주신 자녀라 하셨으니"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 3,
    "verse_start": 7,
    "current_text": "그러므로 성령이 이르신 바와 같이오늘날 너희가 그의 음성을 듣거든",
    "corrected_text": "그러므로 성령이 이르신 바와 같이 오늘날 너희가 그의 음성을 듣거든"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 3,
    "verse_start": 11,
    "current_text": "내가 노하여 맹세한 바와 같이 저희는 내 안식에 들어오지 못하리라 하셨다하였으니",
    "corrected_text": "내가 노하여 맹세한 바와 같이 저희는 내 안식에 들어오지 못하리라 하셨다 하였으니"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 3,
    "verse_start": 15,
    "current_text": "성경에 일렀으되오늘날 너희가 그의 음성을 듣거든 노하심을 격동할 때와 같이 너희 마음을 강퍅케 하지 말라하였으니",
    "corrected_text": "성경에 일렀으되 오늘날 너희가 그의 음성을 듣거든 노하심을 격동할 때와 같이 너희 마음을 강퍅케 하지 말라 하였으니"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 4,
    "verse_start": 3,
    "current_text": "이미 믿는 우리들은 저 안식에 들어가는도다 그 말씀하신 바와 같으니내가 노하여 맹세한 바와 같이 저희가 내 안식에 들어오지 못하리라 하셨다하였으나 세상을 창조할 때부터 그 일이 이루었느니라",
    "corrected_text": "이미 믿는 우리들은 저 안식에 들어가는도다 그 말씀하신 바와 같으니 내가 노하여 맹세한 바와 같이 저희가 내 안식에 들어오지 못하리라 하셨다 하였으나 세상을 창조할 때부터 그 일이 이루었느니라"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 4,
    "verse_start": 7,
    "current_text": "오랜 후에 다윗의 글에 다시 어느날을 정하여 오늘날이라고 미리 이같이 일렀으되오늘날 너희가 그의 음성을 듣거든 너희 마음을 강퍅케 말라하였나니",
    "corrected_text": "오랜 후에 다윗의 글에 다시 어느날을 정하여 오늘날이라고 미리 이같이 일렀으되 오늘날 너희가 그의 음성을 듣거든 너희 마음을 강퍅케 말라 하였나니"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 5,
    "verse_start": 5,
    "current_text": "또한 이와 같이 그리스도께서 대제사장 되심도 스스로 영광을 취하심이 아니요 오직 말씀하신 이가 저더러 이르시되너는 내 아들이니 내가 오늘날 너를 낳았다하셨고",
    "corrected_text": "또한 이와 같이 그리스도께서 대제사장 되심도 스스로 영광을 취하심이 아니요 오직 말씀하신 이가 저더러 이르시되 너는 내 아들이니 내가 오늘날 너를 낳았다 하셨고"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 5,
    "verse_start": 6,
    "current_text": "또한 이와 같이 다른데 말씀하시되네가 영원히 멜기세덱의 반차를 좇는 제사장이라하셨으니",
    "corrected_text": "또한 이와 같이 다른데 말씀하시되 네가 영원히 멜기세덱의 반차를 좇는 제사장이라 하셨으니"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 8,
    "verse_start": 8,
    "current_text": "저희를 허물하여 일렀으되주께서 가라사대 볼찌어다 날이 이르리니 내가 이스라엘 집과 유다 집으로 새 언약을 세우리라",
    "corrected_text": "저희를 허물하여 일렀으되 주께서 가라사대 볼찌어다 날이 이르리니 내가 이스라엘 집과 유다 집으로 새 언약을 세우리라"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 8,
    "verse_start": 12,
    "current_text": "내가 저희 불의를 긍휼히 여기고 저희 죄를 다시 기억하지 아니하리라하셨느니라",
    "corrected_text": "내가 저희 불의를 긍휼히 여기고 저희 죄를 다시 기억하지 아니하리라 하셨느니라"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 10,
    "verse_start": 5,
    "current_text": "그러므로 세상에 임하실 때에 가라사대하나님이 제사와 예물을 원치 아니하시고 오직 나를 위하여 한 몸을 예비하셨도다",
    "corrected_text": "그러므로 세상에 임하실 때에 가라사대 하나님이 제사와 예물을 원치 아니하시고 오직 나를 위하여 한 몸을 예비하셨도다"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 10,
    "verse_start": 7,
    "current_text": "이에 내가 말하기를 하나님이여 보시옵소서 두루마리 책에 나를 가리켜 기록한 것과 같이 하나님의 뜻을 행하러 왔나이다하시니라",
    "corrected_text": "이에 내가 말하기를 하나님이여 보시옵소서 두루마리 책에 나를 가리켜 기록한 것과 같이 하나님의 뜻을 행하러 왔나이다 하시니라"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 10,
    "verse_start": 16,
    "current_text": "주께서 가라사대 그날 후로는 저희와 세울 언약이 이것이라 하시고 내 법을 저희 마음에 두고 저희 생각에 기록하리라하신 후에",
    "corrected_text": "주께서 가라사대 그날 후로는 저희와 세울 언약이 이것이라 하시고 내 법을 저희 마음에 두고 저희 생각에 기록하리라 하신 후에"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 10,
    "verse_start": 17,
    "current_text": "또저희 죄와 저희 불법을 내가 다시 기억지 아니하리라하셨으니",
    "corrected_text": "또 저희 죄와 저희 불법을 내가 다시 기억지 아니하리라 하셨으니"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 10,
    "verse_start": 38,
    "current_text": "오직 나의 의인은 믿음으로 말미암아 살리라 또한 뒤로 물러가면 내 마음이 저를 기뻐하지 아니하리라하셨느니라",
    "corrected_text": "오직 나의 의인은 믿음으로 말미암아 살리라 또한 뒤로 물러가면 내 마음이 저를 기뻐하지 아니하리라 하셨느니라"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 12,
    "verse_start": 5,
    "current_text": "또 아들들에게 권하는것 같이 너희에게 권면하신 말씀을 잊었도다 일렀으되내 아들아 주의 징계하심을 경히 여기지 말며 그에게 꾸지람을 받을 때에 낙심하지 말라",
    "corrected_text": "또 아들들에게 권하는것 같이 너희에게 권면하신 말씀을 잊었도다 일렀으되 내 아들아 주의 징계하심을 경히 여기지 말며 그에게 꾸지람을 받을 때에 낙심하지 말라"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 12,
    "verse_start": 6,
    "current_text": "주께서 그 사랑하시는 자를 징계하시고 그의 받으시는 아들마다 채찍질하심이니라하였으니",
    "corrected_text": "주께서 그 사랑하시는 자를 징계하시고 그의 받으시는 아들마다 채찍질하심이니라 하였으니"
  },
  {
    "translation_id": 84,
    "book_number": 58,
    "chapter": 13,
    "verse_start": 6,
    "current_text": "그러므로 우리가 담대히 가로되주는 나를 돕는 자시니 내가 무서워 아니하겠노라 사람이 내게 어찌하리요하노라",
    "corrected_text": "그러므로 우리가 담대히 가로되 주는 나를 돕는 자시니 내가 무서워 아니하겠노라 사람이 내게 어찌하리요 하노라"
  },
  {
    "translation_id": 84,
    "book_number": 60,
    "chapter": 1,
    "verse_start": 24,
    "current_text": "그러므로모든 육체는 풀과 같고 그 모든 영광이 풀의 꽃과 같으니 풀은 마르고 꽃은 떨어지되",
    "corrected_text": "그러므로 모든 육체는 풀과 같고 그 모든 영광이 풀의 꽃과 같으니 풀은 마르고 꽃은 떨어지되"
  },
  {
    "translation_id": 84,
    "book_number": 60,
    "chapter": 1,
    "verse_start": 25,
    "current_text": "오직 주의 말씀은 세세토록 있도다하였으니 너희에게 전한 복음이 곧 이 말씀이니라",
    "corrected_text": "오직 주의 말씀은 세세토록 있도다 하였으니 너희에게 전한 복음이 곧 이 말씀이니라"
  },
  {
    "translation_id": 84,
    "book_number": 60,
    "chapter": 2,
    "verse_start": 6,
    "current_text": "경에 기록하였으되보라 내가 택한 보배롭고 요긴한 모퉁이 돌을 시온에 두노니 저를 믿는 자는 부끄러움을 당치 아니하리라하였으니",
    "corrected_text": "경에 기록하였으되 보라 내가 택한 보배롭고 요긴한 모퉁이 돌을 시온에 두노니 저를 믿는 자는 부끄러움을 당치 아니하리라 하였으니"
  },
  {
    "translation_id": 84,
    "book_number": 60,
    "chapter": 2,
    "verse_start": 7,
    "current_text": "그러므로 믿는 너희에게는 보배이나 믿지 아니하는 자에게는건축자들의 버린 그 돌이 모퉁이의 머릿돌이 되고",
    "corrected_text": "그러므로 믿는 너희에게는 보배이나 믿지 아니하는 자에게는 건축자들의 버린 그 돌이 모퉁이의 머릿돌이 되고"
  },
  {
    "translation_id": 84,
    "book_number": 60,
    "chapter": 2,
    "verse_start": 8,
    "current_text": "또한부딪히는 돌과 거치는 반석이 되었다하니라 저희가 말씀을 순종치 아니하므로 넘어지나니 이는 저희를 이렇게 정하신 것이라",
    "corrected_text": "또한 부딪히는 돌과 거치는 반석이 되었다 하니라 저희가 말씀을 순종치 아니하므로 넘어지나니 이는 저희를 이렇게 정하신 것이라"
  },
  {
    "translation_id": 84,
    "book_number": 60,
    "chapter": 3,
    "verse_start": 10,
    "current_text": "그러므로생명을 사랑하고 좋은 날 보기를 원하는 자는 혀를 금하여 악한 말을 그치며 그 입술로 궤휼을 말하지 말고",
    "corrected_text": "그러므로 생명을 사랑하고 좋은 날 보기를 원하는 자는 혀를 금하여 악한 말을 그치며 그 입술로 궤휼을 말하지 말고"
  },
  {
    "translation_id": 84,
    "book_number": 60,
    "chapter": 3,
    "verse_start": 12,
    "current_text": "주의 눈은 의인을 향하시고 그의 귀는 저의 간구에 기울이시되 주의 낯은 악행하는 자들을 향하시느니라하였느니라",
    "corrected_text": "주의 눈은 의인을 향하시고 그의 귀는 저의 간구에 기울이시되 주의 낯은 악행하는 자들을 향하시느니라 하였느니라"
  },
  {
    "translation_id": 84,
    "book_number": 60,
    "chapter": 5,
    "verse_start": 14,
    "current_text": "너희는 사랑의 입맞춤으로 피차 문안하라그리스도 안에 있는 너희 모든 이에게 평강이 있을찌어다",
    "corrected_text": "너희는 사랑의 입맞춤으로 피차 문안하라 그리스도 안에 있는 너희 모든 이에게 평강이 있을찌어다"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 4,
    "verse_start": 8,
    "current_text": "네 생물이 각각 여섯 날개가 있고 그 안과 주위에 눈이 가득하더라 그들이 밤낮 쉬지 않고 이르기를거룩하다 거룩하다 거룩하다 주 하나님 곧 전능하신이여 전에도 계셨고 이제도 계시고 장차 오실 자라하고",
    "corrected_text": "네 생물이 각각 여섯 날개가 있고 그 안과 주위에 눈이 가득하더라 그들이 밤낮 쉬지 않고 이르기를 거룩하다 거룩하다 거룩하다 주 하나님 곧 전능하신이여 전에도 계셨고 이제도 계시고 장차 오실 자라 하고"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 4,
    "verse_start": 11,
    "current_text": "우리 주 하나님이여 영광과 존귀와 능력을 받으시는 것이 합당하오니 주께서 만물을 지으신지라 만물이 주의 뜻대로 있었고 또 지으심을 받았나이다하더라",
    "corrected_text": "우리 주 하나님이여 영광과 존귀와 능력을 받으시는 것이 합당하오니 주께서 만물을 지으신지라 만물이 주의 뜻대로 있었고 또 지으심을 받았나이다 하더라"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 5,
    "verse_start": 9,
    "current_text": "새 노래를 노래하여 가로되책을 가지시고 그 인봉을 떼기에 합당하시도다 일찍 죽임을 당하사 각 족속과 방언과 백성과 나라 가운데서 사람들을 피로 사서 하나님께 드리시고",
    "corrected_text": "새 노래를 노래하여 가로되 책을 가지시고 그 인봉을 떼기에 합당하시도다 일찍 죽임을 당하사 각 족속과 방언과 백성과 나라 가운데서 사람들을 피로 사서 하나님께 드리시고"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 5,
    "verse_start": 10,
    "current_text": "저희로 우리 하나님 앞에서 나라와 제사장을 삼으셨으니 저희가 땅에서 왕노릇하리로다하더라",
    "corrected_text": "저희로 우리 하나님 앞에서 나라와 제사장을 삼으셨으니 저희가 땅에서 왕노릇하리로다 하더라"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 5,
    "verse_start": 12,
    "current_text": "큰 음성으로 가로되죽임을 당하신 어린 양이 능력과 부와 지혜와 힘과 존귀와 영광과 찬송을 받으시기에 합당하도다하더라",
    "corrected_text": "큰 음성으로 가로되 죽임을 당하신 어린 양이 능력과 부와 지혜와 힘과 존귀와 영광과 찬송을 받으시기에 합당하도다 하더라"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 5,
    "verse_start": 13,
    "current_text": "내가 또 들으니 하늘 위에와 땅 위에와 땅 아래와 바다 위에와 또 그 가운데 모든 만물이 가로되보좌에 앉으신 이와 어린 양에게 찬송과 존귀와 영광과 능력을 세세토록 돌릴찌어다하니",
    "corrected_text": "내가 또 들으니 하늘 위에와 땅 위에와 땅 아래와 바다 위에와 또 그 가운데 모든 만물이 가로되 보좌에 앉으신 이와 어린 양에게 찬송과 존귀와 영광과 능력을 세세토록 돌릴찌어다 하니"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 7,
    "verse_start": 10,
    "current_text": "큰 소리로 외쳐 가로되구원하심이 보좌에 앉으신 우리 하나님과 어린 양에게 있도다하니",
    "corrected_text": "큰 소리로 외쳐 가로되 구원하심이 보좌에 앉으신 우리 하나님과 어린 양에게 있도다 하니"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 7,
    "verse_start": 12,
    "current_text": "가로되아멘 찬송과 영광과 지혜와 감사와 존귀와 능력과 힘이 우리 하나님께 세세토록 있을찌로다 아멘하더라",
    "corrected_text": "가로되 아멘 찬송과 영광과 지혜와 감사와 존귀와 능력과 힘이 우리 하나님께 세세토록 있을찌로다 아멘 하더라"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 11,
    "verse_start": 15,
    "current_text": "일곱째 천사가 나팔을 불매 하늘에 큰 음성들이 나서 가로되세상 나라가 우리 주와 그 그리스도의 나라가 되어 그가 세세토록 왕노릇 하시리로다하니",
    "corrected_text": "일곱째 천사가 나팔을 불매 하늘에 큰 음성들이 나서 가로되 세상 나라가 우리 주와 그 그리스도의 나라가 되어 그가 세세토록 왕노릇 하시리로다 하니"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 11,
    "verse_start": 17,
    "current_text": "가로되감사하옵나니 옛적에도 계셨고 시방도 계신 주 하나님 곧 전능하신이여 친히 큰 권능을 잡으시고 왕노릇 하시도다",
    "corrected_text": "가로되 감사하옵나니 옛적에도 계셨고 시방도 계신 주 하나님 곧 전능하신이여 친히 큰 권능을 잡으시고 왕노릇 하시도다"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 11,
    "verse_start": 18,
    "current_text": "이방들이 분노하매 주의 진노가 임하여 죽은 자를 심판하시며 종 선지자들과 성도들과 또 무론대소하고 주의 이름을 경외하는 자들에게 상 주시며 또 땅을 망하게 하는 자들을 멸망시키실 때로소이다하더라",
    "corrected_text": "이방들이 분노하매 주의 진노가 임하여 죽은 자를 심판하시며 종 선지자들과 성도들과 또 무론대소하고 주의 이름을 경외하는 자들에게 상 주시며 또 땅을 망하게 하는 자들을 멸망시키실 때로소이다 하더라"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 12,
    "verse_start": 10,
    "current_text": "내가 또 들으니 하늘에 큰 음성이 있어 가로되이제 우리 하나님의 구원과 능력과 나라와 또 그의 그리스도의 권세가 이루었으니 우리 형제들을 참소하던 자 곧 우리 하나님 앞에서 밤낮 참소하던 자가 쫓겨 났고",
    "corrected_text": "내가 또 들으니 하늘에 큰 음성이 있어 가로되 이제 우리 하나님의 구원과 능력과 나라와 또 그의 그리스도의 권세가 이루었으니 우리 형제들을 참소하던 자 곧 우리 하나님 앞에서 밤낮 참소하던 자가 쫓겨 났고"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 12,
    "verse_start": 12,
    "current_text": "그러므로 하늘과 그 가운데 거하는 자들은 즐거워하라 그러나 땅과 바다는 화 있을찐저 이는 마귀가 자기의 때가 얼마 못된 줄을 알므로 크게 분내어 너희에게 내려 갔음이라하더라",
    "corrected_text": "그러므로 하늘과 그 가운데 거하는 자들은 즐거워하라 그러나 땅과 바다는 화 있을찐저 이는 마귀가 자기의 때가 얼마 못된 줄을 알므로 크게 분내어 너희에게 내려 갔음이라 하더라"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 15,
    "verse_start": 3,
    "current_text": "하나님의 종 모세의 노래, 어린 양의 노래를 불러 가로되주 하나님 곧 전능하신이시여 하시는 일이 크고 기이하시도다 만국의 왕이시여 주의 길이 의롭고 참되시도다",
    "corrected_text": "하나님의 종 모세의 노래, 어린 양의 노래를 불러 가로되 주 하나님 곧 전능하신이시여 하시는 일이 크고 기이하시도다 만국의 왕이시여 주의 길이 의롭고 참되시도다"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 15,
    "verse_start": 4,
    "current_text": "주여 누가 주의 이름을 두려워하지 아니하며 영화롭게 하지 아니하오리이까 오직 주만 거룩하시니이다 주의 의로우신 일이 나타났으매 만국이 와서 주께 경배하리이다하더라",
    "corrected_text": "주여 누가 주의 이름을 두려워하지 아니하며 영화롭게 하지 아니하오리이까 오직 주만 거룩하시니이다 주의 의로우신 일이 나타났으매 만국이 와서 주께 경배하리이다 하더라"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 19,
    "verse_start": 1,
    "current_text": "이 일 후에 내가 들으니 하늘에 허다한 무리의 큰 음성 같은 것이 있어 가로되할렐루야 구원과 영광과 능력이 우리 하나님께 있도다",
    "corrected_text": "이 일 후에 내가 들으니 하늘에 허다한 무리의 큰 음성 같은 것이 있어 가로되 할렐루야 구원과 영광과 능력이 우리 하나님께 있도다"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 19,
    "verse_start": 2,
    "current_text": "그의 심판은 참되고 의로운지라 음행으로 땅을 더럽게 한 큰 음녀를 심판하사 자기 종들의 피를 그의 손에 갚으셨도다하고",
    "corrected_text": "그의 심판은 참되고 의로운지라 음행으로 땅을 더럽게 한 큰 음녀를 심판하사 자기 종들의 피를 그의 손에 갚으셨도다 하고"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 19,
    "verse_start": 5,
    "current_text": "보좌에서 음성이 나서 가로되하나님의 종들 곧 그를 경외하는 너희들아 무론대소하고 다 우리 하나님께 찬송하라하더라",
    "corrected_text": "보좌에서 음성이 나서 가로되 하나님의 종들 곧 그를 경외하는 너희들아 무론대소하고 다 우리 하나님께 찬송하라 하더라"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 19,
    "verse_start": 6,
    "current_text": "또 내가 들으니 허다한 무리의 음성도 같고 많은 물 소리도 같고 큰 뇌성도 같아서 가로되할렐루야 주 우리 하나님 곧 전능하신 이가 통치하시도다",
    "corrected_text": "또 내가 들으니 허다한 무리의 음성도 같고 많은 물 소리도 같고 큰 뇌성도 같아서 가로되 할렐루야 주 우리 하나님 곧 전능하신 이가 통치하시도다"
  },
  {
    "translation_id": 84,
    "book_number": 66,
    "chapter": 19,
    "verse_start": 8,
    "current_text": "그에게 허락하사 빛나고 깨끗한 세마포를 입게 하셨은즉 이 세마포는 성도들의 옳은 행실이로다하더라",
    "corrected_text": "그에게 허락하사 빛나고 깨끗한 세마포를 입게 하셨은즉 이 세마포는 성도들의 옳은 행실이로다 하더라"
  },
  {
    "translation_id": 92,
    "book_number": 1,
    "chapter": 4,
    "verse_start": 23,
    "current_text": "라멕이 아내들에게 이르되아다와 씰라여 내 목소리를 들으라 라멕의 아내들이여 내 말을 들으라 나의 상처로 말미암아 내가 사람을 죽였고 나의 상함으로 말미암아 소년을 죽였도다",
    "corrected_text": "라멕이 아내들에게 이르되 아다와 씰라여 내 목소리를 들으라 라멕의 아내들이여 내 말을 들으라 나의 상처로 말미암아 내가 사람을 죽였고 나의 상함으로 말미암아 소년을 죽였도다"
  },
  {
    "translation_id": 92,
    "book_number": 1,
    "chapter": 4,
    "verse_start": 24,
    "current_text": "가인을 위하여는 벌이 칠 배일진대 라멕을 위하여는 벌이 칠십칠 배이리로다하였더라",
    "corrected_text": "가인을 위하여는 벌이 칠 배일진대 라멕을 위하여는 벌이 칠십칠 배이리로다 하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 1,
    "chapter": 9,
    "verse_start": 25,
    "current_text": "이에 이르되가나안은 저주를 받아 그의 형제의 종들의 종이 되기를 원하노라하고",
    "corrected_text": "이에 이르되 가나안은 저주를 받아 그의 형제의 종들의 종이 되기를 원하노라 하고"
  },
  {
    "translation_id": 92,
    "book_number": 1,
    "chapter": 9,
    "verse_start": 26,
    "current_text": "또 이르되셈의 하나님 여호와를 찬송하리로다 가나안은 셈의 종이 되고",
    "corrected_text": "또 이르되 셈의 하나님 여호와를 찬송하리로다 가나안은 셈의 종이 되고"
  },
  {
    "translation_id": 92,
    "book_number": 1,
    "chapter": 9,
    "verse_start": 27,
    "current_text": "하나님이 야벳을 창대하게 하사 셈의 장막에 거하게 하시고 가나안은 그의 종이 되게 하시기를 원하노라하였더라",
    "corrected_text": "하나님이 야벳을 창대하게 하사 셈의 장막에 거하게 하시고 가나안은 그의 종이 되게 하시기를 원하노라 하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 1,
    "chapter": 25,
    "verse_start": 23,
    "current_text": "여호와께서 그에게 이르시되두 국민이 네 태중에 있구나 두 민족이 네 복중에서부터 나누이리라 이 족속이 저 족속보다 강하겠고 큰 자가 어린 자를 섬기리라하셨더라",
    "corrected_text": "여호와께서 그에게 이르시되 두 국민이 네 태중에 있구나 두 민족이 네 복중에서부터 나누이리라 이 족속이 저 족속보다 강하겠고 큰 자가 어린 자를 섬기리라 하셨더라"
  },
  {
    "translation_id": 92,
    "book_number": 1,
    "chapter": 27,
    "verse_start": 27,
    "current_text": "그가 가까이 가서 그에게 입맞추니 아버지가 그의 옷의 향취를 맡고 그에게 축복하여 이르되내 아들의 향취는 여호와께서 복 주신 밭의 향취로다",
    "corrected_text": "그가 가까이 가서 그에게 입맞추니 아버지가 그의 옷의 향취를 맡고 그에게 축복하여 이르되 내 아들의 향취는 여호와께서 복 주신 밭의 향취로다"
  },
  {
    "translation_id": 92,
    "book_number": 1,
    "chapter": 27,
    "verse_start": 39,
    "current_text": "그 아버지 이삭이 그에게 대답하여 이르되네 주소는 땅의 기름짐에서 멀고 내리는 하늘 이슬에서 멀 것이며",
    "corrected_text": "그 아버지 이삭이 그에게 대답하여 이르되 네 주소는 땅의 기름짐에서 멀고 내리는 하늘 이슬에서 멀 것이며"
  },
  {
    "translation_id": 92,
    "book_number": 1,
    "chapter": 27,
    "verse_start": 40,
    "current_text": "너는 칼을 믿고 생활하겠고 네 아우를 섬길 것이며 네가 매임을 벗을 때에는 그 멍에를 네 목에서 떨쳐버리리라하였더라",
    "corrected_text": "너는 칼을 믿고 생활하겠고 네 아우를 섬길 것이며 네가 매임을 벗을 때에는 그 멍에를 네 목에서 떨쳐버리리라 하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 1,
    "chapter": 35,
    "verse_start": 22,
    "current_text": "이스라엘이 그 땅에 거주할 때에 르우벤이 가서 그 아버지의 첩 빌하와 동침하매 이스라엘이 이를 들었더라야곱의 아들은 열둘이라",
    "corrected_text": "이스라엘이 그 땅에 거주할 때에 르우벤이 가서 그 아버지의 첩 빌하와 동침하매 이스라엘이 이를 들었더라 야곱의 아들은 열둘이라"
  },
  {
    "translation_id": 92,
    "book_number": 2,
    "chapter": 15,
    "verse_start": 1,
    "current_text": "이 때에 모세와 이스라엘 자손이 이 노래로 여호와께 노래하니 일렀으되내가 여호와를 찬송하리니 그는 높고 영화로우심이요 말과 그 탄 자를 바다에 던지셨음이로다",
    "corrected_text": "이 때에 모세와 이스라엘 자손이 이 노래로 여호와께 노래하니 일렀으되 내가 여호와를 찬송하리니 그는 높고 영화로우심이요 말과 그 탄 자를 바다에 던지셨음이로다"
  },
  {
    "translation_id": 92,
    "book_number": 2,
    "chapter": 15,
    "verse_start": 18,
    "current_text": "여호와께서 영원무궁 하도록 다스리시도다하였더라",
    "corrected_text": "여호와께서 영원무궁 하도록 다스리시도다 하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 2,
    "chapter": 15,
    "verse_start": 21,
    "current_text": "미리암이 그들에게 화답하여 이르되너희는 여호와를 찬송하라 그는 높고 영화로우심이요 말과 그 탄 자를 바다에 던지셨음이로다하였더라",
    "corrected_text": "미리암이 그들에게 화답하여 이르되 너희는 여호와를 찬송하라 그는 높고 영화로우심이요 말과 그 탄 자를 바다에 던지셨음이로다 하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 21,
    "verse_start": 14,
    "current_text": "이러므로 여호와의 전쟁기에 일렀으되수바의 와헙과 아르논 골짜기와",
    "corrected_text": "이러므로 여호와의 전쟁기에 일렀으되 수바의 와헙과 아르논 골짜기와"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 21,
    "verse_start": 15,
    "current_text": "모든 골짜기의 비탈은 아르 고을을 향하여 기울어지고 모압의 경계에 닿았도다하였더라",
    "corrected_text": "모든 골짜기의 비탈은 아르 고을을 향하여 기울어지고 모압의 경계에 닿았도다 하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 21,
    "verse_start": 17,
    "current_text": "그 때에 이스라엘이 노래하여 이르되우물물아 솟아나라 너희는 그것을 노래하라",
    "corrected_text": "그 때에 이스라엘이 노래하여 이르되 우물물아 솟아나라 너희는 그것을 노래하라"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 21,
    "verse_start": 18,
    "current_text": "이 우물은 지휘관들이 팠고 백성의 귀인들이 규와 지팡이로 판 것이로다하였더라 그들은 광야에서 맛다나에 이르렀고",
    "corrected_text": "이 우물은 지휘관들이 팠고 백성의 귀인들이 규와 지팡이로 판 것이로다 하였더라 그들은 광야에서 맛다나에 이르렀고"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 21,
    "verse_start": 27,
    "current_text": "그러므로 시인이 읊어 이르되너희는 헤스본으로 올지어다 시혼의 성을 세워 견고히 할지어다",
    "corrected_text": "그러므로 시인이 읊어 이르되 너희는 헤스본으로 올지어다 시혼의 성을 세워 견고히 할지어다"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 21,
    "verse_start": 30,
    "current_text": "우리가 그들을 쏘아서 헤스본을 디본까지 멸하였고 메드바에 가까운 노바까지 황폐하게 하였도다하였더라",
    "corrected_text": "우리가 그들을 쏘아서 헤스본을 디본까지 멸하였고 메드바에 가까운 노바까지 황폐하게 하였도다 하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 23,
    "verse_start": 7,
    "current_text": "발람이 예언을 전하여 말하되발락이 나를 아람에서, 모압 왕이 동쪽 산에서 데려다가 이르기를 와서 나를 위하여 야곱을 저주하라, 와서 이스라엘을 꾸짖으라 하도다",
    "corrected_text": "발람이 예언을 전하여 말하되 발락이 나를 아람에서, 모압 왕이 동쪽 산에서 데려다가 이르기를 와서 나를 위하여 야곱을 저주하라, 와서 이스라엘을 꾸짖으라 하도다"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 23,
    "verse_start": 10,
    "current_text": "야곱의 티끌을 누가 능히 세며 이스라엘 사분의 일을 누가 능히 셀고 나는 의인의 죽음을 죽기 원하며 나의 종말이 그와 같기를 바라노라하매",
    "corrected_text": "야곱의 티끌을 누가 능히 세며 이스라엘 사분의 일을 누가 능히 셀고 나는 의인의 죽음을 죽기 원하며 나의 종말이 그와 같기를 바라노라 하매"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 23,
    "verse_start": 18,
    "current_text": "발람이 예언하여 이르기를발락이여 일어나 들을지어다 십볼의 아들이여 내게 자세히 들으라",
    "corrected_text": "발람이 예언하여 이르기를 발락이여 일어나 들을지어다 십볼의 아들이여 내게 자세히 들으라"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 23,
    "verse_start": 24,
    "current_text": "이 백성이 암사자 같이 일어나고 수사자 같이 일어나서 움킨 것을 먹으며 죽인 피를 마시기 전에는 눕지 아니하리로다하매",
    "corrected_text": "이 백성이 암사자 같이 일어나고 수사자 같이 일어나서 움킨 것을 먹으며 죽인 피를 마시기 전에는 눕지 아니하리로다 하매"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 3,
    "current_text": "그가 예언을 전하여 말하되브올의 아들 발람이 말하며 눈을 감았던 자가 말하며",
    "corrected_text": "그가 예언을 전하여 말하되 브올의 아들 발람이 말하며 눈을 감았던 자가 말하며"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 15,
    "current_text": "예언하여 이르기를브올의 아들 발람이 말하며 눈을 감았던 자가 말하며",
    "corrected_text": "예언하여 이르기를 브올의 아들 발람이 말하며 눈을 감았던 자가 말하며"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 19,
    "current_text": "주권자가 야곱에게서 나서 남은 자들을 그 성읍에서 멸절하리로다하고",
    "corrected_text": "주권자가 야곱에게서 나서 남은 자들을 그 성읍에서 멸절하리로다 하고"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 20,
    "current_text": "또 아말렉을 바라보며 예언하여 이르기를아말렉은 민족들의 으뜸이나 그의 종말은 멸망에 이르리로다하고",
    "corrected_text": "또 아말렉을 바라보며 예언하여 이르기를 아말렉은 민족들의 으뜸이나 그의 종말은 멸망에 이르리로다 하고"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 21,
    "current_text": "또 겐 족속을 바라보며 예언하여 이르기를네 거처가 견고하고 네 보금자리는 바위에 있도다",
    "corrected_text": "또 겐 족속을 바라보며 예언하여 이르기를 네 거처가 견고하고 네 보금자리는 바위에 있도다"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 22,
    "current_text": "그러나 가인이 쇠약하리니 나중에는 앗수르의 포로가 되리로다하고",
    "corrected_text": "그러나 가인이 쇠약하리니 나중에는 앗수르의 포로가 되리로다 하고"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 23,
    "current_text": "또 예언하여 이르기를슬프다 하나님이 이 일을 행하시리니 그 때에 살 자가 누구이랴",
    "corrected_text": "또 예언하여 이르기를 슬프다 하나님이 이 일을 행하시리니 그 때에 살 자가 누구이랴"
  },
  {
    "translation_id": 92,
    "book_number": 4,
    "chapter": 24,
    "verse_start": 24,
    "current_text": "깃딤 해변에서 배들이 와서 앗수르를 학대하며 에벨을 괴롭힐 것이나 그도 멸망하리로다하고",
    "corrected_text": "깃딤 해변에서 배들이 와서 앗수르를 학대하며 에벨을 괴롭힐 것이나 그도 멸망하리로다 하고"
  },
  {
    "translation_id": 92,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 2,
    "current_text": "그가 일렀으되여호와께서 시내 산에서 오시고 세일 산에서 일어나시고 바란 산에서 비추시고 일만 성도 가운데에 강림하셨고 그의 오른손에는 그들을 위해 번쩍이는 불이 있도다",
    "corrected_text": "그가 일렀으되 여호와께서 시내 산에서 오시고 세일 산에서 일어나시고 바란 산에서 비추시고 일만 성도 가운데에 강림하셨고 그의 오른손에는 그들을 위해 번쩍이는 불이 있도다"
  },
  {
    "translation_id": 92,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 7,
    "current_text": "유다에 대한 축복은 이러하니라 일렀으되여호와여 유다의 음성을 들으시고 그의 백성에게로 인도하시오며 그의 손으로 자기를 위하여 싸우게 하시고 주께서 도우사 그가 그 대적을 치게 하시기를 원하나이다",
    "corrected_text": "유다에 대한 축복은 이러하니라 일렀으되 여호와여 유다의 음성을 들으시고 그의 백성에게로 인도하시오며 그의 손으로 자기를 위하여 싸우게 하시고 주께서 도우사 그가 그 대적을 치게 하시기를 원하나이다"
  },
  {
    "translation_id": 92,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 8,
    "current_text": "레위에 대하여는 일렀으되주의 둠밈과 우림이 주의 경건한 자에게 있도다 주께서 그를 맛사에서 시험하시고 므리바 물 가에서 그와 다투셨도다",
    "corrected_text": "레위에 대하여는 일렀으되 주의 둠밈과 우림이 주의 경건한 자에게 있도다 주께서 그를 맛사에서 시험하시고 므리바 물 가에서 그와 다투셨도다"
  },
  {
    "translation_id": 92,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 12,
    "current_text": "베냐민에 대하여는 일렀으되여호와의 사랑을 입은 자는 그 곁에 안전히 살리로다 여호와께서 그를 날이 마치도록 보호하시고 그를 자기 어깨 사이에 있게 하시리로다",
    "corrected_text": "베냐민에 대하여는 일렀으되 여호와의 사랑을 입은 자는 그 곁에 안전히 살리로다 여호와께서 그를 날이 마치도록 보호하시고 그를 자기 어깨 사이에 있게 하시리로다"
  },
  {
    "translation_id": 92,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 13,
    "current_text": "요셉에 대하여는 일렀으되원하건대 그 땅이 여호와께 복을 받아 하늘의 보물인 이슬과 땅 아래에 저장한 물과",
    "corrected_text": "요셉에 대하여는 일렀으되 원하건대 그 땅이 여호와께 복을 받아 하늘의 보물인 이슬과 땅 아래에 저장한 물과"
  },
  {
    "translation_id": 92,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 18,
    "current_text": "스불론에 대하여는 일렀으되스불론이여 너는 밖으로 나감을 기뻐하라 잇사갈이여 너는 장막에 있음을 즐거워하라",
    "corrected_text": "스불론에 대하여는 일렀으되 스불론이여 너는 밖으로 나감을 기뻐하라 잇사갈이여 너는 장막에 있음을 즐거워하라"
  },
  {
    "translation_id": 92,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 20,
    "current_text": "갓에 대하여는 일렀으되갓을 광대하게 하시는 이에게 찬송을 부를지어다 갓이 암사자 같이 엎드리고 팔과 정수리를 찢는도다",
    "corrected_text": "갓에 대하여는 일렀으되 갓을 광대하게 하시는 이에게 찬송을 부를지어다 갓이 암사자 같이 엎드리고 팔과 정수리를 찢는도다"
  },
  {
    "translation_id": 92,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 22,
    "current_text": "단에 대하여는 일렀으되단은 바산에서 뛰어나오는 사자의 새끼로다",
    "corrected_text": "단에 대하여는 일렀으되 단은 바산에서 뛰어나오는 사자의 새끼로다"
  },
  {
    "translation_id": 92,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 23,
    "current_text": "납달리에 대하여는 일렀으되은혜가 풍성하고 여호와의 복이 가득한 납달리여 너는 서쪽과 남쪽을 차지할지로다",
    "corrected_text": "납달리에 대하여는 일렀으되 은혜가 풍성하고 여호와의 복이 가득한 납달리여 너는 서쪽과 남쪽을 차지할지로다"
  },
  {
    "translation_id": 92,
    "book_number": 5,
    "chapter": 33,
    "verse_start": 24,
    "current_text": "아셀에 대하여는 일렀으되아셀은 아들들 중에 더 복을 받으며 그의 형제에게 기쁨이 되며 그의 발이 기름에 잠길지로다",
    "corrected_text": "아셀에 대하여는 일렀으되 아셀은 아들들 중에 더 복을 받으며 그의 형제에게 기쁨이 되며 그의 발이 기름에 잠길지로다"
  },
  {
    "translation_id": 92,
    "book_number": 6,
    "chapter": 10,
    "verse_start": 12,
    "current_text": "여호와께서 아모리 사람을 이스라엘 자손에게 넘겨 주시던 날에 여호수아가 여호와께 아뢰어 이스라엘의 목전에서 이르되태양아 너는 기브온 위에 머무르라 달아 너도 아얄론 골짜기에서 그리할지어다하매",
    "corrected_text": "여호와께서 아모리 사람을 이스라엘 자손에게 넘겨 주시던 날에 여호수아가 여호와께 아뢰어 이스라엘의 목전에서 이르되 태양아 너는 기브온 위에 머무르라 달아 너도 아얄론 골짜기에서 그리할지어다 하매"
  },
  {
    "translation_id": 92,
    "book_number": 7,
    "chapter": 5,
    "verse_start": 31,
    "current_text": "여호와여 주의 원수들은 다 이와 같이 망하게 하시고 주를 사랑하는 자들은 해가 힘 있게 돋음 같게 하시옵소서하니라 그 땅이 사십 년 동안 평온하였더라",
    "corrected_text": "여호와여 주의 원수들은 다 이와 같이 망하게 하시고 주를 사랑하는 자들은 해가 힘 있게 돋음 같게 하시옵소서 하니라 그 땅이 사십 년 동안 평온하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 7,
    "chapter": 15,
    "verse_start": 16,
    "current_text": "이르되나귀의 턱뼈로 한 더미, 두 더미를 쌓았음이여 나귀의 턱뼈로 내가 천 명을 죽였도다하니라",
    "corrected_text": "이르되 나귀의 턱뼈로 한 더미, 두 더미를 쌓았음이여 나귀의 턱뼈로 내가 천 명을 죽였도다 하니라"
  },
  {
    "translation_id": 92,
    "book_number": 9,
    "chapter": 2,
    "verse_start": 1,
    "current_text": "한나가 기도하여 이르되내 마음이 여호와로 말미암아 즐거워하며 내 뿔이 여호와로 말미암아 높아졌으며 내 입이 내 원수들을 향하여 크게 열렸으니 이는 내가 주의 구원으로 말미암아 기뻐함이니이다",
    "corrected_text": "한나가 기도하여 이르되 내 마음이 여호와로 말미암아 즐거워하며 내 뿔이 여호와로 말미암아 높아졌으며 내 입이 내 원수들을 향하여 크게 열렸으니 이는 내가 주의 구원으로 말미암아 기뻐함이니이다"
  },
  {
    "translation_id": 92,
    "book_number": 9,
    "chapter": 2,
    "verse_start": 10,
    "current_text": "여호와를 대적하는 자는 산산이 깨어질 것이라 하늘에서 우레로 그들을 치시리로다 여호와께서 땅 끝까지 심판을 내리시고 자기 왕에게 힘을 주시며 자기의 기름 부음을 받은 자의 뿔을 높이시리로다하니라",
    "corrected_text": "여호와를 대적하는 자는 산산이 깨어질 것이라 하늘에서 우레로 그들을 치시리로다 여호와께서 땅 끝까지 심판을 내리시고 자기 왕에게 힘을 주시며 자기의 기름 부음을 받은 자의 뿔을 높이시리로다 하니라"
  },
  {
    "translation_id": 92,
    "book_number": 9,
    "chapter": 4,
    "verse_start": 1,
    "current_text": "사무엘의 말이 온 이스라엘에 전파되니라이스라엘은 나가서 블레셋 사람들과 싸우려고 에벤에셀 곁에 진 치고 블레셋 사람들은 아벡에 진 쳤더니",
    "corrected_text": "사무엘의 말이 온 이스라엘에 전파되니라 이스라엘은 나가서 블레셋 사람들과 싸우려고 에벤에셀 곁에 진 치고 블레셋 사람들은 아벡에 진 쳤더니"
  },
  {
    "translation_id": 92,
    "book_number": 9,
    "chapter": 13,
    "verse_start": 15,
    "current_text": "사무엘이 일어나 길갈에서 떠나 베냐민 기브아로 올라가니라사울이 자기와 함께 한 백성의 수를 세어 보니 육백 명 가량이라",
    "corrected_text": "사무엘이 일어나 길갈에서 떠나 베냐민 기브아로 올라가니라 사울이 자기와 함께 한 백성의 수를 세어 보니 육백 명 가량이라"
  },
  {
    "translation_id": 92,
    "book_number": 9,
    "chapter": 18,
    "verse_start": 7,
    "current_text": "여인들이 뛰놀며 노래하여 이르되사울이 죽인 자는 천천이요 다윗은 만만이로다한지라",
    "corrected_text": "여인들이 뛰놀며 노래하여 이르되 사울이 죽인 자는 천천이요 다윗은 만만이로다 한지라"
  },
  {
    "translation_id": 92,
    "book_number": 9,
    "chapter": 21,
    "verse_start": 11,
    "current_text": "아기스의 신하들이 아기스에게 말하되 이는 그 땅의 왕 다윗이 아니니이까 무리가 춤추며 이 사람의 일을 노래하여 이르되사울이 죽인 자는 천천이요 다윗은 만만이로다하지 아니하였나이까 한지라",
    "corrected_text": "아기스의 신하들이 아기스에게 말하되 이는 그 땅의 왕 다윗이 아니니이까 무리가 춤추며 이 사람의 일을 노래하여 이르되 사울이 죽인 자는 천천이요 다윗은 만만이로다 하지 아니하였나이까 한지라"
  },
  {
    "translation_id": 92,
    "book_number": 9,
    "chapter": 29,
    "verse_start": 5,
    "current_text": "그들이 춤추며 노래하여 이르되사울이 죽인 자는 천천이요 다윗은 만만이로다하던 그 다윗이 아니니이까 하니",
    "corrected_text": "그들이 춤추며 노래하여 이르되 사울이 죽인 자는 천천이요 다윗은 만만이로다 하던 그 다윗이 아니니이까 하니"
  },
  {
    "translation_id": 92,
    "book_number": 10,
    "chapter": 1,
    "verse_start": 27,
    "current_text": "오호라 두 용사가 엎드러졌으며 싸우는 무기가 망하였도다하였더라",
    "corrected_text": "오호라 두 용사가 엎드러졌으며 싸우는 무기가 망하였도다 하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 10,
    "chapter": 2,
    "verse_start": 4,
    "current_text": "유다 사람들이 와서 거기서 다윗에게 기름을 부어 유다 족속의 왕으로 삼았더라어떤 사람이 다윗에게 말하여 이르되 사울을 장사한 사람은 길르앗 야베스 사람들이니이다 하매",
    "corrected_text": "유다 사람들이 와서 거기서 다윗에게 기름을 부어 유다 족속의 왕으로 삼았더라 어떤 사람이 다윗에게 말하여 이르되 사울을 장사한 사람은 길르앗 야베스 사람들이니이다 하매"
  },
  {
    "translation_id": 92,
    "book_number": 10,
    "chapter": 3,
    "verse_start": 33,
    "current_text": "왕이 아브넬을 위하여 애가를 지어 이르되아브넬의 죽음이 어찌하여 미련한 자의 죽음 같은고",
    "corrected_text": "왕이 아브넬을 위하여 애가를 지어 이르되 아브넬의 죽음이 어찌하여 미련한 자의 죽음 같은고"
  },
  {
    "translation_id": 92,
    "book_number": 10,
    "chapter": 3,
    "verse_start": 34,
    "current_text": "네 손이 결박되지 아니하였고 네 발이 차꼬에 채이지 아니하였거늘 불의한 자식의 앞에 엎드러짐 같이 네가 엎드러졌도다하매 온 백성이 다시 그를 슬퍼하여 우니라",
    "corrected_text": "네 손이 결박되지 아니하였고 네 발이 차꼬에 채이지 아니하였거늘 불의한 자식의 앞에 엎드러짐 같이 네가 엎드러졌도다 하매 온 백성이 다시 그를 슬퍼하여 우니라"
  },
  {
    "translation_id": 92,
    "book_number": 10,
    "chapter": 12,
    "verse_start": 15,
    "current_text": "나단이 자기 집으로 돌아가니라우리아의 아내가 다윗에게 낳은 아이를 여호와께서 치시매 심히 앓는지라",
    "corrected_text": "나단이 자기 집으로 돌아가니라 우리아의 아내가 다윗에게 낳은 아이를 여호와께서 치시매 심히 앓는지라"
  },
  {
    "translation_id": 92,
    "book_number": 10,
    "chapter": 19,
    "verse_start": 8,
    "current_text": "왕이 일어나 성문에 앉으매 어떤 사람이 모든 백성에게 말하되 왕이 문에 앉아 계신다 하니 모든 백성이 왕 앞으로 나아오니라이스라엘은 이미 각기 장막으로 도망하였더라",
    "corrected_text": "왕이 일어나 성문에 앉으매 어떤 사람이 모든 백성에게 말하되 왕이 문에 앉아 계신다 하니 모든 백성이 왕 앞으로 나아오니라 이스라엘은 이미 각기 장막으로 도망하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 10,
    "chapter": 20,
    "verse_start": 10,
    "current_text": "아마사가 요압의 손에 있는 칼은 주의하지 아니한지라 요압이 칼로 그의 배를 찌르매 그의 창자가 땅에 쏟아지니 그를 다시 치지 아니하여도 죽으니라요압과 그의 동생 아비새가 비그리의 아들 세바를 뒤쫓을새",
    "corrected_text": "아마사가 요압의 손에 있는 칼은 주의하지 아니한지라 요압이 칼로 그의 배를 찌르매 그의 창자가 땅에 쏟아지니 그를 다시 치지 아니하여도 죽으니라 요압과 그의 동생 아비새가 비그리의 아들 세바를 뒤쫓을새"
  },
  {
    "translation_id": 92,
    "book_number": 10,
    "chapter": 22,
    "verse_start": 2,
    "current_text": "이르되여호와는 나의 반석이시요 나의 요새시요 나를 위하여 나를 건지시는 자시요",
    "corrected_text": "이르되 여호와는 나의 반석이시요 나의 요새시요 나를 위하여 나를 건지시는 자시요"
  },
  {
    "translation_id": 92,
    "book_number": 10,
    "chapter": 22,
    "verse_start": 51,
    "current_text": "여호와께서 그의 왕에게 큰 구원을 주시며 기름 부음 받은 자에게 인자를 베푸심이여 영원하도록 다윗과 그 후손에게로다하였더라",
    "corrected_text": "여호와께서 그의 왕에게 큰 구원을 주시며 기름 부음 받은 자에게 인자를 베푸심이여 영원하도록 다윗과 그 후손에게로다 하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 10,
    "chapter": 23,
    "verse_start": 1,
    "current_text": "이는 다윗의 마지막 말이라이새의 아들 다윗이 말함이여 높이 세워진 자, 야곱의 하나님께로부터 기름 부음 받은 자, 이스라엘의 노래 잘 하는 자가 말하노라",
    "corrected_text": "이는 다윗의 마지막 말이라 이새의 아들 다윗이 말함이여 높이 세워진 자, 야곱의 하나님께로부터 기름 부음 받은 자, 이스라엘의 노래 잘 하는 자가 말하노라"
  },
  {
    "translation_id": 92,
    "book_number": 10,
    "chapter": 23,
    "verse_start": 7,
    "current_text": "그것들을 만지는 자는 철과 창자루를 가져야 하리니 그것들이 당장에 불살리리로다하니라",
    "corrected_text": "그것들을 만지는 자는 철과 창자루를 가져야 하리니 그것들이 당장에 불살리리로다 하니라"
  },
  {
    "translation_id": 92,
    "book_number": 12,
    "chapter": 4,
    "verse_start": 25,
    "current_text": "드디어 갈멜 산으로 가서 하나님의 사람에게로 나아가니라하나님의 사람이 멀리서 그를 보고 자기 사환 게하시에게 이르되 저기 수넴 여인이 있도다",
    "corrected_text": "드디어 갈멜 산으로 가서 하나님의 사람에게로 나아가니라 하나님의 사람이 멀리서 그를 보고 자기 사환 게하시에게 이르되 저기 수넴 여인이 있도다"
  },
  {
    "translation_id": 92,
    "book_number": 12,
    "chapter": 19,
    "verse_start": 21,
    "current_text": "여호와께서 앗수르 왕에게 대하여 이같이 말씀하시기를처녀 딸 시온이 너를 멸시하며 너를 비웃었으며 딸 예루살렘이 너를 향하여 머리를 흔들었느니라",
    "corrected_text": "여호와께서 앗수르 왕에게 대하여 이같이 말씀하시기를 처녀 딸 시온이 너를 멸시하며 너를 비웃었으며 딸 예루살렘이 너를 향하여 머리를 흔들었느니라"
  },
  {
    "translation_id": 92,
    "book_number": 12,
    "chapter": 19,
    "verse_start": 28,
    "current_text": "네가 내게 향한 분노와 네 교만한 말이 내 귀에 들렸도다 그러므로 내가 갈고리를 네 코에 꿰고 재갈을 네 입에 물려 너를 오던 길로 끌어 돌이키리라하셨나이다",
    "corrected_text": "네가 내게 향한 분노와 네 교만한 말이 내 귀에 들렸도다 그러므로 내가 갈고리를 네 코에 꿰고 재갈을 네 입에 물려 너를 오던 길로 끌어 돌이키리라 하셨나이다"
  },
  {
    "translation_id": 92,
    "book_number": 12,
    "chapter": 24,
    "verse_start": 20,
    "current_text": "여호와께서 예루살렘과 유다를 진노하심이 그들을 그 앞에서 쫓아내실 때까지 이르렀더라시드기야가 바벨론 왕을 배반하니라",
    "corrected_text": "여호와께서 예루살렘과 유다를 진노하심이 그들을 그 앞에서 쫓아내실 때까지 이르렀더라 시드기야가 바벨론 왕을 배반하니라"
  },
  {
    "translation_id": 92,
    "book_number": 13,
    "chapter": 16,
    "verse_start": 36,
    "current_text": "여호와 이스라엘의 하나님을 영원부터 영원까지 송축할지로다하매 모든 백성이 아멘 하고 여호와를 찬양하였더라",
    "corrected_text": "여호와 이스라엘의 하나님을 영원부터 영원까지 송축할지로다 하매 모든 백성이 아멘 하고 여호와를 찬양하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 13,
    "chapter": 29,
    "verse_start": 22,
    "current_text": "이 날에 무리가 크게 기뻐하여 여호와 앞에서 먹으며 마셨더라무리가 다윗의 아들 솔로몬을 다시 왕으로 삼아 기름을 부어 여호와께 돌려 주권자가 되게 하고 사독에게도 기름을 부어 제사장이 되게 하니라",
    "corrected_text": "이 날에 무리가 크게 기뻐하여 여호와 앞에서 먹으며 마셨더라 무리가 다윗의 아들 솔로몬을 다시 왕으로 삼아 기름을 부어 여호와께 돌려 주권자가 되게 하고 사독에게도 기름을 부어 제사장이 되게 하니라"
  },
  {
    "translation_id": 92,
    "book_number": 16,
    "chapter": 1,
    "verse_start": 1,
    "current_text": "하가랴의 아들 느헤미야의 말이라아닥사스다 왕 제이십년 기슬르월에 내가 수산 궁에 있는데",
    "corrected_text": "하가랴의 아들 느헤미야의 말이라 아닥사스다 왕 제이십년 기슬르월에 내가 수산 궁에 있는데"
  },
  {
    "translation_id": 92,
    "book_number": 20,
    "chapter": 10,
    "verse_start": 1,
    "current_text": "솔로몬의 잠언이라지혜로운 아들은 아비를 기쁘게 하거니와 미련한 아들은 어미의 근심이니라",
    "corrected_text": "솔로몬의 잠언이라 지혜로운 아들은 아비를 기쁘게 하거니와 미련한 아들은 어미의 근심이니라"
  },
  {
    "translation_id": 92,
    "book_number": 20,
    "chapter": 24,
    "verse_start": 23,
    "current_text": "이것도 지혜로운 자들의 말씀이라재판할 때에 낯을 보아 주는 것이 옳지 못하니라",
    "corrected_text": "이것도 지혜로운 자들의 말씀이라 재판할 때에 낯을 보아 주는 것이 옳지 못하니라"
  },
  {
    "translation_id": 92,
    "book_number": 22,
    "chapter": 6,
    "verse_start": 13,
    "current_text": "돌아오고 돌아오라 술람미 여자야 돌아오고 돌아오라 우리가 너를 보게 하라너희가 어찌하여 마하나임에서 춤추는 것을 보는 것처럼 술람미 여자를 보려느냐",
    "corrected_text": "돌아오고 돌아오라 술람미 여자야 돌아오고 돌아오라 우리가 너를 보게 하라 너희가 어찌하여 마하나임에서 춤추는 것을 보는 것처럼 술람미 여자를 보려느냐"
  },
  {
    "translation_id": 92,
    "book_number": 22,
    "chapter": 7,
    "verse_start": 9,
    "current_text": "네 입은 좋은 포도주 같을 것이니라이 포도주는 내 사랑하는 자를 위하여 미끄럽게 흘러내려서 자는 자의 입을 움직이게 하느니라",
    "corrected_text": "네 입은 좋은 포도주 같을 것이니라 이 포도주는 내 사랑하는 자를 위하여 미끄럽게 흘러내려서 자는 자의 입을 움직이게 하느니라"
  },
  {
    "translation_id": 92,
    "book_number": 22,
    "chapter": 8,
    "verse_start": 5,
    "current_text": "그의 사랑하는 자를 의지하고 거친 들에서 올라오는 여자가 누구인가너로 말미암아 네 어머니가 고생한 곳 너를 낳은 자가 애쓴 그 곳 사과나무 아래에서 내가 너를 깨웠노라",
    "corrected_text": "그의 사랑하는 자를 의지하고 거친 들에서 올라오는 여자가 누구인가 너로 말미암아 네 어머니가 고생한 곳 너를 낳은 자가 애쓴 그 곳 사과나무 아래에서 내가 너를 깨웠노라"
  },
  {
    "translation_id": 92,
    "book_number": 23,
    "chapter": 15,
    "verse_start": 1,
    "current_text": "모압에 관한 경고라하룻밤에 모압 알이 망하여 황폐할 것이며 하룻밤에 모압 기르가 망하여 황폐할 것이라",
    "corrected_text": "모압에 관한 경고라 하룻밤에 모압 알이 망하여 황폐할 것이며 하룻밤에 모압 기르가 망하여 황폐할 것이라"
  },
  {
    "translation_id": 92,
    "book_number": 23,
    "chapter": 17,
    "verse_start": 1,
    "current_text": "다메섹에 관한 경고라보라 다메섹이 장차 성읍을 이루지 못하고 무너진 무더기가 될 것이라",
    "corrected_text": "다메섹에 관한 경고라 보라 다메섹이 장차 성읍을 이루지 못하고 무너진 무더기가 될 것이라"
  },
  {
    "translation_id": 92,
    "book_number": 23,
    "chapter": 19,
    "verse_start": 1,
    "current_text": "애굽에 관한 경고라보라 여호와께서 빠른 구름을 타고 애굽에 임하시리니 애굽의 우상들이 그 앞에서 떨겠고 애굽인의 마음이 그 속에서 녹으리로다",
    "corrected_text": "애굽에 관한 경고라 보라 여호와께서 빠른 구름을 타고 애굽에 임하시리니 애굽의 우상들이 그 앞에서 떨겠고 애굽인의 마음이 그 속에서 녹으리로다"
  },
  {
    "translation_id": 92,
    "book_number": 23,
    "chapter": 21,
    "verse_start": 1,
    "current_text": "해변 광야에 관한 경고라적병이 광야에서, 두려운 땅에서 네겝 회오리바람 같이 몰려왔도다",
    "corrected_text": "해변 광야에 관한 경고라 적병이 광야에서, 두려운 땅에서 네겝 회오리바람 같이 몰려왔도다"
  },
  {
    "translation_id": 92,
    "book_number": 23,
    "chapter": 21,
    "verse_start": 11,
    "current_text": "두마에 관한 경고라사람이 세일에서 나를 부르되 파수꾼이여 밤이 어떻게 되었느냐 파수꾼이여 밤이 어떻게 되었느냐",
    "corrected_text": "두마에 관한 경고라 사람이 세일에서 나를 부르되 파수꾼이여 밤이 어떻게 되었느냐 파수꾼이여 밤이 어떻게 되었느냐"
  },
  {
    "translation_id": 92,
    "book_number": 23,
    "chapter": 21,
    "verse_start": 13,
    "current_text": "아라비아에 관한 경고라드단 대상들이여 너희가 아라비아 수풀에서 유숙하리라",
    "corrected_text": "아라비아에 관한 경고라 드단 대상들이여 너희가 아라비아 수풀에서 유숙하리라"
  },
  {
    "translation_id": 92,
    "book_number": 23,
    "chapter": 22,
    "verse_start": 1,
    "current_text": "환상의 골짜기에 관한 경고라네가 지붕에 올라감은 어찌함인고",
    "corrected_text": "환상의 골짜기에 관한 경고라 네가 지붕에 올라감은 어찌함인고"
  },
  {
    "translation_id": 92,
    "book_number": 23,
    "chapter": 23,
    "verse_start": 1,
    "current_text": "두로에 관한 경고라다시스의 배들아 너희는 슬피 부르짖을지어다 두로가 황무하여 집이 없고 들어갈 곳도 없음이요 이 소식이 깃딤 땅에서부터 그들에게 전파되었음이라",
    "corrected_text": "두로에 관한 경고라 다시스의 배들아 너희는 슬피 부르짖을지어다 두로가 황무하여 집이 없고 들어갈 곳도 없음이요 이 소식이 깃딤 땅에서부터 그들에게 전파되었음이라"
  },
  {
    "translation_id": 92,
    "book_number": 23,
    "chapter": 30,
    "verse_start": 6,
    "current_text": "네겝 짐승들에 관한 경고라사신들이 그들의 재물을 어린 나귀 등에 싣고 그들의 보물을 낙타 안장에 얹고 암사자와 수사자와 독사와 및 날아다니는 불뱀이 나오는 위험하고 곤고한 땅을 지나 자기에게 무익한 민족에게로 갔으나",
    "corrected_text": "네겝 짐승들에 관한 경고라 사신들이 그들의 재물을 어린 나귀 등에 싣고 그들의 보물을 낙타 안장에 얹고 암사자와 수사자와 독사와 및 날아다니는 불뱀이 나오는 위험하고 곤고한 땅을 지나 자기에게 무익한 민족에게로 갔으나"
  },
  {
    "translation_id": 92,
    "book_number": 23,
    "chapter": 58,
    "verse_start": 9,
    "current_text": "네가 부를 때에는 나 여호와가 응답하겠고 네가 부르짖을 때에는 내가 여기 있다 하리라만일 네가 너희 중에서 멍에와 손가락질과 허망한 말을 제하여 버리고",
    "corrected_text": "네가 부를 때에는 나 여호와가 응답하겠고 네가 부르짖을 때에는 내가 여기 있다 하리라 만일 네가 너희 중에서 멍에와 손가락질과 허망한 말을 제하여 버리고"
  },
  {
    "translation_id": 92,
    "book_number": 23,
    "chapter": 59,
    "verse_start": 15,
    "current_text": "성실이 없어지므로 악을 떠나는 자가 탈취를 당하는도다여호와께서 이를 살피시고 그 정의가 없는 것을 기뻐하지 아니하시고",
    "corrected_text": "성실이 없어지므로 악을 떠나는 자가 탈취를 당하는도다 여호와께서 이를 살피시고 그 정의가 없는 것을 기뻐하지 아니하시고"
  },
  {
    "translation_id": 92,
    "book_number": 24,
    "chapter": 3,
    "verse_start": 22,
    "current_text": "배역한 자식들아 돌아오라 내가 너희의 배역함을 고치리라 하시니라보소서 우리가 주께 왔사오니 주는 우리 하나님 여호와이심이니이다",
    "corrected_text": "배역한 자식들아 돌아오라 내가 너희의 배역함을 고치리라 하시니라 보소서 우리가 주께 왔사오니 주는 우리 하나님 여호와이심이니이다"
  },
  {
    "translation_id": 92,
    "book_number": 24,
    "chapter": 23,
    "verse_start": 9,
    "current_text": "선지자들에 대한 말씀이라내 마음이 상하며 내 모든 뼈가 떨리며 내가 취한 사람 같으며 포도주에 잡힌 사람 같으니 이는 여호와와 그 거룩한 말씀 때문이라",
    "corrected_text": "선지자들에 대한 말씀이라 내 마음이 상하며 내 모든 뼈가 떨리며 내가 취한 사람 같으며 포도주에 잡힌 사람 같으니 이는 여호와와 그 거룩한 말씀 때문이라"
  },
  {
    "translation_id": 92,
    "book_number": 24,
    "chapter": 52,
    "verse_start": 3,
    "current_text": "여호와께서 예루살렘과 유다에게 진노하심이 그들을 자기 앞에서 쫓아내시기까지 이르렀더라시드기야가 바벨론 왕을 배반하니라",
    "corrected_text": "여호와께서 예루살렘과 유다에게 진노하심이 그들을 자기 앞에서 쫓아내시기까지 이르렀더라 시드기야가 바벨론 왕을 배반하니라"
  },
  {
    "translation_id": 92,
    "book_number": 31,
    "chapter": 1,
    "verse_start": 1,
    "current_text": "오바댜의 묵시라주 여호와께서 에돔에 대하여 이와 같이 말씀하시니라 우리가 여호와께로 말미암아 소식을 들었나니 곧 사자가 나라들 가운데에 보내심을 받고 이르기를 너희는 일어날지어다 우리가 일어나서 그와 싸우자 하는 것이니라",
    "corrected_text": "오바댜의 묵시라 주 여호와께서 에돔에 대하여 이와 같이 말씀하시니라 우리가 여호와께로 말미암아 소식을 들었나니 곧 사자가 나라들 가운데에 보내심을 받고 이르기를 너희는 일어날지어다 우리가 일어나서 그와 싸우자 하는 것이니라"
  },
  {
    "translation_id": 92,
    "book_number": 32,
    "chapter": 2,
    "verse_start": 2,
    "current_text": "이르되내가 받는 고난으로 말미암아 여호와께 불러 아뢰었더니 주께서 내게 대답하셨고 내가 스올의 뱃속에서 부르짖었더니 주께서 내 음성을 들으셨나이다",
    "corrected_text": "이르되 내가 받는 고난으로 말미암아 여호와께 불러 아뢰었더니 주께서 내게 대답하셨고 내가 스올의 뱃속에서 부르짖었더니 주께서 내 음성을 들으셨나이다"
  },
  {
    "translation_id": 92,
    "book_number": 32,
    "chapter": 2,
    "verse_start": 9,
    "current_text": "나는 감사하는 목소리로 주께 제사를 드리며 나의 서원을 주께 갚겠나이다 구원은 여호와께 속하였나이다하니라",
    "corrected_text": "나는 감사하는 목소리로 주께 제사를 드리며 나의 서원을 주께 갚겠나이다 구원은 여호와께 속하였나이다 하니라"
  },
  {
    "translation_id": 92,
    "book_number": 35,
    "chapter": 3,
    "verse_start": 19,
    "current_text": "주 여호와는 나의 힘이시라 나의 발을 사슴과 같게 하사 나를 나의 높은 곳으로 다니게 하시리로다이 노래는 지휘하는 사람을 위하여 내 수금에 맞춘 것이니라",
    "corrected_text": "주 여호와는 나의 힘이시라 나의 발을 사슴과 같게 하사 나를 나의 높은 곳으로 다니게 하시리로다 이 노래는 지휘하는 사람을 위하여 내 수금에 맞춘 것이니라"
  },
  {
    "translation_id": 92,
    "book_number": 38,
    "chapter": 12,
    "verse_start": 1,
    "current_text": "이스라엘에 관한 여호와의 경고의 말씀이라여호와 곧 하늘을 펴시며 땅의 터를 세우시며 사람 안에 심령을 지으신 이가 이르시되",
    "corrected_text": "이스라엘에 관한 여호와의 경고의 말씀이라 여호와 곧 하늘을 펴시며 땅의 터를 세우시며 사람 안에 심령을 지으신 이가 이르시되"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 1,
    "verse_start": 6,
    "current_text": "이새는 다윗 왕을 낳으니라다윗은 우리야의 아내에게서 솔로몬을 낳고",
    "corrected_text": "이새는 다윗 왕을 낳으니라 다윗은 우리야의 아내에게서 솔로몬을 낳고"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 1,
    "verse_start": 23,
    "current_text": "보라 처녀가 잉태하여 아들을 낳을 것이요 그의 이름은 임마누엘이라 하리라하셨으니 이를 번역한즉 하나님이 우리와 함께 계시다 함이라",
    "corrected_text": "보라 처녀가 잉태하여 아들을 낳을 것이요 그의 이름은 임마누엘이라 하리라 하셨으니 이를 번역한즉 하나님이 우리와 함께 계시다 함이라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 2,
    "verse_start": 6,
    "current_text": "또 유대 땅 베들레헴아 너는 유대 고을 중에서 가장 작지 아니하도다 네게서 한 다스리는 자가 나와서 내 백성 이스라엘의 목자가 되리라하였음이니이다",
    "corrected_text": "또 유대 땅 베들레헴아 너는 유대 고을 중에서 가장 작지 아니하도다 네게서 한 다스리는 자가 나와서 내 백성 이스라엘의 목자가 되리라 하였음이니이다"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 2,
    "verse_start": 15,
    "current_text": "헤롯이 죽기까지 거기 있었으니 이는 주께서 선지자를 통하여 말씀하신 바애굽으로부터 내 아들을 불렀다함을 이루려 하심이라",
    "corrected_text": "헤롯이 죽기까지 거기 있었으니 이는 주께서 선지자를 통하여 말씀하신 바 애굽으로부터 내 아들을 불렀다 함을 이루려 하심이라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 2,
    "verse_start": 18,
    "current_text": "라마에서 슬퍼하며 크게 통곡하는 소리가 들리니 라헬이 그 자식을 위하여 애곡하는 것이라 그가 자식이 없으므로 위로 받기를 거절하였도다함이 이루어졌느니라",
    "corrected_text": "라마에서 슬퍼하며 크게 통곡하는 소리가 들리니 라헬이 그 자식을 위하여 애곡하는 것이라 그가 자식이 없으므로 위로 받기를 거절하였도다 함이 이루어졌느니라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 3,
    "verse_start": 3,
    "current_text": "그는 선지자 이사야를 통하여 말씀하신 자라 일렀으되광야에 외치는 자의 소리가 있어 이르되 너희는 주의 길을 준비하라 그가 오실 길을 곧게 하라하였느니라",
    "corrected_text": "그는 선지자 이사야를 통하여 말씀하신 자라 일렀으되 광야에 외치는 자의 소리가 있어 이르되 너희는 주의 길을 준비하라 그가 오실 길을 곧게 하라 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 4,
    "verse_start": 4,
    "current_text": "예수께서 대답하여 이르시되 기록되었으되사람이 떡으로만 살 것이 아니요 하나님의 입으로부터 나오는 모든 말씀으로 살 것이라하였느니라 하시니",
    "corrected_text": "예수께서 대답하여 이르시되 기록되었으되 사람이 떡으로만 살 것이 아니요 하나님의 입으로부터 나오는 모든 말씀으로 살 것이라 하였느니라 하시니"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 4,
    "verse_start": 6,
    "current_text": "이르되 네가 만일 하나님의 아들이어든 뛰어내리라 기록되었으되그가 너를 위하여 그의 사자들을 명하시리니 그들이 손으로 너를 받들어 발이 돌에 부딪치지 않게 하리로다하였느니라",
    "corrected_text": "이르되 네가 만일 하나님의 아들이어든 뛰어내리라 기록되었으되 그가 너를 위하여 그의 사자들을 명하시리니 그들이 손으로 너를 받들어 발이 돌에 부딪치지 않게 하리로다 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 4,
    "verse_start": 16,
    "current_text": "흑암에 앉은 백성이 큰 빛을 보았고 사망의 땅과 그늘에 앉은 자들에게 빛이 비치었도다하였느니라",
    "corrected_text": "흑암에 앉은 백성이 큰 빛을 보았고 사망의 땅과 그늘에 앉은 자들에게 빛이 비치었도다 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 8,
    "verse_start": 17,
    "current_text": "이는 선지자 이사야를 통하여 하신 말씀에우리의 연약한 것을 친히 담당하시고 병을 짊어지셨도다함을 이루려 하심이더라",
    "corrected_text": "이는 선지자 이사야를 통하여 하신 말씀에 우리의 연약한 것을 친히 담당하시고 병을 짊어지셨도다 함을 이루려 하심이더라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 11,
    "verse_start": 10,
    "current_text": "기록된 바보라 내가 내 사자를 네 앞에 보내노니 그가 네 길을 네 앞에 준비하리라하신 것이 이 사람에 대한 말씀이니라",
    "corrected_text": "기록된 바 보라 내가 내 사자를 네 앞에 보내노니 그가 네 길을 네 앞에 준비하리라 하신 것이 이 사람에 대한 말씀이니라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 12,
    "verse_start": 21,
    "current_text": "또한 이방들이 그의 이름을 바라리라함을 이루려 하심이니라",
    "corrected_text": "또한 이방들이 그의 이름을 바라리라 함을 이루려 하심이니라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 13,
    "verse_start": 14,
    "current_text": "이사야의 예언이 그들에게 이루어졌으니 일렀으되너희가 듣기는 들어도 깨닫지 못할 것이요 보기는 보아도 알지 못하리라",
    "corrected_text": "이사야의 예언이 그들에게 이루어졌으니 일렀으되 너희가 듣기는 들어도 깨닫지 못할 것이요 보기는 보아도 알지 못하리라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 13,
    "verse_start": 15,
    "current_text": "이 백성들의 마음이 완악하여져서 그 귀는 듣기에 둔하고 눈은 감았으니 이는 눈으로 보고 귀로 듣고 마음으로 깨달아 돌이켜 내게 고침을 받을까 두려워함이라하였느니라",
    "corrected_text": "이 백성들의 마음이 완악하여져서 그 귀는 듣기에 둔하고 눈은 감았으니 이는 눈으로 보고 귀로 듣고 마음으로 깨달아 돌이켜 내게 고침을 받을까 두려워함이라 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 13,
    "verse_start": 35,
    "current_text": "이는 선지자를 통하여 말씀하신 바내가 입을 열어 비유로 말하고 창세부터 감추인 것들을 드러내리라함을 이루려 하심이라",
    "corrected_text": "이는 선지자를 통하여 말씀하신 바 내가 입을 열어 비유로 말하고 창세부터 감추인 것들을 드러내리라 함을 이루려 하심이라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 15,
    "verse_start": 9,
    "current_text": "사람의 계명으로 교훈을 삼아 가르치니 나를 헛되이 경배하는도다하였느니라 하시고",
    "corrected_text": "사람의 계명으로 교훈을 삼아 가르치니 나를 헛되이 경배하는도다 하였느니라 하시고"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 21,
    "verse_start": 5,
    "current_text": "시온 딸에게 이르기를 네 왕이 네게 임하나니 그는 겸손하여 나귀, 곧 멍에 메는 짐승의 새끼를 탔도다 하라하였느니라",
    "corrected_text": "시온 딸에게 이르기를 네 왕이 네게 임하나니 그는 겸손하여 나귀, 곧 멍에 메는 짐승의 새끼를 탔도다 하라 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 21,
    "verse_start": 42,
    "current_text": "예수께서 이르시되 너희가 성경에건축자들이 버린 돌이 모퉁이의 머릿돌이 되었나니 이것은 주로 말미암아 된 것이요 우리 눈에 기이하도다함을 읽어 본 일이 없느냐",
    "corrected_text": "예수께서 이르시되 너희가 성경에 건축자들이 버린 돌이 모퉁이의 머릿돌이 되었나니 이것은 주로 말미암아 된 것이요 우리 눈에 기이하도다 함을 읽어 본 일이 없느냐"
  },
  {
    "translation_id": 92,
    "book_number": 40,
    "chapter": 22,
    "verse_start": 44,
    "current_text": "주께서 내 주께 이르시되 내가 네 원수를 네 발 아래에 둘 때까지 내 우편에 앉아 있으라 하셨도다하였느냐",
    "corrected_text": "주께서 내 주께 이르시되 내가 네 원수를 네 발 아래에 둘 때까지 내 우편에 앉아 있으라 하셨도다 하였느냐"
  },
  {
    "translation_id": 92,
    "book_number": 41,
    "chapter": 1,
    "verse_start": 2,
    "current_text": "선지자 이사야의 글에보라 내가 내 사자를 네 앞에 보내노니 그가 네 길을 준비하리라",
    "corrected_text": "선지자 이사야의 글에 보라 내가 내 사자를 네 앞에 보내노니 그가 네 길을 준비하리라"
  },
  {
    "translation_id": 92,
    "book_number": 41,
    "chapter": 1,
    "verse_start": 3,
    "current_text": "광야에 외치는 자의 소리가 있어 이르되 너희는 주의 길을 준비하라 그의 오실 길을 곧게 하라기록된 것과 같이",
    "corrected_text": "광야에 외치는 자의 소리가 있어 이르되 너희는 주의 길을 준비하라 그의 오실 길을 곧게 하라 기록된 것과 같이"
  },
  {
    "translation_id": 92,
    "book_number": 41,
    "chapter": 6,
    "verse_start": 6,
    "current_text": "그들이 믿지 않음을 이상히 여기셨더라이에 모든 촌에 두루 다니시며 가르치시더라",
    "corrected_text": "그들이 믿지 않음을 이상히 여기셨더라 이에 모든 촌에 두루 다니시며 가르치시더라"
  },
  {
    "translation_id": 92,
    "book_number": 41,
    "chapter": 7,
    "verse_start": 6,
    "current_text": "이르시되 이사야가 너희 외식하는 자에 대하여 잘 예언하였도다 기록하였으되이 백성이 입술로는 나를 공경하되 마음은 내게서 멀도다",
    "corrected_text": "이르시되 이사야가 너희 외식하는 자에 대하여 잘 예언하였도다 기록하였으되 이 백성이 입술로는 나를 공경하되 마음은 내게서 멀도다"
  },
  {
    "translation_id": 92,
    "book_number": 41,
    "chapter": 7,
    "verse_start": 7,
    "current_text": "사람의 계명으로 교훈을 삼아 가르치니 나를 헛되이 경배하는도다하였느니라",
    "corrected_text": "사람의 계명으로 교훈을 삼아 가르치니 나를 헛되이 경배하는도다 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 41,
    "chapter": 12,
    "verse_start": 10,
    "current_text": "너희가 성경에건축자들이 버린 돌이 모퉁이의 머릿돌이 되었나니",
    "corrected_text": "너희가 성경에 건축자들이 버린 돌이 모퉁이의 머릿돌이 되었나니"
  },
  {
    "translation_id": 92,
    "book_number": 41,
    "chapter": 12,
    "verse_start": 11,
    "current_text": "이것은 주로 말미암아 된 것이요 우리 눈에 놀랍도다함을 읽어 보지도 못하였느냐 하시니라",
    "corrected_text": "이것은 주로 말미암아 된 것이요 우리 눈에 놀랍도다 함을 읽어 보지도 못하였느냐 하시니라"
  },
  {
    "translation_id": 92,
    "book_number": 41,
    "chapter": 12,
    "verse_start": 36,
    "current_text": "다윗이 성령에 감동되어 친히 말하되주께서 내 주께 이르시되 내가 네 원수를 네 발 아래에 둘 때까지 내 우편에 앉았으라 하셨도다하였느니라",
    "corrected_text": "다윗이 성령에 감동되어 친히 말하되 주께서 내 주께 이르시되 내가 네 원수를 네 발 아래에 둘 때까지 내 우편에 앉았으라 하셨도다 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 1,
    "verse_start": 46,
    "current_text": "마리아가 이르되내 영혼이 주를 찬양하며",
    "corrected_text": "마리아가 이르되 내 영혼이 주를 찬양하며"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 1,
    "verse_start": 55,
    "current_text": "우리 조상에게 말씀하신 것과 같이 아브라함과 그 자손에게 영원히 하시리로다하니라",
    "corrected_text": "우리 조상에게 말씀하신 것과 같이 아브라함과 그 자손에게 영원히 하시리로다 하니라"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 1,
    "verse_start": 79,
    "current_text": "어둠과 죽음의 그늘에 앉은 자에게 비치고 우리 발을 평강의 길로 인도하시리로다하니라",
    "corrected_text": "어둠과 죽음의 그늘에 앉은 자에게 비치고 우리 발을 평강의 길로 인도하시리로다 하니라"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 2,
    "verse_start": 14,
    "current_text": "지극히 높은 곳에서는 하나님께 영광이요 땅에서는 하나님이 기뻐하신 사람들 중에 평화로다하니라",
    "corrected_text": "지극히 높은 곳에서는 하나님께 영광이요 땅에서는 하나님이 기뻐하신 사람들 중에 평화로다 하니라"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 2,
    "verse_start": 32,
    "current_text": "이방을 비추는 빛이요 주의 백성 이스라엘의 영광이니이다하니",
    "corrected_text": "이방을 비추는 빛이요 주의 백성 이스라엘의 영광이니이다 하니"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 3,
    "verse_start": 4,
    "current_text": "선지자 이사야의 책에 쓴 바광야에서 외치는 자의 소리가 있어 이르되 너희는 주의 길을 준비하라 그의 오실 길을 곧게 하라",
    "corrected_text": "선지자 이사야의 책에 쓴 바 광야에서 외치는 자의 소리가 있어 이르되 너희는 주의 길을 준비하라 그의 오실 길을 곧게 하라"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 3,
    "verse_start": 6,
    "current_text": "모든 육체가 하나님의 구원하심을 보리라함과 같으니라",
    "corrected_text": "모든 육체가 하나님의 구원하심을 보리라 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 4,
    "verse_start": 10,
    "current_text": "기록되었으되하나님이 너를 위하여 그 사자들을 명하사 너를 지키게 하시리라하였고",
    "corrected_text": "기록되었으되 하나님이 너를 위하여 그 사자들을 명하사 너를 지키게 하시리라 하였고"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 4,
    "verse_start": 11,
    "current_text": "또한그들이 손으로 너를 받들어 네 발이 돌에 부딪치지 않게 하시리라하였느니라",
    "corrected_text": "또한 그들이 손으로 너를 받들어 네 발이 돌에 부딪치지 않게 하시리라 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 4,
    "verse_start": 19,
    "current_text": "주의 은혜의 해를 전파하게 하려 하심이라하였더라",
    "corrected_text": "주의 은혜의 해를 전파하게 하려 하심이라 하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 7,
    "verse_start": 27,
    "current_text": "기록된 바보라 내가 내 사자를 네 앞에 보내노니 그가 네 앞에서 네 길을 준비하리라한 것이 이 사람에 대한 말씀이라",
    "corrected_text": "기록된 바 보라 내가 내 사자를 네 앞에 보내노니 그가 네 앞에서 네 길을 준비하리라 한 것이 이 사람에 대한 말씀이라"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 8,
    "verse_start": 42,
    "current_text": "이는 자기에게 열두 살 된 외딸이 있어 죽어감이러라예수께서 가실 때에 무리가 밀려들더라",
    "corrected_text": "이는 자기에게 열두 살 된 외딸이 있어 죽어감이러라 예수께서 가실 때에 무리가 밀려들더라"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 9,
    "verse_start": 43,
    "current_text": "사람들이 다 하나님의 위엄에 놀라니라그들이 다 그 행하시는 모든 일을 놀랍게 여길새 예수께서 제자들에게 이르시되",
    "corrected_text": "사람들이 다 하나님의 위엄에 놀라니라 그들이 다 그 행하시는 모든 일을 놀랍게 여길새 예수께서 제자들에게 이르시되"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 20,
    "verse_start": 17,
    "current_text": "그들을 보시며 이르시되 그러면 기록된 바건축자들의 버린 돌이 모퉁이의 머릿돌이 되었느니라함이 어찜이냐",
    "corrected_text": "그들을 보시며 이르시되 그러면 기록된 바 건축자들의 버린 돌이 모퉁이의 머릿돌이 되었느니라 함이 어찜이냐"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 20,
    "verse_start": 42,
    "current_text": "시편에 다윗이 친히 말하였으되주께서 내 주께 이르시되",
    "corrected_text": "시편에 다윗이 친히 말하였으되 주께서 내 주께 이르시되"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 20,
    "verse_start": 43,
    "current_text": "내가 네 원수를 네 발등상으로 삼을 때까지 내 우편에 앉았으라 하셨도다하였느니라",
    "corrected_text": "내가 네 원수를 네 발등상으로 삼을 때까지 내 우편에 앉았으라 하셨도다 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 42,
    "chapter": 23,
    "verse_start": 56,
    "current_text": "돌아가 향품과 향유를 준비하더라계명을 따라 안식일에 쉬더라",
    "corrected_text": "돌아가 향품과 향유를 준비하더라 계명을 따라 안식일에 쉬더라"
  },
  {
    "translation_id": 92,
    "book_number": 43,
    "chapter": 5,
    "verse_start": 9,
    "current_text": "그 사람이 곧 나아서 자리를 들고 걸어가니라이 날은 안식일이니",
    "corrected_text": "그 사람이 곧 나아서 자리를 들고 걸어가니라 이 날은 안식일이니"
  },
  {
    "translation_id": 92,
    "book_number": 43,
    "chapter": 12,
    "verse_start": 36,
    "current_text": "너희에게 아직 빛이 있을 동안에 빛을 믿으라 그리하면 빛의 아들이 되리라예수께서 이 말씀을 하시고 그들을 떠나가서 숨으시니라",
    "corrected_text": "너희에게 아직 빛이 있을 동안에 빛을 믿으라 그리하면 빛의 아들이 되리라 예수께서 이 말씀을 하시고 그들을 떠나가서 숨으시니라"
  },
  {
    "translation_id": 92,
    "book_number": 43,
    "chapter": 12,
    "verse_start": 38,
    "current_text": "이는 선지자 이사야의 말씀을 이루려 하심이라 이르되주여 우리에게서 들은 바를 누가 믿었으며 주의 팔이 누구에게 나타났나이까하였더라",
    "corrected_text": "이는 선지자 이사야의 말씀을 이루려 하심이라 이르되 주여 우리에게서 들은 바를 누가 믿었으며 주의 팔이 누구에게 나타났나이까 하였더라"
  },
  {
    "translation_id": 92,
    "book_number": 43,
    "chapter": 12,
    "verse_start": 40,
    "current_text": "그들의 눈을 멀게 하시고 그들의 마음을 완고하게 하셨으니 이는 그들로 하여금 눈으로 보고 마음으로 깨닫고 돌이켜 내게 고침을 받지 못하게 하려 함이라하였음이더라",
    "corrected_text": "그들의 눈을 멀게 하시고 그들의 마음을 완고하게 하셨으니 이는 그들로 하여금 눈으로 보고 마음으로 깨닫고 돌이켜 내게 고침을 받지 못하게 하려 함이라 하였음이더라"
  },
  {
    "translation_id": 92,
    "book_number": 43,
    "chapter": 18,
    "verse_start": 38,
    "current_text": "빌라도가 이르되 진리가 무엇이냐 하더라이 말을 하고 다시 유대인들에게 나가서 이르되 나는 그에게서 아무 죄도 찾지 못하였노라",
    "corrected_text": "빌라도가 이르되 진리가 무엇이냐 하더라 이 말을 하고 다시 유대인들에게 나가서 이르되 나는 그에게서 아무 죄도 찾지 못하였노라"
  },
  {
    "translation_id": 92,
    "book_number": 43,
    "chapter": 19,
    "verse_start": 24,
    "current_text": "군인들이 서로 말하되 이것을 찢지 말고 누가 얻나 제비 뽑자 하니 이는 성경에그들이 내 옷을 나누고 내 옷을 제비 뽑나이다한 것을 응하게 하려 함이러라 군인들은 이런 일을 하고",
    "corrected_text": "군인들이 서로 말하되 이것을 찢지 말고 누가 얻나 제비 뽑자 하니 이는 성경에 그들이 내 옷을 나누고 내 옷을 제비 뽑나이다 한 것을 응하게 하려 함이러라 군인들은 이런 일을 하고"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 1,
    "verse_start": 20,
    "current_text": "시편에 기록하였으되그의 거처를 황폐하게 하시며 거기 거하는 자가 없게 하소서하였고 또 일렀으되그의 직분을 타인이 취하게 하소서하였도다",
    "corrected_text": "시편에 기록하였으되 그의 거처를 황폐하게 하시며 거기 거하는 자가 없게 하소서 하였고 또 일렀으되 그의 직분을 타인이 취하게 하소서 하였도다"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 2,
    "verse_start": 21,
    "current_text": "누구든지 주의 이름을 부르는 자는 구원을 받으리라하였느니라",
    "corrected_text": "누구든지 주의 이름을 부르는 자는 구원을 받으리라 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 2,
    "verse_start": 25,
    "current_text": "다윗이 그를 가리켜 이르되내가 항상 내 앞에 계신 주를 뵈었음이여 나로 요동하지 않게 하기 위하여 그가 내 우편에 계시도다",
    "corrected_text": "다윗이 그를 가리켜 이르되 내가 항상 내 앞에 계신 주를 뵈었음이여 나로 요동하지 않게 하기 위하여 그가 내 우편에 계시도다"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 2,
    "verse_start": 28,
    "current_text": "주께서 생명의 길을 내게 보이셨으니 주 앞에서 내게 기쁨이 충만하게 하시리로다하였으므로",
    "corrected_text": "주께서 생명의 길을 내게 보이셨으니 주 앞에서 내게 기쁨이 충만하게 하시리로다 하였으므로"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 2,
    "verse_start": 34,
    "current_text": "다윗은 하늘에 올라가지 못하였으나 친히 말하여 이르되주께서 내 주에게 말씀하시기를",
    "corrected_text": "다윗은 하늘에 올라가지 못하였으나 친히 말하여 이르되 주께서 내 주에게 말씀하시기를"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 2,
    "verse_start": 35,
    "current_text": "내가 네 원수로 네 발등상이 되게 하기까지 너는 내 우편에 앉아 있으라 하셨도다하였으니",
    "corrected_text": "내가 네 원수로 네 발등상이 되게 하기까지 너는 내 우편에 앉아 있으라 하셨도다 하였으니"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 4,
    "verse_start": 25,
    "current_text": "또 주의 종 우리 조상 다윗의 입을 통하여 성령으로 말씀하시기를어찌하여 열방이 분노하며 족속들이 허사를 경영하였는고",
    "corrected_text": "또 주의 종 우리 조상 다윗의 입을 통하여 성령으로 말씀하시기를 어찌하여 열방이 분노하며 족속들이 허사를 경영하였는고"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 4,
    "verse_start": 26,
    "current_text": "세상의 군왕들이 나서며 관리들이 함께 모여 주와 그의 그리스도를 대적하도다하신 이로소이다",
    "corrected_text": "세상의 군왕들이 나서며 관리들이 함께 모여 주와 그의 그리스도를 대적하도다 하신 이로소이다"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 7,
    "verse_start": 2,
    "current_text": "스데반이 이르되여러분 부형들이여 들으소서 우리 조상 아브라함이 하란에 있기 전 메소보다미아에 있을 때에 영광의 하나님이 그에게 보여",
    "corrected_text": "스데반이 이르되 여러분 부형들이여 들으소서 우리 조상 아브라함이 하란에 있기 전 메소보다미아에 있을 때에 영광의 하나님이 그에게 보여"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 7,
    "verse_start": 42,
    "current_text": "하나님이 외면하사 그들을 그 하늘의 군대 섬기는 일에 버려 두셨으니 이는 선지자의 책에 기록된 바이스라엘의 집이여 너희가 광야에서 사십 년간 희생과 제물을 내게 드린 일이 있었느냐",
    "corrected_text": "하나님이 외면하사 그들을 그 하늘의 군대 섬기는 일에 버려 두셨으니 이는 선지자의 책에 기록된 바 이스라엘의 집이여 너희가 광야에서 사십 년간 희생과 제물을 내게 드린 일이 있었느냐"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 7,
    "verse_start": 43,
    "current_text": "몰록의 장막과 신 레판의 별을 받들었음이여 이것은 너희가 절하고자 하여 만든 형상이로다 내가 너희를 바벨론 밖으로 옮기리라함과 같으니라",
    "corrected_text": "몰록의 장막과 신 레판의 별을 받들었음이여 이것은 너희가 절하고자 하여 만든 형상이로다 내가 너희를 바벨론 밖으로 옮기리라 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 7,
    "verse_start": 50,
    "current_text": "이 모든 것이 다 내 손으로 지은 것이 아니냐함과 같으니라",
    "corrected_text": "이 모든 것이 다 내 손으로 지은 것이 아니냐 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 8,
    "verse_start": 1,
    "current_text": "사울은 그가 죽임 당함을 마땅히 여기더라그 날에 예루살렘에 있는 교회에 큰 박해가 있어 사도 외에는 다 유대와 사마리아 모든 땅으로 흩어지니라",
    "corrected_text": "사울은 그가 죽임 당함을 마땅히 여기더라 그 날에 예루살렘에 있는 교회에 큰 박해가 있어 사도 외에는 다 유대와 사마리아 모든 땅으로 흩어지니라"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 8,
    "verse_start": 32,
    "current_text": "읽는 성경 구절은 이것이니 일렀으되그가 도살자에게로 가는 양과 같이 끌려갔고 털 깎는 자 앞에 있는 어린 양이 조용함과 같이 그의 입을 열지 아니하였도다",
    "corrected_text": "읽는 성경 구절은 이것이니 일렀으되 그가 도살자에게로 가는 양과 같이 끌려갔고 털 깎는 자 앞에 있는 어린 양이 조용함과 같이 그의 입을 열지 아니하였도다"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 8,
    "verse_start": 33,
    "current_text": "그가 굴욕을 당했을 때 공정한 재판도 받지 못하였으니 누가 그의 세대를 말하리요 그의 생명이 땅에서 빼앗김이로다하였거늘",
    "corrected_text": "그가 굴욕을 당했을 때 공정한 재판도 받지 못하였으니 누가 그의 세대를 말하리요 그의 생명이 땅에서 빼앗김이로다 하였거늘"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 9,
    "verse_start": 19,
    "current_text": "음식을 먹으매 강건하여지니라사울이 다메섹에 있는 제자들과 함께 며칠 있을새",
    "corrected_text": "음식을 먹으매 강건하여지니라 사울이 다메섹에 있는 제자들과 함께 며칠 있을새"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 10,
    "verse_start": 23,
    "current_text": "베드로가 불러 들여 유숙하게 하니라이튿날 일어나 그들과 함께 갈새 욥바에서 온 어떤 형제들도 함께 가니라",
    "corrected_text": "베드로가 불러 들여 유숙하게 하니라 이튿날 일어나 그들과 함께 갈새 욥바에서 온 어떤 형제들도 함께 가니라"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 13,
    "verse_start": 41,
    "current_text": "일렀으되보라 멸시하는 사람들아 너희는 놀라고 멸망하라 내가 너희 때를 당하여 한 일을 행할 것이니 사람이 너희에게 일러줄지라도 도무지 믿지 못할 일이라하였느니라 하니라",
    "corrected_text": "일렀으되 보라 멸시하는 사람들아 너희는 놀라고 멸망하라 내가 너희 때를 당하여 한 일을 행할 것이니 사람이 너희에게 일러줄지라도 도무지 믿지 못할 일이라 하였느니라 하니라"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 13,
    "verse_start": 47,
    "current_text": "주께서 이같이 우리에게 명하시되내가 너를 이방의 빛으로 삼아 너로 땅 끝까지 구원하게 하리라하셨느니라 하니",
    "corrected_text": "주께서 이같이 우리에게 명하시되 내가 너를 이방의 빛으로 삼아 너로 땅 끝까지 구원하게 하리라 하셨느니라 하니"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 15,
    "verse_start": 18,
    "current_text": "즉 예로부터 이것을 알게 하시는 주의 말씀이라함과 같으니라",
    "corrected_text": "즉 예로부터 이것을 알게 하시는 주의 말씀이라 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 28,
    "verse_start": 26,
    "current_text": "일렀으되이 백성에게 가서 말하기를 너희가 듣기는 들어도 도무지 깨닫지 못하며 보기는 보아도 도무지 알지 못하는도다",
    "corrected_text": "일렀으되 이 백성에게 가서 말하기를 너희가 듣기는 들어도 도무지 깨닫지 못하며 보기는 보아도 도무지 알지 못하는도다"
  },
  {
    "translation_id": 92,
    "book_number": 44,
    "chapter": 28,
    "verse_start": 27,
    "current_text": "이 백성들의 마음이 우둔하여져서 그 귀로는 둔하게 듣고 그 눈은 감았으니 이는 눈으로 보고 귀로 듣고 마음으로 깨달아 돌아오면 내가 고쳐 줄까 함이라하였으니",
    "corrected_text": "이 백성들의 마음이 우둔하여져서 그 귀로는 둔하게 듣고 그 눈은 감았으니 이는 눈으로 보고 귀로 듣고 마음으로 깨달아 돌아오면 내가 고쳐 줄까 함이라 하였으니"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 3,
    "verse_start": 4,
    "current_text": "그럴 수 없느니라 사람은 다 거짓되되 오직 하나님은 참되시다 할지어다 기록된 바주께서 주의 말씀에 의롭다 함을 얻으시고 판단 받으실 때에 이기려 하심이라함과 같으니라",
    "corrected_text": "그럴 수 없느니라 사람은 다 거짓되되 오직 하나님은 참되시다 할지어다 기록된 바 주께서 주의 말씀에 의롭다 함을 얻으시고 판단 받으실 때에 이기려 하심이라 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 3,
    "verse_start": 10,
    "current_text": "기록된 바의인은 없나니 하나도 없으며",
    "corrected_text": "기록된 바 의인은 없나니 하나도 없으며"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 3,
    "verse_start": 18,
    "current_text": "그들의 눈 앞에 하나님을 두려워함이 없느니라함과 같으니라",
    "corrected_text": "그들의 눈 앞에 하나님을 두려워함이 없느니라 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 4,
    "verse_start": 8,
    "current_text": "주께서 그 죄를 인정하지 아니하실 사람은 복이 있도다함과 같으니라",
    "corrected_text": "주께서 그 죄를 인정하지 아니하실 사람은 복이 있도다 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 8,
    "verse_start": 36,
    "current_text": "기록된 바우리가 종일 주를 위하여 죽임을 당하게 되며 도살 당할 양 같이 여김을 받았나이다함과 같으니라",
    "corrected_text": "기록된 바 우리가 종일 주를 위하여 죽임을 당하게 되며 도살 당할 양 같이 여김을 받았나이다 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 9,
    "verse_start": 25,
    "current_text": "호세아의 글에도 이르기를내가 내 백성 아닌 자를 내 백성이라, 사랑하지 아니한 자를 사랑한 자라 부르리라",
    "corrected_text": "호세아의 글에도 이르기를 내가 내 백성 아닌 자를 내 백성이라, 사랑하지 아니한 자를 사랑한 자라 부르리라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 9,
    "verse_start": 26,
    "current_text": "너희는 내 백성이 아니라 한 그 곳에서 그들이 살아 계신 하나님의 아들이라 일컬음을 받으리라함과 같으니라",
    "corrected_text": "너희는 내 백성이 아니라 한 그 곳에서 그들이 살아 계신 하나님의 아들이라 일컬음을 받으리라 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 9,
    "verse_start": 29,
    "current_text": "또한 이사야가 미리 말한 바만일 만군의 주께서 우리에게 씨를 남겨 두지 아니하셨더라면 우리가 소돔과 같이 되고 고모라와 같았으리로다함과 같으니라",
    "corrected_text": "또한 이사야가 미리 말한 바 만일 만군의 주께서 우리에게 씨를 남겨 두지 아니하셨더라면 우리가 소돔과 같이 되고 고모라와 같았으리로다 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 9,
    "verse_start": 33,
    "current_text": "기록된 바보라 내가 걸림돌과 거치는 바위를 시온에 두노니 그를 믿는 자는 부끄러움을 당하지 아니하리라함과 같으니라",
    "corrected_text": "기록된 바 보라 내가 걸림돌과 거치는 바위를 시온에 두노니 그를 믿는 자는 부끄러움을 당하지 아니하리라 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 10,
    "verse_start": 18,
    "current_text": "그러나 내가 말하노니 그들이 듣지 아니하였느냐 그렇지 아니하니그 소리가 온 땅에 퍼졌고 그 말씀이 땅 끝까지 이르렀도다하였느니라",
    "corrected_text": "그러나 내가 말하노니 그들이 듣지 아니하였느냐 그렇지 아니하니 그 소리가 온 땅에 퍼졌고 그 말씀이 땅 끝까지 이르렀도다 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 10,
    "verse_start": 19,
    "current_text": "그러나 내가 말하노니 이스라엘이 알지 못하였느냐 먼저 모세가 이르되내가 백성 아닌 자로써 너희를 시기하게 하며 미련한 백성으로써 너희를 노엽게 하리라하였고",
    "corrected_text": "그러나 내가 말하노니 이스라엘이 알지 못하였느냐 먼저 모세가 이르되 내가 백성 아닌 자로써 너희를 시기하게 하며 미련한 백성으로써 너희를 노엽게 하리라 하였고"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 10,
    "verse_start": 20,
    "current_text": "이사야는 매우 담대하여내가 나를 찾지 아니한 자들에게 찾은 바 되고 내게 묻지 아니한 자들에게 나타났노라말하였고",
    "corrected_text": "이사야는 매우 담대하여 내가 나를 찾지 아니한 자들에게 찾은 바 되고 내게 묻지 아니한 자들에게 나타났노라 말하였고"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 11,
    "verse_start": 9,
    "current_text": "또 다윗이 이르되그들의 밥상이 올무와 덫과 거치는 것과 보응이 되게 하시옵고",
    "corrected_text": "또 다윗이 이르되 그들의 밥상이 올무와 덫과 거치는 것과 보응이 되게 하시옵고"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 11,
    "verse_start": 10,
    "current_text": "그들의 눈은 흐려 보지 못하고 그들의 등은 항상 굽게 하옵소서하였느니라",
    "corrected_text": "그들의 눈은 흐려 보지 못하고 그들의 등은 항상 굽게 하옵소서 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 11,
    "verse_start": 26,
    "current_text": "그리하여 온 이스라엘이 구원을 받으리라 기록된 바구원자가 시온에서 오사 야곱에게서 경건하지 않은 것을 돌이키시겠고",
    "corrected_text": "그리하여 온 이스라엘이 구원을 받으리라 기록된 바 구원자가 시온에서 오사 야곱에게서 경건하지 않은 것을 돌이키시겠고"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 11,
    "verse_start": 27,
    "current_text": "내가 그들의 죄를 없이 할 때에 그들에게 이루어질 내 언약이 이것이라함과 같으니라",
    "corrected_text": "내가 그들의 죄를 없이 할 때에 그들에게 이루어질 내 언약이 이것이라 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 14,
    "verse_start": 11,
    "current_text": "기록되었으되주께서 이르시되 내가 살았노니 모든 무릎이 내게 꿇을 것이요 모든 혀가 하나님께 자백하리라하였느니라",
    "corrected_text": "기록되었으되 주께서 이르시되 내가 살았노니 모든 무릎이 내게 꿇을 것이요 모든 혀가 하나님께 자백하리라 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 15,
    "verse_start": 9,
    "current_text": "이방인들도 그 긍휼하심으로 말미암아 하나님께 영광을 돌리게 하려 하심이라 기록된 바그러므로 내가 열방 중에서 주께 감사하고 주의 이름을 찬송하리로다함과 같으니라",
    "corrected_text": "이방인들도 그 긍휼하심으로 말미암아 하나님께 영광을 돌리게 하려 하심이라 기록된 바 그러므로 내가 열방 중에서 주께 감사하고 주의 이름을 찬송하리로다 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 15,
    "verse_start": 10,
    "current_text": "또 이르되열방들아 주의 백성과 함께 즐거워하라하였으며",
    "corrected_text": "또 이르되 열방들아 주의 백성과 함께 즐거워하라 하였으며"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 15,
    "verse_start": 11,
    "current_text": "또모든 열방들아 주를 찬양하며 모든 백성들아 그를 찬송하라하였으며",
    "corrected_text": "또 모든 열방들아 주를 찬양하며 모든 백성들아 그를 찬송하라 하였으며"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 15,
    "verse_start": 12,
    "current_text": "또 이사야가 이르되이새의 뿌리 곧 열방을 다스리기 위하여 일어나시는 이가 있으리니 열방이 그에게 소망을 두리라하였느니라",
    "corrected_text": "또 이사야가 이르되 이새의 뿌리 곧 열방을 다스리기 위하여 일어나시는 이가 있으리니 열방이 그에게 소망을 두리라 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 15,
    "verse_start": 21,
    "current_text": "기록된 바주의 소식을 받지 못한 자들이 볼 것이요 듣지 못한 자들이 깨달으리라함과 같으니라",
    "corrected_text": "기록된 바 주의 소식을 받지 못한 자들이 볼 것이요 듣지 못한 자들이 깨달으리라 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 45,
    "chapter": 16,
    "verse_start": 20,
    "current_text": "평강의 하나님께서 속히 사탄을 너희 발 아래에서 상하게 하시리라우리 주 예수의 은혜가 너희에게 있을지어다",
    "corrected_text": "평강의 하나님께서 속히 사탄을 너희 발 아래에서 상하게 하시리라 우리 주 예수의 은혜가 너희에게 있을지어다"
  },
  {
    "translation_id": 92,
    "book_number": 46,
    "chapter": 1,
    "verse_start": 19,
    "current_text": "기록된 바내가 지혜 있는 자들의 지혜를 멸하고 총명한 자들의 총명을 폐하리라하였으니",
    "corrected_text": "기록된 바 내가 지혜 있는 자들의 지혜를 멸하고 총명한 자들의 총명을 폐하리라 하였으니"
  },
  {
    "translation_id": 92,
    "book_number": 46,
    "chapter": 2,
    "verse_start": 9,
    "current_text": "기록된 바하나님이 자기를 사랑하는 자들을 위하여 예비하신 모든 것은 눈으로 보지 못하고 귀로 듣지 못하고 사람의 마음으로 생각하지도 못하였다함과 같으니라",
    "corrected_text": "기록된 바 하나님이 자기를 사랑하는 자들을 위하여 예비하신 모든 것은 눈으로 보지 못하고 귀로 듣지 못하고 사람의 마음으로 생각하지도 못하였다 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 46,
    "chapter": 14,
    "verse_start": 33,
    "current_text": "하나님은 무질서의 하나님이 아니시요 오직 화평의 하나님이시니라모든 성도가 교회에서 함과 같이",
    "corrected_text": "하나님은 무질서의 하나님이 아니시요 오직 화평의 하나님이시니라 모든 성도가 교회에서 함과 같이"
  },
  {
    "translation_id": 92,
    "book_number": 47,
    "chapter": 6,
    "verse_start": 2,
    "current_text": "이르시되내가 은혜 베풀 때에 너에게 듣고 구원의 날에 너를 도왔다하셨으니 보라 지금은 은혜 받을 만한 때요 보라 지금은 구원의 날이로다",
    "corrected_text": "이르시되 내가 은혜 베풀 때에 너에게 듣고 구원의 날에 너를 도왔다 하셨으니 보라 지금은 은혜 받을 만한 때요 보라 지금은 구원의 날이로다"
  },
  {
    "translation_id": 92,
    "book_number": 47,
    "chapter": 6,
    "verse_start": 16,
    "current_text": "하나님의 성전과 우상이 어찌 일치가 되리요 우리는 살아 계신 하나님의 성전이라 이와 같이 하나님께서 이르시되내가 그들 가운데 거하며 두루 행하여 나는 그들의 하나님이 되고 그들은 나의 백성이 되리라",
    "corrected_text": "하나님의 성전과 우상이 어찌 일치가 되리요 우리는 살아 계신 하나님의 성전이라 이와 같이 하나님께서 이르시되 내가 그들 가운데 거하며 두루 행하여 나는 그들의 하나님이 되고 그들은 나의 백성이 되리라"
  },
  {
    "translation_id": 92,
    "book_number": 47,
    "chapter": 6,
    "verse_start": 18,
    "current_text": "너희에게 아버지가 되고 너희는 내게 자녀가 되리라 전능하신 주의 말씀이니라하셨느니라",
    "corrected_text": "너희에게 아버지가 되고 너희는 내게 자녀가 되리라 전능하신 주의 말씀이니라 하셨느니라"
  },
  {
    "translation_id": 92,
    "book_number": 47,
    "chapter": 9,
    "verse_start": 9,
    "current_text": "기록된 바그가 흩어 가난한 자들에게 주었으니 그의 의가 영원토록 있느니라함과 같으니라",
    "corrected_text": "기록된 바 그가 흩어 가난한 자들에게 주었으니 그의 의가 영원토록 있느니라 함과 같으니라"
  },
  {
    "translation_id": 92,
    "book_number": 48,
    "chapter": 4,
    "verse_start": 27,
    "current_text": "기록된 바잉태하지 못한 자여 즐거워하라 산고를 모르는 자여 소리 질러 외치라 이는 홀로 사는 자의 자녀가 남편 있는 자의 자녀보다 많음이라하였으니",
    "corrected_text": "기록된 바 잉태하지 못한 자여 즐거워하라 산고를 모르는 자여 소리 질러 외치라 이는 홀로 사는 자의 자녀가 남편 있는 자의 자녀보다 많음이라 하였으니"
  },
  {
    "translation_id": 92,
    "book_number": 49,
    "chapter": 4,
    "verse_start": 8,
    "current_text": "그러므로 이르기를그가 위로 올라가실 때에 사로잡혔던 자들을 사로잡으시고 사람들에게 선물을 주셨다하였도다",
    "corrected_text": "그러므로 이르기를 그가 위로 올라가실 때에 사로잡혔던 자들을 사로잡으시고 사람들에게 선물을 주셨다 하였도다"
  },
  {
    "translation_id": 92,
    "book_number": 54,
    "chapter": 3,
    "verse_start": 16,
    "current_text": "크도다 경건의 비밀이여, 그렇지 않다 하는 이 없도다그는 육신으로 나타난 바 되시고 영으로 의롭다 하심을 받으시고 천사들에게 보이시고 만국에서 전파되시고 세상에서 믿은 바 되시고 영광 가운데서 올려지셨느니라",
    "corrected_text": "크도다 경건의 비밀이여, 그렇지 않다 하는 이 없도다 그는 육신으로 나타난 바 되시고 영으로 의롭다 하심을 받으시고 천사들에게 보이시고 만국에서 전파되시고 세상에서 믿은 바 되시고 영광 가운데서 올려지셨느니라"
  },
  {
    "translation_id": 92,
    "book_number": 56,
    "chapter": 1,
    "verse_start": 12,
    "current_text": "그레데인 중의 어떤 선지자가 말하되그레데인들은 항상 거짓말쟁이며 악한 짐승이며 배만 위하는 게으름뱅이라하니",
    "corrected_text": "그레데인 중의 어떤 선지자가 말하되 그레데인들은 항상 거짓말쟁이며 악한 짐승이며 배만 위하는 게으름뱅이라 하니"
  },
  {
    "translation_id": 92,
    "book_number": 56,
    "chapter": 3,
    "verse_start": 15,
    "current_text": "나와 함께 있는 자가 다 네게 문안하니 믿음 안에서 우리를 사랑하는 자들에게 너도 문안하라은혜가 너희 무리에게 있을지어다",
    "corrected_text": "나와 함께 있는 자가 다 네게 문안하니 믿음 안에서 우리를 사랑하는 자들에게 너도 문안하라 은혜가 너희 무리에게 있을지어다"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 5,
    "current_text": "하나님께서 어느 때에 천사 중 누구에게너는 내 아들이라 오늘 내가 너를 낳았다하셨으며 또 다시나는 그에게 아버지가 되고 그는 내게 아들이 되리라하셨느냐",
    "corrected_text": "하나님께서 어느 때에 천사 중 누구에게 너는 내 아들이라 오늘 내가 너를 낳았다 하셨으며 또 다시 나는 그에게 아버지가 되고 그는 내게 아들이 되리라 하셨느냐"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 6,
    "current_text": "또 그가 맏아들을 이끌어 세상에 다시 들어오게 하실 때에하나님의 모든 천사들은 그에게 경배할지어다말씀하시며",
    "corrected_text": "또 그가 맏아들을 이끌어 세상에 다시 들어오게 하실 때에 하나님의 모든 천사들은 그에게 경배할지어다 말씀하시며"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 7,
    "current_text": "또 천사들에 관하여는그는 그의 천사들을 바람으로, 그의 사역자들을 불꽃으로 삼으시느니라하셨으되",
    "corrected_text": "또 천사들에 관하여는 그는 그의 천사들을 바람으로, 그의 사역자들을 불꽃으로 삼으시느니라 하셨으되"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 8,
    "current_text": "아들에 관하여는하나님이여 주의 보좌는 영영하며 주의 나라의 규는 공평한 규이니이다",
    "corrected_text": "아들에 관하여는 하나님이여 주의 보좌는 영영하며 주의 나라의 규는 공평한 규이니이다"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 9,
    "current_text": "주께서 의를 사랑하시고 불법을 미워하셨으니 그러므로 하나님 곧 주의 하나님이 즐거움의 기름을 주께 부어 주를 동류들보다 뛰어나게 하셨도다하였고",
    "corrected_text": "주께서 의를 사랑하시고 불법을 미워하셨으니 그러므로 하나님 곧 주의 하나님이 즐거움의 기름을 주께 부어 주를 동류들보다 뛰어나게 하셨도다 하였고"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 10,
    "current_text": "또주여 태초에 주께서 땅의 기초를 두셨으며 하늘도 주의 손으로 지으신 바라",
    "corrected_text": "또 주여 태초에 주께서 땅의 기초를 두셨으며 하늘도 주의 손으로 지으신 바라"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 12,
    "current_text": "의복처럼 갈아입을 것이요 그것들은 옷과 같이 변할 것이나 주는 여전하여 연대가 다함이 없으리라하였으나",
    "corrected_text": "의복처럼 갈아입을 것이요 그것들은 옷과 같이 변할 것이나 주는 여전하여 연대가 다함이 없으리라 하였으나"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 1,
    "verse_start": 13,
    "current_text": "어느 때에 천사 중 누구에게내가 네 원수로 네 발등상이 되게 하기까지 너는 내 우편에 앉아 있으라하셨느냐",
    "corrected_text": "어느 때에 천사 중 누구에게 내가 네 원수로 네 발등상이 되게 하기까지 너는 내 우편에 앉아 있으라 하셨느냐"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 2,
    "verse_start": 6,
    "current_text": "그러나 누구인가가 어디에서 증언하여 이르되사람이 무엇이기에 주께서 그를 생각하시며 인자가 무엇이기에 주께서 그를 돌보시나이까",
    "corrected_text": "그러나 누구인가가 어디에서 증언하여 이르되 사람이 무엇이기에 주께서 그를 생각하시며 인자가 무엇이기에 주께서 그를 돌보시나이까"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 2,
    "verse_start": 8,
    "current_text": "만물을 그 발 아래에 복종하게 하셨느니라하였으니 만물로 그에게 복종하게 하셨은즉 복종하지 않은 것이 하나도 없어야 하겠으나 지금 우리가 만물이 아직 그에게 복종하고 있는 것을 보지 못하고",
    "corrected_text": "만물을 그 발 아래에 복종하게 하셨느니라 하였으니 만물로 그에게 복종하게 하셨은즉 복종하지 않은 것이 하나도 없어야 하겠으나 지금 우리가 만물이 아직 그에게 복종하고 있는 것을 보지 못하고"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 2,
    "verse_start": 12,
    "current_text": "이르시되내가 주의 이름을 내 형제들에게 선포하고 내가 주를 교회 중에서 찬송하리라하셨으며",
    "corrected_text": "이르시되 내가 주의 이름을 내 형제들에게 선포하고 내가 주를 교회 중에서 찬송하리라 하셨으며"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 2,
    "verse_start": 13,
    "current_text": "또 다시내가 그를 의지하리라하시고 또 다시볼지어다 나와 및 하나님께서 내게 주신 자녀라하셨으니",
    "corrected_text": "또 다시 내가 그를 의지하리라 하시고 또 다시 볼지어다 나와 및 하나님께서 내게 주신 자녀라 하셨으니"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 3,
    "verse_start": 7,
    "current_text": "그러므로 성령이 이르신 바와 같이오늘 너희가 그의 음성을 듣거든",
    "corrected_text": "그러므로 성령이 이르신 바와 같이 오늘 너희가 그의 음성을 듣거든"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 3,
    "verse_start": 11,
    "current_text": "내가 노하여 맹세한 바와 같이 그들은 내 안식에 들어오지 못하리라 하였다하였느니라",
    "corrected_text": "내가 노하여 맹세한 바와 같이 그들은 내 안식에 들어오지 못하리라 하였다 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 3,
    "verse_start": 15,
    "current_text": "성경에 일렀으되오늘 너희가 그의 음성을 듣거든 격노하시게 하던 것 같이 너희 마음을 완고하게 하지 말라하였으니",
    "corrected_text": "성경에 일렀으되 오늘 너희가 그의 음성을 듣거든 격노하시게 하던 것 같이 너희 마음을 완고하게 하지 말라 하였으니"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 4,
    "verse_start": 3,
    "current_text": "이미 믿는 우리들은 저 안식에 들어가는도다 그가 말씀하신 바와 같으니내가 노하여 맹세한 바와 같이 그들이 내 안식에 들어오지 못하리라 하셨다하였으나 세상을 창조할 때부터 그 일이 이루어졌느니라",
    "corrected_text": "이미 믿는 우리들은 저 안식에 들어가는도다 그가 말씀하신 바와 같으니 내가 노하여 맹세한 바와 같이 그들이 내 안식에 들어오지 못하리라 하셨다 하였으나 세상을 창조할 때부터 그 일이 이루어졌느니라"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 4,
    "verse_start": 7,
    "current_text": "오랜 후에 다윗의 글에 다시 어느 날을 정하여 오늘이라고 미리 이같이 일렀으되오늘 너희가 그의 음성을 듣거든 너희 마음을 완고하게 하지 말라하였나니",
    "corrected_text": "오랜 후에 다윗의 글에 다시 어느 날을 정하여 오늘이라고 미리 이같이 일렀으되 오늘 너희가 그의 음성을 듣거든 너희 마음을 완고하게 하지 말라 하였나니"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 5,
    "verse_start": 5,
    "current_text": "또한 이와 같이 그리스도께서 대제사장 되심도 스스로 영광을 취하심이 아니요 오직 말씀하신 이가 그에게 이르시되너는 내 아들이니 내가 오늘 너를 낳았다하셨고",
    "corrected_text": "또한 이와 같이 그리스도께서 대제사장 되심도 스스로 영광을 취하심이 아니요 오직 말씀하신 이가 그에게 이르시되 너는 내 아들이니 내가 오늘 너를 낳았다 하셨고"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 5,
    "verse_start": 6,
    "current_text": "또한 이와 같이 다른 데서 말씀하시되네가 영원히 멜기세덱의 반차를 따르는 제사장이라하셨으니",
    "corrected_text": "또한 이와 같이 다른 데서 말씀하시되 네가 영원히 멜기세덱의 반차를 따르는 제사장이라 하셨으니"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 8,
    "verse_start": 8,
    "current_text": "그들의 잘못을 지적하여 말씀하시되주께서 이르시되 볼지어다 날이 이르리니 내가 이스라엘 집과 유다 집과 더불어 새 언약을 맺으리라",
    "corrected_text": "그들의 잘못을 지적하여 말씀하시되 주께서 이르시되 볼지어다 날이 이르리니 내가 이스라엘 집과 유다 집과 더불어 새 언약을 맺으리라"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 8,
    "verse_start": 12,
    "current_text": "내가 그들의 불의를 긍휼히 여기고 그들의 죄를 다시 기억하지 아니하리라하셨느니라",
    "corrected_text": "내가 그들의 불의를 긍휼히 여기고 그들의 죄를 다시 기억하지 아니하리라 하셨느니라"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 10,
    "verse_start": 5,
    "current_text": "그러므로 주께서 세상에 임하실 때에 이르시되하나님이 제사와 예물을 원하지 아니하시고 오직 나를 위하여 한 몸을 예비하셨도다",
    "corrected_text": "그러므로 주께서 세상에 임하실 때에 이르시되 하나님이 제사와 예물을 원하지 아니하시고 오직 나를 위하여 한 몸을 예비하셨도다"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 10,
    "verse_start": 7,
    "current_text": "이에 내가 말하기를 하나님이여 보시옵소서 두루마리 책에 나를 가리켜 기록된 것과 같이 하나님의 뜻을 행하러 왔나이다하셨느니라",
    "corrected_text": "이에 내가 말하기를 하나님이여 보시옵소서 두루마리 책에 나를 가리켜 기록된 것과 같이 하나님의 뜻을 행하러 왔나이다 하셨느니라"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 10,
    "verse_start": 16,
    "current_text": "주께서 이르시되 그 날 후로는 그들과 맺을 언약이 이것이라 하시고 내 법을 그들의 마음에 두고 그들의 생각에 기록하리라하신 후에",
    "corrected_text": "주께서 이르시되 그 날 후로는 그들과 맺을 언약이 이것이라 하시고 내 법을 그들의 마음에 두고 그들의 생각에 기록하리라 하신 후에"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 10,
    "verse_start": 17,
    "current_text": "또그들의 죄와 그들의 불법을 내가 다시 기억하지 아니하리라하셨으니",
    "corrected_text": "또 그들의 죄와 그들의 불법을 내가 다시 기억하지 아니하리라 하셨으니"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 10,
    "verse_start": 38,
    "current_text": "나의 의인은 믿음으로 말미암아 살리라 또한 뒤로 물러가면 내 마음이 그를 기뻐하지 아니하리라하셨느니라",
    "corrected_text": "나의 의인은 믿음으로 말미암아 살리라 또한 뒤로 물러가면 내 마음이 그를 기뻐하지 아니하리라 하셨느니라"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 12,
    "verse_start": 5,
    "current_text": "또 아들들에게 권하는 것 같이 너희에게 권면하신 말씀도 잊었도다 일렀으되내 아들아 주의 징계하심을 경히 여기지 말며 그에게 꾸지람을 받을 때에 낙심하지 말라",
    "corrected_text": "또 아들들에게 권하는 것 같이 너희에게 권면하신 말씀도 잊었도다 일렀으되 내 아들아 주의 징계하심을 경히 여기지 말며 그에게 꾸지람을 받을 때에 낙심하지 말라"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 12,
    "verse_start": 6,
    "current_text": "주께서 그 사랑하시는 자를 징계하시고 그가 받아들이시는 아들마다 채찍질하심이라하였으니",
    "corrected_text": "주께서 그 사랑하시는 자를 징계하시고 그가 받아들이시는 아들마다 채찍질하심이라 하였으니"
  },
  {
    "translation_id": 92,
    "book_number": 58,
    "chapter": 13,
    "verse_start": 6,
    "current_text": "그러므로 우리가 담대히 말하되주는 나를 돕는 이시니 내가 무서워하지 아니하겠노라 사람이 내게 어찌하리요하노라",
    "corrected_text": "그러므로 우리가 담대히 말하되 주는 나를 돕는 이시니 내가 무서워하지 아니하겠노라 사람이 내게 어찌하리요 하노라"
  },
  {
    "translation_id": 92,
    "book_number": 60,
    "chapter": 1,
    "verse_start": 24,
    "current_text": "그러므로모든 육체는 풀과 같고 그 모든 영광은 풀의 꽃과 같으니 풀은 마르고 꽃은 떨어지되",
    "corrected_text": "그러므로 모든 육체는 풀과 같고 그 모든 영광은 풀의 꽃과 같으니 풀은 마르고 꽃은 떨어지되"
  },
  {
    "translation_id": 92,
    "book_number": 60,
    "chapter": 1,
    "verse_start": 25,
    "current_text": "오직 주의 말씀은 세세토록 있도다하였으니 너희에게 전한 복음이 곧 이 말씀이니라",
    "corrected_text": "오직 주의 말씀은 세세토록 있도다 하였으니 너희에게 전한 복음이 곧 이 말씀이니라"
  },
  {
    "translation_id": 92,
    "book_number": 60,
    "chapter": 2,
    "verse_start": 6,
    "current_text": "성경에 기록되었으되보라 내가 택한 보배로운 모퉁잇돌을 시온에 두노니 그를 믿는 자는 부끄러움을 당하지 아니하리라하였으니",
    "corrected_text": "성경에 기록되었으되 보라 내가 택한 보배로운 모퉁잇돌을 시온에 두노니 그를 믿는 자는 부끄러움을 당하지 아니하리라 하였으니"
  },
  {
    "translation_id": 92,
    "book_number": 60,
    "chapter": 2,
    "verse_start": 7,
    "current_text": "그러므로 믿는 너희에게는 보배이나 믿지 아니하는 자에게는건축자들이 버린 그 돌이 모퉁이의 머릿돌이 되고",
    "corrected_text": "그러므로 믿는 너희에게는 보배이나 믿지 아니하는 자에게는 건축자들이 버린 그 돌이 모퉁이의 머릿돌이 되고"
  },
  {
    "translation_id": 92,
    "book_number": 60,
    "chapter": 2,
    "verse_start": 8,
    "current_text": "또한부딪치는 돌과 걸려 넘어지게 하는 바위가 되었다하였느니라 그들이 말씀을 순종하지 아니하므로 넘어지나니 이는 그들을 이렇게 정하신 것이라",
    "corrected_text": "또한 부딪치는 돌과 걸려 넘어지게 하는 바위가 되었다 하였느니라 그들이 말씀을 순종하지 아니하므로 넘어지나니 이는 그들을 이렇게 정하신 것이라"
  },
  {
    "translation_id": 92,
    "book_number": 60,
    "chapter": 3,
    "verse_start": 10,
    "current_text": "그러므로생명을 사랑하고 좋은 날 보기를 원하는 자는 혀를 금하여 악한 말을 그치며 그 입술로 거짓을 말하지 말고",
    "corrected_text": "그러므로 생명을 사랑하고 좋은 날 보기를 원하는 자는 혀를 금하여 악한 말을 그치며 그 입술로 거짓을 말하지 말고"
  },
  {
    "translation_id": 92,
    "book_number": 60,
    "chapter": 3,
    "verse_start": 12,
    "current_text": "주의 눈은 의인을 향하시고 그의 귀는 의인의 간구에 기울이시되 주의 얼굴은 악행하는 자들을 대하시느니라하였느니라",
    "corrected_text": "주의 눈은 의인을 향하시고 그의 귀는 의인의 간구에 기울이시되 주의 얼굴은 악행하는 자들을 대하시느니라 하였느니라"
  },
  {
    "translation_id": 92,
    "book_number": 60,
    "chapter": 5,
    "verse_start": 14,
    "current_text": "너희는 사랑의 입맞춤으로 서로 문안하라그리스도 안에 있는 너희 모든 이에게 평강이 있을지어다",
    "corrected_text": "너희는 사랑의 입맞춤으로 서로 문안하라 그리스도 안에 있는 너희 모든 이에게 평강이 있을지어다"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 4,
    "verse_start": 8,
    "current_text": "네 생물은 각각 여섯 날개를 가졌고 그 안과 주위에는 눈들이 가득하더라 그들이 밤낮 쉬지 않고 이르기를거룩하다 거룩하다 거룩하다 주 하나님 곧 전능하신 이여 전에도 계셨고 이제도 계시고 장차 오실 이시라하고",
    "corrected_text": "네 생물은 각각 여섯 날개를 가졌고 그 안과 주위에는 눈들이 가득하더라 그들이 밤낮 쉬지 않고 이르기를 거룩하다 거룩하다 거룩하다 주 하나님 곧 전능하신 이여 전에도 계셨고 이제도 계시고 장차 오실 이시라 하고"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 4,
    "verse_start": 11,
    "current_text": "우리 주 하나님이여 영광과 존귀와 권능을 받으시는 것이 합당하오니 주께서 만물을 지으신지라 만물이 주의 뜻대로 있었고 또 지으심을 받았나이다하더라",
    "corrected_text": "우리 주 하나님이여 영광과 존귀와 권능을 받으시는 것이 합당하오니 주께서 만물을 지으신지라 만물이 주의 뜻대로 있었고 또 지으심을 받았나이다 하더라"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 5,
    "verse_start": 9,
    "current_text": "그들이 새 노래를 불러 이르되두루마리를 가지시고 그 인봉을 떼기에 합당하시도다 일찍이 죽임을 당하사 각 족속과 방언과 백성과 나라 가운데에서 사람들을 피로 사서 하나님께 드리시고",
    "corrected_text": "그들이 새 노래를 불러 이르되 두루마리를 가지시고 그 인봉을 떼기에 합당하시도다 일찍이 죽임을 당하사 각 족속과 방언과 백성과 나라 가운데에서 사람들을 피로 사서 하나님께 드리시고"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 5,
    "verse_start": 10,
    "current_text": "그들로 우리 하나님 앞에서 나라와 제사장들을 삼으셨으니 그들이 땅에서 왕 노릇 하리로다하더라",
    "corrected_text": "그들로 우리 하나님 앞에서 나라와 제사장들을 삼으셨으니 그들이 땅에서 왕 노릇 하리로다 하더라"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 5,
    "verse_start": 12,
    "current_text": "큰 음성으로 이르되죽임을 당하신 어린 양은 능력과 부와 지혜와 힘과 존귀와 영광과 찬송을 받으시기에 합당하도다하더라",
    "corrected_text": "큰 음성으로 이르되 죽임을 당하신 어린 양은 능력과 부와 지혜와 힘과 존귀와 영광과 찬송을 받으시기에 합당하도다 하더라"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 5,
    "verse_start": 13,
    "current_text": "내가 또 들으니 하늘 위에와 땅 위에와 땅 아래와 바다 위에와 또 그 가운데 모든 피조물이 이르되보좌에 앉으신 이와 어린 양에게 찬송과 존귀와 영광과 권능을 세세토록 돌릴지어다하니",
    "corrected_text": "내가 또 들으니 하늘 위에와 땅 위에와 땅 아래와 바다 위에와 또 그 가운데 모든 피조물이 이르되 보좌에 앉으신 이와 어린 양에게 찬송과 존귀와 영광과 권능을 세세토록 돌릴지어다 하니"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 7,
    "verse_start": 10,
    "current_text": "큰 소리로 외쳐 이르되구원하심이 보좌에 앉으신 우리 하나님과 어린 양에게 있도다하니",
    "corrected_text": "큰 소리로 외쳐 이르되 구원하심이 보좌에 앉으신 우리 하나님과 어린 양에게 있도다 하니"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 7,
    "verse_start": 12,
    "current_text": "이르되아멘 찬송과 영광과 지혜와 감사와 존귀와 권능과 힘이 우리 하나님께 세세토록 있을지어다 아멘하더라",
    "corrected_text": "이르되 아멘 찬송과 영광과 지혜와 감사와 존귀와 권능과 힘이 우리 하나님께 세세토록 있을지어다 아멘 하더라"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 11,
    "verse_start": 15,
    "current_text": "일곱째 천사가 나팔을 불매 하늘에 큰 음성들이 나서 이르되세상 나라가 우리 주와 그의 그리스도의 나라가 되어 그가 세세토록 왕 노릇 하시리로다하니",
    "corrected_text": "일곱째 천사가 나팔을 불매 하늘에 큰 음성들이 나서 이르되 세상 나라가 우리 주와 그의 그리스도의 나라가 되어 그가 세세토록 왕 노릇 하시리로다 하니"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 11,
    "verse_start": 17,
    "current_text": "이르되감사하옵나니 옛적에도 계셨고 지금도 계신 주 하나님 곧 전능하신 이여 친히 큰 권능을 잡으시고 왕 노릇 하시도다",
    "corrected_text": "이르되 감사하옵나니 옛적에도 계셨고 지금도 계신 주 하나님 곧 전능하신 이여 친히 큰 권능을 잡으시고 왕 노릇 하시도다"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 11,
    "verse_start": 18,
    "current_text": "이방들이 분노하매 주의 진노가 내려 죽은 자를 심판하시며 종 선지자들과 성도들과 또 작은 자든지 큰 자든지 주의 이름을 경외하는 자들에게 상 주시며 또 땅을 망하게 하는 자들을 멸망시키실 때로소이다하더라",
    "corrected_text": "이방들이 분노하매 주의 진노가 내려 죽은 자를 심판하시며 종 선지자들과 성도들과 또 작은 자든지 큰 자든지 주의 이름을 경외하는 자들에게 상 주시며 또 땅을 망하게 하는 자들을 멸망시키실 때로소이다 하더라"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 12,
    "verse_start": 10,
    "current_text": "내가 또 들으니 하늘에 큰 음성이 있어 이르되이제 우리 하나님의 구원과 능력과 나라와 또 그의 그리스도의 권세가 나타났으니 우리 형제들을 참소하던 자 곧 우리 하나님 앞에서 밤낮 참소하던 자가 쫓겨났고",
    "corrected_text": "내가 또 들으니 하늘에 큰 음성이 있어 이르되 이제 우리 하나님의 구원과 능력과 나라와 또 그의 그리스도의 권세가 나타났으니 우리 형제들을 참소하던 자 곧 우리 하나님 앞에서 밤낮 참소하던 자가 쫓겨났고"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 12,
    "verse_start": 12,
    "current_text": "그러므로 하늘과 그 가운데에 거하는 자들은 즐거워하라 그러나 땅과 바다는 화 있을진저 이는 마귀가 자기의 때가 얼마 남지 않은 줄을 알므로 크게 분내어 너희에게 내려갔음이라하더라",
    "corrected_text": "그러므로 하늘과 그 가운데에 거하는 자들은 즐거워하라 그러나 땅과 바다는 화 있을진저 이는 마귀가 자기의 때가 얼마 남지 않은 줄을 알므로 크게 분내어 너희에게 내려갔음이라 하더라"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 15,
    "verse_start": 3,
    "current_text": "하나님의 종 모세의 노래, 어린 양의 노래를 불러 이르되주 하나님 곧 전능하신 이시여 하시는 일이 크고 놀라우시도다 만국의 왕이시여 주의 길이 의롭고 참되시도다",
    "corrected_text": "하나님의 종 모세의 노래, 어린 양의 노래를 불러 이르되 주 하나님 곧 전능하신 이시여 하시는 일이 크고 놀라우시도다 만국의 왕이시여 주의 길이 의롭고 참되시도다"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 15,
    "verse_start": 4,
    "current_text": "주여 누가 주의 이름을 두려워하지 아니하며 영화롭게 하지 아니하오리이까 오직 주만 거룩하시니이다 주의 의로우신 일이 나타났으매 만국이 와서 주께 경배하리이다하더라",
    "corrected_text": "주여 누가 주의 이름을 두려워하지 아니하며 영화롭게 하지 아니하오리이까 오직 주만 거룩하시니이다 주의 의로우신 일이 나타났으매 만국이 와서 주께 경배하리이다 하더라"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 19,
    "verse_start": 1,
    "current_text": "이 일 후에 내가 들으니 하늘에 허다한 무리의 큰 음성 같은 것이 있어 이르되할렐루야 구원과 영광과 능력이 우리 하나님께 있도다",
    "corrected_text": "이 일 후에 내가 들으니 하늘에 허다한 무리의 큰 음성 같은 것이 있어 이르되 할렐루야 구원과 영광과 능력이 우리 하나님께 있도다"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 19,
    "verse_start": 2,
    "current_text": "그의 심판은 참되고 의로운지라 음행으로 땅을 더럽게 한 큰 음녀를 심판하사 자기 종들의 피를 그 음녀의 손에 갚으셨도다하고",
    "corrected_text": "그의 심판은 참되고 의로운지라 음행으로 땅을 더럽게 한 큰 음녀를 심판하사 자기 종들의 피를 그 음녀의 손에 갚으셨도다 하고"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 19,
    "verse_start": 5,
    "current_text": "보좌에서 음성이 나서 이르시되하나님의 종들 곧 그를 경외하는 너희들아 작은 자나 큰 자나 다 우리 하나님께 찬송하라하더라",
    "corrected_text": "보좌에서 음성이 나서 이르시되 하나님의 종들 곧 그를 경외하는 너희들아 작은 자나 큰 자나 다 우리 하나님께 찬송하라 하더라"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 19,
    "verse_start": 6,
    "current_text": "또 내가 들으니 허다한 무리의 음성과도 같고 많은 물 소리와도 같고 큰 우렛소리와도 같은 소리로 이르되할렐루야 주 우리 하나님 곧 전능하신 이가 통치하시도다",
    "corrected_text": "또 내가 들으니 허다한 무리의 음성과도 같고 많은 물 소리와도 같고 큰 우렛소리와도 같은 소리로 이르되 할렐루야 주 우리 하나님 곧 전능하신 이가 통치하시도다"
  },
  {
    "translation_id": 92,
    "book_number": 66,
    "chapter": 19,
    "verse_start": 8,
    "current_text": "그에게 빛나고 깨끗한 세마포 옷을 입도록 허락하셨으니 이 세마포 옷은 성도들의 옳은 행실이로다하더라",
    "corrected_text": "그에게 빛나고 깨끗한 세마포 옷을 입도록 허락하셨으니 이 세마포 옷은 성도들의 옳은 행실이로다 하더라"
  }
]
$corrections$::jsonb;
  correction_count integer;
  distinct_key_count integer;
  krv_count integer;
  nkrv_count integer;
  unexpected_translation_count integer;
  unchanged_payload_count integer;
  non_whitespace_change_count integer;
  stale_or_missing_count integer;
  updated_count integer;
  postcheck_failure_count integer;
begin
  if to_regclass('public.kbs_bible_verses') is null then
    raise exception 'Safety stop: public.kbs_bible_verses is missing';
  end if;

  select
    count(*)::integer,
    count(
      distinct (
        c.translation_id,
        c.book_number,
        c.chapter,
        c.verse_start
      )
    )::integer,
    count(*) filter (where c.translation_id = 84)::integer,
    count(*) filter (where c.translation_id = 92)::integer,
    count(*) filter (where c.translation_id not in (84, 92))::integer,
    count(*) filter (
      where c.current_text is not distinct from c.corrected_text
    )::integer,
    count(*) filter (
      where regexp_replace(
        c.current_text,
        '[[:space:]]+',
        '',
        'g'
      ) is distinct from regexp_replace(
        c.corrected_text,
        '[[:space:]]+',
        '',
        'g'
      )
    )::integer
  into
    correction_count,
    distinct_key_count,
    krv_count,
    nkrv_count,
    unexpected_translation_count,
    unchanged_payload_count,
    non_whitespace_change_count
  from jsonb_to_recordset(corrections) as c(
    translation_id smallint,
    book_number smallint,
    chapter smallint,
    verse_start smallint,
    current_text text,
    corrected_text text
  );

  if correction_count <> 508
     or distinct_key_count <> 508
     or krv_count <> 251
     or nkrv_count <> 257
     or unexpected_translation_count <> 0 then
    raise exception
      'Safety stop: unexpected correction payload (% total, % distinct, % KRV, % NKRV, % other)',
      correction_count,
      distinct_key_count,
      krv_count,
      nkrv_count,
      unexpected_translation_count;
  end if;

  if unchanged_payload_count <> 0
     or non_whitespace_change_count <> 0 then
    raise exception
      'Safety stop: correction payload is not spacing-only (% unchanged, % non-whitespace changes)',
      unchanged_payload_count,
      non_whitespace_change_count;
  end if;

  select count(*)::integer
  into stale_or_missing_count
  from jsonb_to_recordset(corrections) as c(
    translation_id smallint,
    book_number smallint,
    chapter smallint,
    verse_start smallint,
    current_text text,
    corrected_text text
  )
  left join public.kbs_bible_verses as verse
    on verse.translation_id = c.translation_id
   and verse.book_number = c.book_number
   and verse.chapter = c.chapter
   and verse.verse_start = c.verse_start
  where verse.translation_id is null
     or verse.text is distinct from c.current_text;

  if stale_or_missing_count <> 0 then
    raise exception
      'Safety stop: % target rows are missing or no longer match the audited text',
      stale_or_missing_count;
  end if;

  update public.kbs_bible_verses as verse
  set text = c.corrected_text
  from jsonb_to_recordset(corrections) as c(
    translation_id smallint,
    book_number smallint,
    chapter smallint,
    verse_start smallint,
    current_text text,
    corrected_text text
  )
  where verse.translation_id = c.translation_id
    and verse.book_number = c.book_number
    and verse.chapter = c.chapter
    and verse.verse_start = c.verse_start
    and verse.text = c.current_text;

  get diagnostics updated_count = row_count;

  if updated_count <> correction_count then
    raise exception
      'Safety stop: updated % rows instead of %',
      updated_count,
      correction_count;
  end if;

  select count(*)::integer
  into postcheck_failure_count
  from jsonb_to_recordset(corrections) as c(
    translation_id smallint,
    book_number smallint,
    chapter smallint,
    verse_start smallint,
    current_text text,
    corrected_text text
  )
  left join public.kbs_bible_verses as verse
    on verse.translation_id = c.translation_id
   and verse.book_number = c.book_number
   and verse.chapter = c.chapter
   and verse.verse_start = c.verse_start
  where verse.translation_id is null
     or verse.text is distinct from c.corrected_text;

  if postcheck_failure_count <> 0 then
    raise exception
      'Safety stop: % corrected rows failed postcheck',
      postcheck_failure_count;
  end if;

  raise notice
    'Corrected 508 KBS Bible verses (251 KRV, 257 NKRV); all changes are whitespace-only.';
end;
$spacing_fix$;

commit;

select
  translation_id,
  book_number,
  chapter,
  verse_start,
  text
from public.kbs_bible_verses
where translation_id in (84, 92)
  and book_number = 20
  and chapter = 10
  and verse_start = 1
order by translation_id;

