import Stack from './Stack.js'
import arrayEach from './arrayEach.js'
import assignValue from './assignValue.js'
import cloneBuffer from './cloneBuffer.js'
import copyArray from './copyArray.js'
import copyObject from './copyObject.js'
import cloneArrayBuffer from './cloneArrayBuffer.js'
import cloneDataView from './cloneDataView.js'
import cloneRegExp from './cloneRegExp.js'
import cloneSymbol from './cloneSymbol.js'
import cloneTypedArray from './cloneTypedArray.js'
import copySymbols from './copySymbols.js'
import copySymbolsIn from './copySymbolsIn.js'
import getAllKeys from './getAllKeys.js'
import getAllKeysIn from './getAllKeysIn.js'
import getTag from './getTag.js'
import initCloneObject from './initCloneObject.js'
import isBuffer from '../isBuffer.js'
import isObject from '../isObject.js'
import isTypedArray from '../isTypedArray.js'
import keys from '../keys.js'
import keysIn from '../keysIn.js'

/** Used to compose bitmasks for cloning. */
const CLONE_DEEP_FLAG = 1
const CLONE_FLAT_FLAG = 2
const CLONE_SYMBOLS_FLAG = 4

/** `Object#toString` result references. */
const argsTag = '[object Arguments]'
const arrayTag = '[object Array]'
const boolTag = '[object Boolean]'
const dateTag = '[object Date]'
const errorTag = '[object Error]'
const mapTag = '[object Map]'
const numberTag = '[object Number]'
const objectTag = '[object Object]'
const regexpTag = '[object RegExp]'
const setTag = '[object Set]'
const stringTag = '[object String]'
const symbolTag = '[object Symbol]'
const weakMapTag = '[object WeakMap]'

const arrayBufferTag = '[object ArrayBuffer]'
const dataViewTag = '[object DataView]'
const float32Tag = '[object Float32Array]'
const float64Tag = '[object Float64Array]'
const int8Tag = '[object Int8Array]'
const int16Tag = '[object Int16Array]'
const int32Tag = '[object Int32Array]'
const uint8Tag = '[object Uint8Array]'
const uint8ClampedTag = '[object Uint8ClampedArray]'
const uint16Tag = '[object Uint16Array]'
const uint32Tag = '[object Uint32Array]'

/** Used to identify `toStringTag` values supported by `clone`. */
const cloneableTags = {}
cloneableTags[argsTag] = cloneableTags[arrayTag] =
cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] =
cloneableTags[boolTag] = cloneableTags[dateTag] =
cloneableTags[float32Tag] = cloneableTags[float64Tag] =
cloneableTags[int8Tag] = cloneableTags[int16Tag] =
cloneableTags[int32Tag] = cloneableTags[mapTag] =
cloneableTags[numberTag] = cloneableTags[objectTag] =
cloneableTags[regexpTag] = cloneableTags[setTag] =
cloneableTags[stringTag] = cloneableTags[symbolTag] =
cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true
cloneableTags[errorTag] = cloneableTags[weakMapTag] = false // 非克隆对象

/** Used to check objects for own properties. */
const hasOwnProperty = Object.prototype.hasOwnProperty

/**
 * Initializes an object clone based on its `toStringTag`.
 *
 * **Note:** This function only supports cloning values with tags of
 * `Boolean`, `Date`, `Error`, `Map`, `Number`, `RegExp`, `Set`, or `String`.
 *
 * @private
 * @param {Object} object The object to clone.
 * @param {string} tag The `toStringTag` of the object to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneByTag(object, tag, isDeep) {
  const Ctor = object.constructor
  switch (tag) {
    case arrayBufferTag:
      return cloneArrayBuffer(object)
    // bool 
    case boolTag:
    case dateTag:
      return new Ctor(+object)

    case dataViewTag:
      return cloneDataView(object, isDeep)
    // 类型化数组则调用 cloneTypedArray
    case float32Tag: case float64Tag:
    case int8Tag: case int16Tag: case int32Tag:
    case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
      return cloneTypedArray(object, isDeep)

    // 基本类型 string，number 直接 new
    case numberTag:
    case stringTag:
      return new Ctor(object)

    case regexpTag:
      return cloneRegExp(object)
    // set 和 map 先 new ，然后再调用 add 或 set 方法一个一个加进去
    case mapTag:
      return new Ctor
    case setTag:
      return new Ctor
    // symbol 类型则调用 cloneSymbol 函数
    case symbolTag:
      return cloneSymbol(object)
  }
}

/**
 * Initializes an array clone.
 *
 * @private
 * @param {Array} array The array to clone.
 * @returns {Array} Returns the initialized clone.
 */
