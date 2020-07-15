import cloneDeep from '../cloneDeep'
let o = {
  a: '1',
  b: {
    d: 1234
  },
  c: [1, 2, 3]
}
let cloned = cloneDeep(o)
console.log(cloned)