# Personal Fact Extraction Skill Document

## Decision Framework: Extract vs Skip

**Extract** durable personal facts — information that remains true about the user across conversations and would be useful to recall later. This includes:
- **Identity**: name, age, nationality, location, where they grew up
- **Profession/Education**: job title, employer, field of study, degree, school, years of experience
- **Skills & Tools**: programming languages, software, instruments, techniques they use
- **Preferences**: favorite foods, music genres, artists, frameworks, tools, communication styles
- **Constraints**: dietary restrictions, dislikes, physical limitations, things they cannot do
- **Relationships**: partner, team members, collaborators (with relevant details about them)
- **Habits/Routines**: recurring activities, workout frequency, meal prep schedules, rehearsal times
- **Projects/Goals**: ongoing work, career transitions, current learning efforts, things they are building
- **Possessions/Resources**: equipment, memberships, workspace details, access to tools/clusters
- **History**: past jobs, previous tools used, places lived, sports played, books read

**Skip** anything that is:
- A transient request ("Can you draft an email?" / "I'll check that out this weekend")
- A one-time action with no lasting relevance
- Information about someone other than the user (unless it's a named relationship like a partner or teammate and their details affect the user's context)
- The assistant's own output or recommendations (unless the user explicitly adopts them, e.g., "I'm going with the ThinkPad")

## Extraction Rules

- Begin every extracted fact with **"The user..."**
- State facts declaratively and concisely. One fact per statement.
- Preserve specificity: include names, numbers, tools, locations, and timeframes when the user provides them.
- Combine closely related details into a single fact when natural (e.g., "The user is a 34-year-old data analyst living in Toronto") but split them if they cover distinct categories.
- When the user expresses a preference with reasoning, capture both (e.g., "The user prefers matplotlib over seaborn because of the control it offers").
- For negative preferences, state them clearly (e.g., "The user does not eat seafood").

## Common Pitfalls

- **Transient plans**: "I'll check that out this weekend" is not a durable fact. But "I'm planning a trip to Kyoto in July" is a durable project/goal.
- **Hypotheticals**: "Maybe Japanese or Korean?" — extract the underlying interest ("The user is interested in Japanese and Korean cuisine") but not the tentative framing.
- **Sarcasm/Jokes**: Do not extract facts from clearly sarcastic or humorous statements. Look for sincerity signals.
- **Assistant recommendations**: Do not extract the assistant's suggestions as user facts unless the user explicitly accepts or adopts them ("That sounds great, I'll go with Linear").
- **Facts about others**: Only extract details about other people when they are named and directly relevant to the user's context (e.g., partner's name, teammate's instrument and skill level).

## Update Handling

When the user corrects or updates a previously stated fact:
- **Extract only the corrected/updated version.** Do not retain the old value.
- Examples: "Actually it's been closer to 15 years" replaces the earlier "12 years." "I actually just switched to vegan" replaces "vegetarian." "We've been reconsidering — Kyoto instead of Tokyo" replaces Tokyo.
- If the old value provides useful context, note the transition (e.g., "The user recently switched from vegetarian to vegan about a month ago" or "The user's favourite language is TypeScript, having previously preferred plain JavaScript").

## Structured Output

For each extracted fact, assign:
- **type**: One of `identity`, `profession`, `education`, `skill`, `preference`, `constraint`, `relationship`, `habit`, `project`, `possession`, `history`
- **namespace**: A grouping category (e.g., `personal`, `work`, `health`, `hobbies`, `food`, `music`, `tech`, `travel`, `fitness`)
- **key**: A short, unique, snake_case identifier for the fact (e.g., `name`, `age`, `employer`, `favorite_cuisine`, `dietary_restriction`, `programming_languages`)
- **value**: The full extracted fact string beginning with "The user..."