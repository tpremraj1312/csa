import json
import re

# Read the JS file
with open("questions_clean.js", "r", encoding="utf-8") as f:
    content = f.read()

# Extract the rawQuestions array
match = re.search(r"rawQuestions\s*=\s*(\[[\s\S]*\])", content)

if not match:
    print("rawQuestions array not found!")
    exit()

array_text = match.group(1)

# Convert JS-like array to JSON
data = json.loads(array_text)

seen = set()
unique = []
duplicates = []

for q in data:
    question_text = q["question"].strip().lower()

    if question_text not in seen:
        seen.add(question_text)
        unique.append(q)
    else:
        duplicates.append(q["question"])

# Write cleaned JS file
with open("clean_questions.js", "w", encoding="utf-8") as f:
    f.write("const rawQuestions = ")
    json.dump(unique, f, indent=4)
    f.write(";")

print("Total Questions:", len(data))
print("Unique Questions:", len(unique))
print("Duplicates Removed:", len(duplicates))