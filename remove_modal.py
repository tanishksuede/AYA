import os
import re

file_path = r"c:\AYA-master\src\components\game\SolarMap.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove LessonJournal import
content = content.replace("import { LessonJournal } from './LessonJournal';\n", "")

# Remove SettingsModal
idx = content.find("function SettingsModal({ onClose }: { onClose: () => void }) {")
if idx != -1:
    content = content[:idx]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
