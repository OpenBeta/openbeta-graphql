# Schema Files

If you enjoy syntax hilighting and GQL formatting then, this seperation will be good for you health.
Take a look at the https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql extension, this will provide auto-formatting and syntax hilighting in this project.

This will also give us better clarity on services like GitHub with syntax hilighting and readability. It also gives our project a better layout with proper IDE icons that indicate file intent.

## Documentation Guidelines

The schema defines available data, but should always **describe** the data and its purpose. No attribute should be assumed to be obvious to other developers. New developers in particular will have no sense of existing terminology, and data should be explained to API consumers on the assumption that they do not share a common vocab with you.

You can use basic markdown inside field / query documentation and we strongly encourage you make use of it in instances that make the content more readable.

You may feel free to copy/paste type documentation if there is no difference between exposed data and internal data, but some data is passed and understood differently within the API, or has no literal data but is resolved as a computed value.

## Exploring Schema

Building this project locally and then doing `yarn serve` will allow you to browse the schema on your local machine, along with markdown rendering and searchable structure. Look at the [Root README](../../../README.md) for more information on building.
