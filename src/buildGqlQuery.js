import {
  GET_LIST,
  GET_MANY,
  GET_MANY_REFERENCE,
  GET_ONE,
  DELETE,
  CREATE,
  UPDATE,
  UPDATE_MANY,
  DELETE_MANY,
  GET_TREE,
  GET_NODES,
  MOVE_NODE,
} from './fetchActions';

import { TypeKind } from 'graphql';
import * as gqlTypes from 'graphql-ast-types-browser';

import getFinalType from './getFinalType';
import isList from './isList';
import isRequired from './isRequired';
const pluralize = require('pluralize');

export const buildFragments = (introspectionResults) => (possibleTypes) =>
  possibleTypes.reduce((acc, possibleType) => {
    const type = getFinalType(possibleType);

    const linkedType = introspectionResults.types.find(
      (t) => t.name === type.name
    );

    return [
      ...acc,
      gqlTypes.inlineFragment(
        gqlTypes.selectionSet(buildFields(linkedType)),
        gqlTypes.namedType(gqlTypes.name(type.name))
      ),
    ];
  }, []);
export const buildTreeChildrenFields = (rootType) =>
  rootType.fields.reduce((acc, field) => {
    if (field.name !== 'children') {
      return acc;
    }
    const finalType = getFinalType(field.type);
    //获取introspectionResults
    const includeResource = introspectionResults.resources.find(
      (r) => r.type.name === finalType.name
    );
    if (!includeResource) {
      return acc;
    }

    if (
      finalType.kind == TypeKind.OBJECT ||
      finalType.kind == TypeKind.INTERFACE
    ) {
      const nestFields = buildFields(includeResource.type);
      const childrenFields = buildTreeChildrenFields(includeResource.type);
      let gqlField = gqlTypes.field(
        gqlTypes.name(field.name),
        null,
        null,
        null,
        gqlTypes.selectionSet([...nestFields, ...childrenFields])
      );
      return [...acc, gqlField];
    }

    return acc;
  }, []);
export const buildIncludeFields = (
  introspectionResults,
  rootType,
  includes = []
) =>
  rootType.fields.reduce((acc, field) => {
    if (!includes.includes(field.name)) {
      return acc;
    }
    const finalType = getFinalType(field.type);
    //获取introspectionResults
    const includeResource = introspectionResults.resources.find(
      (r) => r.type.name === finalType.name
    );
    if (!includeResource) {
      return acc;
    }

    if (
      finalType.kind == TypeKind.OBJECT ||
      finalType.kind == TypeKind.INTERFACE
    ) {
      const nestFields = buildFields(includeResource.type);
      let gqlField = gqlTypes.field(
        gqlTypes.name(field.name),
        null,
        null,
        null,
        gqlTypes.selectionSet(nestFields)
      );
      return [...acc, gqlField];
    }

    return acc;
  }, []);

export const buildFields = (type, aorFetchType = '') => {
  const fields = type.fields.reduce((acc, field) => {
    const type = getFinalType(field.type);

    if (type.kind !== TypeKind.OBJECT && type.kind !== TypeKind.INTERFACE) {
      return [...acc, gqlTypes.field(gqlTypes.name(field.name))];
    }
    return acc;
  }, []);
  return fields;
};

export const getArgType = (arg) => {
  const type = getFinalType(arg.type);
  const required = isRequired(arg.type);
  const list = isList(arg.type);

  if (required) {
    if (list) {
      return gqlTypes.nonNullType(
        gqlTypes.listType(
          gqlTypes.nonNullType(gqlTypes.namedType(gqlTypes.name(type.name)))
        )
      );
    }

    return gqlTypes.nonNullType(gqlTypes.namedType(gqlTypes.name(type.name)));
  }

  if (list) {
    return gqlTypes.listType(gqlTypes.namedType(gqlTypes.name(type.name)));
  }

  return gqlTypes.namedType(gqlTypes.name(type.name));
};

export const buildArgs = (query, variables) => {
  if (query.args.length === 0) {
    return [];
  }

  const validVariables = Object.keys(variables).filter(
    (k) => typeof variables[k] !== 'undefined'
  );

  let args = query.args
    .filter((a) => validVariables.includes(a.name))
    .reduce(
      (acc, arg) => [
        ...acc,
        gqlTypes.argument(
          gqlTypes.name(arg.name),
          gqlTypes.variable(gqlTypes.name(arg.name))
        ),
      ],
      []
    );

  return args;
};

