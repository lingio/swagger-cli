#!/usr/bin/env node
//
// node index.js <path-to-openapi3-spec.yaml>
//
const $RefParser = require('@stoplight/json-schema-ref-parser');
const createStoplightDefaults = require('./defaults');
const jsyaml = require('js-yaml');
const path = require('path');

async function cli(file) {
	const defaults = createStoplightDefaults({
		cwd: path.dirname(file),
		// endpointUrl: "http://localhost:8080",
	})

	const parser = new $RefParser();

	const bundled = await parser.bundle(file, {
		bundle: defaults.oas3,
		dereference: {
			circular: true
		}
	});

	const content = jsyaml.dump(bundled, {
		indent: 2,
		lineWidth: Infinity,
		noRefs: true,
	});

	process.stdout.write(content);
}

if (process.argv.length < 3) {
	console.log("usage:", "swagger-cli <spec.yaml>");
	process.exit(1);
}

cli(process.argv[2]);
