// 1: 'bone',
// 2: 'goo',
// 3: 'stone',
// 4: 'spear'

let recipe: {[result in Drop]?: {[item in Drop]?: number}} = {
  'bone_pickaxe': {'bone': 1},

}
export default recipe;