export const buildMetaArgs = (query, variables, aorFetchType) => {
  if (query.args.length === 0) {
    return [];
  }

  const validVariables = Object.keys(variables).filter((k) => {
    if (
      aorFetchType === GET_LIST ||
      aorFetchType === GET_MANY ||
      aorFetchType === GET_MANY_REFERENCE ||
      aorFetchType === GET_TREE ||
      aorFetchType === GET_NODES
    ) {
      return (
        typeof variables[k] !== 'undefined' && k !== 'limit' && k !== 'offset'
      );
    }

    return typeof variables[k] !== 'undefined';
  });

  let args = query.args
    .filter((a) => validVariables.includes(a.name))
    .reduce(
      (acc, arg) => [
        ...acc,
        gqlTypes.argument(
          gqlTypes.name(arg.name),
          gqlTypes.variable(gqlTypes.name(arg.name))
        ),
      ],
      []
    );

  return args;
};

export const buildApolloArgs = (query, variables) => {
  if (query.args.length === 0) {
    return [];
  }

  const validVariables = Object.keys(variables).filter(
    (k) => typeof variables[k] !== 'undefined'
  );

  let args = query.args
    .filter((a) => validVariables.includes(a.name))
    .reduce((acc, arg) => {
      return [
        ...acc,
        gqlTypes.variableDefinition(
          gqlTypes.variable(gqlTypes.name(arg.name)),
          getArgType(arg)
        ),
      ];
    }, []);

  return args;
};

export const buildGqlQuery =
  (
    introspectionResults,
    buildFields,
    buildMetaArgs,
    buildArgs,
    buildApolloArgs,
    aggregateFieldName
  ) =>
  (
    resource,
    aorFetchType,
    queryType,
    variables = {},
    includeResourceNames = []
  ) => {
    const { sortField, sortOrder, ...metaVariables } = variables;
    const apolloArgs = buildApolloArgs(queryType, variables);
    const args = buildArgs(queryType, variables);
    const metaArgs = buildMetaArgs(queryType, metaVariables, aorFetchType);

    if (aorFetchType === GET_TREE || aorFetchType === GET_NODES) {
      includeResourceNames.push('children');
    }
    const fields = buildFields(
      resource.type,
      aorFetchType,
      includeResourceNames
    );
    const includeFields = buildIncludeFields(
      introspectionResults,
      resource.type,
      includeResourceNames
    );

    if (
      aorFetchType === GET_LIST ||
      aorFetchType === GET_MANY ||
      aorFetchType === GET_MANY_REFERENCE
    ) {
      return gqlTypes.document([
        gqlTypes.operationDefinition(
          'query',
          gqlTypes.selectionSet([
            gqlTypes.field(
              gqlTypes.name(queryType.name),
              gqlTypes.name('items'),
              args,
              null,
              gqlTypes.selectionSet([...fields, ...includeFields])
            ),
            gqlTypes.field(
              gqlTypes.name(aggregateFieldName(queryType.name)),
              gqlTypes.name('total'),
              metaArgs,
              null,
              gqlTypes.selectionSet([
                gqlTypes.field(
                  gqlTypes.name('aggregate'),
                  null,
                  null,
                  null,
                  gqlTypes.selectionSet([
                    gqlTypes.field(gqlTypes.name('count')),
                  ])
                ),
              ])
            ),
          ]),
          gqlTypes.name(queryType.name),
          apolloArgs
        ),
      ]);
    }
    if (aorFetchType === GET_TREE || aorFetchType === GET_NODES) {
      return gqlTypes.document([
        gqlTypes.operationDefinition(
          'query',
          gqlTypes.selectionSet([
            gqlTypes.field(
              gqlTypes.name(queryType.name),
              gqlTypes.name('items'),
              args,
              null,
              gqlTypes.selectionSet([...fields, ...includeFields])
            ),
          ]),
          gqlTypes.name(queryType.name),
          apolloArgs
        ),
      ]);
    }

    if (
      aorFetchType === CREATE ||
      aorFetchType === UPDATE ||
      aorFetchType === UPDATE_MANY ||
      aorFetchType === DELETE ||
      aorFetchType === DELETE_MANY
    ) {
      return gqlTypes.document([
        gqlTypes.operationDefinition(
          'mutation',
          gqlTypes.selectionSet([
            gqlTypes.field(
              gqlTypes.name(queryType.name),
              gqlTypes.name('data'),
              args,
              null,
              gqlTypes.selectionSet([
                gqlTypes.field(
                  gqlTypes.name('returning'),
                  null,
                  null,
                  null,
                  gqlTypes.selectionSet(fields)
                ),
              ])
            ),
          ]),
          gqlTypes.name(queryType.name),
          apolloArgs
        ),
      ]);
    }

    return gqlTypes.document([
      gqlTypes.operationDefinition(
        'query',
        gqlTypes.selectionSet([
          gqlTypes.field(
            gqlTypes.name(queryType.name),
            gqlTypes.name('returning'),
            args,
            null,
            gqlTypes.selectionSet(fields)
          ),
        ]),
        gqlTypes.name(queryType.name),
        apolloArgs
      ),
    ]);
  };

export default (introspectionResults) =>
  buildGqlQuery(
    introspectionResults,
    buildFields,
    buildMetaArgs,
    buildArgs,
    buildApolloArgs
  );
