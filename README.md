# Laadkast Calculator

Standalone webapp voor een indicatieve berekening van een EV-verdeelkast voor parkings.

## Gebruik

Open `index.html` in een browser.

De app berekent onder meer:

- geinstalleerd vermogen;
- ontwerpvermogen met gelijktijdigheid en beschikbare stroom;
- ontwerpstroom;
- indicatieve hoofdschakelaar, railstel en afgaande beveiligingen;
- indicatieve kabelsecties op basis van stroom en spanningsval;
- DIN-module-inschatting;
- materiaallijst;
- budgetraming;
- kopieerbaar rapport.

Daarnaast kan de gebruiker meerdere klantprojecten en calculatieversies bewaren. Deze opslag gebeurt lokaal in de browser via `localStorage`. Daardoor blijven opgeslagen calculaties per browser/toestel bewaard, maar worden ze niet automatisch gedeeld met andere gebruikers of computers.

## Belangrijk

De resultaten zijn indicatief. Voor uitvoering zijn minstens nodig:

- AREI-conform ontwerp;
- kortsluitstroomberekening;
- selectiviteitscontrole;
- controle van kabelplaatsingswijze, temperatuur, bundeling en omgeving;
- controle van aardingsstelsel en foutlusimpedantie;
- schema, situatieplan, labels en keuring door een erkend controleorganisme.
