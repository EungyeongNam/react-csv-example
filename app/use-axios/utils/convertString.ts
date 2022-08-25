import _ from 'lodash'

export enum ConvertType {
  'CAMEL',
  'SNAKE',
}

export const camelize = (obj: any) =>
  _.transform(obj, (acc: any, value, key, target) => {
    const camelKey = _.isArray(target) ? key : _.isString(key) ? _.camelCase(key) : key

    acc[camelKey] = _.isObject(value) ? camelize(value) : value
  })

export const snakelize = (obj: any) =>
  _.transform(obj, (acc: any, value, key, target) => {
    const snakeKey = _.isArray(target) ? key : _.isString(key) ? _.snakeCase(key) : key

    acc[snakeKey] = _.isObject(value) ? snakelize(value) : value
  })

export const convertCaseList = (list: any, resultType: ConvertType) =>
  resultType === ConvertType.CAMEL ? camelize(list) : snakelize(list)
