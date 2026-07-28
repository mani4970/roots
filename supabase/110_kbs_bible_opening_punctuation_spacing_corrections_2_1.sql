-- 110_kbs_bible_opening_punctuation_spacing_corrections_2_1.sql
-- Christian Roots 2.1 KRV opening-punctuation spacing correction
--
-- Scope:
--   - Remove an invalid space immediately after an opening parenthesis or
--     bracket in 14 verified KRV verses.
--   - Require every live row to match its audited pre-fix text before updating.
--   - Preserve schemas, grants, RLS, reflection records, streaks, progress,
--     rewards, badges, and every non-Bible table.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $spacing_fix$
declare
  corrections constant jsonb := $corrections$
[
  {
    "translation_id": 84,
    "book_number": 1,
    "chapter": 23,
    "verse_start": 19,
    "current_text": "그 후에 아브라함이 그 아내 사라를 가나안 땅 마므레 앞 막벨라 밭 굴에 장사하였더라 ( 마므레는 곧 헤브론이라)",
    "corrected_text": "그 후에 아브라함이 그 아내 사라를 가나안 땅 마므레 앞 막벨라 밭 굴에 장사하였더라 (마므레는 곧 헤브론이라)"
  },
  {
    "translation_id": 84,
    "book_number": 1,
    "chapter": 48,
    "verse_start": 7,
    "current_text": "내게 관하여는 내가 이전에 밧단에서 올 때에 라헬이 나를 따르는 노중 가나안 땅에서 죽었는데 그곳은 에브랏까지 길이 오히려 격한 곳이라 내가 거기서 그를 에브랏 길에 장사하였느니라 ( 에브랏은 곧 베들레헴이라)",
    "corrected_text": "내게 관하여는 내가 이전에 밧단에서 올 때에 라헬이 나를 따르는 노중 가나안 땅에서 죽었는데 그곳은 에브랏까지 길이 오히려 격한 곳이라 내가 거기서 그를 에브랏 길에 장사하였느니라 (에브랏은 곧 베들레헴이라)"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 3,
    "verse_start": 9,
    "current_text": "( 헤르몬산을 시돈 사람은 시룐이라 칭하고 아모리 족속은 스닐이라 칭하였느니라)",
    "corrected_text": "(헤르몬산을 시돈 사람은 시룐이라 칭하고 아모리 족속은 스닐이라 칭하였느니라)"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 3,
    "verse_start": 11,
    "current_text": "( 르바임 족속의 남은 자는 바산 왕 옥뿐이었으며 그의 침상은 철 침상이라 지금 오히려 암몬 족속의 랍바에 있지 아니하냐 그것을 사람의 보통 규빗으로 재면 그 장이 아홉 규빗이요 광이 네 규빗이니라)",
    "corrected_text": "(르바임 족속의 남은 자는 바산 왕 옥뿐이었으며 그의 침상은 철 침상이라 지금 오히려 암몬 족속의 랍바에 있지 아니하냐 그것을 사람의 보통 규빗으로 재면 그 장이 아홉 규빗이요 광이 네 규빗이니라)"
  },
  {
    "translation_id": 84,
    "book_number": 5,
    "chapter": 3,
    "verse_start": 13,
    "current_text": "길르앗의 남은 땅과 옥의 나라이었던 아르곱 온 지방 곧 온 바산으로는 내가 므낫세 반 지파에게 주었노라 ( 바산을 옛적에는 르바임의 땅이라 칭하더니",
    "corrected_text": "길르앗의 남은 땅과 옥의 나라이었던 아르곱 온 지방 곧 온 바산으로는 내가 므낫세 반 지파에게 주었노라 (바산을 옛적에는 르바임의 땅이라 칭하더니"
  },
  {
    "translation_id": 84,
    "book_number": 6,
    "chapter": 3,
    "verse_start": 15,
    "current_text": "( 요단이 모맥 거두는 시기에는 항상 언덕에 넘치더라) 궤를 멘 자들이 요단에 이르며 궤를 멘 제사장들의 발이 물가에 잠기자",
    "corrected_text": "(요단이 모맥 거두는 시기에는 항상 언덕에 넘치더라) 궤를 멘 자들이 요단에 이르며 궤를 멘 제사장들의 발이 물가에 잠기자"
  },
  {
    "translation_id": 84,
    "book_number": 9,
    "chapter": 30,
    "verse_start": 5,
    "current_text": "( 다윗의 두 아내 이스르엘 여인 아히노암과 갈멜 사람 나발의 아내 되었던 아비가일도 사로잡혔더라)",
    "corrected_text": "(다윗의 두 아내 이스르엘 여인 아히노암과 갈멜 사람 나발의 아내 되었던 아비가일도 사로잡혔더라)"
  },
  {
    "translation_id": 84,
    "book_number": 11,
    "chapter": 10,
    "verse_start": 11,
    "current_text": "[ 오빌에서부터 금을 실어온 히람의 배들이 오빌에서 많은 백단목과 보석을 운반하여 오매",
    "corrected_text": "[오빌에서부터 금을 실어온 히람의 배들이 오빌에서 많은 백단목과 보석을 운반하여 오매"
  },
  {
    "translation_id": 84,
    "book_number": 13,
    "chapter": 5,
    "verse_start": 1,
    "current_text": "이스라엘의 장자 르우벤의 아들들은 이러하니라 ( 르우벤은 장자라도 그 아비의 침상을 더럽게 하였으므로 장자의 명분이 이스라엘의 아들 요셉의 자손에게로 돌아갔으나 족보에는 장자의 명분대로 기록할 것이 아니니라",
    "corrected_text": "이스라엘의 장자 르우벤의 아들들은 이러하니라 (르우벤은 장자라도 그 아비의 침상을 더럽게 하였으므로 장자의 명분이 이스라엘의 아들 요셉의 자손에게로 돌아갔으나 족보에는 장자의 명분대로 기록할 것이 아니니라"
  },
  {
    "translation_id": 84,
    "book_number": 14,
    "chapter": 9,
    "verse_start": 10,
    "current_text": "( 후람의 신복들과 솔로몬의 신복들도 오빌에서 금을 실어 올 때에 백단목과 보석을 가져온지라",
    "corrected_text": "(후람의 신복들과 솔로몬의 신복들도 오빌에서 금을 실어 올 때에 백단목과 보석을 가져온지라"
  },
  {
    "translation_id": 84,
    "book_number": 43,
    "chapter": 1,
    "verse_start": 42,
    "current_text": "데리고 예수께로 오니 예수께서 보시고 가라사대 네가 요한의 아들 시몬이니 장차 게바라 하리라 하시니라 ( 게바는 번역하면 베드로라)",
    "corrected_text": "데리고 예수께로 오니 예수께서 보시고 가라사대 네가 요한의 아들 시몬이니 장차 게바라 하리라 하시니라 (게바는 번역하면 베드로라)"
  },
  {
    "translation_id": 84,
    "book_number": 43,
    "chapter": 9,
    "verse_start": 7,
    "current_text": "이르시되 실로암 못에 가서 씻으라 하시니 ( 실로암은 번역하면 보냄을 받았다는 뜻이라) 이에 가서 씻고 밝은 눈으로 왔더라",
    "corrected_text": "이르시되 실로암 못에 가서 씻으라 하시니 (실로암은 번역하면 보냄을 받았다는 뜻이라) 이에 가서 씻고 밝은 눈으로 왔더라"
  },
  {
    "translation_id": 84,
    "book_number": 43,
    "chapter": 19,
    "verse_start": 13,
    "current_text": "빌라도가 이 말을 듣고 예수를 끌고 나와서 박석( 히브리 말로 가바다)이란 곳에서 재판석에 앉았더라",
    "corrected_text": "빌라도가 이 말을 듣고 예수를 끌고 나와서 박석(히브리 말로 가바다)이란 곳에서 재판석에 앉았더라"
  },
  {
    "translation_id": 84,
    "book_number": 43,
    "chapter": 19,
    "verse_start": 17,
    "current_text": "저희가 예수를 맡으매 예수께서 자기의 십자가를 지시고 해골( 히브리 말로 골고다)이라 하는 곳에 나오시니",
    "corrected_text": "저희가 예수를 맡으매 예수께서 자기의 십자가를 지시고 해골(히브리 말로 골고다)이라 하는 곳에 나오시니"
  }
]
$corrections$::jsonb;
  correction_count integer;
  distinct_key_count integer;
  invalid_payload_count integer;
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
    count(*) filter (
      where c.translation_id <> 84
         or c.current_text is not distinct from c.corrected_text
         or regexp_replace(
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
    invalid_payload_count
  from jsonb_to_recordset(corrections) as c(
    translation_id smallint,
    book_number smallint,
    chapter smallint,
    verse_start smallint,
    current_text text,
    corrected_text text
  );

  if correction_count <> 14
     or distinct_key_count <> 14
     or invalid_payload_count <> 0 then
    raise exception
      'Safety stop: unexpected correction payload (% total, % distinct, % invalid)',
      correction_count,
      distinct_key_count,
      invalid_payload_count;
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
    'Corrected 14 KRV opening-punctuation spacing errors; all changes are whitespace-only.';
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
where translation_id = 84
  and (
    (book_number = 5 and chapter = 3 and verse_start = 9)
    or (book_number = 43 and chapter = 19 and verse_start = 13)
  )
order by book_number, chapter, verse_start;

