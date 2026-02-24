import re

with open('pages/Home.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove bundle section (lines 215-266)
pattern = r'      \{/\* 2\.5 New! Bundle Packages \*/\}.*?      \{/\* 2\. Recommended Routine \(Pro\) \*/\}'
replacement = '      {/* 2. Recommended Routine (Pro) */}'

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('pages/Home.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Bundle section removed successfully!")
