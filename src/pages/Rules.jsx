export default function Rules() {
  return (
    <div className="rules-page">
      <div className="section-head">
        <div><h2>Regler</h2></div>
      </div>

      <div className="rules-body">
        <section className="rules-section">
          <h3>Slik tipper du</h3>
          <ul>
            <li>Velg hjemmeseier, uavgjort eller borteseier for hver kamp.</li>
            <li>Tipset ditt lagres automatisk når du klikker — det er ingen send-knapp.</li>
            <li>Klikk på samme valg igjen for å fjerne tipset.</li>
          </ul>
        </section>

        <section className="rules-section">
          <h3>Poeng</h3>
          <ul>
            <li>Du får poeng for hvert riktig tipp.</li>
            <li>Poengverdiene er basert på odds: jo mer overraskende utfallet, jo høyere poengsum.</li>
            <li>Du kan se poengverdiene direkte på hver kamp.</li>
          </ul>
        </section>

        <section className="rules-section">
          <h3><span className="rules-bolt">⚡</span> Booster (2x)</h3>
          <ul>
            <li>Du kan doble poengene på ett tipp per periode med en 2x-booster.</li>
            <li>Periodene er gruppespillets runde 1, 2 og 3 — og deretter hver sluttspillrunde for seg (åttedelsfinaler, kvartfinaler, semifinaler, bronsefinale og finale).</li>
            <li>Tipp først, og trykk så på ⚡-knappen på kampen du vil booste.</li>
            <li>Treffer du, blir poengene doblet. Bommer du, skjer ingenting ekstra — boosteren er bare en fordel.</li>
            <li>Du kan flytte boosteren fritt mellom kamper i samme periode helt til den boostede kampen låses.</li>
            <li>Ubrukte boostere overføres ikke til neste periode.</li>
          </ul>
        </section>

        <section className="rules-section">
          <h3>Låsing av kamper</h3>
          <ul>
            <li>Tipping stenges 5 minutter før kampstart.</li>
            <li>Låste kamper viser «Kampen er i gang» med ditt valg (om du har tippet).</li>
            <li>Etter kampen er ferdig forsvinner den fra tippevisningen.</li>
          </ul>
        </section>

        <section className="rules-section">
          <h3>Ligaer</h3>
          <ul>
            <li>Opprett en liga eller bli med via invitasjonslenke.</li>
            <li>Poengene dine telles opp i alle ligaer du er med i.</li>
            <li>Gå til «Ligaer»-fanen for å administrere ligaene dine.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
