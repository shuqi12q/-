# -*- coding: utf-8 -*-
import io, sys

base = r"C:/Users/13182/WorkBuddy/2026-08-03-14-48-00/psycare/src/app/box"
pages = ["reframe", "coin", "book", "clear", "zen", "muyu", "firstaid"]
for p in pages:
    fp = f"{base}/{p}/page.tsx"
    with io.open(fp, "r", encoding="utf-8") as f:
        s = f.read()
    if "BoxBack" in s:
        print(p, "skip")
        continue
    s = s.replace(
        'import PrivacyBadge from "@/components/PrivacyBadge";',
        'import PrivacyBadge from "@/components/PrivacyBadge";\nimport BoxBack from "@/components/BoxBack";',
        1,
    )
    s = s.replace("    <Shell>\n", "    <Shell>\n      <BoxBack />\n", 1)
    with io.open(fp, "w", encoding="utf-8") as f:
        f.write(s)
    print(p, "done")
