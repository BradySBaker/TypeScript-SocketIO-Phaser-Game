// 1: 'bone',
// 2: 'goo',
// 3: 'stone',
// 4: 'spear'
type Drop = 'bone' | 'stone' | 'goo' | 'spear' | 'bone_pickaxe' | 'bone_hatchet';
let recipes: {[result in Drop]?: {[item in Drop]?: number}} = {
  'bone_pickaxe': {'bone': 2, 'goo': 2},
  'bone_hatchet': {'bone': 2, 'goo': 2}
}
export default recipes;