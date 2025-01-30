# Tick logic

Ticks are actually quite complicated, involving philosophical, linguistic, historical, cultural, and mathematical issues. Some people have strong opinions, different platforms handle ticks differently, and definitions of words evolve over time. Here are some thoughts to get you thinking and/or riled up:

* Can you redpoint a boulder?
* Can you flash a toprope?
* Do you you send or Onsight a DWS?
* What does an "Attempt" mean on a solo?

This document doesn't answer all the questions, It is merely a description of the architecture adopted by OpenBeta to try to best caputre how climbers generally want to keep track of their ticks, while restricting some obvious things that don't make sense, like ticking a Boulder route as a Frenchfree Solo, or a Toprope route as a Lead Pinkpoint

## Architecture

Let's get to the technical details. There are 3 layers to this architecturally in OB
* `Climb.type`
* `Tick.style`
* `Tick.attemptType`

Here are all the possible values for `Climb.type` (also called discipline), as defined in the [Climb Schema](https://github.com/OpenBeta/openbeta-graphql/blob/develop/src/graphql/schema/Climb.gql#L115), and Tick style and attemptsTypes defined in the [TickSchema](https://github.com/OpenBeta/openbeta-graphql/blob/develop/src/db/TickTypes.ts).

| Climb.type    | Tick.style | Tick.attemptType |
|---------------|------------|------------------|
| trad          | Lead       | Onsight          |
| sport         | Follow     | Flash            |
| bouldering    | TR         | Redpoint         |
| deepwatersolo | Solo       | Pinkpoint        |
| snow          | Aid        | Send             |
| ice           | Boulder    | Attempt          |
| aid           |            | Frenchfree       |
| tr            |            |                  |
| alpine        |            |                  |
| mixed         |            |                  |


See the [Wikipedia Glossary of Climbing Terms](https://en.wikipedia.org/wiki/Glossary_of_climbing_terms) for common definitions of all these terms.

Given the 10 climb types, 6 styles, and 7 attempt types, there are `10*6*7=`**420** diffent ways to "tick" a route. *(Thats not even accounting for the fact that a route can be multiple disciplines, eg: boulder & TR, or sport & deepwatersolo. If you really want to get nerdy: with the `2^10=1024` possible discipline combinations, there are a whopping `1024*6*7=`**43,008** ways to tick a route!)*

## Here's a Hierarchical way to restrict values:

### Climb type -> Tick Style

| Climb Type        | logical description | Tick Style Options     |
|-------------------|---------------------|--------------------    |
| 'trad', 'sport', 'snow', 'ice', 'mixed', 'alpine'  | leadable | Lead, Follow |
| 'tr' or leadable  | topropeable       | TR                       |
| 'aid'             | aidable | Aid                                |
| 'deepwatersolo' or leadable or aidable or topropeable | soloable | Solo       |
| bouldering        | boulderable | Boulder                        |


Since a route can have multiple disciplines, these options are composable. eg: a route marked as 'trad, aid', is both 'leadable' and 'aidable'. A route that is 'boulder, tr', is both 'boulderable' and 'topropeable'

### Tick Style -> Tick Attempt Type

| Tick Style | Attempt Type options |
|------------|----------------------|
| 'Lead' | 'Onsight', 'Flash', 'Redpoint', 'Pinkpoint', 'Attempt', 'Frenchfree' |
| 'Follow', 'TR' or 'Aid | 'Send', 'Attempt' |
| 'Solo' | 'Onsight', 'Flash', 'Redpoint', 'Attempt' |
| 'Boulder' | 'Flash', 'Send', 'Attempt' |

## A few justifications

* While many people use terms like "trash" or "tronsight" to indicate a "toprope flash/onsight", most climbers dont use the terms "onsight", "flash" and "redpoint" for topropped routes. However, many people want to distinguish a "clean" TR ascent, so OB allows the generic term "send" for topropes.
* Common boulding nomenclature indicates that there is no such thing as an "onsight" of a boulder, only a flash, and instead of using the term "redpoint" for a send after multiple attempts, boulderes just use the generic term send.
* OB does not use the term "Fell/Hung" for roped climbs, and instead normalizes it to "Attempt", just like boulders. Importing routes from MP will convert "Fell/Hung" to "Attempt"
* While 'Frenchfree' and 'Aid' could be considered synomonous, some climbers may want to distinguish, for example, a multipitch route where one pitch was intentionally 'French freed' (Time Wave Zero being a common example), which is distinctly different in character than, eg: aiding the Nose on El Cap.
* Eventually, it might be cool to allow ticks for individual pitches, but that is not supported right now.
* Given the 43,008 possible combinations, no simple logical system will perfectly capture every edge case.


## Importing from Mountain Project

OP stores ticks a bit differently in the database than MP. Mainly around boulders. For Boulders, MP sets LeadStyle to null, and uses thh "style" field for  Send, Attempt, and Flash. Open Beta sets the "style" to "boulder", and then uses attemptType to store Send, Attempt, and Flash, to be consistent with ticks for roped climbs. The Logic around [importing Ticks](https://github.com/OpenBeta/open-tacos/blob/develop/src/app/api/user/bulkImportTicks/route.ts), and tick validation ([frontend](https://github.com/OpenBeta/open-tacos/blob/develop/src/components/users/TickForm.tsx) and [backend](https://github.com/OpenBeta/openbeta-graphql/blob/develop/src/model/TickDataSource.ts)) is somewhat complicated, but it should result in fairly clean data in the OB database.