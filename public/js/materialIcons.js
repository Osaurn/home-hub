(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MaterialIcons = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const FALLBACK = '📦';

  // First matching rule wins. Patterns are tried against the category first,
  // then the name.
  const RULES = [
    { icon: '🎨', pattern: /maali|väri|lakka|lasuuri|pohjuste|öljy|petsi|sävy/ },
    { icon: '🧴', pattern: /saumaus|sauma|silikoni|tiiviste|akryyli|massa/ },
    { icon: '🔲', pattern: /laatta|laatat|laatoit|klinkkeri|mosaiikki/ },
    { icon: '🧱', pattern: /tiili|harkko|laasti|betoni|tasoite|rappaus|kivi/ },
    { icon: '🪵', pattern: /puu|lauta|terassi|vaneri|hirsi|kipsi|levy/ },
    { icon: '🟫', pattern: /lattia|parketti|laminaatti|matto|vinyyli/ },
    { icon: '📜', pattern: /tapetti|tapetoi/ },
    { icon: '🧶', pattern: /eriste|villa|vaahto/ },
    { icon: '🔩', pattern: /ruuvi|naula|kiinnike|kiinnit|pultti/ },
    { icon: '🧪', pattern: /liima|kitti|hartsi|pohjustusaine|kemikaali/ },
    { icon: '🏠', pattern: /katto|pelti|kate|sadevesi|räystäs/ },
    { icon: '🪟', pattern: /lasi|ikkuna|ovi/ },
    { icon: '🔌', pattern: /sähkö|johto|kaapeli|pistorasia/ },
    { icon: '🚰', pattern: /putki|vesi|viemäri|hana/ },
  ];

  // Choices offered in the material form's icon picker.
  const PICKER_ICONS = ['🎨', '🧴', '🔲', '🧱', '🪵', '🟫', '📜', '🧶', '🔩', '🧪', '🏠', '🪟', '🔌', '🚰', '🪣', '📦'];

  function matchText(text) {
    const t = (text || '').toLowerCase();
    if (!t) return null;
    const rule = RULES.find((r) => r.pattern.test(t));
    return rule ? rule.icon : null;
  }

  // Manual override (material.icon) wins; otherwise guess from category, then name.
  function materialIcon(material) {
    if (material.icon) return material.icon;
    return matchText(material.category) || matchText(material.name) || FALLBACK;
  }

  return { materialIcon, PICKER_ICONS, FALLBACK };
});
