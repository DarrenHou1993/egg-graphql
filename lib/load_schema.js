'use strict';

const fs = require('fs');
const path = require('path');
const {
  makeExecutableSchema,
} = require('graphql-tools');
const _ = require('lodash');

const SYMBOL_SCHEMA = Symbol('Applicaton#schema');

module.exports = app => {
  const basePath = path.join(app.baseDir, 'app/graphql');
  const types = fs.readdirSync(basePath);

  const schemas = [];
  const resolverMap = {};
  const resolverFactories = [];
  const directiveMap = {};
  const schemaDirectivesProps = {};

  types.forEach(type => {
    // Load schema
    const schemaFile = path.join(basePath, type, 'schema.graphql');
    /* istanbul ignore else */
    if (fs.existsSync(schemaFile)) {
      const schema = fs.readFileSync(schemaFile, {
        encoding: 'utf8',
      });
      schemas.push(schema);
    }

    // Load resolver
    let resolverFile = path.join(basePath, type, 'resolver');
    resolverFile = app.loader.resolveModule(resolverFile);

    if (resolverFile) {
      const resolver = require(resolverFile);
      if (_.isFunction(resolver)) {
        resolverFactories.push(resolver);
      } else if (_.isObject(resolver)) {
        _.merge(resolverMap, resolver);
      }
    }

    // Load directive resolver
    let directiveFile = path.join(basePath, type, 'directive');
    directiveFile = app.loader.resolveModule(directiveFile);

    if (directiveFile) {
      const directive = require(directiveFile);
      _.merge(directiveMap, directive);
    }

    // Load schemaDirectives
    let schemaDirectivesFile = path.join(basePath, type, 'schemaDirective');
    schemaDirectivesFile = app.loader.resolveModule(schemaDirectivesFile);
    if (schemaDirectivesFile) {
      schemaDirectivesFile = require(schemaDirectivesFile);
      _.merge(schemaDirectivesProps, schemaDirectivesFile);
    }
  });

  Object.defineProperty(app, 'schema', {
    get() {
      if (!this[SYMBOL_SCHEMA]) {
        resolverFactories.forEach(resolverFactory =>
          _.merge(resolverMap, resolverFactory(app))
        );

        this[SYMBOL_SCHEMA] = makeExecutableSchema({
          typeDefs: schemas,
          resolvers: resolverMap,
          directiveResolvers: directiveMap,
          schemaDirectives: schemaDirectivesProps,
        });
      }
      return this[SYMBOL_SCHEMA];
    },
  });
};
