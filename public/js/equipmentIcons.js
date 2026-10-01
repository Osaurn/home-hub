(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EquipmentIcons = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const FALLBACK = '🔧';

  // First matching rule wins. Patterns are tried against the category first,
  // then the name, so "Lämmitys" beats a name like "Vesikiertopumppu".
  const RULES = [
    { icon: '🚰', pattern: /vesi|viemäri|putki|kaivo|salaoja|hana/ },
    { icon: '🌬️', pattern: /ilmanvaihto|ilmastointi|tuuletin|ilmanpuhdist|iv-|ivk/ },
    { icon: '🔥', pattern: /lämmit|lämpö|lämpim|kattila|takka|pannu|patteri|lattialämp|sauna|kiuas/ },
    { icon: '⚡', pattern: /sähkö|sulake|akku|aurinkopaneeli|laturi|invertteri/ },
    { icon: '🧊', pattern: /jääkaappi|pakastin|kylmä/ },
    { icon: '🧺', pattern: /pesukone|kuivausrumpu|kuivaus|astianpesu|tiskikone/ },
    { icon: '🍳', pattern: /liesi|uuni|mikro|keitto|liesituuletin/ },
    { icon: '🚗', pattern: /^auto\b|autotalli|ajoneuvo|\bauto\b/ },
    { icon: '🌿', pattern: /piha|ruohonleikkuri|puutarha|pensas|kasvi/ },
    { icon: '🧯', pattern: /palo|pelastus|sammutin|häly|savuhälytin/ },
    { icon: '🔒', pattern: /lukko|ovi|hälytysjärjestelmä|kamera/ },
    { icon: '💡', pattern: /valaist|lamppu|valo/ },
  ];

  // Choices offered in the equipment form's icon picker.
  const PICKER_ICONS = ['🔥', '🌬️', '🚰', '⚡', '🧊', '🧺', '🍳', '🚗', '🌿', '🧯', '🔒', '💡', '🛠️', '🏠', '🔧'];

  function matchText(text) {
    const t = (text || '').toLowerCase();
    if (!t) return null;
    const rule = RULES.find((r) => r.pattern.test(t));
    return rule ? rule.icon : null;
  }

  // Manual override (equipment.icon) wins; otherwise guess from category, then name.
  function equipmentIcon(equipment) {
    if (equipment.icon) return equipment.icon;
    return matchText(equipment.category) || matchText(equipment.name) || FALLBACK;
  }

  return { equipmentIcon, PICKER_ICONS, FALLBACK };
});