function initCloneArray(array) {
  const { length } = array
  // 等同于 new Array(length)
  const result = new array.constructor(length)

  // Add properties assigned by `RegExp#exec`.
  // 正则 match 返回的数组特殊处理
  if (length && typeof array[0] === 'string' && hasOwnProperty.call(array, 'index')) {
    result.index = array.index
    result.input = array.input
  }
  return result
}

/**
 * The base implementation of `clone` and `cloneDeep` which tracks
 * traversed objects.
 *
 * @private
 * @param {*} value The value to clone.
 * @param {number} bitmask The bitmask flags.
 *  1 - Deep clone
 *  2 - Flatten inherited properties
 *  4 - Clone symbols
 * @param {Function} [customizer] The function to customize cloning.
 * @param {string} [key] The key of `value`.
 * @param {Object} [object] The parent object of `value`.
 * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
 * @returns {*} Returns the cloned value.
 */
function baseClone(value, bitmask, customizer, key, object, stack) {
  
  let result
  /** 
   * 通过位运算
  */
  const isDeep = bitmask & CLONE_DEEP_FLAG // 是否深拷贝
  const isFlat = bitmask & CLONE_FLAT_FLAG // 是否拷贝原型链
  const isFull = bitmask & CLONE_SYMBOLS_FLAG // 是否拷贝 symbol

  if (customizer) {
    result = object ? customizer(value, key, object, stack) : customizer(value)
  }
  if (result !== undefined) {
    return result
  }
  // 非对象则直接返回值
  if (!isObject(value)) {
    return value
  }
  const isArr = Array.isArray(value)
  const tag = getTag(value)
  // 对象是数组
  if (isArr) {
    result = initCloneArray(value)
    if (!isDeep) {
      // 浅拷贝数组，深拷贝在后面的 arrayEach 里拷贝
      return copyArray(value, result)
    }
  } else {
    // 对象非数组
    const isFunc = typeof value === 'function'
    //  buffer 则调用 cloneBuffer
    if (isBuffer(value)) {
      return cloneBuffer(value, isDeep)
    }
    // 对象，argument 对象，函数对象
    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
      // 初始化对象
      result = (isFlat || isFunc) ? {} : initCloneObject(value)
      if (!isDeep) {
        // 浅拷贝
        return isFlat
          ? copySymbolsIn(value, copyObject(value, keysIn(value), result)) // 拷贝原型链
          : copySymbols(value, Object.assign(result, value)) // 不拷贝原型链
      }
    } else {
      if (isFunc || !cloneableTags[tag]) {
        return object ? value : {}
      }
      // 初始化克隆对象
      result = initCloneByTag(value, tag, isDeep)
    }
  }
  // Check for circular references and return its corresponding clone.
  /** 
   * 使用栈来缓存，处理对象中的循环引用问题，将值保存在栈中，如果缓存中存在该值，则直接取出
   * 其实这个栈并不是数据结构上的栈，只是暴露出了 set 和 get 方法，是用来缓存的
   * 缓存的实现用到了 ListCache 和 MapCache ，ListCache 用了数组实现，MapCache 用了内部 Hash(即 Object 实现) 或者 ES6 Map 实现
   * 当栈的 size 大于 200，则使用 MapCache，否则则使用 ListCache
  */
   
  stack || (stack = new Stack)
  const stacked = stack.get(value)
  if (stacked) {
    return stacked
  }
  stack.set(value, result)

  /** 
   * set 和 map 调用 add 或 set 方法一个一个加进去
  */
  if (tag == mapTag) {
    value.forEach((subValue, key) => {
      result.set(key, baseClone(subValue, bitmask, customizer, key, value, stack))
    })
    return result
  }

  if (tag == setTag) {
    value.forEach((subValue) => {
      result.add(baseClone(subValue, bitmask, customizer, subValue, value, stack))
    })
    return result
  }


  if (isTypedArray(value)) {
    return result
  }
  // 设置获取对象 key 的函数，根据是否拷贝原型链上以及是否拷贝 symbol 选取不同的函数
  const keysFunc = isFull
    ? (isFlat ? getAllKeysIn : getAllKeys)
    : (isFlat ? keysIn : keys)

  const props = isArr ? undefined : keysFunc(value)
  console.log('props', props)
  console.log('value', value)
  // console.log('result', result)
  /** 
   * arrayEach(array, iteratee) 第一个对象是要迭代的数组，类似forEach
   * 最后通过 arrayEach 遍历对象中的key，然后递归调用
  */
  arrayEach(props || value, (subValue, key) => {
    
    if (props) {
      key = subValue
      subValue = value[key]
      
    }
    console.log('subValue', subValue)
    console.log('key', key)
    // Recursively populate clone (susceptible to call stack limits).
    /** 
     * assignValue(object, key, value) {
     * 作用 result[key] = value
    */
    assignValue(result, key, baseClone(subValue, bitmask, customizer, key, value, stack))
  })

  // console.log(value, bitmask, customizer, key, stack.getData())
  return result
}

export default baseClone
