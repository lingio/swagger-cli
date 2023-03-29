# swagger-cli

```
npx lingio/swagger-cli <path/to/openapi3.yaml> > bundle.yaml
```

```shell
$ tree openapi

openapi
├── paths
│   ├── elearngames.yaml
│   ├── games@{game}.yaml
│   ├── games.yaml
│   └── onboarding-games.yaml
├── responses
│   ├── Error.yaml
│   └── Game.yaml
├── schemas
│   ├── ep
│   │   ├── GrammarExercise.yaml
│   │   ├── ImageSet.yaml
│   │   ├── ListeningExercise.yaml
│   │   ├── PronounceWordExercise.yaml
│   │   ├── QuizAlt.yaml
│   │   ├── ReadingExercise.yaml
│   │   ├── Segment.yaml
│   │   ├── SpellingExercise.yaml
│   │   ├── TextExercise.yaml
│   │   ├── TranslationExercise.yaml
│   │   └── WordExercise.yaml
│   ├── Error.yaml
│   ├── ExercisePack.yaml
│   ├── GameReq.yaml
│   ├── GameTemplate.yaml
│   ├── GameType.yaml
│   ├── Game.yaml
│   ├── StepType.yaml
│   ├── Step.yaml
│   └── TemplateStep.yaml
└── spec.yaml

$ npx lingio/swagger-cli openapi/spec.yaml > spec.yaml
```

## why

The original [swagger-cli](https://github.com/APIDevTools/swagger-cli) embeds `$ref: "./other.yaml` definitions verbatim in the root document and rewrites other `$ref: "./other.yaml"` to ~bs~ internal refs like `$ref: "#/paths/~1game/responses/200/content/json/~1other`.

[Issue 127](https://github.com/APIDevTools/swagger-parser/issues/127) mentions that stoplight implemented the expected behavior in their [fork of the underlying lib](https://github.com/stoplightio/json-schema-ref-parser).

Their implementation works but has an annoying limitation:

- no two resources may share the same name
- e.g. `/responses/Game.yaml` and `/components/Game.yaml` will after bundling be renamed `/responses/Game` and `/components/Game_2`

This repo just hacks the `key-generator.js` to allow same-key as long as the path is different. This will likely break on some folder structures. Works for our use-case, though.
