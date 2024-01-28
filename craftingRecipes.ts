// 1: 'bone',
// 2: 'goo',
// 3: 'stone',
// 4: 'spear'

let recipes: {[result in Drop]?: {[item in Drop]?: number}} = {
  'bone_pickaxe': {'bone': 2, 'goo': 2},
}
export default recipes;