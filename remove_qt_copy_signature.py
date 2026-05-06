from pathlib import Path

path = Path('app/qt/record/page.tsx')
if not path.exists():
    raise SystemExit('app/qt/record/page.tsx 파일을 찾을 수 없습니다. Roots 프로젝트 루트에서 실행해주세요.')

text = path.read_text(encoding='utf-8')
original = text

# Remove QT copy signature items from arrays.
# Examples removed:
#   `\n\n${t("qt_record_copy_signature", lang)}`,
#   `\n\n${t("qt_record_copy_signature", lang)}`
lines = text.splitlines()
new_lines = []
removed = 0
for line in lines:
    if 'qt_record_copy_signature' in line:
        removed += 1
        continue
    new_lines.append(line)
text = '\n'.join(new_lines) + ('\n' if original.endswith('\n') else '')

if removed == 0:
    print('qt_record_copy_signature 사용 줄을 찾지 못했습니다. 이미 제거되어 있을 수 있습니다.')
else:
    path.write_text(text, encoding='utf-8')
    print(f'완료: qt_record_copy_signature 줄 {removed}개를 제거했습니다.')
