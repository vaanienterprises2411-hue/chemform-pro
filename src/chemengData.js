// ChemEng Pro formula data
export const CHEMENG_DATA = [
    { id:"ce1", name:"PVAc Emulsion (Homopolymer, Semi-batch)", sub:"Batch emulsion polymerisation, adhesive/paint binder", score:94, tags:["PVAc","emulsion polymerisation"], free:false,
      ingredients:[
        {n:"Vinyl Acetate monomer",       p:45,  c:55},
        {n:"Water (DM)",                  p:45,  c:0.05},
        {n:"PVA stabiliser Mowiol 4-88",  p:4,   c:250},
        {n:"K2S2O8 initiator",            p:0.30,c:120},
        {n:"Sodium Bicarbonate buffer",   p:0.20,c:12},
        {n:"Plasticiser DBP (optional)",  p:5,   c:70},
      ],
      process:["Charge 80% water + PVA to reactor, heat 70 °C, dissolve PVA 30 min (seed charge)","Dissolve K2S2O8 in remaining water — add 10% to reactor","Charge 10% VAc monomer as seed, allow polymerisation 15 min (seed particle nucleation)","Semi-batch: feed remaining VAc monomer + remaining initiator at controlled rate over 3–4 h at 70–75 °C (reflux condenser must handle exotherm)","Post-polymerise: raise to 80 °C, 1 h (conversion >98%)","Cool to 40 °C, add buffer + plasticiser","Filter 100µ, fill","QC: solids 50–55%, Brookfield viscosity, residual VAc <0.1% by GC, Tg by DSC"],
      equipment:["Glass-lined reactor with reflux condenser + jacket","Semi-batch monomer metering pump","N2 purge","GC for residual monomer","DSC","Brookfield viscometer"] },
    { id:"ce2", name:"Acrylic Emulsion (Styrene-Acrylic)", sub:"Core-shell emulsion polymerisation, paint binder", score:95, tags:["acrylic","styrene-acrylic","emulsion"], free:false,
      ingredients:[
        {n:"Styrene monomer",    p:20,  c:65},
        {n:"Butyl Acrylate",     p:25,  c:80},
        {n:"Methyl Methacrylate",p:15,  c:90},
        {n:"Acrylic Acid",       p:2,   c:65},
        {n:"Water (DM)",         p:33,  c:0.05},
        {n:"SDBS Emulsifier",    p:0.80,c:80},
        {n:"APS Initiator",      p:0.30,c:120},
        {n:"NaHCO3 buffer",      p:0.15,c:12},
      ],
      process:["Pre-emulsify monomers in water + SDBS emulsifier — stable pre-emulsion","Charge 10% pre-emulsion + APS seed charge to reactor at 80 °C, N2 purge","Seed polymerise 15 min","Semi-batch: feed remaining pre-emulsion + APS solution over 3–4 h at 80 °C","Redox chase: add t-BHP + ascorbic acid to reduce residual monomer to <0.1%","Cool to 40 °C, neutralise to pH 8–9 with dilute ammonia","Filter 100µ, fill","QC: solids 50%, residual monomer GC, MFT (MFFT bar), Tg by DSC"],
      equipment:["N2-purged SS reactor with reflux","Semi-batch metering pump","GC residual monomer","MFFT bar","DSC"] },
    { id:"ce3", name:"Alkyd Resin (Long Oil, 60% NVM)", sub:"Melt polycondensation, air-drying paint binder", score:93, tags:["alkyd resin","long oil"], free:false,
      ingredients:[
        {n:"Linseed / Soybean Oil",   p:55,  c:100},
        {n:"Phthalic Anhydride",      p:22,  c:60},
        {n:"Pentaerythritol",         p:12,  c:110},
        {n:"Glycerol",                p:8,   c:55},
        {n:"Xylene (reflux solvent)", p:3,   c:30},
      ],
      process:["Alcoholysis stage: charge oils + glycerol + pentaerythritol + Ca/Pb catalyst to reactor","Heat to 240 °C under N2, stir until monoglyceride stage — verify by MeOH cloud point test (clear in 10:1 MeOH:sample)","Cool to 180 °C, add phthalic anhydride portion-wise (add too fast = crystallisation, runaway)","Add xylene (5% for reflux/azeotropic water removal), raise to 230–240 °C","Collect condensed water via Dean-Stark trap — monitor AV every 30 min","Stop when acid value AV <10 mg KOH/g (typically 6–10 h total)","Thin with xylene to 60% NVM at 120 °C","Filter, fill","QC: acid value, Gardner-Holdt viscosity, colour Gardner <6, drying time on glass"],
      equipment:["SS reactor 1000 L with Dean-Stark trap + N2 blanket + jacket","High-temp heating mantle 260 °C","Inline acid value titration set","Gardner-Holdt viscosity tubes","Gardner colour comparator"] },
    { id:"ce4", name:"Polyamide Hardener (Dimer Acid Based)", sub:"Epoxy hardener, flexible, amine value 200–350", score:92, tags:["polyamide","hardener","epoxy"], free:false,
      ingredients:[
        {n:"Dimer Fatty Acid C36",     p:60,  c:180},
        {n:"TETA (triethylenetetramine)",p:25, c:120},
        {n:"EDA (ethylenediamine)",    p:10,  c:80},
        {n:"Xylene (reaction medium)", p:5,   c:30},
      ],
      process:["Charge dimer acid + xylene to reactor, heat to 60 °C with N2","Add TETA + EDA dropwise over 30 min — exotherm control to <80 °C","Raise temperature gradually to 200 °C, collect water of condensation via Dean-Stark trap","React at 200 °C until amine value reaches 200–350 mg KOH/g (titrate every 30 min)","Distil xylene under vacuum at end","Cool to 80 °C, thin with benzyl alcohol if needed for viscosity","Fill","QC: amine value (HCl titration), Brookfield viscosity, colour Gardner <5, EEW reactivity with DGEBA"],
      equipment:["SS reactor with Dean-Stark + N2","Vacuum pump","Amine value titration","Brookfield viscometer","Gardner comparator"] },
    { id:"ce5", name:"HPMC (Hydroxypropyl Methylcellulose)", sub:"Cellulose ether semi-batch etherification", score:95, tags:["HPMC","cellulose ether"], free:false,
      ingredients:[
        {n:"Cotton Linters cellulose",         p:40,  c:28},
        {n:"NaOH 50% (alkalization)",          p:15,  c:12},
        {n:"Methyl Chloride CH3Cl (methylating)",p:25, c:45},
        {n:"Propylene Oxide (HP group)",       p:12,  c:80},
        {n:"Isopropanol (diluent)",            p:8,   c:55},
      ],
      process:["Alkalization: charge cellulose + IPA to pressure reactor, cool to -5 to 0 °C","Add NaOH 50% — alkali cellulose forms (1 h, -5 °C)","Purge N2, seal reactor","Charge CH3Cl + propylene oxide under pressure","Heat 50–80 °C, react 3–4 h at 5–8 bar pressure","Purge residual reagents, wash hot water (60 °C) × 3 to remove NaCl + NaOH + glycols","Centrifuge, spray-dry, mill to target particle size and viscosity grade","QC: DS methyl 1.5–2.1 by NMR, MS hydroxypropyl 0.1–0.3, 2% Brookfield viscosity (grade target), moisture <5%"],
      equipment:["Pressure reactor Hastelloy / SS 316L","Cryogenic NaOH system","Wash column or centrifuge","Spray dryer","ACM mill","Brookfield viscometer","NMR for DS"] },
    { id:"ce6", name:"Ethanol (Fermentation + Distillation)", sub:"Molasses-based, pharma/industrial grade", score:91, tags:["ethanol","fermentation"], free:false,
      ingredients:[
        {n:"Molasses 60° Brix 50% sugars",p:25,  c:8},
        {n:"Water (process)",             p:68,  c:0.05},
        {n:"Saccharomyces cerevisiae",    p:0.50,c:200},
        {n:"Urea (nitrogen source)",      p:0.10,c:18},
        {n:"H2SO4 (pH control)",          p:0.15,c:10},
      ],
      process:["Dilute molasses to 20–22° Brix in fermentation vessel with process water","Adjust pH 4.5–5.0 with H2SO4 (critical for yeast over bacterial contamination)","Sterilise at 80 °C / 30 min (flash pasteurisation)","Inoculate with pre-grown yeast at 10% v/v (from propagator)","Ferment 30–33 °C, 24–36 h with air sparging (aeration) + agitation","Check EtOH by ebulliometer — target 8–12% v/v in beer","Transfer beer to distillation: 3-column system — Analyser + Rectifier + Dehydration (mol sieve beds for 99.5%+ anhydrous)","QC: EtOH % by GC, water content (KF) for pharma grade, heavy metals, colour"],
      equipment:["SS fermentation vessels 10–50 kL","Yeast propagator","3-column distillation train","Molecular sieve dehydration beds","GC analyser","Ebulliometer"] },
    { id:"ce7", name:"CMC (Carboxymethylcellulose, Slurry Process)", sub:"Food & industrial grade, DS 0.6–1.2", score:93, tags:["CMC","cellulose ether"], free:false,
      ingredients:[
        {n:"Purified Cotton Linters cellulose",p:35,  c:28},
        {n:"NaOH 50%",                        p:20,  c:12},
        {n:"Monochloroacetic Acid (MCA)",      p:25,  c:70},
        {n:"Isopropanol / Ethanol diluent",   p:18,  c:55},
        {n:"HCl (pH adjustment)",             p:2,   c:12},
      ],
      process:["Alkalize cellulose in IPA slurry + NaOH at 25–30 °C, 30 min","Add MCA dissolved in IPA dropwise, 60–70 °C, 90 min (DS builds with MCA:cellulose ratio)","Filter slurry, wash with IPA/water 70:30 to remove NaCl + glycolate","Re-slurry in water for food grade — additional wash","Dry at 60–70 °C in tray/spray dryer","Mill and sieve to specification","QC: DS 0.6–1.2 (food) or 0.7–1.5 (industrial), 1% Brookfield viscosity by grade, NaCl content <0.5% (food), pH 6.5–8.5"],
      equipment:["IPA slurry reactor SS","Filter press","Spray dryer / tray dryer","ACM mill","Brookfield viscometer","Ion chromatography for DS"] },
    { id:"ce8", name:"Polyester Polyol (for PU Foam / Coatings)", sub:"Melt polycondensation, OH value 50–80", score:93, tags:["polyester polyol","PU"], free:false,
      ingredients:[
        {n:"Adipic Acid",          p:38,  c:90},
        {n:"Diethylene Glycol DEG",p:25,  c:55},
        {n:"Ethylene Glycol EG",   p:15,  c:50},
        {n:"Neopentyl Glycol NPG", p:18,  c:95},
        {n:"Tin Octoate catalyst", p:0.05,c:600},
      ],
      process:["Charge diol mixture + adipic acid to reactor","Heat to 150 °C, begin water removal with N2 sweep + partial condenser (no vacuum yet)","Raise to 200–220 °C, apply vacuum 50–100 mbar for final drying (water removal)","Monitor acid value every hour — stop at AV <2 mg KOH/g and OH value 50–80 mg KOH/g","Cool to 100 °C, thin if needed, fill under N2","QC: OH value (acetylation method ASTM D4274), acid value, Brookfield viscosity, colour Hazen <50"],
      equipment:["SS reactor with Dean-Stark + vacuum + N2 blanket","OH value titration (acetylation method)","Acid value titration","Brookfield viscometer","Hazen colour comparator"] },
    { id:"ce9", name:"Styrene-Acrylic Emulsion (SA Emulsion)", sub:"Semi-batch emulsion copolymerisation, exterior paint & coating binder", score:93, tags:["styrene-acrylic","emulsion polymerisation","binder"], free:false, proLocked:false,
      ingredients:[
        {n:"Styrene monomer",                    p:20,  c:95},
        {n:"n-Butyl Acrylate",                   p:18,  c:145},
        {n:"Methyl Methacrylate",                p:8,   c:165},
        {n:"Acrylic Acid (functional monomer)",  p:1,   c:180},
        {n:"Disponil AFEM 181 (emulsifier)",     p:1.5, c:380},
        {n:"Sodium Dodecyl Sulfate",             p:0.3, c:180},
        {n:"Ammonium Persulfate (initiator)",    p:0.4, c:120},
        {n:"Sodium Bicarbonate (buffer)",        p:0.2, c:12},
        {n:"Water (DM)",                         p:50.6,c:0.05},
      ],
      process:`STAGE 1 — PRE-EMULSION (Room temp, 1h)
Prepare monomer pre-emulsion: mix styrene, BA, MMA, AA with surfactant solution + 60% of total water. High-shear mix 20 min. Separately dissolve APS in 5% water.

STAGE 2 — SEEDING (80°C, N₂ purge)
Charge 15% pre-emulsion + 10% initiator solution into reactor at 80°C under nitrogen. Polymerise 20 min to form seed latex (particle size 80–120nm).

STAGE 3 — SEMI-BATCH FEED (80°C, 3–4h)
Simultaneously feed remaining pre-emulsion (3–4h) and initiator solution (3.5h) to maintain starved-feed conditions. Temperature control ±2°C critical — exotherm risk. Residual monomer feeds through: slow feed = better conversion.

STAGE 4 — COOK-DOWN & CHASING (85°C, 1h)
Increase temp to 85°C, add chase initiator (0.1% APS + 0.05% sodium metabisulfite) to reduce residual monomer <100 ppm.

STAGE 5 — NEUTRALISATION & COOLING
Cool to <40°C. Neutralise with 25% ammonia to pH 7.5–9.0. Filter through 100-mesh screen.

SPECIFICATIONS:
Solids: 45–50% | pH: 7.5–9.0 | Viscosity: 500–2000 mPas | MFFT: 5–15°C | Particle size: 120–180nm | Residual monomer: <100ppm

EQUIPMENT: 1000L glass-lined jacketed reactor, reflux condenser, anchor/helical stirrer, N₂ purge system, monomer feed pumps, heat exchanger`,
      equipment:["Glass-lined jacketed reactor 1000L","Reflux condenser","Anchor stirrer","N₂ purge system","Monomer metering pumps","GC for residual monomer","Particle size analyser","pH meter"] },

    { id:"ce10", name:"Epoxy Resin (Bisphenol A Diglycidyl Ether, BADGE)", sub:"Step-growth polymerisation, liquid epoxy resin EEW 180–195", score:95, tags:["epoxy resin","BADGE","step-growth polymerisation"], free:false, proLocked:false,
      ingredients:[
        {n:"Bisphenol A (BPA)",                  p:37.2, c:120},
        {n:"Epichlorohydrin (ECH)",               p:59.0, c:95},
        {n:"Sodium Hydroxide 50% solution",       p:18.5, c:25},
        {n:"Water (wash)",                        p:30,   c:0.05},
        {n:"Toluene (azeotropic drying solvent)", p:5,    c:55},
      ],
      process:`STAGE 1 — DISSOLUTION (60°C)
Charge BPA and ECH to reactor (ECH:BPA molar ratio ~10:1 for liquid resin). Heat to 60°C with stirring until BPA fully dissolves in ECH.

STAGE 2 — RING OPENING / ADDITION (55–65°C, 2h)
Add 50% NaOH solution dropwise over 2h at 55–65°C. Exothermic — cooling water required. NaOH opens epoxide ring of ECH and causes addition to BPA hydroxyl, then re-closure. pH 12–13 maintained.

STAGE 3 — DEHYDROCHLORINATION (65–70°C, 1h)
Second NaOH addition causes elimination of HCl (dehydrochlorination) to form epoxide ring. Temperature 65–70°C. NaCl precipitates.

STAGE 4 — WASHING (3× with hot water 60°C)
Transfer to wash vessel. Wash 3× with hot DM water to remove NaCl and excess NaOH. Check wash water conductivity <50 µS/cm.

STAGE 5 — SOLVENT STRIPPING
Azeotropic drying with toluene to remove water. Strip toluene under vacuum (60°C, <5 mbar) until water <0.2%.

STAGE 6 — FILTRATION
Filter through pressure leaf filter. Final product: clear amber liquid.

SPECIFICATIONS:
EEW (Epoxide Equivalent Weight): 182–192 g/eq | Viscosity @ 25°C: 10,000–15,000 mPas | Color: <3 Gardner | Hydrolysable Cl: <500 ppm | Water: <0.2%

EQUIPMENT: Glasslined reactor, reflux condenser, NaOH metering pump, wash vessel, vacuum stripper, pressure leaf filter`,
      equipment:["Glass-lined jacketed reactor","Reflux condenser","NaOH metering system","Wash vessel (3-stage)","Vacuum stripper","Pressure leaf filter","Titration setup for EEW","Chloride analyser"] },

    { id:"ce11", name:"Alkyd Resin (Short Oil, 35% Soya Oil)", sub:"Polycondensation, fast-drying stoving/oven-dry alkyd for industrial paints", score:92, tags:["alkyd resin","polycondensation","short oil"], free:false, proLocked:false,
      ingredients:[
        {n:"Soya Fatty Acids (TOFA grade)",      p:35,  c:85},
        {n:"Pentaerythritol (polyol)",            p:12,  c:180},
        {n:"Phthalic Anhydride (diacid)",         p:28,  c:95},
        {n:"Isophthalic Acid (modifying diacid)", p:8,   c:120},
        {n:"Trimethylolpropane (branching agent)",p:5,   c:220},
        {n:"Xylene (azeotropic solvent)",         p:10,  c:62},
        {n:"Litharge (PbO catalyst, or Tin DBTL)",p:0.05,c:180},
      ],
      process:`STAGE 1 — FATTY ACID ESTERIFICATION (220–240°C, N₂, 3–4h)
Charge fatty acids + pentaerythritol + TMP to reactor. Heat under N₂ blanket to 220°C. React until acid value <10 mg KOH/g (monoglyceride stage).

STAGE 2 — PHTHALIC ANHYDRIDE ADDITION
Cool to 180°C. Add PA + IPA slowly (vigorous reaction, CO₂/steam evolution). Heat to 220–235°C.

STAGE 3 — POLYCONDENSATION (220–240°C, 4–6h)
Azeotropic distillation with xylene to remove water of condensation. Monitor acid value every 30 min. Target acid value: 8–12 mg KOH/g. Viscosity builds progressively.

STAGE 4 — THINNING
When target acid value and viscosity reached, cool to 150°C. Add xylene to 60% solids. Filter.

SPECIFICATIONS (60% in xylene):
Acid Value: 8–12 mg KOH/g | Viscosity Z3–Z5 (Gardner-Holdt) | Color: <5 Gardner | Oil length: 35% | Solids: 60%

EQUIPMENT: Stainless steel jacketed reactor with dean-stark trap, reflux condenser, helical anchor stirrer, N₂ blanket system, heating mantle or heat transfer oil system`,
      equipment:["SS jacketed reactor 1000L","Dean-Stark trap + reflux condenser","Helical anchor stirrer","N₂ blanket system","Heat transfer oil heating","Acid value titration","Gardner-Holdt viscosity tubes","Color comparator"] },

    { id:"ce12", name:"Polyester Resin (Unsaturated, Orthophthalic)", sub:"Polycondensation, UP resin for GRP/FRP composites", score:91, tags:["polyester resin","UP resin","FRP","composite"], free:false, proLocked:false,
      ingredients:[
        {n:"Phthalic Anhydride",                  p:30,  c:95},
        {n:"Maleic Anhydride (unsaturation)",      p:15,  c:145},
        {n:"Propylene Glycol",                    p:30,  c:95},
        {n:"Diethylene Glycol (modifier)",        p:10,  c:65},
        {n:"Styrene monomer (reactive diluent)",  p:14,  c:88},
        {n:"Hydroquinone (inhibitor)",            p:0.02,c:280},
        {n:"Cobalt Naphthenate 6% (accelerator)", p:0.3, c:180},
      ],
      process:`STAGE 1 — ESTERIFICATION (180–220°C, N₂, 6–8h)
Charge PA, MA, PG, DEG to reactor under N₂. Heat to 180°C gradually. Water of condensation distils over. Raise temp stepwise: 180→200→220°C over 4h. Monitor acid value every hour.

STAGE 2 — POLYCONDENSATION (220°C, vacuum optional)
Continue until acid value 20–25 mg KOH/g. Apply partial vacuum (200–400 mbar) to boost conversion.

STAGE 3 — INHIBITOR ADDITION
Cool to 150°C. Add hydroquinone inhibitor to prevent premature gelation.

STAGE 4 — STYRENE DILUTION
Cool to <80°C. Transfer to blend vessel. Add styrene to 30–35% to adjust viscosity (200–600 mPas at 25°C). Styrene content affects reactivity and hardness.

SPECIFICATIONS:
Acid Value: 20–25 mg KOH/g | Viscosity: 300–600 mPas | Styrene content: 30–35% | Gel time (1% BPO): 8–15 min | Color: <4 Gardner

EQUIPMENT: SS or glass-lined reactor with partial condenser, N₂ system, vacuum pump, blend vessel for styrene dilution`,
      equipment:["SS or glass-lined reactor","Partial condenser (Dean-Stark)","N₂ system","Vacuum pump","Styrene blend vessel","Acid value titration","Gel time tester","Brookfield viscometer"] },

    { id:"ce13", name:"Polyether Polyol (Propylene Oxide, Triol, MW 3000)", sub:"Ring-opening polymerisation, flexible PU foam and elastomer base", score:93, tags:["polyether polyol","PO polymerisation","polyurethane"], free:false, proLocked:true,
      ingredients:[
        {n:"Glycerol (trifunctional initiator)",  p:3.2, c:85},
        {n:"Propylene Oxide (PO)",                p:94.5,c:95},
        {n:"KOH catalyst (45% solution)",         p:0.3, c:45},
        {n:"Magnesium Silicate (neutralisation)", p:2,   c:35},
      ],
      process:`STAGE 1 — INITIATOR + CATALYST CHARGING
Charge glycerol + KOH catalyst (0.1–0.3% on charge) to stainless steel pressure reactor. Purge 3× with N₂. Dehydrate at 100°C, vacuum to <100 ppm water.

STAGE 2 — PROPYLENE OXIDE POLYMERISATION (110–130°C, pressure 3–5 bar)
Feed PO slowly — exothermic, pressure controlled. PO addition rate set by heat removal capacity (jacket + condenser). Never exceed 5 bar. PO feeds over 4–8h. Reactor must be explosion-proof — PO is highly flammable (flash point -37°C).

STAGE 3 — DIGESTION
After PO feed complete, hold at 120°C for 1h to consume residual PO. Vent to <0.1 bar. Check for unreacted PO by GC.

STAGE 4 — NEUTRALISATION & FILTRATION
Cool to 80°C. Add magnesium silicate (Ambosol) to neutralise KOH. Stir 2h at 80°C. Filter under pressure through leaf filter. Strip residual PO/water under vacuum.

SPECIFICATIONS:
Hydroxyl Value: 54–58 mg KOH/g (theoretical MW ~3000) | Acid Value: <0.1 | Water: <0.05% | Viscosity @ 25°C: 500–700 mPas | Color: <50 APHA | K+: <5 ppm

EQUIPMENT: Pressure-rated SS reactor (10 bar design), PO metering pump, explosion-proof electrics, scrubber for PO vent, pressure leaf filter, vacuum stripper`,
      equipment:["Pressure SS reactor 10 bar","PO metering/dosing pump","Explosion-proof electrics + ATEX zone","PO scrubber system","Leaf filter (pressure)","Vacuum stripper","GC for residual PO","Karl Fischer for water","OH value titration apparatus"] },

    { id:"ce14", name:"Ethylene Vinyl Acetate (EVA) Emulsion", sub:"Semi-batch emulsion copolymerisation, adhesive and paper binder", score:90, tags:["EVA","ethylene vinyl acetate","emulsion","adhesive"], free:false, proLocked:true,
      ingredients:[
        {n:"Vinyl Acetate monomer",               p:40,  c:55},
        {n:"Ethylene (dissolved under pressure)",  p:6,   c:35},
        {n:"PVA Mowiol 4-88 (protective colloid)",p:4.5, c:250},
        {n:"PVA Mowiol 28-99 (protective colloid)",p:1,  c:265},
        {n:"Disponil AFEM 181 (emulsifier)",      p:0.8, c:380},
        {n:"Ammonium Persulfate (initiator)",      p:0.3, c:120},
        {n:"Sodium Acetate (buffer)",              p:0.1, c:18},
        {n:"Water (DM)",                          p:47.3,c:0.05},
      ],
      process:`STAGE 1 — REACTOR PREPARATION (pressure vessel, 50 bar rated)
Charge water, PVA stabilisers, emulsifier to pressure reactor. Heat to 60°C, dissolve PVA with stirring.

STAGE 2 — ETHYLENE PRESSURISATION
Charge 30% of vinyl acetate. Seal reactor. Pressurise with ethylene to 30–40 bar at 60°C. Stir to dissolve ethylene in monomer phase.

STAGE 3 — INITIATION
Add initiator solution. Polymerisation begins — exotherm detected (temp rise 2–5°C). Ethylene incorporation determined by pressure drop rate.

STAGE 4 — SEMI-BATCH FEED (70–80°C, 4–5h)
Feed remaining VA over 4h. Maintain ethylene pressure by continuous dosing. Ethylene content of copolymer controlled by pressure (higher pressure = more ethylene). Typical ethylene content: 8–15%.

STAGE 5 — FINISHING
Reduce pressure. Chase with redox initiator. Cool to 40°C. Filter.

SPECIFICATIONS:
Solids: 55–58% | Ethylene content: 10–12% | Viscosity: 3000–6000 mPas | pH: 4.5–5.5 | MFFT: -5 to 5°C | Particle size: 1–3 µm

EQUIPMENT: Pressure reactor (50 bar), ethylene metering, explosion-proof fittings`,
      equipment:["Pressure reactor 50 bar SS","Ethylene dosing system","Explosion-proof ATEX zone","High-pressure pump","Particle size analyser","GC for residual monomer","pH meter","Brookfield viscometer"] },

    { id:"ce15", name:"SBR Latex (Styrene-Butadiene Rubber Emulsion)", sub:"Cold emulsion polymerisation 5°C, general purpose SBR 1500 type", score:92, tags:["SBR","styrene-butadiene","rubber","latex"], free:false, proLocked:true,
      ingredients:[
        {n:"Styrene monomer",                      p:23.5,c:88},
        {n:"Butadiene (liquefied gas)",             p:72,  c:65},
        {n:"Fatty Acid Soap (emulsifier)",          p:4.7, c:85},
        {n:"K2S2O8 (initiator)",                   p:0.3, c:120},
        {n:"n-Dodecyl Mercaptan (chain transfer)",  p:0.2, c:380},
        {n:"Sodium Pyrophosphate (chelator)",        p:0.3, c:45},
        {n:"Ferrous Sulfate (activator)",           p:0.003,c:18},
        {n:"Water (DM)",                            p:200, c:0.05},
      ],
      process:`STAGE 1 — COLD EMULSION POLYMERISATION (5°C, pressure vessel)
SBR polymerisation at 5°C gives better properties than hot process (60°C). Reactor is high-pressure (10 bar) due to butadiene vapour pressure. Butadiene (BP -4.4°C) handled as liquefied gas.

Charge soap solution, FeSO₄, Na-pyrophosphate, DDM chain transfer agent. Cool to 5°C. Add BD under pressure. Add styrene. Initiate with oxidising agent (K₂S₂O₈) + reducing agent (FeSO₄) redox system.

STAGE 2 — POLYMERISATION (5–10°C, 8–12h)
Reaction proceeds at 5°C to ~60% conversion. Monitor pressure drop (corresponds to BD consumption). Conversion limited to 60% to avoid gel formation.

STAGE 3 — SHORT-STOPPING (at 60% conversion)
Add shortstop (0.1% DEHA or sodium dimethyldithiocarbamate) to kill polymerisation. Prevents further reaction, gel formation.

STAGE 4 — STRIPPING (50–60°C, vacuum)
Remove unreacted BD by steam stripping under vacuum. BD recovered and recycled. Final BD: <50 ppm.

STAGE 5 — COAGULATION & DRYING (for dry rubber)
OR: For latex use — antioxidant addition, biocide, pH adjustment to 10–11.

SPECIFICATIONS (SBR 1500 dry rubber):
Styrene content: 23.5% | Mooney viscosity ML(1+4) 100°C: 50±5 | Bound styrene: 23±1% | Gel content: <5% | Ash: <1%`,
      equipment:["Pressure reactor 10 bar (BD rated)","BD liquefied gas system + ATEX zone","Cold water chilling system -10°C","BD recovery/stripping column","Coagulation vessel + dryer (for dry rubber)","Mooney viscometer","GPC for MW","GC for BD residual"] },

    { id:"ce16", name:"Cellulose Ether — HPMC (Hydroxypropyl Methyl Cellulose)", sub:"Heterogeneous gas-solid etherification of cellulose", score:94, tags:["HPMC","cellulose ether","etherification"], free:false, proLocked:true,
      ingredients:[
        {n:"Refined Cotton Linters / Wood Pulp",  p:55,  c:85},
        {n:"Sodium Hydroxide 50% (alkali agent)",  p:12,  c:25},
        {n:"Methyl Chloride (methylating agent)",  p:18,  c:95},
        {n:"Propylene Oxide (HPO agent)",          p:8,   c:95},
        {n:"Isopropyl Alcohol (reaction medium)",  p:7,   c:65},
      ],
      process:`STAGE 1 — MERCERISATION (ALKALI CELLULOSE FORMATION)
Shred cellulose pulp. Steep in 50% NaOH solution at 25°C for 30 min. Squeeze to 2.5× NaOH/cellulose ratio. Alkali cellulose formed — reactive sites generated.

STAGE 2 — ETHERIFICATION (60–80°C, pressure vessel, 4–6h)
Transfer alkali cellulose to pressure reactor. Add IPA as reaction medium (prevents local overheating). Purge with N₂. Cool to -10°C. Charge MeCl and PO under pressure. Heat to 60–80°C. React 4–6h. MeCl provides methyl substitution (DS 1.5–2.0); PO provides hydroxypropyl substitution (MS 0.1–0.3).

STAGE 3 — NEUTRALISATION & WASHING
Depressurise reactor. Recover MeCl/IPA by distillation. Neutralise with HCl. Wash product with hot water 80–90°C (removes NaCl, glycol ethers). Wash until conductivity <500 µS/cm.

STAGE 4 — DRYING & MILLING
Dry at 50–60°C (air dryer). Mill to required particle size. Sieve. Surface treat for delayed dissolution if required.

SPECIFICATIONS (construction grade HPMC):
DS(methyl): 1.5–2.0 | MS(hydroxypropyl): 0.1–0.3 | Viscosity (2% aq, 20°C): 15,000–200,000 mPas (grade-dependent) | Moisture: <5% | Ash (as NaCl): <5% | Gel temp: 58–68°C`,
      equipment:["Steeping tank (NaOH)","Squeeze press","Pressure reactor (ATEX) 10 bar","MeCl/PO dosing system","IPA recovery distillation","Hot water wash system","Spray dryer / tray dryer","Pin mill + classifier","Brookfield viscometer 2% solution"] },

    { id:"ce17", name:"Carboxymethyl Cellulose (CMC) — Technical & Food Grade", sub:"Etherification of cellulose with monochloroacetic acid", score:91, tags:["CMC","cellulose ether","detergent","drilling"], free:false, proLocked:true,
      ingredients:[
        {n:"Cotton Linters / Refined Wood Pulp",  p:50,  c:75},
        {n:"Sodium Hydroxide 50%",                p:15,  c:25},
        {n:"Monochloroacetic Acid (MCA)",          p:20,  c:85},
        {n:"Isopropyl Alcohol (medium)",           p:15,  c:65},
      ],
      process:`STAGE 1 — ALKALI CELLULOSE (25°C, 30 min)
Slurry cellulose in IPA. Add 50% NaOH with mixing. React 30 min. Na-cellulose formed. Uniform alkali distribution critical for uniform DS.

STAGE 2 — ETHERIFICATION (55–75°C, 1.5–2h)
Add MCA (or sodium chloroacetate) to Na-cellulose slurry. Heat to 55–75°C. CMC DS controlled by MCA/NaOH/cellulose molar ratio. DS 0.6–0.7 for detergent grade; DS 0.85–0.95 for food/pharma grade.

STAGE 3 — NEUTRALISATION
Add HCl or acetic acid to neutralise. NaCl byproduct formed.

STAGE 4 — WASHING & PURIFICATION
For technical grade: wash with 70% IPA/water to remove NaCl (conductivity test). For food grade: multiple hot water washes, spray dry.

STAGE 5 — DRYING & MILLING
Spray dry or tray dry. Mill to 80–120 mesh.

SPECIFICATIONS:
DS: 0.65–0.90 | Purity: >99.5% CMC (food grade) | Viscosity (1%, 25°C): 200–3000 mPas | NaCl: <1.2% food, <5% technical | pH: 6.5–8.5 | Moisture: <10%`,
      equipment:["Alkylation reactor SS","MCA dosing system","IPA wash vessel","IPA recovery column","Spray dryer","Pin mill","DS measurement (titration)","Brookfield viscometer"] },

    { id:"ce18", name:"Ethanol (Fermentation Route, Sugarcane/Grain)", sub:"Yeast fermentation + distillation, industrial/fuel ethanol 99.5%", score:88, tags:["ethanol","fermentation","distillation","biofuel"], free:false, proLocked:true,
      ingredients:[
        {n:"Sugarcane Juice / Molasses (substrate)",p:85,  c:12},
        {n:"Saccharomyces cerevisiae (yeast)",      p:0.5, c:180},
        {n:"Urea (nitrogen nutrient)",              p:0.2, c:28},
        {n:"DAP (phosphate nutrient)",              p:0.1, c:45},
        {n:"Sulfuric Acid (pH control)",            p:0.1, c:12},
        {n:"Water",                                 p:14.1,c:0.05},
      ],
      process:`STAGE 1 — SUBSTRATE PREPARATION
Dilute molasses/sugarcane juice to 18–20 Brix (total fermentable sugars). Adjust pH to 4.5–5.0 with H₂SO₄. Add nutrients: urea (200 ppm N), DAP (100 ppm P₂O₅).

STAGE 2 — YEAST PROPAGATION
Activate dry yeast in 10% sugar solution at 30°C, 2h. Scale up in propagation tank with aeration. Pitch rate: 10⁸ cells/mL.

STAGE 3 — BATCH FERMENTATION (30–33°C, 36–48h, anaerobic)
Transfer to fermentor. Temperature control critical (cooling coils). CO₂ evolution monitored. Ethanol yield: ~48% w/w of glucose consumed (theoretical 51%). Final beer: 8–12% v/v ethanol.

STAGE 4 — DISTILLATION (Continuous)
Beer column: concentrate ethanol to 50–55% v/v. Rectifier: concentrate to 95.6% v/v azeotrope. Spent wash (vinasse): high BOD, requires treatment.

STAGE 5 — DEHYDRATION (for fuel ethanol 99.5%)
Molecular sieve dehydration (3A zeolite) or extractive distillation with cyclohexane to break azeotrope. Final product: 99.5% v/v anhydrous ethanol.

SPECIFICATIONS:
Ethanol: ≥99.5% v/v (fuel grade) or 95.6% (rectified spirit) | Methanol: <100 ppm | Acidity: <30 ppm as acetic acid | Water: <0.5%

EQUIPMENT: Fermentors 100,000L SS, beer column, rectifying column, molecular sieve dehydration, CO₂ recovery, effluent treatment`,
      equipment:["Fermentors 100KL SS","Beer column","Rectifying column","Molecular sieve dehydration unit","CO₂ scrubber + recovery","Effluent treatment (biodigester)","Online Brix/ethanol analyser","GC for ethanol purity"] },

    { id:"ce19", name:"Biodiesel (FAME, Transesterification of Vegetable Oil)", sub:"Base-catalysed transesterification, EN 14214 specification", score:89, tags:["biodiesel","FAME","transesterification","biofuel"], free:false, proLocked:true,
      ingredients:[
        {n:"Refined Vegetable Oil (RBD palm/soya)", p:78,  c:85},
        {n:"Methanol (anhydrous 99.9%)",            p:16,  c:38},
        {n:"Sodium Methylate 30% in methanol",      p:1,   c:85},
        {n:"Phosphoric Acid (for neutralisation)",  p:0.3, c:45},
        {n:"Water (wash)",                          p:4.7, c:0.05},
      ],
      process:`STAGE 1 — OIL PRE-TREATMENT
RBD oil: FFA <0.1% (no acid pretreatment needed). Non-RBD/crude oil: acid esterification first (H₂SO₄ + methanol at 60°C to reduce FFA <0.5%). Water content: <0.05% — critical, water inhibits transesterification.

STAGE 2 — TRANSESTERIFICATION (60°C, 1h, 3:1 MeOH:oil molar ratio)
Mix oil + methanol + sodium methylate catalyst (0.5–1.0% on oil) at 60°C. Reaction: triglyceride + 3 MeOH → 3 FAME (biodiesel) + glycerol. Residence time 1h (batch) or continuous CSTR.

STAGE 3 — PHASE SEPARATION (30 min)
Allow glycerol to settle (2 phases). Bottom: crude glycerol (85–90% glycerol + methanol + catalyst). Top: crude FAME.

STAGE 4 — METHANOL RECOVERY
Strip methanol from both phases by vacuum distillation (60°C). Methanol recycled.

STAGE 5 — WASHING & DRYING
Wash FAME 2× with warm water (50°C) to remove soap, glycerol, methanol. Dry under vacuum at 60°C (water <200 ppm).

SPECIFICATIONS (EN 14214):
FAME: ≥96.5% | Flash point: >120°C | Acid value: <0.5 mg KOH/g | Water: <500 ppm | Cloud point: dependent on oil source | Sulphur: <10 ppm

EQUIPMENT: Transesterification reactor (SS), settling tank (glycerol separation), methanol stripper, water wash vessel, vacuum dryer`,
      equipment:["Transesterification reactor SS","Glycerol settling vessel","Methanol recovery distillation","Water wash vessel","Vacuum dryer","Titration for acid value","GC for FAME content","Karl Fischer for water"] },

    { id:"ce20", name:"Pharmaceutical API — Paracetamol (Acetaminophen) Synthesis", sub:"Acetylation of p-aminophenol, bulk API manufacture", score:93, tags:["pharma API","synthesis","paracetamol","acetylation"], free:false, proLocked:true,
      ingredients:[
        {n:"para-Aminophenol (p-AP, 99%)",         p:55,  c:180},
        {n:"Acetic Anhydride (acetylating agent)",  p:52,  c:95},
        {n:"Water (DM, reaction medium)",           p:200, c:0.05},
        {n:"Activated Carbon (decolourisation)",    p:0.5, c:350},
        {n:"Acetic Acid (byproduct, recovered)",    p:30,  c:38},
      ],
      process:`STAGE 1 — SLURRY PREPARATION
Prepare 20% w/v aqueous slurry of p-aminophenol in DM water at 25°C. Stir to uniform suspension.

STAGE 2 — ACETYLATION (25–40°C, 1h)
Add acetic anhydride dropwise (exothermic — control temp 25–40°C with cooling). Molar ratio: p-AP:Ac₂O = 1:1.05. Reaction completes in 30–60 min. Acetic acid is byproduct: p-AP + Ac₂O → Paracetamol + CH₃COOH.

STAGE 3 — DECOLOURISATION
Add 0.5% activated carbon. Heat to 70°C, stir 20 min. Filter hot through sparkler filter.

STAGE 4 — CRYSTALLISATION
Cool filtrate to 5–10°C with controlled cooling rate (0.5°C/min for large crystals). Filter, wash with cold DM water.

STAGE 5 — DRYING
Fluid bed dryer at 70°C. LOD <0.5%.

SPECIFICATIONS (IP/BP/USP):
Assay (HPLC): 99.0–101.0% | Related substances (4-aminophenol): <50 ppm | LOD: <0.5% | Heavy metals: <20 ppm | Residual solvents: ICH Q3C compliant | pH (1% solution): 5.3–6.5

EQUIPMENT: Glass-lined jacketed reactor, Ac₂O metering pump, Sparkler filter (decolourisation), Cooling crystalliser, Centrifuge or pressure filter, FBD, HPLC for assay + impurity profile`,
      equipment:["Glass-lined reactor","Acetic anhydride metering pump","Sparkler filter","Cooling crystalliser (controlled rate)","Centrifuge","Fluid bed dryer","HPLC system","Karl Fischer","Heavy metal testing"] },

    { id:"ce21", name:"Agrochemical AI — Pendimethalin 30% EC Manufacturing", sub:"Formulation of dinitroaniline herbicide, emulsifiable concentrate", score:86, tags:["agrochemical","herbicide","EC","dinitroaniline"], free:false, proLocked:true,
      ingredients:[
        {n:"Pendimethalin Technical (95%)",         p:31.58,c:280},
        {n:"Aromatic Solvent 150 (Solvesso 150)",   p:55,   c:68},
        {n:"Castor Oil Ethoxylate 40EO (emulsifier)",p:8,   c:165},
        {n:"Calcium Dodecylbenzene Sulfonate",      p:5.42, c:95},
      ],
      process:`STAGE 1 — DISSOLUTION (40°C, 1h)
Charge Solvesso 150 to SS vessel. Add pendimethalin technical with heating to 40°C. Stir until complete dissolution (yellow-orange solution). Temperature aids dissolution of this moderately soluble AI.

STAGE 2 — EMULSIFIER ADDITION (room temp)
Add castor oil ethoxylate and calcium DDBSS emulsifier blend. Mix 30 min at room temp. Emulsifier ratio optimised for HLB 10–12 (target for EC formulations).

STAGE 3 — QUALITY TESTING
Emulsification test (CIPAC MT 36): dilute 1mL in 100mL standard hard water (342 ppm CaCO₃). Observe after 0 min and 1h. Acceptable: cream <2mL, no free oil, no oily ring.
Cold stability: store at 0°C for 7 days — no crystallisation, no separation.
Flash point: >40°C (Pensky-Martens).

STAGE 4 — FILTRATION & FILLING
Filter through 150-mesh SS screen. Fill into HDPE containers. Label with safety data.

SPECIFICATIONS:
AI content: 30±1.5% (HPLC) | Emulsification stability: pass | Cold storage stability: pass | Flash point: >40°C | pH (1% in water): 6–8 | Density: 0.98–1.02 g/mL`,
      equipment:["SS mixing vessel (heated)","High-speed stirrer","Emulsification test apparatus (CIPAC)","Cold storage 0°C","Flash point tester (Pensky-Martens)","HPLC for AI assay","pH meter","Density meter"] },

    { id:"ce22", name:"Inorganic Chemical — Sodium Silicate (Water Glass) Manufacturing", sub:"Fusion / hydrothermal process, Na₂SiO₃, silica ratio 2.0–3.5", score:87, tags:["inorganic","sodium silicate","water glass"], free:false, proLocked:true,
      ingredients:[
        {n:"Silica Sand (SiO₂ >99%)",              p:52,  c:8},
        {n:"Sodium Carbonate (Soda Ash)",           p:32,  c:18},
        {n:"Water (DM)",                            p:16,  c:0.05},
      ],
      process:`DRY FUSION PROCESS (for solid water glass):
STAGE 1 — FUSION (1400–1500°C)
Mix silica sand + soda ash in correct molar ratio (SiO₂:Na₂O = desired modulus, typically 2.5–3.5). Charge to furnace. Fuse at 1400–1500°C for 4–6h. Molten mass flows to cooling conveyor. Cooled cullet (solid Na₂O·nSiO₂).

STAGE 2 — DISSOLUTION (autoclave, 130–160°C, 3–5 bar)
Crush cullet to 5–20mm pieces. Charge to autoclave with DM water. Heat to 150°C at 4 bar steam pressure. Dissolve 2–4h to form liquid sodium silicate solution. Filter to remove undissolved silica.

HYDROTHERMAL PROCESS (direct liquid production):
React NaOH solution with silica sand in autoclave at 170°C, 8 bar, 4h. Simpler for small-scale.

SPECIFICATIONS:
SiO₂:Na₂O modulus: 2.0–3.5 (as required) | Baumé: 40–42°Be (density 1.38–1.40 g/mL) | Fe: <50 ppm | Al₂O₃: <0.2% | Colour: clear to pale yellow

APPLICATIONS: Adhesives (corrugated box), silica gel precursor, concrete waterproofing, detergent builder, paper coating`,
      equipment:["High-temperature furnace 1500°C","Autoclave (pressure vessel, 10 bar)","Steam system","Plate-and-frame filter","Baumé/density meter","Atomic absorption for metals","Refractometer"] },
];
