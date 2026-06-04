const STANDARD_CURRENTS = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630];
const CABLE_SECTIONS = [
  { section: 2.5, ampacity: 20 },
  { section: 4, ampacity: 25 },
  { section: 6, ampacity: 32 },
  { section: 10, ampacity: 45 },
  { section: 16, ampacity: 63 },
  { section: 25, ampacity: 80 },
  { section: 35, ampacity: 100 },
  { section: 50, ampacity: 125 },
  { section: 70, ampacity: 160 },
  { section: 95, ampacity: 200 },
  { section: 120, ampacity: 250 },
  { section: 150, ampacity: 280 },
  { section: 185, ampacity: 320 },
  { section: 240, ampacity: 400 },
  { section: 300, ampacity: 500 }
];

const inputIds = [
  "projectName",
  "spots",
  "powerPerPoint",
  "phaseMode",
  "simultaneity",
  "availableCurrent",
  "feederLength",
  "branchLength",
  "voltageDrop",
  "reserve",
  "midMeters",
  "chargerDcProtection",
  "chargerCost",
  "outgoingCost",
  "midCost",
  "loadManagerCost",
  "cabinetBaseCost",
  "cableCost",
  "laborHours",
  "laborRate"
];

const inputs = Object.fromEntries(inputIds.map((id) => [id, document.getElementById(id)]));
const defaults = {};
inputIds.forEach((id) => {
  const element = inputs[id];
  defaults[id] = element.type === "checkbox" ? element.checked : element.value;
});

const out = {
  installedPower: byId("installedPower"),
  designPower: byId("designPower"),
  designCurrent: byId("designCurrent"),
  fullPowerCars: byId("fullPowerCars"),
  capacityFill: byId("capacityFill"),
  pointCount: byId("pointCount"),
  availablePower: byId("availablePower"),
  averagePower: byId("averagePower"),
  loadBalancingAdvice: byId("loadBalancingAdvice"),
  warnings: byId("warnings"),
  mainSwitch: byId("mainSwitch"),
  busbar: byId("busbar"),
  branchProtection: byId("branchProtection"),
  rcdAdvice: byId("rcdAdvice"),
  dinModules: byId("dinModules"),
  cabinetType: byId("cabinetType"),
  partsList: byId("partsList"),
  feederCable: byId("feederCable"),
  feederDrop: byId("feederDrop"),
  branchCable: byId("branchCable"),
  branchDrop: byId("branchDrop"),
  totalBranchLength: byId("totalBranchLength"),
  costCabinet: byId("costCabinet"),
  costChargers: byId("costChargers"),
  costCables: byId("costCables"),
  costTotal: byId("costTotal"),
  budgetRows: byId("budgetRows"),
  singleLineDiagram: byId("singleLineDiagram"),
  reportText: byId("reportText")
};

document.querySelectorAll("input, select").forEach((element) => {
  element.addEventListener("input", calculate);
  element.addEventListener("change", calculate);
});

inputs.powerPerPoint.addEventListener("change", () => {
  inputs.phaseMode.value = Number(inputs.powerPerPoint.value) === 7.4 ? "1" : "3";
  calculate();
});

