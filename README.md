# Assignment Feedback Assistant

A beginner-friendly website that gives teachers a structured **feedback draft** for a sample student answer, based on a grading rubric.

> **Rule-based demonstration, not AI.** The tool counts rubric keywords in the answer and suggests marks from that count. It cannot understand meaning, check correctness, or judge quality. **All marks are suggestions that require teacher review.**

> **Privacy warning:** Do not enter student names, ID numbers, emails, phone numbers, school or class details, or any other identifying information. Use anonymous or made-up sample text. The page processes text in your browser and sends nothing anywhere. It does not save anything. The tool blocks obvious emails, phone-like numbers and "name:" or "student ID" labels, but this check is basic and **cannot catch everything**. You are responsible for what you enter and for storing printed reports securely.

## Features

- Inputs: assignment question, grading rubric, maximum score, sample student answer
- Validation with clear messages next to each field
- Report with: rubric criteria, evidence found in the answer, suggested marks per criterion, strengths, areas for improvement, suggestions for revision
- "How these suggestions were produced" section in every report
- Printable feedback (the form is hidden when printing), Reset button, "Load example" button
- Responsive design for phones and computers

## Rubric format

One criterion per line:

```
Criterion name | points | keyword, keyword, keyword
```

Example:

```
Defines machine learning | 3 | learn, data, patterns
Gives an example | 2 | example, spam, recommendation
```

- Points are optional. If omitted on every line, the maximum score is shared equally.
- If you give points, give them on every line, and they must add up to the maximum score.
- If you leave out keywords, words of 4+ letters from the criterion name are used, and the report says so.
- Up to 8 criteria.

## How the logic works (all in `script.js`)

1. A keyword counts as found if a word in the answer **starts with it** (not case-sensitive). So `plant` matches `plants`.
2. Coverage = keywords found / keywords listed.
3. Suggested marks = criterion points x coverage, rounded to the nearest 0.5.
4. Evidence = the first sentence containing each found keyword (up to 3).
5. Strengths: criteria with at least 75% coverage, plus example phrases ("for example", "such as") and reasoning words ("because", "therefore").
6. Improvements and revision suggestions: criteria under 75% coverage, missing keywords, short answers (under 30 words), missing example or reasoning words.
7. Length, example and reasoning checks affect the comments only, not the marks.

## Limitations

- It cannot tell whether an answer is correct. A wrong answer that uses the keywords scores well.
- Synonyms, paraphrases and misspellings are missed. Keyword-stuffed text can score highly.
- English text only.
- Quality of the feedback depends on the keywords you write.
- It is meant to support, never replace, teacher judgement.

## Project structure

```
assignment-feedback-assistant/
├── index.html
├── style.css
├── script.js
├── README.md
├── LICENSE
└── screenshots/
```

## Setup and testing

1. Open `index.html` in a browser.
2. Click **Generate Feedback** with empty fields to see the validation messages.
3. Click **Load example**, then **Generate Feedback**. Check the report.
4. Add an email address to the answer and generate again. It should be blocked.
5. Change rubric points so they do not add up to the maximum score. You should see an error.
6. Try **Print Feedback** (the print preview should show only the report) and **Reset**.

## Host with GitHub Pages

1. Create a public GitHub repository and upload `index.html`, `style.css`, `script.js`, `README.md` and `LICENSE`.
2. Open **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then **Save**.
5. After a minute or two, your site is live at `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

## Screenshots

```
![Form](screenshots/form.png)
![Feedback report](screenshots/report.png)
```

## License

Released under the [MIT License](LICENSE).
