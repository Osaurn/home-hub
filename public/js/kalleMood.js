(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KalleMood = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const MESSAGES = {
    excited: [
      'Kaikki tehty! Olet mestari!',
      'Hurraa! Ei yhtään tekemätöntä!',
      'Koti on priimakunnossa – mahtavaa työtä!',
    ],
    happy: [
      'Hyvin menee! Pari pientä hommaa odottaa.',
      'Ei kiirettä, olet ajan tasalla!',
      'Hienoa! Kaikki on hallinnassa.',
    ],
    confident: [
      'Tehtäviä on kasassa, mutta mikään ei ole myöhässä. Sinä pystyt tähän!',
      'Yksi kerrallaan – sinä hoidat nämä!',
      'Vasara valmiina! Aloitetaanko?',
    ],
    concerned: [
      'Hmm, pari tehtävää on jäänyt myöhään…',
      'Hetkinen, jotain on unohtunut. Katsotaanko yhdessä?',
      'Vähän huolettaa nuo myöhässä olevat.',
    ],
    exhausted: [
      'Huh huh… Tehtäviä on kasaantunut aika paljon.',
      'Minua väsyttää jo pelkkä myöhässä olevien lista!',
      'Apua! Nyt tarvitaan yhteistyötä.',
    ],
    sad: [
      'Voi ei… Tehtäviä on jäänyt pahasti roikkumaan. Minulla on surku.',
      'Olen aika surullinen. Koti kaipaa huoltoa…',
      'Kukaan ei ole tehnyt mitään pitkään aikaan. Snif.',
    ],
  };

  const ALT = {
    excited: 'Innostunut Kalle',
    happy: 'Iloinen Kalle',
    confident: 'Itsevarma Kalle',
    concerned: 'Huolestunut Kalle',
    exhausted: 'Uupunut Kalle',
    sad: 'Surullinen Kalle',
  };

  function computeKalleMood(overdueCount, dueCount) {
    if (overdueCount === 0) {
      if (dueCount === 0) return 'excited';
      return dueCount <= 3 ? 'happy' : 'confident';
    }
    if (overdueCount <= 2) return 'concerned';
    if (overdueCount <= 5) return 'exhausted';
    return 'sad';
  }

  function pickMessage(mood, rand) {
    const list = MESSAGES[mood];
    return list[Math.floor((rand || Math.random)() * list.length)];
  }

  return { computeKalleMood, pickMessage, MESSAGES, ALT };
});
