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
            <li>Du får poeng for hvert riktig tippet utfall.</li>
            <li>Poengverdiene er basert på odds: Overraskende utfall gir høyere poengsum.</li>
            <li>Riktig tippet utfall gir intill 20 poeng — men summen kan øke opp til 30 poeng ved bruk av booster.</li>
            <li>Du kan se poengverdiene direkte på hver kamp.</li>
          </ul>
        </section>

        <section className="rules-section">
          <h3>Gruppespill-bonus</h3>
          <ul>
            <li>For hver 10. riktige gruppespillstips får du 5 bonuspoeng.</li>
            <li>Bonusen belønner deg for å treffe på mange kamper — ikke bare å satse på de store overraskelsene.</li>
            <li>Bare riktige tips i gruppespillet teller (rundene 1, 2 og 3). Sluttspill og spesialer teller ikke.</li>
            <li>Det er ingen øvre grense — 20 riktige gir 10 bonuspoeng, 30 gir 15, og så videre.</li>
            <li>Følg med på fremgangen mot neste bonus i tippekupongen.</li>
          </ul>
        </section>

        <section className="rules-section">
          <h3><span className="rules-bolt">⚡</span> Booster (2x)</h3>
          <ul>
            <li>Du kan potensielt øke poengene på én kamp per runde ved bruk av en 2x-booster.</li>
            <li>En runde defineres som gruppespillets innledende runder (1, 2 og 3) — og deretter hver sluttspillrunde for seg (åttedelsfinaler, kvartfinaler, semifinaler, bronsefinale og finale).</li>
            <li>Tipp først, og trykk så på ⚡-knappen på kampen du vil booste.</li>
            <li>Treffer du, dobles poengene — men du kan få maks 30 poeng per kamp. Boosteren gir altså full uttelling opp til 15 poeng (15 → 30), men har en maks-verdi på 30.</li>
            <li>Bommer du, skjer det ingenting — boosteren er utelukkende positiv.</li>
            <li>Du kan flytte boosteren fritt mellom kamper i samme runde helt til den valgte kampen låses.</li>
            <li>Ubrukte boostere overføres ikke til neste runde.</li>
          </ul>
        </section>

        <section className="rules-section">
          <h3>Spesialer</h3>
          <ul>
            <li>Under «Spesialer» tipper du på utfall for hele turneringen.</li>
            <li><strong>Verdensmester:</strong> velg laget du tror vinner VM. Treffer du, får du poeng lik oddsen rundet opp — odds 6,0 gir 6 poeng, odds 38 gir 38 poeng.</li>
            <li>Det er ingen øvre grense på spesial-poeng, i motsetning til kamper der maks er 20 poeng (30 med booster).</li>
            <li>Oddsen låses ved turneringsstart, og du kan endre valget ditt helt fram til den første kampen sparkes i gang.</li>
            <li>Boostere gjelder ikke for spesialer.</li>
            <li>Verdensmester avgjøres etter finalen, og poengene legges til totalsummen din.</li>
          </ul>
        </section>

        <section className="rules-section">
          <h3>Låsing av kamper</h3>
          <ul>
            <li>Muligheten for å tippe på en kamp stenges 5 minutter før kampstart.</li>
            <li>Låste kamper viser «Kampen er i gang» med ditt valg (dersom du har tippet).</li>
            <li>Etter kampenslutt forsvinner den fra tippevisningen, og resultatet finnes i "Spilte Kamper".</li>
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
