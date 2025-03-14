// export const GET_LIST = 'GET_LIST';
// export const GET_ONE = 'GET_ONE';
// export const GET_MANY = 'GET_MANY';
// export const GET_MANY_REFERENCE = 'GET_MANY_REFERENCE';
// export const CREATE = 'CREATE';
// export const UPDATE = 'UPDATE';
// export const UPDATE_MANY = 'UPDATE_MANY';
// export const DELETE = 'DELETE';
// export const DELETE_MANY = 'DELETE_MANY';
/**
 * Supported data actions
 */
export const GET_LIST = 'getList';
export const GET_MANY = 'getMany';
export const GET_ONE = 'getOne';
export const CREATE = 'create';
export const UPDATE = 'update';
export const UPDATE_MANY = 'updateMany';
export const DELETE = 'delete';
export const DELETE_MANY = 'deleteMany';
export const GET_MANY_REFERENCE = 'getManyReference';

/**
 * Specific optional tree actions
 */
export const GET_TREE = 'getTree';
export const GET_NODES = 'getNodes';
export const MOVE_NODE = 'moveNode';

export const fetchActionsWithRecordResponse = [GET_ONE, CREATE, UPDATE];
export const fetchActionsWithArrayOfIdentifiedRecordsResponse = [
  GET_LIST,
  GET_MANY,
  GET_MANY_REFERENCE,
];
export const fetchActionsWithArrayOfRecordsResponse = [
  ...fetchActionsWithArrayOfIdentifiedRecordsResponse,
  UPDATE_MANY,
  DELETE_MANY,
];
export const fetchActionsWithTotalResponse = [GET_LIST, GET_MANY_REFERENCE];

export const sanitizeFetchType = (fetchType) => {
  switch (fetchType) {
    case GET_LIST:
      return 'getList';
    case GET_ONE:
      return 'getOne';
    case GET_MANY:
      return 'getMany';
    case GET_MANY_REFERENCE:
      return 'getManyReference';
    case CREATE:
      return 'create';
    case UPDATE:
      return 'update';
    case UPDATE_MANY:
      return 'updateMany';
    case DELETE:
      return 'delete';
    case DELETE_MANY:
      return 'deleteMany';
    default:
      return fetchType;
  }
};
