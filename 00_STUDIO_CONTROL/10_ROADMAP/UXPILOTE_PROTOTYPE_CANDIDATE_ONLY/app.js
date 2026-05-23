(function () {
  "use strict";

  var sampleData = {
    workspace_root: "C:/TACTICAL_CHESS_STUDIO",
    tactical_chess_purelab: "TacticalChessPureLab — recovered studio organism; not ecosystem root",
    sizeModelNote: "Tower sizes are illustrative hardcoded sample weights, not filesystem measurements.",
    studioCore: {
      label: "Studio Core / Root Substrate",
      detail: "Foundation Layer: broad substrate of code, docs, tests, artifacts, runtime boundaries, and machine signals. Every shown district is rooted here, but the UI performs no scan, no repo read, no runtime, and no persistence."
    },
    ecosystemLegend: [
      "Human = water / care / intention",
      "Code = soil / roots / trunks",
      "Docs = genetic memory / seeds",
      "Tests = immune system",
      "Artifacts = compost / traces",
      "Runtime = metabolism",
      "Machine = climate / heat / energy",
      "AI = mycelium / scouts",
      "HumanGate = Sovereign Gardener / Final Authority Apex"
    ],
    humanGate: {
      selected_option: "AUTHORIZE_ONE_BOUNDED_READ_ONLY_PROTOTYPE_STEP",
      scope: "one bounded static skeleton only",
      final_authority: "HumanGate",
      apex_label: "Final Authority Apex"
    },
    status_by_surface: {
      active_runtime_code: "PASSIVE",
      tests: "PASSIVE",
      artifacts_runtime_outputs: "PASSIVE",
      canonical_docs: "PASSIVE",
      roadmap_docs_only: "TESTED",
      inference: "PASSIVE"
    },
    blockedActions: [
      "runtime execution",
      "agent activation",
      "broad recursive scan",
      "network exposure",
      "hardware control",
      "power control",
      "process control",
      "system settings control",
      "tests or CI",
      "Git commit, push, branch, or pull request",
      "latest.json creation",
      "lab/runs/RUN_* creation",
      "dataset, model, or checkpoint creation"
    ],
    mapFlows: [
      { label: "Core -> Recovered Organism Zone", pathClass: "flow-core-organism", kind: "validated foundation-link" },
      { label: "Recovered Organism Zone -> Evidence Stream", pathClass: "flow-organism-evidence", kind: "validated" },
      { label: "Evidence Stream -> HumanGate", pathClass: "flow-evidence-gate", kind: "validated" },
      { label: "Source Memory Grove -> Seed Nursery", pathClass: "flow-memory-seed", kind: "suggestion" },
      { label: "Mycelium / Scout Layer -> Seed Nursery", pathClass: "flow-mycelium-seed", kind: "suggestion" },
      { label: "Climate / Heat / Energy -> HumanGate", pathClass: "flow-climate-gate", kind: "validated" },
      { label: "Toxic / Forbidden Growth isolated from normal allowed flow", pathClass: "flow-toxic-isolated", kind: "blocked-flow" }
    ],
    flowLegend: [
      { label: "solid arrow = validated flow", className: "solid" },
      { label: "dashed arrow = suggestion flow", className: "dashed" },
      { label: "red blocked line = forbidden flow", className: "blocked" },
      { label: "upward flow = escalation toward HumanGate", className: "solid" },
      { label: "foundation link = rooted in Studio Core", className: "foundation" }
    ],
    zones: [
      {
        id: "core",
        label: "Studio Core / Root Substrate",
        type: "Foundation Layer",
        surface: "roadmap_docs_only",
        status: "PASSIVE",
        tone: "soil",
        mapClass: "core-zone",
        sizeClass: "size-massive",
        weight: "massive / sample 96",
        detail: "Studio Core / Root Substrate is the Foundation Layer: the broad base platform beneath every district. It anchors code, docs, tests, artifacts, runtime boundaries, and machine signals without scanning or executing anything."
      },
      {
        id: "workspace",
        label: "Studio Ecosystem Root",
        type: "C:/TACTICAL_CHESS_STUDIO",
        surface: "roadmap_docs_only",
        status: "PASSIVE",
        tone: "water",
        mapClass: "root-zone",
        sizeClass: "size-large",
        weight: "large / sample 82",
        detail: "Studio Ecosystem Root is a large district above the Studio Core / Root Substrate. It frames the whole studio map, while the core remains the foundation below every tower. This skeleton does not scan it."
      },
      {
        id: "purelab",
        label: "Recovered Organism Zone",
        type: "TacticalChessPureLab — recovered studio organism",
        surface: "active_runtime_code",
        status: "PASSIVE",
        tone: "soil",
        mapClass: "organism-zone",
        sizeClass: "size-large",
        weight: "large / sample 76",
        detail: "TacticalChessPureLab — recovered studio organism is a connected organism district rooted in Studio Core and linked into the evidence-to-HumanGate chain. It is not ecosystem root and does not define the whole studio."
      },
      {
        id: "humangate",
        label: "HumanGate / Sovereign Gardener",
        type: "Sovereign Gardener / Final Authority Apex",
        surface: "roadmap_docs_only",
        status: "DOCUMENTED_ONLY",
        tone: "gardener",
        mapClass: "gate-zone",
        sizeClass: "size-massive",
        weight: "massive / sample 100",
        detail: "HumanGate is the apex, top, and summit of the SVG isometric city map: the Sovereign Gardener and Final Authority Apex for mutation, activation, promotion, cost, claims, and Git actions."
      },
      {
        id: "evidence",
        label: "Evidence Stream",
        type: "readback, route, and validation trace watercourse",
        surface: "roadmap_docs_only",
        status: "PASSIVE",
        tone: "immune",
        mapClass: "evidence-zone",
        sizeClass: "size-medium",
        weight: "medium / sample 58",
        detail: "Evidence Stream is a directional tower chain carrying readback, route checks, validation notes, and blocked-action traces upward toward HumanGate. It is observation, not claim promotion."
      },
      {
        id: "memory",
        label: "Source Memory Grove",
        type: "docs as genetic memory / seeds",
        surface: "canonical_docs",
        status: "DOCUMENTED_ONLY",
        tone: "seed",
        mapClass: "memory-zone",
        sizeClass: "size-medium",
        weight: "medium / sample 54",
        detail: "Source Memory Grove represents docs, policies, specs, and source-state anchors. Its suggestion flow feeds the Seed Nursery, but it does not become runtime authority."
      },
      {
        id: "patchlab",
        label: "Seed Nursery — candidates only",
        type: "Patch Lab candidate-only planning zone",
        surface: "roadmap_docs_only",
        status: "DOCUMENTED_ONLY",
        tone: "seed",
        mapClass: "seed-zone",
        sizeClass: "size-small",
        weight: "small / sample 38",
        detail: "Seed Nursery — candidates only is a smaller planning district. It may display target files, non-goals, blocked actions, and validation plans; it does not write or execute from the UI."
      },
      {
        id: "llmlink",
        label: "Mycelium / Scout Layer",
        type: "LLM Link Layer passive suggestion zone",
        surface: "inference",
        status: "PASSIVE",
        tone: "mycelium",
        mapClass: "mycelium-zone",
        sizeClass: "size-small",
        weight: "small / sample 34",
        detail: "Mycelium / Scout Layer is passive suggestion infrastructure: labels, summaries, reranking, and ambiguity flags. It can suggest toward the nursery only and cannot bypass HumanGate."
      },
      {
        id: "cost",
        label: "Climate / Heat / Energy",
        type: "Cost / Heat / Energy observation-only signal zone",
        surface: "inference",
        status: "PASSIVE",
        tone: "climate",
        mapClass: "climate-zone",
        sizeClass: "size-medium",
        weight: "medium / sample 46",
        detail: "Climate / Heat / Energy is observation only. It may point upward to HumanGate for cost context, but it has no hardware, power, process, runtime, or system control."
      },
      {
        id: "runtime",
        label: "Metabolism Lock",
        type: "runtime as metabolism, authority NONE",
        surface: "active_runtime_code",
        status: "BLOCKED",
        tone: "metabolism",
        mapClass: "metabolism-zone",
        sizeClass: "size-tiny",
        weight: "tiny / sample 18",
        detail: "Metabolism Lock is a tiny blocked tower: runtime is metabolism, but this static skeleton has no runtime authority. Runtime execution remains blocked."
      },
      {
        id: "compost",
        label: "Compost / Trace Beds",
        type: "artifacts and logs as compost / traces",
        surface: "artifacts_runtime_outputs",
        status: "PASSIVE",
        tone: "compost",
        mapClass: "compost-zone",
        sizeClass: "size-small",
        weight: "small / sample 30",
        detail: "Compost / Trace Beds are smaller artifact and log districts. They may inform future review, but they are not proof or authority by themselves."
      },
      {
        id: "blocked",
        label: "Toxic / Forbidden Growth",
        type: "forbidden controls",
        surface: "active_runtime_code",
        status: "BLOCKED",
        tone: "blocked",
        mapClass: "toxic-zone",
        sizeClass: "size-medium",
        weight: "medium / sample 44",
        detail: "Toxic / Forbidden Growth is isolated from normal allowed flow with a red blocked line. Runtime, agents, broad scan, network, hardware, power, process, system control, Git actions, lab outputs, datasets, models, and claims remain blocked."
      }
    ],
    events: [
      { label: "Source readback", status: "PASSIVE", detail: "Required sources are represented as readback evidence in the executor report." },
      { label: "Route check", status: "PASSIVE", detail: "Destination is roadmap docs only under the prototype candidate directory." },
      { label: "Studio Core / Root Substrate", status: "PASSIVE", detail: "Foundation Layer only; no scan, no runtime, no persistence." },
      { label: "HumanGate", status: "DOCUMENTED_ONLY", detail: "Final Authority Apex at the top summit; one bounded static skeleton step only." },
      { label: "Runtime lock", status: "BLOCKED", detail: "Runtime is metabolism, but this skeleton has no runtime authority." },
      { label: "Flow legend", status: "PASSIVE", detail: "Solid, dashed, blocked, upward, and foundation links are static explanatory flows." }
    ]
  };

  var views = {
    ecosystem: {
      title: "SVG Isometric City Ecosystem Map",
      intro: "Static inline SVG cartographic city-ecosystem map using hardcoded illustrative sample data only.",
      render: renderEcosystem
    },
    chain: {
      title: "Chain Builder",
      intro: "Candidate chain grammar view. Creation and execution remain blocked.",
      render: renderChain
    },
    inspector: {
      title: "Zone Inspector",
      intro: "Selected zone details with source, route, evidence, and blocked action posture.",
      render: renderInspectorView
    },
    evidence: {
      title: "Evidence Board",
      intro: "Surface-separated software, evidence, and claim posture. No global verdict.",
      render: renderEvidence
    },
    patch: {
      title: "Seed Nursery — candidates only",
      intro: "Candidate-only task framing. No runtime mutation and no implementation generation.",
      render: renderPatchLab
    },
    cost: {
      title: "Climate / Heat / Energy",
      intro: "Observation-only cost and pressure signals. No control.",
      render: renderCost
    },
    source: {
      title: "Source Registry",
      intro: "Created, registered, loaded, enforced, and evidenced stay separate.",
      render: renderSourceRegistry
    },
    humangate: {
      title: "HumanGate",
      intro: "HumanGate remains the top summit and Final Authority Apex for one bounded next-step decisions.",
      render: renderHumanGate
    },
    llm: {
      title: "Mycelium / Scout Layer",
      intro: "Passive labels, summaries, reranking, and ambiguity flags only.",
      render: renderLlm
    }
  };

  var selectedZoneId = "workspace";

  function el(tag, className, text) {
    var element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text) {
      element.textContent = text;
    }
    return element;
  }

  function badge(status) {
    var className = "badge passive";
    if (status === "BLOCKED") className = "badge blocked";
    if (status === "DOCUMENTED_ONLY") className = "badge candidate";
    if (status === "TESTED") className = "badge tested";
    var node = el("span", className, status);
    return node;
  }

  function findZone(id) {
    for (var i = 0; i < sampleData.zones.length; i += 1) {
      if (sampleData.zones[i].id === id) {
        return sampleData.zones[i];
      }
    }
    return sampleData.zones[0];
  }

  var svgNs = "http://www.w3.org/2000/svg";

  var mapGeometry = {
    core: { cx: 550, cy: 612, w: 920, d: 170, h: 52, kind: "foundation" },
    workspace: { cx: 292, cy: 508, w: 178, d: 86, h: 126 },
    purelab: { cx: 495, cy: 512, w: 196, d: 96, h: 118 },
    evidence: { cx: 678, cy: 430, w: 154, d: 78, h: 86 },
    memory: { cx: 323, cy: 368, w: 150, d: 76, h: 82 },
    patchlab: { cx: 510, cy: 392, w: 130, d: 66, h: 62 },
    llmlink: { cx: 188, cy: 458, w: 132, d: 68, h: 56 },
    cost: { cx: 846, cy: 388, w: 150, d: 76, h: 78 },
    runtime: { cx: 728, cy: 534, w: 104, d: 54, h: 38 },
    compost: { cx: 392, cy: 580, w: 126, d: 62, h: 48 },
    blocked: { cx: 932, cy: 548, w: 150, d: 78, h: 70 },
    humangate: { cx: 560, cy: 246, w: 172, d: 86, h: 214 }
  };

  var flowGeometry = [
    { label: "Core -> Recovered Organism Zone", d: "M 472 570 C 492 548, 506 540, 514 514", className: "foundation-flow", marker: "url(#arrow-foundation)" },
    { label: "Recovered Organism Zone -> Evidence Stream", d: "M 548 452 C 592 416, 624 404, 666 390", className: "validated-flow", marker: "url(#arrow-validated)" },
    { label: "Evidence Stream -> HumanGate", d: "M 700 356 C 674 320, 630 292, 588 252", className: "validated-flow upward-flow", marker: "url(#arrow-validated)" },
    { label: "Source Memory Grove -> Seed Nursery", d: "M 366 322 C 410 316, 454 326, 492 350", className: "suggestion-flow", marker: "url(#arrow-suggestion)" },
    { label: "Mycelium / Scout Layer -> Seed Nursery", d: "M 232 426 C 310 400, 402 386, 486 374", className: "suggestion-flow", marker: "url(#arrow-suggestion)" },
    { label: "Climate / Heat / Energy -> HumanGate", d: "M 826 334 C 760 290, 666 260, 602 234", className: "validated-flow upward-flow", marker: "url(#arrow-validated)" },
    { label: "Toxic / Forbidden Growth isolated / blocked flow", d: "M 896 500 C 858 484, 838 470, 810 450", className: "blocked-svg-flow", marker: "url(#arrow-blocked)" }
  ];

  function svgEl(tag, attrs, text) {
    var node = document.createElementNS(svgNs, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    if (text) {
      node.textContent = text;
    }
    return node;
  }

  function pointList(points) {
    return points.map(function (point) {
      return point[0] + "," + point[1];
    }).join(" ");
  }

  function addSvgText(parent, lines, x, y, className) {
    var text = svgEl("text", { x: x, y: y, class: className || "map-svg-label", "text-anchor": "middle" });
    lines.forEach(function (line, index) {
      var span = svgEl("tspan", { x: x, dy: index === 0 ? 0 : 15 }, line);
      text.appendChild(span);
    });
    parent.appendChild(text);
  }

  function districtLabel(zone) {
    if (zone.id === "humangate") {
      return ["HumanGate", "Sovereign Gardener", "Final Authority Apex", zone.weight];
    }
    if (zone.id === "purelab") {
      return ["TacticalChessPureLab — recovered studio organism", "not ecosystem root", zone.weight];
    }
    if (zone.id === "core") {
      return ["Studio Core / Root Substrate", "Foundation Layer", zone.weight];
    }
    return [zone.label, zone.weight];
  }

  function drawDistrict(parent, zone, geometry) {
    var cx = geometry.cx;
    var cy = geometry.cy;
    var w = geometry.w;
    var d = geometry.d;
    var h = geometry.h;
    var topY = cy - h;
    var top = [[cx, topY - d / 2], [cx + w / 2, topY], [cx, topY + d / 2], [cx - w / 2, topY]];
    var bottom = [[cx, cy - d / 2], [cx + w / 2, cy], [cx, cy + d / 2], [cx - w / 2, cy]];
    var group = svgEl("g", {
      class: "svg-district zone-" + zone.tone + (zone.id === selectedZoneId ? " selected" : ""),
      "data-zone-id": zone.id,
      role: "button",
      tabindex: "0",
      "aria-label": zone.label + " " + zone.weight
    });

    group.appendChild(svgEl("polygon", { class: "face-left", points: pointList([top[3], top[2], bottom[2], bottom[3]]) }));
    group.appendChild(svgEl("polygon", { class: "face-right", points: pointList([top[1], top[2], bottom[2], bottom[1]]) }));
    group.appendChild(svgEl("polygon", { class: "face-front", points: pointList([bottom[3], bottom[2], bottom[1], bottom[0]]) }));
    group.appendChild(svgEl("polygon", { class: "face-top", points: pointList(top) }));
    group.appendChild(svgEl("polygon", { class: "hit-area", points: pointList([top[0], top[1], bottom[1], bottom[2], bottom[3], top[3]]) }));

    if (zone.id === "blocked") {
      group.appendChild(svgEl("rect", { class: "quarantine-ring", x: cx - 106, y: cy - h - 72, width: 214, height: h + 128, rx: 8 }));
    }

    addSvgText(group, districtLabel(zone), cx, topY + 8, zone.id === "humangate" ? "map-svg-label apex-label" : "map-svg-label");
    parent.appendChild(group);
  }

  function drawFoundation(parent) {
    var zone = findZone("core");
    var geometry = mapGeometry.core;
    drawDistrict(parent, zone, geometry);
    addSvgText(parent, ["Studio Ecosystem Root", "cartographic city-ecosystem plan"], 550, 650, "map-svg-caption");
  }

  function renderSvgMap(map) {
    var svg = svgEl("svg", {
      class: "ecosystem-svg",
      viewBox: "0 0 1100 720",
      role: "img",
      "aria-label": "Static SVG isometric cartographic UxPilote ecosystem map"
    });
    var defs = svgEl("defs", {});
    [
      ["arrow-validated", "#116466"],
      ["arrow-suggestion", "#5f4b8b"],
      ["arrow-foundation", "#6b5136"],
      ["arrow-blocked", "#b42318"]
    ].forEach(function (item) {
      var marker = svgEl("marker", { id: item[0], viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
      marker.appendChild(svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: item[1] }));
      defs.appendChild(marker);
    });
    svg.appendChild(defs);
    svg.appendChild(svgEl("path", { class: "map-river evidence-river", d: "M 168 626 C 322 556, 462 548, 610 484 C 720 436, 810 392, 934 322" }));
    svg.appendChild(svgEl("path", { class: "map-gridline", d: "M 102 602 L 552 330 L 1000 604" }));
    svg.appendChild(svgEl("path", { class: "map-gridline", d: "M 188 654 L 552 432 L 914 654" }));
    drawFoundation(svg);

    ["workspace", "compost", "llmlink", "purelab", "runtime", "memory", "patchlab", "evidence", "cost", "blocked", "humangate"].forEach(function (id) {
      drawDistrict(svg, findZone(id), mapGeometry[id]);
    });

    flowGeometry.forEach(function (flow, index) {
      svg.appendChild(svgEl("path", { class: "svg-flow " + flow.className, d: flow.d, "marker-end": flow.marker }));
      addSvgText(svg, [flow.label], index === 6 ? 842 : [514, 612, 648, 430, 358, 742][index], index === 6 ? 444 : [546, 410, 303, 314, 390, 286][index], "svg-flow-label");
    });
    svg.appendChild(svgEl("line", { class: "blocked-bar", x1: 804, y1: 434, x2: 834, y2: 466 }));
    svg.appendChild(svgEl("line", { class: "blocked-bar", x1: 834, y1: 434, x2: 804, y2: 466 }));

    svg.addEventListener("click", function (event) {
      var target = event.target.closest("[data-zone-id]");
      if (target) {
        selectedZoneId = target.getAttribute("data-zone-id");
        renderInspector();
        setView("inspector");
      }
    });

    svg.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        var target = event.target.closest("[data-zone-id]");
        if (target) {
          event.preventDefault();
          selectedZoneId = target.getAttribute("data-zone-id");
          renderInspector();
          setView("inspector");
        }
      }
    });

    map.appendChild(svg);
  }

  function setView(viewId) {
    var view = views[viewId] || views.ecosystem;
    document.getElementById("view-title").replaceChildren(
      el("h2", "", view.title),
      badge("PASSIVE")
    );

    var content = document.getElementById("view-content");
    content.replaceChildren();
    content.appendChild(el("p", "muted", view.intro));
    view.render(content);

    var buttons = document.querySelectorAll(".nav-button");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].classList.toggle("active", buttons[i].getAttribute("data-view") === viewId);
    }

    renderInspector();
  }

  function renderEcosystem(container) {
    var map = el("div", "ecosystem-map", "");
    map.appendChild(el("div", "map-title", "Static inline SVG cartographic/isometric city-ecosystem map: HumanGate apex above weighted districts rooted in Studio Core"));
    map.appendChild(el("div", "size-note", sampleData.sizeModelNote));
    renderSvgMap(map);

    var pathList = el("div", "path-list", "");
    pathList.appendChild(el("h3", "", "Flow legend"));
    var legend = el("ul", "flow-legend", "");
    sampleData.flowLegend.forEach(function (item) {
      var li = el("li", "", "");
      li.appendChild(el("span", "legend-line " + item.className, ""));
      li.appendChild(document.createTextNode(item.label));
      legend.appendChild(li);
    });
    pathList.appendChild(legend);
    pathList.appendChild(el("h3", "", "Visible static flows"));
    sampleData.mapFlows.forEach(function (path) {
      pathList.appendChild(el("p", "", path.label));
    });
    pathList.appendChild(el("p", "blocked-message", "Toxic / Forbidden Growth is isolated from normal allowed flow. Sizes and flows are static examples, not live telemetry."));

    container.appendChild(map);
    container.appendChild(pathList);
  }

  function renderChain(container) {
    var card = el("div", "detail-card stack", "");
    card.appendChild(el("h3", "", "Sample bounded chain candidate"));
    var list = el("ul", "chain-list", "");
    [
      "Qui: codex executor, patch proposal authority only",
      "Quoi: local static UxPilote skeleton candidate",
      "Quand: one bounded step, no retry loop, stop on scope violation",
      "Comment: static readback validation, blocked actions preserved",
      "Ou: roadmap_docs_only target directory",
      "Pourquoi: recover the living ecosystem metaphor while preserving source-state and HumanGate boundaries"
    ].forEach(function (item) {
      list.appendChild(el("li", "", item));
    });
    card.appendChild(list);
    card.appendChild(el("p", "blocked-message", "Create chain is blocked in this skeleton. This panel is a static preview only."));
    container.appendChild(card);
  }

  function renderInspectorView(container) {
    var zone = findZone(selectedZoneId);
    container.appendChild(zoneDetailCard(zone));
  }

  function renderEvidence(container) {
    var table = el("div", "surface-table", "");
    Object.keys(sampleData.status_by_surface).forEach(function (surface) {
      var row = el("div", "surface-row", "");
      row.appendChild(el("strong", "", surface));
      row.appendChild(badge(sampleData.status_by_surface[surface]));
      row.appendChild(el("span", "badge passive", surface === "roadmap_docs_only" ? "NO_CLAIM_ALLOWED" : "PASSIVE"));
      table.appendChild(row);
    });
    container.appendChild(table);
  }

  function renderPatchLab(container) {
    var card = el("div", "detail-card stack", "");
    card.appendChild(el("h3", "", "Candidate-only Patch Lab"));
    [
      "Target files: index.html, styles.css, app.js, README.md",
      "Allowed action: static wording and visual patch in the approved existing files",
      "Blocked: runtime, tests, agents, broad scan, network, Git, lab outputs",
      "Output route: roadmap_docs_only",
      "Promotion gate: HumanGate",
      "Visual rule: inline SVG isometric cartographic city map only; no live telemetry"
    ].forEach(function (line) {
      card.appendChild(el("p", "", line));
    });
    container.appendChild(card);
  }

  function renderCost(container) {
    var card = el("div", "detail-grid", "");
    [
      ["Climate observation", "UNKNOWN"],
      ["Estimated cost", "LOW"],
      ["CPU/GPU pressure", "NOT OBSERVED"],
      ["Memory pressure", "NOT OBSERVED"],
      ["Time cost", "BOUNDED"],
      ["Guard state", "STATIC ONLY"]
    ].forEach(function (pair) {
      var item = el("div", "detail-card", "");
      item.appendChild(el("h3", "", pair[0]));
      item.appendChild(badge(pair[1] === "LOW" || pair[1] === "STATIC ONLY" ? "PASSIVE" : "BLOCKED"));
      item.appendChild(el("p", "muted", pair[1]));
      card.appendChild(item);
    });
    container.appendChild(card);
  }

  function renderSourceRegistry(container) {
    var card = el("div", "detail-card stack", "");
    card.appendChild(el("h3", "", "Source-state separation"));
    ["created", "registered", "loaded", "enforced", "evidenced"].forEach(function (state) {
      var row = el("div", "surface-row", "");
      row.appendChild(el("strong", "", state));
      row.appendChild(badge(state === "loaded" || state === "enforced" ? "PASSIVE" : "DOCUMENTED_ONLY"));
      card.appendChild(row);
    });
    card.appendChild(el("p", "muted", "No source is promoted by this skeleton."));
    container.appendChild(card);
  }

  function renderHumanGate(container) {
    var card = el("div", "detail-card stack", "");
    card.appendChild(el("h3", "", "HumanGate / Sovereign Gardener / Final Authority Apex"));
    card.appendChild(el("p", "", "Selected option: " + sampleData.humanGate.selected_option));
    card.appendChild(el("p", "", "Scope: " + sampleData.humanGate.scope));
    card.appendChild(el("p", "", "Apex posture: " + sampleData.humanGate.apex_label + " at the top summit of the SVG isometric city map."));
    card.appendChild(el("p", "", "Runtime, agents, broad scans, network exposure, Git actions, and claims remain blocked."));
    card.appendChild(badge("DOCUMENTED_ONLY"));
    container.appendChild(card);
  }

  function renderLlm(container) {
    var card = el("div", "detail-card stack", "");
    card.appendChild(el("h3", "", "Passive Mycelium / Scout Layer"));
    [
      "May suggest labels.",
      "May summarize loaded context.",
      "May flag ambiguity.",
      "Must not mutate, execute, activate, claim, or bypass HumanGate."
    ].forEach(function (line) {
      card.appendChild(el("p", "", line));
    });
    container.appendChild(card);
  }

  function zoneDetailCard(zone) {
    var card = el("div", "detail-card stack", "");
    card.appendChild(el("h3", "", zone.label));
    card.appendChild(el("p", "muted", zone.detail));
    card.appendChild(el("p", "", "Studio Core / Root Substrate is the Foundation Layer and broad base plate below this district."));
    card.appendChild(el("p", "", sampleData.sizeModelNote));
    card.appendChild(el("p", "", "Flows are static examples, not live telemetry."));
    if (zone.id === "humangate") {
      card.appendChild(el("p", "", "HumanGate is the apex, top, and summit of this map."));
    }
    if (zone.id === "purelab") {
      card.appendChild(el("p", "", sampleData.tactical_chess_purelab));
    }
    var meta = el("div", "tag-row", "");
    meta.appendChild(badge(zone.status));
    meta.appendChild(el("span", "badge passive", zone.surface));
    meta.appendChild(el("span", "badge warning", "HumanGate final"));
    meta.appendChild(el("span", "badge passive", zone.weight));
    card.appendChild(meta);
    return card;
  }

  function renderInspector() {
    var zone = findZone(selectedZoneId);
    var inspector = document.getElementById("inspector-content");
    inspector.replaceChildren(zoneDetailCard(zone));
  }

  function renderEvents() {
    var tray = document.getElementById("event-tray-content");
    tray.replaceChildren();
    sampleData.events.forEach(function (eventItem) {
      var card = el("div", "event-card", "");
      card.appendChild(el("h3", "", eventItem.label));
      card.appendChild(badge(eventItem.status));
      card.appendChild(el("p", "muted", eventItem.detail));
      tray.appendChild(card);
    });
  }

  function bindNavigation() {
    var buttons = document.querySelectorAll(".nav-button");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener("click", function (event) {
        setView(event.currentTarget.getAttribute("data-view"));
      });
    }
  }

  function bindBlockedActions() {
    var buttons = document.querySelectorAll("[data-blocked-action]");
    var message = document.getElementById("blocked-message");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener("click", function (event) {
        message.textContent = event.currentTarget.getAttribute("data-blocked-action");
      });
    }
  }

  bindNavigation();
  bindBlockedActions();
  renderEvents();
  setView("ecosystem");
}());
