(function () {
  const GUIDE_HTML = `
    <h2>Käyttöohje</h2>
    <p>Kalle Kotiapuri pitää kirjaa kodin määräaikaishuolloista: mitä pitää tehdä, milloin, ja mitä on jo tehty.</p>

    <h3>Siirtyminen sovelluksessa</h3>
    <p>Kallen kasvokuva ja nimi ("Kalle Kotiapuri") vasemmassa yläkulmassa vie aina etusivun vuosikelloon. Yläpalkin muut linkit: "Kaikki tehtävät" (koko tehtävälista) ja "Historia" (kaikki tekokerrat). Pyöreä "?"-painike avaa tämän ohjeen miltä tahansa sivulta.</p>

    <h3>Kalle ja hänen tunnelmansa</h3>
    <p>Etusivun ylälaidassa Kalle seuraa tilannetta ja kommentoi sitä puhekuplassa. Kun kaikki on tehty, Kalle on innoissaan. Kun tehtäviä on myöhässä, hän huolestuu, uupuu ja lopulta surullisena kaipaa apuasi.</p>

    <h3>Vuosikello</h3>
    <p>Etusivun kello näyttää vuoden neljä vuodenaikaa. Väri kertoo tilanteen:</p>
    <ul>
      <li><span class="legend-dot" style="background:#1f7a5c"></span>Vihreä — kauden tehtävät on tehty</li>
      <li><span class="legend-dot" style="background:#e0a526"></span>Keltainen — jotain on tekemättä tällä hetkellä</li>
      <li><span class="legend-dot" style="background:#d7263d"></span>Punainen — jokin tehtävä on myöhässä</li>
      <li><span class="legend-dot" style="background:#e8e8e8"></span>Harmaa — vuodenaika ei ole vielä alkanut</li>
    </ul>
    <p>Klikkaamalla vuodenaikaa (esim. "Syksy") näet kaikki sille neljännekselle kuuluvat tehtävät ja niiden tilan. Jos tehtävillä on tunnisteita, voit vielä suodattaa listaa niiden mukaan.</p>

    <h3>Tehtävän merkitseminen tehdyksi</h3>
    <p>Paina tehtävän kohdalla "Merkitse tehdyksi" -painiketta. Tehtävän tekemispäivä ja mahdollinen muistiinpano tallentuvat historiaan, ja tehtävä katoaa "Tehtävät nyt" / "Myöhässä" -listalta.</p>

    <h3>Uuden tehtävän lisääminen</h3>
    <p>Paina "+ Lisää tehtävä". Valitse toistuvuus:</p>
    <ul>
      <li><strong>Vuosineljänneksittäin</strong> — tehtävä toistuu joka vuosi valitsemillasi vuosineljänneksillä (esim. ilmansuodattimien vaihto keväällä ja syksyllä).</li>
      <li><strong>Tarkka kuukausi</strong> — tehtävä toistuu joka vuosi tietyllä kuukaudella tai kuukausilla (esim. aina helmikuussa), jos vuosineljännes on liian karkea jako.</li>
      <li><strong>Muutaman vuoden välein</strong> — tehtävä toistuu harvemmin, esim. joka 3.–5. vuosi (esim. ulkoseinien maalaus). Sovellus muistuttaa, kun väli alkaa lähestyä ja merkitsee tehtävän myöhässä olevaksi, jos yläraja ylittyy.</li>
    </ul>
    <p>Ohjeet, tunnisteet ja liitteet voi lisätä heti samalla lomakkeella — kaikki tallentuu, kun painat "Tallenna".</p>

    <h3>Tunnisteet</h3>
    <p>Tunnisteilla voi ryhmitellä tehtäviä vapaasti, esim. "Sisätilat" tai "Turvallisuus". Tehtävän muokkaussivulla klikkaamalla tunnistetta lisäät tai poistat sen kyseiseltä tehtävältä; uuden tunnisteen voi luoda "Uusi tunniste" -kentästä.</p>
    <p>"Kaikki tehtävät" -sivulla ja vuosikellon vuodenaika-näkymässä tunnisteet näkyvät suodattimina listan yläpuolella — paina tunnistetta rajataksesi näkymän siihen. "Kaikki tehtävät" -sivulla jokaisen tunnisteen vieressä on myös punainen ×, jolla tunnisteen voi poistaa kokonaan (kysytään aina vahvistus, ja siinä näkyy, kuinka moneen tehtävään tunniste on tällä hetkellä liitetty).</p>

    <h3>Ohjeet ja liitteet</h3>
    <p>Jokaiselle tehtävälle voi kirjoittaa ohjeet (tukee Markdown-muotoilua) ja liittää tiedostoja, kuten käyttöohjeita tai kuvia. Sekä ohjeet että liitteet löytyvät ja niitä voi muokata milloin tahansa tehtävän muokkaussivulta.</p>

    <h3>Historia</h3>
    <p>Etusivun "Viimeksi tehdyt" -osio näyttää viisi tuoreinta tekokertaa, ja "Historia"-sivu koko listan aikajärjestyksessä. Yksittäisen tehtävän omalla muokkaussivulla näkyy vain sen tehtävän tekokerrat, ja vahingossa tehdyn merkinnän voi kumota "Kumoa"-painikkeella.</p>

    <h3>Käyttäjät</h3>
    <p>Sovellusta voi käyttää samaan aikaan useampi laite kotiverkossa — kaikki näkevät saman ajantasaisen tilanteen.</p>
  `;

  function buildHelpUI() {
    const header = document.querySelector('header.site');
    const nav = header && header.querySelector('nav');
    if (!header || !nav) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'help-btn';
    btn.setAttribute('aria-label', 'Ohje');
    btn.textContent = '?';
    nav.appendChild(btn);

    const overlay = document.createElement('div');
    overlay.className = 'help-overlay';
    overlay.innerHTML = `
      <div class="help-modal" role="dialog" aria-modal="true" aria-label="Käyttöohje">
        <button type="button" class="help-close" aria-label="Sulje ohje">×</button>
        <div class="help-content">${GUIDE_HTML}</div>
      </div>`;
    document.body.appendChild(overlay);

    function onKeydown(e) {
      if (e.key === 'Escape') closeHelp();
    }

    function openHelp() {
      overlay.classList.add('open');
      document.addEventListener('keydown', onKeydown);
    }

    function closeHelp() {
      overlay.classList.remove('open');
      document.removeEventListener('keydown', onKeydown);
    }

    btn.addEventListener('click', openHelp);
    overlay.querySelector('.help-close').addEventListener('click', closeHelp);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeHelp();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildHelpUI);
  } else {
    buildHelpUI();
  }
})();