document.querySelectorAll("[data-preset-spots]").forEach((button) => {
  button.addEventListener("click", () => {
    inputs.spots.value = button.dataset.presetSpots;
    calculate();
  });
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

byId("resetButton").addEventListener("click", () => {
  inputIds.forEach((id) => {
    const element = inputs[id];
    if (element.type === "checkbox") {
      element.checked = defaults[id];
    } else {
      element.value = defaults[id];
    }
  });
  calculate();
});

byId("printButton").addEventListener("click", () => window.print());
byId("copyButton").addEventListener("click", copyReport);

calculate();

function byId(id) {
  return document.getElementById(id);
}

function numberValue(id) {
  const value = Number(inputs[id].value);
  return Number.isFinite(value) ? value : 0;
}

function settings() {
  return {
    projectName: inputs.projectName.value.trim() || "Parking laadpalen",
    spots: clamp(Math.round(numberValue("spots")), 1, 96),
    powerPerPoint: clamp(numberValue("powerPerPoint"), 1, 100),
    phases: inputs.phaseMode.value === "1" ? 1 : 3,
    simultaneity: clamp(numberValue("simultaneity"), 5, 100),
    availableCurrent: clamp(numberValue("availableCurrent"), 16, 630),
    feederLength: clamp(numberValue("feederLength"), 1, 500),
    branchLength: clamp(numberValue("branchLength"), 1, 250),
    voltageDrop: clamp(numberValue("voltageDrop"), 1, 8),
    reserve: clamp(numberValue("reserve"), 0, 50),
    midMeters: inputs.midMeters.checked,
    chargerDcProtection: inputs.chargerDcProtection.checked,
    chargerCost: Math.max(0, numberValue("chargerCost")),
    outgoingCost: Math.max(0, numberValue("outgoingCost")),
    midCost: Math.max(0, numberValue("midCost")),
    loadManagerCost: Math.max(0, numberValue("loadManagerCost")),
    cabinetBaseCost: Math.max(0, numberValue("cabinetBaseCost")),
    cableCost: Math.max(0, numberValue("cableCost")),
    laborHours: Math.max(0, numberValue("laborHours")),
    laborRate: Math.max(0, numberValue("laborRate"))
  };
}

function calculate() {
  const s = settings();
  inputs.spots.value = s.spots;
  updatePresetButtons(s.spots);

  const installedPower = s.spots * s.powerPerPoint;
  const availablePower = powerFromCurrent(s.availableCurrent, s.phases);
  const simultaneityPower = installedPower * (s.simultaneity / 100);
  const designPower = Math.min(installedPower, simultaneityPower, availablePower);
  const pointCurrent = currentFromPower(s.powerPerPoint, s.phases);
  const designCurrent = currentFromPower(designPower, s.phases);
  const designCurrentWithReserve = designCurrent * (1 + s.reserve / 100);
  const utilization = installedPower > 0 ? designPower / installedPower : 0;
  const fullPowerCars = Math.floor(designPower / s.powerPerPoint);
  const averagePower = designPower / s.spots;
  const mainSwitch = nextStandard(designCurrentWithReserve);
  const branchBreaker = nextStandard(pointCurrent);
  const busbar = nextStandard(Math.max(mainSwitch, designCurrentWithReserve));
  const feederCable = selectCable(designCurrentWithReserve, s.feederLength, s.phases, s.voltageDrop);
  const branchCable = selectCable(pointCurrent, s.branchLength, s.phases, s.voltageDrop);
  const modules = moduleEstimate(s);
  const cabinetType = cabinetAdvice(s.spots, modules.rows, busbar);
  const costs = estimateCosts(s, feederCable, branchCable, modules);
  const warnings = buildWarnings(s, {
    installedPower,
    availablePower,
    designPower,
    averagePower,
    utilization,
    fullPowerCars,
    pointCurrent,
    designCurrent,
    mainSwitch,
    branchBreaker
  });

  renderOverview(s, {
    installedPower,
    availablePower,
    designPower,
    designCurrent,
    utilization,
    fullPowerCars,
    averagePower,
    warnings
  });
  renderCabinet(s, {
    mainSwitch,
    busbar,
    branchBreaker,
    pointCurrent,
    modules,
    cabinetType
  });
  renderCables(s, {
    feederCable,
    branchCable
  });
  renderBudget(costs);
  renderScheme(s, {
    mainSwitch,
    busbar,
    branchBreaker,
    feederCable,
    branchCable
  });
  renderReport(s, {
    installedPower,
    availablePower,
    designPower,
    designCurrent,
    pointCurrent,
    fullPowerCars,
    averagePower,
    mainSwitch,
    busbar,
    branchBreaker,
    feederCable,
    branchCable,
    modules,
    cabinetType,
    costs,
    warnings
  });
}

function currentFromPower(powerKw, phases) {
  const power = powerKw * 1000;
  return phases === 3 ? power / (Math.sqrt(3) * 400) : power / 230;
}

function powerFromCurrent(current, phases) {
  const power = phases === 3 ? Math.sqrt(3) * 400 * current : 230 * current;
  return power / 1000;
}

function nextStandard(current) {
  const tolerance = 0.6;
  return STANDARD_CURRENTS.find((standard) => current <= standard + tolerance) || STANDARD_CURRENTS.at(-1);
}

function selectCable(current, length, phases, maxDrop) {
  const target = Math.max(current, 1);
  const selected = CABLE_SECTIONS.find((candidate) => {
    const drop = voltageDropPercent(target, length, candidate.section, phases);
    return candidate.ampacity >= target && drop <= maxDrop;
  }) || CABLE_SECTIONS.at(-1);

  return {
    section: selected.section,
    ampacity: selected.ampacity,
    drop: voltageDropPercent(target, length, selected.section, phases)
  };
}

function voltageDropPercent(current, length, section, phases) {
  const rho = 0.0225;
  const voltage = phases === 3 ? 400 : 230;
  const factor = phases === 3 ? Math.sqrt(3) : 2;
  return (factor * current * rho * length * 100) / (section * voltage);
}

function moduleEstimate(s) {
  const protectionModules = s.chargerDcProtection ? 4 : 8;
  const meterModules = s.midMeters ? 4 : 0;
  const terminalModules = 2;
  const perPoint = protectionModules + meterModules + terminalModules;
  const base = 24;
  const reserveModules = Math.ceil((base + perPoint * s.spots) * (s.reserve / 100));
  const total = base + perPoint * s.spots + reserveModules;
  const rows = Math.ceil(total / 24);
  return { perPoint, base, reserveModules, total, rows };
}

function cabinetAdvice(spots, rows, busbar) {
  if (spots <= 4) {
    return `Wandkast IP54/IP65, minimaal ${rows} rijen, rail ${busbar}A`;
  }
  if (spots <= 12) {
    return `Ruime wand- of vloerkast IP54/IP65, minimaal ${rows} rijen, rail ${busbar}A`;
  }
  return `Vloer- of straatkast met railstel, minimaal ${rows} rijen, rail ${busbar}A`;
}

function estimateCosts(s, feederCable, branchCable, modules) {
  const outgoing = s.spots * s.outgoingCost;
  const mid = s.midMeters ? s.spots * s.midCost : 0;
  const cabinetScale = s.cabinetBaseCost + Math.max(0, modules.rows - 3) * 180;
  const loadManager = s.loadManagerCost;
  const chargers = s.spots * s.chargerCost;
  const totalBranchMeters = s.spots * s.branchLength;
  const feederCableCost = s.feederLength * cableMeterMultiplier(feederCable.section) * s.cableCost;
  const branchCableCost = totalBranchMeters * cableMeterMultiplier(branchCable.section) * s.cableCost;
  const labor = s.laborHours * s.laborRate;
  const commissioning = 450;
  const cabinet = cabinetScale + outgoing + mid + loadManager;
  const cables = feederCableCost + branchCableCost;
  const subtotal = cabinet + chargers + cables + labor + commissioning;
  const contingency = subtotal * 0.12;
  const total = subtotal + contingency;

  return {
    cabinet,
    chargers,
    cables,
    labor,
    commissioning,
    contingency,
    total,
    rows: [
      ["Kast/rail/basis", 1, "post", cabinetScale],
      ["Afgaande beveiligingen", s.spots, "stuks", outgoing],
      ["MID meters", s.midMeters ? s.spots : 0, "stuks", mid],
      ["Load management", 1, "post", loadManager],
      ["Laadpalen", s.spots, "stuks", chargers],
      ["Voedingskabel", `${s.feederLength} m`, `${feederCable.section} mm2`, feederCableCost],
      ["Laadpuntkabels", `${totalBranchMeters} m`, `${branchCable.section} mm2`, branchCableCost],
      ["Werkuren", s.laborHours, `${formatMoney(s.laborRate)}/u`, labor],
      ["Keuring/inbedrijfstelling", 1, "post", commissioning],
      ["Onvoorzien 12%", 1, "post", contingency]
    ]
  };
}

function cableMeterMultiplier(section) {
  if (section <= 6) return 1;
  if (section <= 16) return 1.6;
  if (section <= 35) return 2.5;
  if (section <= 70) return 4.2;
  if (section <= 120) return 6.5;
  return 9.5;
}

function buildWarnings(s, data) {
  const warnings = [];
  const minPower = s.phases === 3 ? 4.2 : 1.4;

  if (data.availablePower < data.installedPower) {
    warnings.push({
      type: "warning",
      text: `Load balancing nodig: beschikbaar vermogen is ${formatKw(data.availablePower)} tegenover ${formatKw(data.installedPower)} geinstalleerd.`
    });
  } else {
    warnings.push({
      type: "ok",
      text: "Beschikbare aansluiting dekt het ingestelde gelijktijdige laadvermogen."
    });
  }

  if (data.averagePower < minPower) {
    warnings.push({
      type: "danger",
      text: `Gemiddeld vermogen per bezette plaats is laag (${formatKw(data.averagePower)}). Veel laadpalen hebben een minimumstroom nodig.`
    });
  }

  if (!s.chargerDcProtection) {
    warnings.push({
      type: "warning",
      text: "Zonder 6mA DC-detectie in de laadpaal is meestal Type B foutstroombeveiliging per laadpunt nodig."
    });
  }

  if (s.phases === 1 && s.spots > 4) {
    warnings.push({
      type: "warning",
      text: "Bij veel 1-fase laadpunten moet faseverdeling en onbalans apart ontworpen worden."
    });
  }

  if (s.phases === 1 && s.powerPerPoint > 7.4) {
    warnings.push({
      type: "danger",
      text: "11 kW of 22 kW op 1-fase vraagt een zeer hoge stroom. Controleer het laadpaaltype en de netaansluiting."
    });
  }

  if (data.designCurrent > 250) {
    warnings.push({
      type: "warning",
      text: "Ontwerpstroom boven 250A: reken op vloer-/straatkast, railstel en mogelijk netstudie."
    });
  }

  warnings.push({
    type: "warning",
    text: "Indicatief ontwerp: AREI-keuring, kortsluitberekening, selectiviteit en kabelcorrectiefactoren blijven verplicht."
  });

  return warnings;
}

function renderOverview(s, data) {
  out.installedPower.textContent = formatKw(data.installedPower);
  out.designPower.textContent = formatKw(data.designPower);
  out.designCurrent.textContent = formatAmp(data.designCurrent);
  out.fullPowerCars.textContent = `${Math.min(data.fullPowerCars, s.spots)} / ${s.spots}`;
  out.capacityFill.style.width = `${Math.round(data.utilization * 100)}%`;
  out.pointCount.textContent = `${s.spots} laadpunten aan ${formatKw(s.powerPerPoint)} per punt`;
  out.availablePower.textContent = `${formatKw(data.availablePower)} (${formatAmp(s.availableCurrent)})`;
  out.averagePower.textContent = formatKw(data.averagePower);
  out.loadBalancingAdvice.textContent = data.availablePower < data.installedPower
    ? `Begrens EV-groep op ${formatAmp(s.availableCurrent)} of ${formatKw(data.designPower)}.`
    : "Niet noodzakelijk op basis van deze invoer.";

  out.warnings.innerHTML = "";
  data.warnings.forEach((warning) => {
    const li = document.createElement("li");
    li.className = warning.type;
    li.textContent = warning.text;
    out.warnings.appendChild(li);
  });
}

function renderCabinet(s, data) {
  out.mainSwitch.textContent = `${data.mainSwitch}A 4P lastscheider, vergrendelbaar`;
  out.busbar.textContent = `${data.busbar}A railstel, PE-rail en N-rail gescheiden`;
  out.branchProtection.textContent = `${s.spots} x ${data.branchBreaker}A ${s.phases === 3 ? "4P" : "2P"} per laadpunt`;
  out.rcdAdvice.textContent = s.chargerDcProtection
    ? "Type A 30mA per laadpunt, op voorwaarde dat elke laadpaal 6mA DC-detectie heeft."
    : "Type B 30mA per laadpunt of gelijkwaardige fabrikantoplossing.";
  out.dinModules.textContent = `${data.modules.total} modules, circa ${data.modules.rows} rijen van 24 modules`;
  out.cabinetType.textContent = data.cabinetType;

  const parts = [
    `${data.mainSwitch}A hoofdschakelaar 4P`,
    `Railstel ${data.busbar}A met N- en PE-rail`,
    "Overspanningsbeveiliging type 2 met passende voorbeveiliging",
    `${s.spots} afgaande kringen voor EV-laders`,
    s.chargerDcProtection ? `${s.spots} Type A 30mA RCBO/RCD-oplossingen` : `${s.spots} Type B 30mA RCD-oplossingen`,
    s.midMeters ? `${s.spots} MID kWh-meters` : "Geen MID meters in deze berekening",
    "Load-management controller met CT's of Modbus hoofdmeter",
    "Netwerkswitch/router en klemmenstrook",
    "Schemahouder, labels, kabelwartels en trekontlasting"
  ];
  renderList(out.partsList, parts);
}

function renderCables(s, data) {
  out.feederCable.textContent = `5G${data.feederCable.section} mm2 Cu indicatief`;
  out.feederDrop.textContent = `${formatPercent(data.feederCable.drop)} bij ${s.feederLength} m`;
  out.branchCable.textContent = `${s.phases === 3 ? "5G" : "3G"}${data.branchCable.section} mm2 Cu indicatief`;
  out.branchDrop.textContent = `${formatPercent(data.branchCable.drop)} bij ${s.branchLength} m`;
  out.totalBranchLength.textContent = `${s.spots * s.branchLength} m laadpuntkabels totaal`;
}

function renderBudget(costs) {
  out.costCabinet.textContent = formatMoney(costs.cabinet);
  out.costChargers.textContent = formatMoney(costs.chargers);
  out.costCables.textContent = formatMoney(costs.cables);
  out.costTotal.textContent = formatMoney(costs.total);

  out.budgetRows.innerHTML = "";
  costs.rows.forEach(([label, qty, unit, amount]) => {
    const tr = document.createElement("tr");
    [label, qty, unit, formatMoney(amount)].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    out.budgetRows.appendChild(tr);
  });
}

function renderScheme(s, data) {
  const branchCount = Math.min(s.spots, 6);
  const hiddenCount = Math.max(0, s.spots - branchCount);

  out.singleLineDiagram.innerHTML = "";
  [
    ["Net", `${s.phases === 3 ? "3x400V+N+PE" : "1x230V+PE"}`],
    ["Hoofd", `${data.mainSwitch}A 4P`],
    ["SPD", "Type 2"],
    ["Meter", "Modbus/CT"],
    ["Rail", `${data.busbar}A`],
    ["Load", "Controller"]
  ].forEach(([title, subtitle]) => out.singleLineDiagram.appendChild(schemeNode(title, subtitle)));

  const branchStack = document.createElement("div");
  branchStack.className = "branch-stack";
  for (let i = 1; i <= branchCount; i += 1) {
    const branch = document.createElement("div");
    branch.className = "branch-item";
    branch.textContent = `LP${i}: ${data.branchBreaker}A + ${s.chargerDcProtection ? "Type A/6mA DC" : "Type B"} + ${s.midMeters ? "MID + " : ""}${s.phases === 3 ? "5G" : "3G"}${data.branchCable.section} mm2`;
    branchStack.appendChild(branch);
  }
  if (hiddenCount > 0) {
    const branch = document.createElement("div");
    branch.className = "branch-item";
    branch.textContent = `... + ${hiddenCount} identieke afgaande kringen`;
    branchStack.appendChild(branch);
  }
  out.singleLineDiagram.appendChild(branchStack);
}

function schemeNode(title, subtitle) {
  const node = document.createElement("div");
  node.className = "scheme-node";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const span = document.createElement("span");
  span.textContent = subtitle;
  node.append(strong, span);
  return node;
}

function renderReport(s, data) {
  const lines = [
    `Project: ${s.projectName}`,
    `Datum: ${new Date().toLocaleDateString("nl-BE")}`,
    "",
    "Invoer",
    `- Laadpunten: ${s.spots}`,
    `- Vermogen per laadpunt: ${formatKw(s.powerPerPoint)}`,
    `- Net: ${s.phases === 3 ? "3x400V+N+PE" : "1x230V+PE"}`,
    `- Beschikbaar voor EV: ${formatAmp(s.availableCurrent)} (${formatKw(data.availablePower)})`,
    `- Gelijktijdigheid: ${s.simultaneity}%`,
    `- Reserve: ${s.reserve}%`,
    "",
    "Resultaat",
    `- Geinstalleerd vermogen: ${formatKw(data.installedPower)}`,
    `- Ontwerpvermogen: ${formatKw(data.designPower)}`,
    `- Ontwerpstroom: ${formatAmp(data.designCurrent)}`,
    `- Vol vermogen tegelijk: ${Math.min(data.fullPowerCars, s.spots)} van ${s.spots}`,
    `- Gemiddeld bij alle plaatsen bezet: ${formatKw(data.averagePower)} per laadpunt`,
    "",
    "Kast",
    `- Hoofdschakelaar: ${data.mainSwitch}A 4P`,
    `- Railstel: ${data.busbar}A`,
    `- Afgaand: ${s.spots} x ${data.branchBreaker}A ${s.phases === 3 ? "4P" : "2P"}`,
    `- Differentieel: ${s.chargerDcProtection ? "Type A 30mA + 6mA DC in laadpaal" : "Type B 30mA"}`,
    `- Modules: ${data.modules.total}, circa ${data.modules.rows} rijen`,
    `- Kasttype: ${data.cabinetType}`,
    "",
    "Kabels",
    `- Voeding: 5G${data.feederCable.section} mm2 Cu, spanningsval ${formatPercent(data.feederCable.drop)}`,
    `- Laadpunt: ${s.phases === 3 ? "5G" : "3G"}${data.branchCable.section} mm2 Cu, spanningsval ${formatPercent(data.branchCable.drop)}`,
    "",
    "Budget",
    `- Kastmateriaal: ${formatMoney(data.costs.cabinet)}`,
    `- Laadpalen: ${formatMoney(data.costs.chargers)}`,
    `- Kabels: ${formatMoney(data.costs.cables)}`,
    `- Totaal excl. btw: ${formatMoney(data.costs.total)}`,
    "",
    "Waarschuwingen",
    ...data.warnings.map((warning) => `- ${warning.text}`)
  ];
  out.reportText.textContent = lines.join("\n");
}

function renderList(target, items) {
  target.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    target.appendChild(li);
  });
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(out.reportText.textContent);
    showToast("Rapport gekopieerd");
  } catch {
    showToast("Kopieren mislukt");
  }
}

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "copy-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1900);
}

function setActiveTab(tab) {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tab);
  });
}

function updatePresetButtons(spots) {
  document.querySelectorAll("[data-preset-spots]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.presetSpots) === spots);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatKw(value) {
  return `${formatNumber(value, 1)} kW`;
}

function formatAmp(value) {
  return `${formatNumber(value, value >= 100 ? 0 : 1)} A`;
}

function formatPercent(value) {
  return `${formatNumber(value, 2)}%`;
}

function formatMoney(value) {
  return `EUR ${Math.round(value).toLocaleString("nl-BE")}`;
}

function formatNumber(value, digits = 0) {
  return Number(value).toLocaleString("nl-BE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}
