import { useState, useEffect, useCallback, useRef } from "react";

// ─── Currency (all base costs stored in INR) ───────────────────────────────
const INR_TO_USD = 1 / 83.5;
const fmtCur = (inr, cur) => {
  if (cur === "INR") return `₹${Number(inr).toFixed(2)}`;
  return `$${(Number(inr) * INR_TO_USD).toFixed(3)}`;
};

// ─── CORRECT COST CALCULATION ─────────────────────────────────────────────
// Each ingredient has: p = percentage by weight, c = cost per kg in INR
// Formula cost/kg = SUM of (p/100 * c) for all ingredients
// This is always correct regardless of whether percentages add to 100 or not
const calcCostPerKg = (ingredients, customPrices = {}) => {
  return ingredients.reduce((total, ing) => {
    const pricePer_kg = Number(customPrices[ing.n] ?? ing.c);
    const fraction = Number(ing.p) / 100;
    return total + fraction * pricePer_kg;
  }, 0);
};

// ─── Plans ─────────────────────────────────────────────────────────────────
const PLANS = {
  free:       { name:"Free",       price:0,   inr:0,    usd:0,  color:"#64748b", ai:3,   process:0,   equipment:0,   engBasic:false, engDetailed:false, chemeng:false },
  starter:    { name:"Starter",    price:749, inr:749,  usd:9,  color:"#34d399", ai:10,  process:5,   equipment:5,   engBasic:false, engDetailed:false, chemeng:false },
  pro:        { name:"Pro",        price:2399,inr:2399, usd:29, color:"#4f9cf9", ai:50,  process:5,   equipment:5,   engBasic:true,  engDetailed:false, chemeng:false },
  enterprise: { name:"Enterprise", price:8249,inr:8249, usd:99, color:"#a78bfa", ai:999, process:999, equipment:999, engBasic:true,  engDetailed:true,  chemeng:true  },
};

const INDUSTRIES = [
  { id:"construction", label:"Construction Chemicals", icon:"🏗️" },
  { id:"paints",       label:"Paints & Coatings",      icon:"🎨" },
  { id:"adhesives",    label:"Adhesives & Sealants",    icon:"🔗" },
  { id:"cosmetics",    label:"Cosmetics & Personal Care",icon:"✨" },
  { id:"homecare",     label:"Homecare & Cleaning",     icon:"🧹" },
  { id:"chemical",     label:"Chemical Manufacturing",  icon:"⚗️" },
  { id:"pharma",       label:"Pharma / Nutraceuticals", icon:"💊" },
  { id:"other",        label:"Other / Research",        icon:"🔬" },
];

const INDUSTRY_PRIORITY = {
  construction:["drymix","coatings","adhesives"],
  paints:      ["paints","coatings","adhesives"],
  adhesives:   ["adhesives","coatings","drymix"],
  cosmetics:   ["cosmetics","homecare"],
  homecare:    ["homecare","cosmetics"],
  chemical:    ["chemeng"],
  pharma:      ["cosmetics","homecare","chemeng"],
  other:       [],
};

const CATEGORIES = [
  { id:"drymix",    label:"Drymix",     icon:"🏗️", color:"#e8a838" },
  { id:"paints",    label:"Paints",     icon:"🎨", color:"#4f9cf9" },
  { id:"coatings",  label:"Coatings",   icon:"🛡️", color:"#34d399" },
  { id:"adhesives", label:"Adhesives",  icon:"🔗", color:"#fb7185" },
  { id:"cosmetics", label:"Cosmetics",  icon:"✨", color:"#f472b6" },
  { id:"homecare",  label:"Homecare",   icon:"🧹", color:"#a78bfa" },
  { id:"inks",      label:"Inks",        icon:"🖨️", color:"#06b6d4" },
  { id:"sizing",    label:"Sizing Agents",icon:"🧵", color:"#84cc16" },
  { id:"chemeng",   label:"ChemEng Pro", icon:"⚗️", color:"#fb923c", enterprise:true },
  { id:"pharma",    label:"Pharma API",       icon:"💊", color:"#e879f9", paid:true },
  { id:"request",   label:"+ Request Formula", icon:"📩", color:"#f59e0b", special:true },
];

// ─── ALL COSTS IN INR/kg ──────────────────────────────────────────────────
// Cost calculation verification example:
// White Wall Putty:
//   White Cement 22% @ ₹12/kg  → 0.22 × 12 = ₹2.64
//   Dolomite 60% @ ₹3/kg       → 0.60 ×  3 = ₹1.80
//   Marble Powder 12% @ ₹4/kg  → 0.12 ×  4 = ₹0.48
//   HPMC 0.3% @ ₹350/kg        → 0.003×350 = ₹1.05
//   Hydrated Lime 5% @ ₹4/kg   → 0.05 ×  4 = ₹0.20
//   TOTAL = ₹6.17/kg ✓ (market ~₹12-14/kg after overheads, packaging, margin)

const FORMULAS = {
  drymix:[
    { id:"dm1", name:"Tile Adhesive C1 (IS:15477)", sub:"Standard cement-based, per XLS", score:82, tags:["C1","IS:15477"], free:true,
      ingredients:[
        {n:"OPC 53 grey cement",  p:40,   c:5.5},
        {n:"Sand 30/80 mesh",     p:35,   c:1.8},
        {n:"Sand 50/120 mesh",    p:20,   c:1.8},
        {n:"Coal Flyash",         p:5,    c:1.2},
        {n:"RDP",                 p:1,    c:160},
        {n:"MHEC",                p:0.30, c:275},
        {n:"Calcium Formate",     p:0.50, c:75},
        {n:"Silica Fume",         p:0.50, c:30},
      ],
      process:"Cement-based adhesive produced by dry blending of all mineral and polymer components. Cement and sand fractions form the structural matrix while flyash fills voids and aids workability. MHEC provides water retention and open time; RDP adds flexibility and wet adhesion. Blending sequence, sieve size and moisture-proof packaging are the critical process parameters. Contact us for the Process Flow Diagram and detailed SOP.",
      equipment:["Ribbon blender 500–1000 L","1.5 mm vibratory sieve","Auto bagging machine 25 kg","Moisture analyser","Bag filter"] },
    { id:"dm2", name:"Tile Adhesive C2TE (IS:15477)", sub:"Improved, extended open time, non-sag", score:91, tags:["C2TE","IS:15477"], free:true,
      ingredients:[
        {n:"OPC 53 grey cement",  p:35,   c:5.5},
        {n:"Sand 30/80 mesh",     p:40,   c:1.8},
        {n:"Sand 50/120 mesh",    p:20,   c:1.8},
        {n:"Coal Flyash",         p:5,    c:1.2},
        {n:"RDP",                 p:3,    c:160},
        {n:"MHEC",                p:0.40, c:275},
        {n:"Calcium Formate",     p:0.80, c:75},
        {n:"Silica Fume",         p:3,    c:30},
      ],
      process:"C2TE grade requires higher RDP and MHEC dosage compared to C1 to achieve extended open time and non-sag T classification. Silica fume at 3% significantly improves tensile bond strength. The blending process is similar but batch homogeneity is more critical. Contact us for Process Flow Diagram and QC protocols.",
      equipment:["Ribbon blender 1000 L","Slip tester EN1308","Open time jig","Tensile bond tester"] },
    { id:"dm3", name:"White Wall Putty (IS:6278)", sub:"Interior, high whiteness, smooth finish", score:84, tags:["putty","interior","IS:6278"], free:true,
      ingredients:[
        {n:"White Cement OPC 53", p:22,   c:18.5},
        {n:"Dolomite 325 mesh",   p:70,   c:3},
        {n:"Hydrated Lime",       p:8,    c:12},
        {n:"RDP",                 p:0.50, c:160},
        {n:"MHEC",                p:0.30, c:275},
      ],
      process:"White putty is a dry blend of white cement, dolomite and hydrated lime as the bulk matrix. RDP improves flexibility and reduces micro-cracking. MHEC provides workability and water retention. Sieving through 150 micron is critical for smooth finish. Contact us for Process Flow Diagram.",
      equipment:["Ribbon blender 500 L","150 µm vibratory sieve","Whiteness meter","Bond strength tester"] },
    { id:"dm4", name:"AAC Block Jointing Mortar", sub:"Thin-bed, 2–3 mm joint", score:85, tags:["AAC","thin-bed"], free:true,
      ingredients:[
        {n:"OPC 53 grey cement",  p:32,   c:5.5},
        {n:"Sand 30/80 mesh",     p:30,   c:1.8},
        {n:"Sand 50/120 mesh",    p:30,   c:1.8},
        {n:"Coal Flyash",         p:8,    c:1.2},
        {n:"RDP",                 p:0.60, c:160},
        {n:"MHEC",                p:0.30, c:275},
        {n:"Calcium Formate",     p:0.50, c:75},
        {n:"Silica Fume",         p:0.50, c:30},
      ],
      process:"Thin-bed jointing mortar for AAC blocks requires very fine sand grading for application at 2–3 mm joint thickness. Higher paste content and MHEC water retention ensure adequate bond without water absorption by the porous AAC block. Contact us for Process Flow Diagram.",
      equipment:["Ribbon blender","Flow table","Tensile bond test rig","Water retention apparatus"] },
    { id:"dm5", name:"Ready Mix Plaster", sub:"Machine/hand applied, CS2 grade", score:80, tags:["plaster","EN998-1"],
      ingredients:[
        {n:"OPC 53 grey cement",  p:20,   c:5.5},
        {n:"Sand upto 2mm",       p:72,   c:1.8},
        {n:"Flyash",              p:8,    c:1.2},
        {n:"RDP",                 p:0.30, c:160},
        {n:"MHEC",                p:0.20, c:275},
        {n:"PP Fiber 3mm",        p:0.05, c:75},
        {n:"Air Entrainer",       p:0.005,c:120},
      ],
      process:"Ready-mix plaster combines cement, coarse sand and flyash. PP fibres improve crack resistance and air entrainer aids workability in machine application. Low MHEC dosage provides water retention. Contact us for Process Flow Diagram and machine application SOP.",
      equipment:["Drum mixer","Compressive strength press","Spray plaster machine"] },
    { id:"dm6", name:"Cementitious Grout — White", sub:"CG2 grade, EN13888", score:89, tags:["grout","CG2","white"],
      ingredients:[
        {n:"White Cement OPC 53", p:40,   c:18.5},
        {n:"Dolomite 325 mesh",   p:60,   c:3},
        {n:"RDP",                 p:0.80, c:160},
        {n:"MHEC",                p:0.30, c:275},
      ],
      process:"White cementitious grout using white cement and dolomite. Dolomite fineness is critical for smooth joint. RDP improves flexibility; MHEC ensures water retention. Contact us for detailed process.",
      equipment:["Ribbon blender","Spectrophotometer","Shrinkage bar molds"] },
    { id:"dm7", name:"Cementitious Grout — Jet Black", sub:"CG2, black oxide pigmented", score:88, tags:["grout","black"],
      ingredients:[
        {n:"White Cement OPC 53", p:40,   c:18.5},
        {n:"Dolomite 325 mesh",   p:50,   c:3},
        {n:"Black Iron Oxide",    p:10,   c:180},
        {n:"RDP",                 p:0.80, c:160},
        {n:"MHEC",                p:0.30, c:275},
      ],
      process:"High oxide loading for deep black. Oxide pre-blended with dolomite before cement addition to avoid streaking. Contact us for process flow.",
      equipment:["Ribbon blender","Spectrophotometer"] },
    { id:"dm8", name:"Cementitious Grout — Steel Grey", sub:"CG2, neutral grey", score:87, tags:["grout","grey"],
      ingredients:[
        {n:"White Cement OPC 53", p:40,   c:18.5},
        {n:"Dolomite 325 mesh",   p:59,   c:3},
        {n:"Black Iron Oxide",    p:0.50, c:180},
        {n:"RDP",                 p:0.80, c:160},
        {n:"MHEC",                p:0.30, c:275},
      ],
      process:"Low black oxide loading for neutral steel grey. Precise weighing critical for shade consistency. Contact us for process flow.",
      equipment:["Ribbon blender","Spectrophotometer"] },
    { id:"dm9", name:"Cementitious Grout — Ivory", sub:"CG2, warm ivory tone", score:87, tags:["grout","ivory"],
      ingredients:[
        {n:"White Cement OPC 53", p:40,   c:18.5},
        {n:"Dolomite 325 mesh",   p:59,   c:3},
        {n:"Yellow Iron Oxide",   p:1,    c:180},
        {n:"RDP",                 p:0.80, c:160},
        {n:"MHEC",                p:0.30, c:275},
      ],
      process:"Yellow oxide provides warm ivory tone. Contact us for process flow.",
      equipment:["Ribbon blender","Spectrophotometer"] },
    { id:"dm10", name:"Cementitious Grout — Coffee Brown", sub:"CG2, deep brown blend", score:87, tags:["grout","brown"],
      ingredients:[
        {n:"White Cement OPC 53", p:40,   c:18.5},
        {n:"Dolomite 325 mesh",   p:56.9, c:3},
        {n:"Black Iron Oxide",    p:3,    c:180},
        {n:"Red Iron Oxide",      p:5,    c:160},
        {n:"RDP",                 p:0.80, c:160},
        {n:"MHEC",                p:0.30, c:275},
      ],
      process:"Black and red oxide blend creates coffee brown. Pre-blend oxides before introduction to main mix. Contact us for process flow.",
      equipment:["Ribbon blender","Spectrophotometer"] },
    { id:"dm11", name:"Non-Shrink Cement Grout", sub:"Precision grouting, aluminium powder expansive", score:92, tags:["grout","non-shrink"],
      ingredients:[
        {n:"OPC 53 grey cement",  p:60,   c:5.5},
        {n:"Sand 30/80 mesh",     p:20,   c:1.8},
        {n:"Sand 50/120 mesh",    p:15,   c:1.8},
        {n:"Aluminium Powder",    p:0.20, c:450},
        {n:"SMF Superplasticiser",p:0.60, c:130},
        {n:"Silica Fume",         p:5,    c:30},
      ],
      process:"Aluminium powder generates controlled gas expansion to compensate for shrinkage. SMF superplasticiser provides flowability. Silica fume boosts strength. Aluminium powder handling requires safety precautions. Contact us for safety SOP and process flow.",
      equipment:["High-shear mixer","Expansion measurement mold","Compressive press","Flow cone"] },
    { id:"dm12", name:"Floor Hardener (Dry Shake)", sub:"Surface densifier, IS:15491", score:83, tags:["floor hardener"],
      ingredients:[
        {n:"OPC 53 grey cement",  p:35,   c:5.5},
        {n:"Sand 30/80 mesh",     p:47,   c:1.8},
        {n:"Sand 8 mesh (coarse)",p:15,   c:1.8},
        {n:"SMF Superplasticiser",p:0.35, c:130},
        {n:"Silica Fume",         p:3,    c:30},
      ],
      process:"Dry-shake floor hardener applied onto fresh concrete and power-trowelled in. Coarse sand provides aggregate interlock; silica fume densifies the surface matrix. Applied at 3–5 kg/m². Contact us for detailed application SOP and process flow.",
      equipment:["Ribbon blender","Power trowel (application)","Abrasion tester"] },
    { id:"dm13", name:"Microconcrete", sub:"Structural repair, high strength", score:94, tags:["repair","microconcrete"],
      ingredients:[
        {n:"OPC 53 grey cement",  p:35,   c:5.5},
        {n:"Sand 30/80 mesh",     p:30,   c:1.8},
        {n:"Sand 8 mesh (coarse)",p:30,   c:1.8},
        {n:"SMF Superplasticiser",p:0.35, c:130},
        {n:"RDP",                 p:2,    c:160},
        {n:"Silica Fume",         p:3,    c:30},
      ],
      process:"High-strength repair mortar with dual sand grading for optimum packing. SMF provides flowability; RDP improves adhesion to substrate. Silica fume fills micro-pores and boosts compressive strength. Contact us for detailed process flow and QC protocol.",
      equipment:["Pan mixer","40 mm cube molds","Pull-off tester","UPV meter","Compressive press"] },
  ],

  paints:[
    { id:"pt1", name:"Distemper (Water-based)", sub:"Economy interior, IS:428 compliant", score:76, tags:["distemper","IS:428"], free:true,
      ingredients:[
        {n:"Water",                            p:26,  c:0.10},
        {n:"Sodium Hexametaphosphate",         p:0.20,c:150},
        {n:"Dispersant & Wetting Agent",       p:0.50,c:100},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Defoamer / Kerosene",              p:0.50,c:80},
        {n:"TiO2 Anatase",                     p:6.20,c:220},
        {n:"Dolomite",                         p:26.5,c:3.5},
        {n:"China Clay",                       p:7,   c:4},
        {n:"Chalk White",                      p:22,  c:3.3},
        {n:"HEC",                              p:0.10,c:385},
        {n:"Styrene Acrylic Emulsion 50%",     p:10,  c:90},
        {n:"Wax Emulsion",                     p:0.50,c:120},
      ],
      process:"Distemper is a water-based economy paint manufactured by slurrying pigments and fillers in water with dispersants, followed by let-down with styrene acrylic emulsion. HEC provides viscosity control. The process requires a high-speed disperser followed by a let-down tank. Contact us for Process Flow Diagram.",
      equipment:["High-speed disperser","KU viscometer","pH meter","Drawdown applicator"] },
    { id:"pt2", name:"Acrylic Emulsion — Interior Matt (IS:1384)", sub:"Styrene acrylic, TiO2 anatase", score:83, tags:["interior","matt","IS:1384"], free:true,
      ingredients:[
        {n:"Water",                            p:40,  c:0.10},
        {n:"Sodium Hexametaphosphate",         p:0.20,c:150},
        {n:"Dispersant / Wetting Agent",       p:0.30,c:100},
        {n:"MEG",                              p:0.70,c:60},
        {n:"Fungicide / Herbicide",            p:0.10,c:140},
        {n:"Defoamer / Kerosene",              p:3,   c:80},
        {n:"TiO2 Anatase",                     p:16,  c:220},
        {n:"Dolomite",                         p:4,   c:3.5},
        {n:"Thickener",                        p:0.10,c:65},
        {n:"HEC",                              p:0.20,c:385},
        {n:"Styrene Acrylic Emulsion 50%",     p:40,  c:90},
        {n:"Wax Emulsion",                     p:1,   c:120},
      ],
      process:"Interior matt emulsion paint manufactured by dispersion of TiO2 and fillers in water using a Cowles disperser, followed by let-down with styrene acrylic emulsion. HEC and thickener build viscosity. Contact us for Process Flow Diagram.",
      equipment:["High-speed disperser","KU viscometer","pH meter","Hiding power panel"] },
    { id:"pt3", name:"Acrylic Emulsion — Interior Satin (IS:1384)", sub:"Higher TiO2, higher emulsion, satin sheen", score:87, tags:["interior","satin","IS:1384"], free:true,
      ingredients:[
        {n:"Water",                            p:13,  c:0.10},
        {n:"Sodium Hexametaphosphate",         p:0.20,c:150},
        {n:"Dispersant / Wetting Agent",       p:0.30,c:100},
        {n:"MEG",                              p:1.20,c:60},
        {n:"Fungicide",                        p:0.10,c:140},
        {n:"Defoamer / Kerosene",              p:3,   c:80},
        {n:"TiO2 Anatase",                     p:24,  c:220},
        {n:"Chalk White",                      p:2,   c:3},
        {n:"Thickener",                        p:0.10,c:65},
        {n:"HEC",                              p:0.20,c:385},
        {n:"Styrene Acrylic Emulsion 50%",     p:60,  c:90},
        {n:"Wax Emulsion",                     p:1,   c:120},
      ],
      process:"Satin finish requires higher emulsion and TiO2 content vs matt. The higher PVC contributes to sheen. Dispersion sequence is identical to matt but emulsion let-down volume is higher. Contact us for Process Flow Diagram.",
      equipment:["High-speed disperser","Gloss meter @60°","KU viscometer"] },
    { id:"pt4", name:"Acrylic Emulsion — Exterior Satin", sub:"Acrylic emulsion 50%, UV stabilised", score:90, tags:["exterior","satin","acrylic"], free:true,
      ingredients:[
        {n:"Water",                            p:19,  c:0.10},
        {n:"Sodium Hexametaphosphate",         p:0.20,c:150},
        {n:"Dispersant / Wetting Agent",       p:0.30,c:100},
        {n:"MEG",                              p:1,   c:60},
        {n:"Fungicide",                        p:0.10,c:140},
        {n:"Defoamer / Kerosene",              p:1,   c:80},
        {n:"UV Absorber / HALS",               p:0.20,c:300},
        {n:"TiO2 Rutile",                      p:20,  c:360},
        {n:"Mica",                             p:11,  c:12},
        {n:"China Clay",                       p:3,   c:4},
        {n:"Thickener",                        p:0.70,c:65},
        {n:"HEC",                              p:0.30,c:385},
        {n:"Acrylic Emulsion 50%",             p:48,  c:130},
        {n:"Wax Emulsion",                     p:1,   c:80},
      ],
      process:"Exterior satin emulsion using pure acrylic emulsion and rutile TiO2 for UV durability. Mica platelet fillers reduce sheen and improve dirt pick-up resistance. HALS stabiliser extends weathering life. Contact us for Process Flow Diagram.",
      equipment:["High-speed disperser","QUV weathering chamber","Gloss meter","Wet scrub tester"] },
    { id:"pt5", name:"Acrylic Emulsion — Exterior Matt", sub:"Acrylic, mica-filled, economy exterior", score:85, tags:["exterior","matt","acrylic"],
      ingredients:[
        {n:"Water",                            p:39,  c:0.10},
        {n:"Sodium Hexametaphosphate",         p:0.20,c:150},
        {n:"Dispersant / Wetting Agent",       p:0.40,c:100},
        {n:"MEG",                              p:1.20,c:60},
        {n:"Fungicide",                        p:0.10,c:140},
        {n:"Defoamer / Kerosene",              p:1,   c:80},
        {n:"UV Absorber / HALS",               p:0.20,c:300},
        {n:"TiO2 Rutile",                      p:13,  c:360},
        {n:"Mica",                             p:10,  c:12},
        {n:"Aluminium Silicate",               p:4,   c:6},
        {n:"Calcite",                          p:6,   c:4},
        {n:"China Clay",                       p:2,   c:4},
        {n:"Thickener",                        p:0.40,c:65},
        {n:"HEC",                              p:0.30,c:385},
        {n:"Acrylic Emulsion 50%",             p:27,  c:102},
        {n:"Wax",                              p:1,   c:80},
      ],
      process:"Economy exterior matt with partial mica and aluminium silicate replacement of TiO2. HALS UV stabiliser extends performance. Contact us for Process Flow Diagram.",
      equipment:["High-speed disperser","QUV chamber","Gloss meter"] },
    { id:"pt6", name:"Black Japan (CNSL-Alkyd)", sub:"CNSL resin based, IS:341", score:84, tags:["black japan","CNSL","IS:341"],
      ingredients:[
        {n:"Carbon Black",                     p:1.75,c:130},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"Manganese Octoate 10%",            p:0.12,c:163},
        {n:"Cobalt Octoate 12%",               p:0.05,c:425},
        {n:"Zinc Octoate 18%",                 p:0.50,c:160},
        {n:"CNSL Resin 70%",                   p:35,  c:80},
        {n:"Alkyd Long Oil Soya 60%",          p:3.50,c:150},
        {n:"Wetting Agent",                    p:0.30,c:93},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"Kerosene",                         p:57.5,c:80},
      ],
      process:"Black japan is a CNSL-alkyd blend pigmented with carbon black. Carbon black dispersion requires prolonged high-shear milling (bead mill minimum 45 min) to achieve jetness. Drier metals are added after grinding. Contact us for Process Flow Diagram.",
      equipment:["Bead mill / triple roll mill","Jetness meter","Drying recorder","KU viscometer"] },
    { id:"pt7", name:"Red Oxide Primer (CNSL-Alkyd, Solvent)", sub:"Anti-corrosive primer, IS:2074", score:86, tags:["primer","red oxide","CNSL","IS:2074"],
      ingredients:[
        {n:"Red Oxide",                        p:20,  c:130},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"Manganese Octoate 10%",            p:0.12,c:163},
        {n:"Cobalt Octoate 12%",               p:0.05,c:425},
        {n:"Zinc Octoate 18%",                 p:0.50,c:160},
        {n:"Aluminium Stearate",               p:0.50,c:90},
        {n:"CNSL Resin 70%",                   p:23.5,c:80},
        {n:"Alkyd Pure Soya",                  p:2.50,c:150},
        {n:"Wetting Agent",                    p:0.30,c:92},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Kerosene",                         p:45,  c:80},
        {n:"Talc",                             p:25,  c:3.5},
      ],
      process:"Red oxide primer based on CNSL-alkyd blend. Red oxide and talc are ground in part CNSL resin and kerosene to Hegman 4-5 fineness. Aluminium stearate prevents settling. Contact us for Process Flow Diagram.",
      equipment:["Bead mill / triple roll mill","Salt spray cabinet","Cross-cut adhesion tester"] },
    { id:"pt8", name:"White Alkyd Enamel (IS:133)", sub:"Long oil alkyd, high gloss", score:88, tags:["enamel","alkyd","white","IS:133"],
      ingredients:[
        {n:"Alkyd Resin Long Oil 100%",        p:24,  c:150},
        {n:"TiO2 Rutile",                      p:20,  c:360},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"Manganese Octoate 10%",            p:0.12,c:163},
        {n:"Cobalt Octoate 12%",               p:0.05,c:425},
        {n:"Zinc Octoate 18%",                 p:0.50,c:160},
        {n:"Wetting & Dispersing Agent",       p:0.50,c:92},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"Dolomite",                         p:5,   c:3.5},
        {n:"Kerosene",                         p:55,  c:80},
        {n:"MEG",                              p:2.50,c:60},
      ],
      process:"White alkyd enamel ground to Hegman 6-7 for high gloss. TiO2 dispersed in part alkyd + kerosene using bead mill or triple roll. Let-down with remaining alkyd and drier additions. Contact us for Process Flow Diagram.",
      equipment:["Bead mill / triple roll mill","Hegman gauge","Gloss meter","Drying recorder"] },
    { id:"pt9", name:"Post Office Red Alkyd Enamel", sub:"IS shade, CNSL-alkyd, IS:133", score:87, tags:["enamel","red","IS:133"],
      ingredients:[
        {n:"PO Red Pigment",                   p:3,   c:400},
        {n:"Lead Octoate 24%",                 p:0.94,c:120},
        {n:"Manganese Octoate 10%",            p:0.42,c:163},
        {n:"Cobalt Octoate 12%",               p:0.35,c:425},
        {n:"Zinc Octoate 18%",                 p:0.30,c:160},
        {n:"CNSL Resin 70%",                   p:55,  c:80},
        {n:"Alkyd Pure Soya",                  p:5,   c:150},
        {n:"Wetting Agent",                    p:0.30,c:92},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Kerosene",                         p:34,  c:80},
      ],
      process:"PO red enamel uses speciality PO red pigment which requires careful dispersion in CNSL-alkyd blend. Shade matching to IS Post Office Red standard using spectrophotometer. Contact us for Process Flow Diagram.",
      equipment:["Bead mill","Spectrophotometer","Gloss meter"] },
    { id:"pt10", name:"Bus Green Alkyd Enamel", sub:"Chrome green, CNSL-alkyd", score:86, tags:["enamel","green","IS:133"],
      ingredients:[
        {n:"Chrome Green",                     p:15,  c:200},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"Manganese Octoate 10%",            p:0.30,c:163},
        {n:"Cobalt Octoate 12%",               p:0.25,c:425},
        {n:"Zinc Octoate 18%",                 p:0.30,c:160},
        {n:"CNSL Resin 70%",                   p:47,  c:80},
        {n:"Alkyd Pure Soya",                  p:4,   c:150},
        {n:"Wetting Agent",                    p:0.30,c:92},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Kerosene",                         p:37,  c:80},
      ],
      process:"Bus green uses chrome green pigment dispersed in CNSL-alkyd. Chrome green is relatively easy to disperse vs organic pigments. Contact us for Process Flow Diagram.",
      equipment:["Bead mill","Spectrophotometer","Gloss meter"] },
    { id:"pt11", name:"Dark Smoke Grey Alkyd Enamel", sub:"Carbon black + TiO2 + Prussian blue blend", score:86, tags:["enamel","grey","IS:133"],
      ingredients:[
        {n:"Carbon Black",                     p:0.50,c:130},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"TiO2 Rutile",                      p:15,  c:360},
        {n:"Prussian Blue",                    p:0.50,c:400},
        {n:"Manganese Octoate 10%",            p:0.30,c:163},
        {n:"Cobalt Octoate 12%",               p:0.25,c:425},
        {n:"CNSL Resin 70%",                   p:50,  c:80},
        {n:"Alkyd Pure Soya",                  p:4,   c:150},
        {n:"Wetting Agent",                    p:0.30,c:92},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Kerosene",                         p:35,  c:80},
      ],
      process:"Complex shade requiring three pigments. Carbon black must be milled separately first, then combined with TiO2 and Prussian blue grinds. Shade adjust with spectrophotometer. Contact us for Process Flow Diagram.",
      equipment:["Bead mill","Spectrophotometer","Gloss meter"] },
    { id:"pt12", name:"Aluminium Paint", sub:"Aluminium paste, CNSL-alkyd base", score:85, tags:["enamel","aluminium","IS:2339"],
      ingredients:[
        {n:"Aluminium Paste",                  p:8,   c:400},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"Manganese Octoate 10%",            p:0.30,c:163},
        {n:"Cobalt Octoate 12%",               p:0.25,c:425},
        {n:"CNSL Resin 70%",                   p:50,  c:80},
        {n:"Alkyd Pure Soya",                  p:4,   c:150},
        {n:"Wetting Agent",                    p:0.30,c:92},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Kerosene",                         p:36,  c:40},
      ],
      process:"Aluminium paste must be added last at low speed to preserve flake orientation. Do NOT use high shear — aluminium flakes will be destroyed, losing leafing effect. Contact us for Process Flow Diagram.",
      equipment:["Low-shear paddle mixer","Leafing test panel","Gloss meter"] },
    { id:"pt13", name:"Olive Green Alkyd Enamel", sub:"Chrome green + carbon black + chrome yellow blend", score:86, tags:["enamel","olive green"],
      ingredients:[
        {n:"Chrome Green",                     p:10,  c:200},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"Carbon Black",                     p:0.19,c:130},
        {n:"Middle Chrome Yellow",             p:0.58,c:200},
        {n:"Manganese Octoate 10%",            p:0.30,c:163},
        {n:"Cobalt Octoate 12%",               p:0.25,c:425},
        {n:"Zinc Octoate 18%",                 p:0.30,c:160},
        {n:"CNSL Resin 70%",                   p:55,  c:80},
        {n:"Alkyd Pure Soya",                  p:4,   c:150},
        {n:"Wetting Agent",                    p:0.30,c:92},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Kerosene",                         p:33,  c:80},
      ],
      process:"Olive green blend of chrome green, carbon black and chrome yellow. Mill each pigment separately then combine for shade. Contact us for Process Flow Diagram.",
      equipment:["Bead mill","Spectrophotometer","Gloss meter"] },
    { id:"pt14", name:"Epoxy Red Oxide Primer (2K, IS:13238)", sub:"DGEBA + DETA adduct hardener", score:95, tags:["primer","epoxy","red oxide","2K"],
      ingredients:[
        {n:"DGEBA Epoxy Resin EEW 190 (Part A)",p:39.5,c:280},
        {n:"Xylene (Part A)",                   p:23.7,c:120},
        {n:"Red Oxide (Part A)",                p:11,  c:130},
        {n:"Aerosil (Part A)",                  p:0.85,c:200},
        {n:"Epoxy-DETA Adduct 1:1 (Part B)",    p:13.3,c:300},
        {n:"Xylene (Part B)",                   p:11.7,c:120},
      ],
      process:"Two-component epoxy primer. Part A contains epoxy resin, pigments and thixotrope dispersed together. Part B is the DETA adduct hardener. Mixed at site at correct stoichiometric ratio. Stoichiometry must be calculated from EEW and AHEW. Contact us for detailed process and mix ratio calculation.",
      equipment:["Bead mill","Salt spray cabinet","DFT gauge","Pot life timer"] },
    { id:"pt15", name:"Epoxy Zinc Rich Primer (2K)", sub:"DGEBA + DETA adduct, >70% Zn DFT", score:97, tags:["primer","zinc rich","epoxy"],
      ingredients:[
        {n:"DGEBA Epoxy Resin EEW 190 (Part A)",p:39.5,c:280},
        {n:"Xylene (Part A)",                   p:23.7,c:120},
        {n:"Zinc Dust (Part A)",                p:11,  c:220},
        {n:"Aerosil (Part A)",                  p:0.85,c:200},
        {n:"Epoxy-DETA Adduct 1:1 (Part B)",    p:13.3,c:300},
        {n:"Xylene (Part B)",                   p:11.7,c:120},
      ],
      process:"Same two-component structure as epoxy primer but with zinc dust for cathodic protection. Zinc dust addition to Part A at LOW speed only — no high shear. Earthing and N2 blanketing mandatory. Contact us for detailed safety SOP and process flow.",
      equipment:["Earthed low-shear mixer","N2 blanketing","XRF analyser","Salt spray cabinet"] },
  ],

  coatings:[
    { id:"ct1", name:"Epoxy Floor Coating (2K, RT Cure)", sub:"Self-levelling, heavy duty industrial floor", score:93, tags:["epoxy","floor","RT cure","2K"], free:true,
      ingredients:[
        {n:"Bisphenol A Epoxy EEW190 (Part A)",p:38,  c:280},
        {n:"TiO2",                             p:8,   c:200},
        {n:"Silica Sand 0.1–0.3mm",            p:10,  c:3},
        {n:"Xylene",                           p:8,   c:30},
        {n:"Cycloaliphatic Amine (Part B)",     p:22,  c:300},
        {n:"Flow/levelling agent",              p:0.30,c:400},
        {n:"Defoamer",                          p:0.15,c:200},
      ],
      process:["Part A: Disperse TiO2 + silica sand in epoxy + xylene at medium shear 20 min","Add flow agent + defoamer","Pack Part A (shelf 12 months)","Part B: Cycloaliphatic amine hardener — pack separately","Site: Mix A:B = 3.5:1 wt., induction time 10 min, pot life 45–60 min @25 °C","Pour and spread self-levelling at 200–300 µm wet (notched squeegee)","De-air with spike roller","Full cure: 7 days @25 °C, walk-on at 24 h","QC: compressive strength >70 MPa, chemical resistance, gloss, Shore D >70"],
      equipment:["Paddle mixer","Notched squeegee","Spike roller (air release)","Shore D hardness tester","Chemical resistance panel"] },
    { id:"ct2", name:"Epoxy Clear Top Coat (2K)", sub:"High gloss, chemical resistant floor/wall", score:94, tags:["epoxy","clear","topcoat","2K"], free:true,
      ingredients:[
        {n:"Bisphenol F Epoxy (Part A)",    p:40,  c:320},
        {n:"Xylene / MEK",                  p:12,  c:30},
        {n:"Flow agent",                    p:0.30,c:400},
        {n:"UV Stabiliser",                 p:0.50,c:500},
        {n:"Cycloaliphatic Amine (Part B)", p:22,  c:300},
      ],
      process:["Part A: Blend epoxy + solvents + flow agent + UV stabiliser at low shear","Pack Part A","Part B: Cycloaliphatic amine hardener","Site mix A:B = 3:1 wt., pot life 60–90 min","Apply by squeegee + back-roll at 40–60 µm DFT","Full cure: 7 days @25 °C","QC: MEK double rub >200, gloss >90 @60°, pencil hardness >2H"],
      equipment:["Paddle mixer","Roller + squeegee","MEK rub tester","Gloss meter","Pencil hardness set"] },
    { id:"ct3", name:"Pigmented Epoxy Top Coat (2K)", sub:"Industrial, IS shade RAL/BS colours", score:93, tags:["epoxy","topcoat","2K"], free:true,
      ingredients:[
        {n:"Bisphenol A Epoxy (Part A)",    p:35,  c:280},
        {n:"TiO2",                          p:10,  c:200},
        {n:"Carbon Black (for grey shade)",  p:0.50,c:150},
        {n:"Micronised Talc",               p:8,   c:12},
        {n:"Xylene",                        p:10,  c:30},
        {n:"Flow agent",                    p:0.30,c:400},
        {n:"Cycloaliphatic Amine (Part B)", p:22,  c:300},
      ],
      process:["Part A: Disperse TiO2 + CB + talc in epoxy + xylene at 2000 rpm, 30 min","Grind to Hegman 5","Add flow agent","Pack Part A","Site mix with Part B amine at 3:1 wt.","Apply 60–80 µm DFT, 2 coats (sand between coats at 24 h)","QC: gloss >80 @60°, adhesion, chemical resistance"],
      equipment:["Bead mill","DFT gauge","Chemical resistance tester","Gloss meter"] },
    { id:"ct4", name:"Stoving Alkyd Enamel (Melamine-Alkyd)", sub:"Bake 130 °C / 30 min, OEM / industrial", score:90, tags:["stoving","alkyd","melamine"],
      ingredients:[
        {n:"Short-oil Alkyd Resin 60%",  p:40,  c:100},
        {n:"Melamine Formaldehyde 55%",  p:20,  c:160},
        {n:"TiO2 Rutile",                p:18,  c:200},
        {n:"CaCO3 2µm",                  p:5,   c:6},
        {n:"Xylene / Butanol 1:1",       p:12,  c:32},
        {n:"p-TSA Acid Catalyst",        p:0.15,c:180},
        {n:"Flow agent",                 p:0.30,c:400},
      ],
      process:["Disperse TiO2 in alkyd + solvent at 2500 rpm, 25 min","Grind Hegman 6–7 (bead mill)","Let-down with melamine formaldehyde resin + remaining alkyd","Add acid catalyst + flow agent","Apply by spray at 40–50 µm DFT wet","Stove 130 °C / 30 min in conveyor oven (or 150 °C / 20 min)","QC: MEK double rub >100, pencil hardness ≥2H, gloss >85 @60°, cross-hatch adhesion"],
      equipment:["Bead mill","Stoving oven (conveyor)","MEK rub tester","Pencil hardness set","Gloss meter"] },
    { id:"ct5", name:"Stoving Polyester Enamel (Coil Coating)", sub:"220–240 °C PMT, pre-painted steel / aluminium", score:96, tags:["stoving","polyester","coil coating"],
      ingredients:[
        {n:"Hydroxyl Polyester Resin (Part A)",p:45,  c:140},
        {n:"HMMM Melamine Crosslinker (Part B)",p:18, c:200},
        {n:"TiO2 Rutile",                      p:18,  c:200},
        {n:"BaSO4 Blanc Fixe",                 p:5,   c:22},
        {n:"Cyclohexanone / Solvesso 150",     p:10,  c:45},
        {n:"DNNSA Acid Catalyst",              p:0.30,c:200},
        {n:"Flow / wax additive",              p:0.50,c:400},
      ],
      process:["Disperse TiO2 + BaSO4 in polyester + solvent, 25 min, bead mill to Hegman 6+","Let-down with HMMM crosslinker + catalyst + flow/wax additive","Apply by roll coater at 20–25 µm DFT dry","Stove at PMT 220–240 °C (peak metal temperature), 20–25 s in oven","QC: T-bend 0T no crack, MEK rub >80, reverse impact 80 in-lb, Erichsen >6 mm"],
      equipment:["3-roll bead mill","Coil coating roll coater","Induction oven","T-bend tester","MEK rub set","Reverse impact tester","Erichsen cupping"] },
    { id:"ct6", name:"Epoxy Powder Coating (Stoving, TGIC-free)", sub:"100% solids, 180–200 °C cure, high build", score:95, tags:["powder coating","stoving","epoxy"],
      ingredients:[
        {n:"Bisphenol A Epoxy solid EEW700",p:50,  c:130},
        {n:"DICY Hardener",                 p:5,   c:180},
        {n:"TiO2 Rutile",                   p:20,  c:200},
        {n:"BaSO4",                         p:12,  c:22},
        {n:"Resiflow P67 (flow agent)",     p:0.80,c:400},
        {n:"Benzoin (degassing agent)",     p:0.30,c:200},
      ],
      process:["Dry blend all ingredients in high-speed mixer 2 min (pre-mix)","Melt-extrude in twin-screw extruder at 90–100 °C barrel temperature","Cool on chill rolls, chip, grind in ACM mill to D50 30–50 µm","Classify to remove >100 µm particles","Apply by electrostatic spray gun (60–80 kV, 60–80 µm target film)","Cure in oven 180–200 °C / 15–20 min","QC: film thickness, gloss >85 @60°, MEK rub >80, cross-cut adhesion, impact resistance"],
      equipment:["Twin-screw extruder","ACM powder mill","Air classifier","Electrostatic spray gun","Cure oven","Laser particle sizer","MEK rub set"] },
    { id:"ct7", name:"PU Waterproof Coating (1K Moisture-cure)", sub:"Roof deck / terrace, elongation >300%", score:96, tags:["PU","waterproof","1K"],
      ingredients:[
        {n:"MDI Prepolymer NCO 3%",  p:80,  c:320},
        {n:"Xylene",                 p:10,  c:30},
        {n:"Carbon Black / Pigment", p:3,   c:150},
        {n:"Molecular Sieve 3A",     p:2,   c:180},
        {n:"DBTL Catalyst",          p:0.05,c:800},
      ],
      process:["STRICTLY DRY: RH <50%, all equipment oven-dried at 80 °C before use","Blend MDI prepolymer + xylene + molecular sieve powder at low speed","Add pigment + catalyst last, mix 10 min","Fill into cartridges/containers under N2 blanket","Apply at 60–80 µm DFT per coat, 2–3 coats for 2 mm waterproofing","Moisture from air cures: tack-free 2 h, full cure 24 h","QC: elongation >300%, tensile strength >3 MPa, water vapour transmission"],
      equipment:["Dry SS vessel with N2 blanketing","Cartridge filler","Tensile/elongation tester","Moisture meter"] },
    { id:"ct8", name:"Aliphatic PU Top Coat (2K, UV stable)", sub:"High gloss exterior metal / concrete, 2000 h QUV", score:97, tags:["PU","topcoat","2K","UV-stable"],
      ingredients:[
        {n:"Aliphatic Polyol OH 120 (Part A)",p:45,  c:400},
        {n:"HDI Trimer NCO 21.8% (Part B)",   p:22,  c:600},
        {n:"TiO2",                            p:12,  c:200},
        {n:"Xylene / Butyl Acetate",          p:12,  c:32},
        {n:"HALS UV Stabiliser",              p:0.50,c:600},
        {n:"Flow agent",                      p:0.30,c:400},
      ],
      process:["Part A: Disperse TiO2 in polyol + solvents at 2000 rpm, 25 min","Add HALS + flow agent, mix 10 min","Pack Part A","Part B: HDI trimer isocyanate — pack separately","Site mix A:B at NCO:OH = 1.05:1 molar ratio, induction 15 min, pot life 3–4 h","Apply by spray at 40–50 µm DFT per coat","QC: 2000 h QUV gloss retention >80%, pencil hardness ≥H, adhesion"],
      equipment:["Bead mill","HVLP spray gun","QUV weathering chamber 2000 h","Gloss meter","Pot life timer"] },
    { id:"ct9", name:"Elastomeric Waterproof Acrylic Coating", sub:"Crack-bridging, exterior roof/wall", score:90, tags:["waterproof","acrylic","elastomeric"],
      ingredients:[
        {n:"Water",                         p:25,  c:0.05},
        {n:"Acrylic Elastomeric Emulsion",  p:42,  c:150},
        {n:"TiO2",                          p:10,  c:200},
        {n:"CaCO3",                         p:12,  c:5},
        {n:"HEUR Thickener",                p:0.70,c:280},
        {n:"Dispersant",                    p:0.40,c:200},
        {n:"Biocide",                       p:0.20,c:600},
        {n:"Coalescent",                    p:2,   c:180},
      ],
      process:["Disperse TiO2 + CaCO3 in water + dispersant at 2000 rpm, 20 min","Let-down with elastomeric acrylic emulsion at low speed","Add HEUR thickener + biocide + coalescent","Adjust pH 8–9, viscosity 120–140 KU","QC: crack bridging at -10 °C, elongation >200%, 1000 h QUV, water absorption"],
      equipment:["High-speed disperser","Crack bridge tester","QUV chamber","Tensile tester","KU viscometer"] },
    { id:"ct10", name:"RTV Silicone Coating (Room Temp Vulcanising)", sub:"High-temp, release, electrical insulation", score:95, tags:["RTV silicone","coating","high-temp"],
      ingredients:[
        {n:"PDMS Vinyl terminated 500 cst",p:60,  c:350},
        {n:"Silicone Crosslinker (HMS)",   p:8,   c:280},
        {n:"Fumed Silica (reinforcement)", p:15,  c:180},
        {n:"Pt Catalyst (Karstedt)",       p:0.05,c:8000},
        {n:"Inhibitor (1-Ethynyl-3-ol)",   p:0.10,c:400},
        {n:"Xylene / VM&P Naphtha",        p:15,  c:32},
      ],
      process:["MOISTURE EXCLUSION: all raw materials <50 ppm water","Part A: Blend PDMS + fumed silica + Pt catalyst + inhibitor + solvent at low shear under vacuum 30 min","Part B: HMS crosslinker in solvent","Mix A:B = 10:1 at application point (or 1-component with inhibitor for open time)","Apply by spray/dip/roll at 50–150 µm DFT","Cure: RT 2–4 h (addition cure, no by-product)","QC: Shore A 40–60, elongation >200%, volume resistivity, high-temp ageing 200 °C/1000 h"],
      equipment:["Vacuum planetary mixer","N2 blanketing","Shore A tester","Volume resistivity meter","High-temp oven"] },
  ],

  adhesives:[
    { id:"ad1", name:"Epoxy General Purpose Adhesive (2K)", sub:"1:1 or 2:1 ratio, structural bonding", score:92, tags:["epoxy","2K","structural"], free:true,
      ingredients:[
        {n:"Bisphenol A Epoxy EEW190 (Part A)",p:50,  c:280},
        {n:"CaCO3 filler",                     p:10,  c:5},
        {n:"Talc",                             p:5,   c:12},
        {n:"Cycloaliphatic Amine (Part B)",    p:30,  c:300},
        {n:"Accelerator DMP-30",               p:0.50,c:400},
      ],
      process:["Part A: Blend epoxy + fillers in planetary mixer under vacuum 20 min, degas","Pack Part A in dual-cartridge syringe (1:1 or 2:1)","Part B: Amine + accelerator, pack separately","Application: mix with static nozzle","Pot life: 5 min, fixture strength: 30 min, full cure: 24 h @25 °C","QC: lap shear on steel >15 MPa, T-peel, Shore D hardness"],
      equipment:["Planetary vacuum mixer","Dual-cartridge filling line","Lap shear test jig","Shore D set"] },
    { id:"ad2", name:"PU Wood Glue (1K Moisture Cure, D4)", sub:"Waterproof EN204 D4, joinery, finger jointing", score:91, tags:["PU","wood glue","D4","waterproof"], free:true,
      ingredients:[
        {n:"MDI Prepolymer NCO 8–10%",p:88,  c:280},
        {n:"Molecular Sieve 3A",      p:2,   c:180},
        {n:"Plasticiser DIDP",        p:8,   c:60},
        {n:"DBTL Catalyst",           p:0.05,c:800},
        {n:"Pigment (optional)",      p:0.50,c:200},
      ],
      process:["ALL equipment strictly moisture-free (oven-dry at 80 °C)","Blend MDI prepolymer + plasticiser at 60–70 °C, low speed, N2 purge","Add molecular sieve powder, mix 10 min","Add catalyst + pigment, mix 5 min, degas under vacuum","Fill into cartridges / tubes under N2 immediately","Shelf life: 12 months sealed / 9 months in cartridge","Cure: moisture from wood, 24 h full cure, 4–6 h working strength","QC: EN204 D4 wet tensile strength >10 MPa, wood failure >80%"],
      equipment:["N2-purged earthed SS reactor","Vacuum pump","Cartridge filler","EN204 D4 test jig"] },
    { id:"ad3", name:"PVAc Wood Glue (1K Water-based, D2/D3)", sub:"White glue, interior carpentry, school glue", score:85, tags:["PVAc","wood glue","D2"], free:true,
      ingredients:[
        {n:"PVAc Emulsion 55%",  p:70,  c:60},
        {n:"Water",              p:15,  c:0.05},
        {n:"Plasticiser DBP",    p:3,   c:70},
        {n:"HPMC thickener",     p:0.40,c:380},
        {n:"Preservative",       p:0.20,c:350},
        {n:"Defoamer",           p:0.10,c:200},
      ],
      process:["Add PVAc emulsion to paddle mixer at ambient temperature","Add plasticiser (DBP) at low speed, mix 10 min","Pre-dissolve HPMC in warm water, add to tank slowly","Add preservative + defoamer, mix 10 min","Adjust viscosity with water to 5000–10000 cps (Brookfield)","Fill into bottles","QC: EN204 D2/D3 bond strength, open time 10–15 min, tack, pH 4–5"],
      equipment:["Paddle mixer SS","Brookfield viscometer","EN204 test press","pH meter"] },
    { id:"ad4", name:"RTV Silicone Sealant (1K Acetoxy Cure)", sub:"General purpose — glass, aluminium, sanitary", score:93, tags:["RTV silicone","1K","acetoxy"], free:true,
      ingredients:[
        {n:"PDMS OH-terminated 50000 cst",  p:70,  c:350},
        {n:"Methyl Triacetoxy Silane (crosslinker)",p:5,c:180},
        {n:"CaCO3 surface treated",         p:18,  c:8},
        {n:"Fumed Silica",                  p:3,   c:180},
        {n:"Pigment white",                 p:1.5, c:200},
        {n:"DBTDA Tin Catalyst",            p:0.05,c:900},
      ],
      process:["MOISTURE EXCLUSION: all RM <50 ppm H2O — critical to shelf life","Blend PDMS + fumed silica + surface-treated CaCO3 in planetary mixer under full vacuum, 30 min","Add methyl triacetoxy silane crosslinker + DBTDA catalyst + pigment under vacuum, 15 min (acetoxy odour — ventilate)","Fill into cartridges under N2 blanket IMMEDIATELY (no delay — moisture ingress ruins batch)","Seal cartridges","Cure: atmospheric moisture, tack-free time 20–30 min, depth of cure 2–3 mm/day","QC: extrusion rate, tack-free time, Shore A 18–25, elongation >250%, adhesion to glass"],
      equipment:["Planetary vacuum mixer","N2 cartridge filler","Shore A tester","Tensile tester","Adhesion test on glass/aluminium"] },
    { id:"ad5", name:"RTV Silicone Sealant (2K Neutral Cure)", sub:"No corrosion, electronics, optical, structural glazing", score:95, tags:["RTV silicone","2K","neutral"],
      ingredients:[
        {n:"PDMS OH-terminated (Part A)",   p:72,  c:350},
        {n:"Fumed Silica (Part A)",          p:4,   c:180},
        {n:"Alkoxy Crosslinker VTMS (Part A)",p:3,  c:200},
        {n:"Plasticiser PDMS low MW",        p:10,  c:100},
        {n:"Filler / pigment (Part A)",      p:10,  c:10},
        {n:"Organotin Catalyst (Part B)",    p:0.10,c:900},
      ],
      process:["Part A: Blend PDMS + fumed silica + alkoxy silane + filler + plasticiser under vacuum 30 min in planetary mixer","Pack Part A in drum/cartridge under N2","Part B: Organotin catalyst in carrier — pack separately (10:1 ratio)","Site mix A:B via static mixer or manual stir","Cure: moisture from air, no by-product (no acetic acid smell — neutral cure)","Tack-free 1 h, full cure 24–48 h, Shore A 15–25","QC: no copper corrosion (1 week contact test), Shore A, elongation, tensile strength"],
      equipment:["Planetary vacuum mixer","Dual-pack cartridge filler","Copper corrosion test","Shore A + tensile tester"] },
    { id:"ad6", name:"Polysulphide Sealant (2K)", sub:"Fuel-resistant, expansion joints, aviation & civil", score:91, tags:["polysulphide","2K","joint sealant"],
      ingredients:[
        {n:"Liquid Polysulphide LP-2 (Part A)",p:60, c:280},
        {n:"CaCO3 coated (Part A)",            p:22, c:8},
        {n:"Carbon Black (Part A)",            p:2,  c:150},
        {n:"Plasticiser DOP (Part A)",         p:5,  c:55},
        {n:"MnO2 Paste Curing Agent (Part B)", p:10, c:120},
        {n:"Retarder Stearic Acid (Part B)",   p:0.20,c:80},
      ],
      process:["Part A: Mix LP-2 polymer + CaCO3 + CB + DOP in Z-blade or sigma mixer 20 min, degas under vacuum","Pack Part A in tubs / cartridges","Part B: MnO2 paste + stearic acid retarder — pre-blended, pack separately","Site mix A:B = 6:1 by weight with paddle or mechanical mixer, pot life 2–3 h @25 °C","Apply by gun into primed joint, tool smooth within 30 min","Cure: 24–72 h @25 °C to Shore A 25–40","QC: EN ISO 11600 movement accommodation factor ±25%, jet fuel resistance, water immersion 7 days"],
      equipment:["Z-blade / sigma mixer","Tub + cartridge filler","Shore A tester","Movement rig","Chemical resistance panel"] },
    { id:"ad7", name:"Acrylic PSA (Pressure Sensitive Adhesive)", sub:"Self-adhesive labels, tapes, removable to permanent", score:89, tags:["PSA","acrylic"],
      ingredients:[
        {n:"2-EHA (2-Ethylhexyl Acrylate)",    p:60,  c:90},
        {n:"Vinyl Acetate",                    p:20,  c:55},
        {n:"Acrylic Acid",                     p:5,   c:65},
        {n:"AIBN Initiator",                   p:0.30,c:400},
        {n:"Ethyl Acetate (solvent)",           p:14,  c:30},
        {n:"Al-acetylacetonate crosslinker",   p:0.10,c:400},
      ],
      process:["Charge monomers + ethyl acetate + AIBN in N2-purged reactor","Polymerise semi-batch at 75–80 °C, 5–6 h (add remaining monomer portion by portion)","Check solids content ≥40–45% (conversion check)","Add crosslinker at end, mix 15 min","Coat on release liner at 20–25 µm dry via comma or slot-die coater","Dry 80–100 °C / 3 min","QC: PSTC-1 180° peel, PSTC-7 loop tack, PSTC-2 shear hold"],
      equipment:["N2-purged reactor with reflux","Semi-batch pump","Slot-die / comma coater","Drying oven","PSTC peel/tack/shear tester"] },
    { id:"ad8", name:"BOPP Tape Adhesive (Acrylic Solvent)", sub:"OPP film carrier, packaging tape", score:87, tags:["BOPP","tape","acrylic"],
      ingredients:[
        {n:"2-EHA",                         p:65,  c:90},
        {n:"Vinyl Acetate",                 p:18,  c:55},
        {n:"Acrylic Acid",                  p:5,   c:65},
        {n:"AIBN Initiator",                p:0.30,c:400},
        {n:"Toluene",                       p:11,  c:25},
        {n:"Al-acac crosslinker",           p:0.10,c:400},
      ],
      process:["Polymerise as PSA process (N2 purged, 75–80 °C, semi-batch, 6 h)","Target Mw 500–700 kDa (verify by GPC)","Apply on corona-treated BOPP film at 18–22 µm dry via slot-die","Dry 80–100 °C / 2 min","Slit and rewind","QC: 180° peel on steel, loop tack >600 g/25mm, shear 24 h >5 h"],
      equipment:["N2 reactor","Corona treater","Slot-die coater","GPC for Mw","Peel/tack/shear tester"] },
    { id:"ad9", name:"PU Lamination Adhesive (2K, Retort-stable)", sub:"Flexible food packaging, high temp stable", score:94, tags:["PU","lamination","2K"],
      ingredients:[
        {n:"Aliphatic Polyurethane Polyol (Part A)",p:55, c:200},
        {n:"Ethyl Acetate",                         p:20, c:30},
        {n:"MDI/HDI Isocyanate (Part B)",           p:20, c:350},
        {n:"DBTL Catalyst",                         p:0.05,c:800},
      ],
      process:["Dissolve Part A polyol in ethyl acetate, mix 15 min","Add Part B isocyanate to achieve NCO:OH = 1.1:1 molar ratio","Add catalyst, mix 5 min","Apply by gravure or comma coater at 2–3 g/m² dry weight","Laminate with second film through nip roll","Cure: 48–72 h @40 °C (retort grade: 7 days @50 °C)","QC: T-peel ≥300 g/25mm, solvent retention <5 ppm by GC headspace, hot tack"],
      equipment:["Gravure / comma coater","Nip roll laminator","Cure oven","T-peel tester","GC headspace for solvent"] },
    { id:"ad10", name:"Epoxy Grout (2K, Chemical Resistant)", sub:"Sanitary areas, food industry, acid-resistant joints", score:96, tags:["epoxy grout","2K"],
      ingredients:[
        {n:"Bisphenol A Epoxy + filler paste (Part A)",p:60, c:200},
        {n:"Graded Quartz 0–0.3mm",                    p:20, c:3},
        {n:"TiO2 / Pigment",                           p:3,  c:200},
        {n:"Cycloaliphatic Amine (Part B)",             p:16, c:300},
        {n:"Wetting agent",                             p:0.30,c:300},
      ],
      process:["Part A: Blend epoxy resin with graded quartz + TiO2 + wetting agent in planetary mixer, degas under vacuum","Pack Part A in pail / tray (A side)","Pack Part B cycloaliphatic amine separately","Site: Mix A:B = 3:1 by volume, pot life 30–45 min @25 °C","Apply grout into tile joints with rubber float","Clean excess within pot life with damp cloth","Full cure: 7 days @25 °C, do not grout in <10 °C","QC: EN13888 chemical resistance (10% H2SO4, 10% NaOH), compressive strength >45 MPa"],
      equipment:["Planetary vacuum mixer","Dual-pack pail line","Compressive press","Chemical resistance tanks"] },
    { id:"ad11", name:"UV Curing Adhesive (Acrylic, 1K)", sub:"Instant cure with UV lamp, glass/optical/medical devices", score:97, tags:["UV cure","acrylic","optical"],
      ingredients:[
        {n:"Urethane Acrylate Oligomer",         p:55,  c:450},
        {n:"TPGDA Reactive Diluent",             p:20,  c:150},
        {n:"HDDA Reactive Diluent",              p:10,  c:140},
        {n:"Irgacure 819 Photoinitiator",        p:3,   c:1200},
        {n:"MEHQ Inhibitor / Stabiliser",        p:0.05,c:400},
        {n:"Silane Adhesion Promoter",           p:1,   c:500},
      ],
      process:["DARK ROOM / YELLOW LIGHT: all operations exclude UV light","Blend oligomer + reactive diluents at low speed, 30 min — avoid UV exposure","Add photoinitiator (Irgacure 819) + MEHQ inhibitor + silane, mix 15 min under yellow light","Fill into amber UV-opaque syringes / cartridges immediately","Store at 4–8 °C away from light","Apply thin bead, assemble parts, cure with 365–405 nm UV at 1000–3000 mJ/cm² (5–30 s)","QC: lap shear on glass >8 MPa, optical clarity >95% transmission, depth of cure"],
      equipment:["Yellow-light room","Planetary mixer","UV LED conveyor / spot lamp","Radiometer","Lap shear jig","Optical clarity measurement"] },
    { id:"ad12", name:"Starch-Based Paper Glue (Seam & Lamination)", sub:"Anionic cooked starch, corrugator, book binding", score:82, tags:["starch","paper","seam"],
      ingredients:[
        {n:"Oxidised Corn / Tapioca Starch",p:18,  c:22},
        {n:"Water",                         p:75,  c:0.05},
        {n:"Borax Na2B4O7",                p:0.50, c:35},
        {n:"NaOH 10% solution",            p:0.80, c:5},
        {n:"Preservative",                 p:0.10, c:350},
      ],
      process:["Heat water to 70 °C in SS jacketed vessel","Slurry starch in 30% cold water separately (avoid lumps)","Add starch slurry slowly to hot water with anchor agitation","Cook at 85–90 °C, 20 min — full gelatinisation (Brookfield target 800–1200 cps)","Add borax + NaOH for crosslinking, cook 5 min more","Cool to 40 °C, add preservative","Fill","QC: Brookfield viscosity, pH 7.5–9, tack on Kraft paper, dry bond strength"],
      equipment:["Jacketed SS vessel with anchor agitator","Thermometer / thermocouple","Brookfield viscometer","pH meter","Tack tester"] },
    { id:"ad13", name:"Synthetic Rubber Contact Adhesive (Neoprene)", sub:"High tack, footwear, upholstery, laminates", score:86, tags:["rubber","contact","neoprene"],
      ingredients:[
        {n:"Polychloroprene CR solid",  p:20,  c:380},
        {n:"Toluene / Hexane 60:40",   p:55,  c:27},
        {n:"Zinc Oxide",               p:2,   c:90},
        {n:"MgO",                      p:1,   c:50},
        {n:"Phenolic Resin tackifier", p:8,   c:100},
        {n:"Antioxidant",              p:0.50,c:300},
        {n:"Accelerator ETU",          p:0.30,c:250},
      ],
      process:["EXPLOSION-PROOF facility mandatory (solvent flash point low)","Dissolve CR in toluene/hexane at 40–50 °C with anchor stirrer, 4–6 h (slow dissolution — do not rush)","Add ZnO + MgO slurry in part solvent","Add phenolic resin tackifier, stir 1 h","Add antioxidant + ETU accelerator last","Filter through 150µ and fill into tins/tubes","STORAGE: sealed tins, away from heat and spark sources","QC: quick-stick T-peel, 180° peel on leather / SBR rubber, viscosity, non-volatile content"],
      equipment:["Explosion-proof SS reactor with anchor stirrer","Ex-proof pump and filling line","Filter press","Peel/tack tester"] },
  ],

  cosmetics:[
    { id:"co1", name:"Glycerin Soap Bar (Transparent)", sub:"Hot process, vegetable oils, IS:4955", score:88, tags:["soap","glycerin"], free:true,
      ingredients:[
        {n:"Coconut Oil (76°)",  p:30,  c:120},
        {n:"Palm Oil (RBD)",     p:25,  c:90},
        {n:"Castor Oil",         p:10,  c:150},
        {n:"NaOH flakes",        p:9,   c:28},
        {n:"Water (for lye)",    p:5,   c:0.05},
        {n:"Glycerin",           p:12,  c:80},
        {n:"Ethanol 96%",        p:5,   c:55},
        {n:"Sugar Solution 70%", p:3,   c:25},
        {n:"Fragrance",          p:1,   c:800},
      ],
      process:["Heat oils (coconut + palm + castor) to 70 °C in SS reactor","Prepare NaOH lye: add NaOH to water slowly (NEVER water to NaOH) — CAUTION: exothermic, 80 °C spike, PPE mandatory","Add hot lye to hot oils with continuous stirring — mix to trace (saponification begins)","Heat batch at 90 °C, stir 60–90 min until full saponification (no unsaponified oil on pH test)","Add glycerin + ethanol + sugar solution at 80 °C — clarity develops","Add fragrance at 65 °C, mix 5 min","Pour into molds at 60–65 °C","Cool and cure 24–48 h, demold, cut","QC: pH 8.5–10, free alkali <0.1% (IS:4955), transparency, lather test"],
      equipment:["SS jacketed reactor with anchor agitator","pH meter","Thermometer","SS or silicone molds","Refractometer"] },
    { id:"co2", name:"SLS-Free Shampoo (Normal Hair)", sub:"Sarcosinate + CAPB, mild, IS:6012 compliant", score:87, tags:["shampoo","SLS-free","normal"], free:true,
      ingredients:[
        {n:"Water",                             p:57,  c:0.05},
        {n:"Sodium Lauroyl Sarcosinate 30%",    p:18,  c:180},
        {n:"CAPB 35%",                          p:8,   c:120},
        {n:"Decyl Glucoside 50%",               p:4,   c:180},
        {n:"Glycerin",                          p:2,   c:80},
        {n:"NaCl",                              p:1,   c:5},
        {n:"Citric Acid",                       p:0.30,c:60},
        {n:"Phenoxyethanol",                    p:0.50,c:400},
        {n:"Fragrance",                         p:0.80,c:800},
        {n:"Panthenol",                         p:0.50,c:500},
      ],
      process:["Heat water to 55 °C in SS tank with anchor agitator","Add sodium lauroyl sarcosinate — mix gently (avoid foam)","Add CAPB at 50 °C, mix 10 min","Add decyl glucoside at 50 °C, mix 5 min","Cool to 40 °C, add glycerin + NaCl (for viscosity building)","Adjust pH to 5.5–6.5 with citric acid","Add phenoxyethanol + panthenol at 35 °C, mix 10 min","Add fragrance at 30 °C, mix 5 min","Filter, fill","QC: pH 5.5–6.5, Brookfield viscosity 3000–8000 cps, foam height, clarity"],
      equipment:["SS tank with anchor agitator","Brookfield viscometer","pH meter","Foam tester"] },
    { id:"co3", name:"Baby Shampoo (No-Tear, Ultra-Mild)", sub:"Amphoteric surfactants only, pH 6–7", score:92, tags:["baby","shampoo","no-tear"], free:true,
      ingredients:[
        {n:"Water",                             p:70,  c:0.05},
        {n:"CAPB 35%",                          p:15,  c:120},
        {n:"Disodium Cocoamphodiacetate 40%",   p:6,   c:140},
        {n:"Glycerin",                          p:3,   c:80},
        {n:"Allantoin",                         p:0.20,c:500},
        {n:"NaCl",                              p:0.50,c:5},
        {n:"Citric Acid",                       p:0.20,c:60},
        {n:"Phenoxyethanol",                    p:0.50,c:400},
        {n:"Baby Fragrance (hypoallergenic)",   p:0.30,c:1500},
      ],
      process:["Heat water to 50 °C — use DM/purified water only","Add CAPB — mix gently at low speed to avoid foam","Add disodium cocoamphodiacetate, mix 10 min","Add glycerin + allantoin at 45 °C","Cool to 35 °C, add NaCl for viscosity","Adjust pH to 6.0–7.0 with citric acid (CRITICAL for zero irritation)","Add phenoxyethanol + baby fragrance at 30 °C","Fill","QC: pH 6.0–7.0 CRITICAL, Draize eye irritation = ZERO, viscosity 2000–5000 cps, microbial"],
      equipment:["SS tank gentle anchor agitator","pH meter (calibrate fresh)","Brookfield LV viscometer","Microbial testing"] },
    { id:"co4", name:"Moisturizer / Day Cream (O/W)", sub:"Niacinamide + HA, anti-aging, all skin types", score:91, tags:["moisturizer","cream","anti-aging"],
      ingredients:[
        {n:"Water (DM)",             p:65,  c:0.05},
        {n:"Cetearyl Alcohol",       p:3,   c:180},
        {n:"Glyceryl Stearate",      p:2,   c:200},
        {n:"Dimethicone 100 cst",    p:3,   c:350},
        {n:"CCT (caprylic/capric)",  p:4,   c:280},
        {n:"Glycerin",               p:5,   c:80},
        {n:"Niacinamide",            p:4,   c:900},
        {n:"Hyaluronic Acid 1% soln",p:3,   c:600},
        {n:"Carbopol 940",           p:0.30,c:500},
        {n:"TEA (Triethanolamine)",  p:0.25,c:80},
        {n:"Phenoxyethanol",         p:0.80,c:400},
        {n:"Fragrance",              p:0.30,c:800},
      ],
      process:["Water phase: heat DM water + glycerin + HA solution to 80 °C","Oil phase: melt cetearyl alcohol + glyceryl stearate + dimethicone + CCT at 80 °C in separate vessel","Homogenise: pour oil phase into water phase with high-shear homogenizer at 80 °C, 5 min","Cool to 45 °C with gentle mixing","Add niacinamide + pre-wetted Carbopol 940","Neutralise Carbopol with TEA dropwise to pH 5.5–6.5 (viscosity forms)","Add phenoxyethanol + fragrance at 35 °C","Degas, fill","QC: pH 5.5–6.5, viscosity, stability at 45 °C 6 weeks, microbial"],
      equipment:["Vacuum homogenizer emulsifier","Water bath + SS vessels","pH meter","Stability oven 45 °C","Brookfield viscometer"] },
    { id:"co5", name:"Aloe Vera Gel", sub:"After-sun, cooling, multipurpose soothing gel", score:90, tags:["aloe vera","gel"],
      ingredients:[
        {n:"Aloe Vera Juice (1x certified)",p:75,  c:50},
        {n:"DM Water",                      p:12,  c:0.05},
        {n:"Carbopol ETD 2020",             p:0.50,c:500},
        {n:"Glycerin",                      p:3,   c:80},
        {n:"TEA",                           p:0.40,c:80},
        {n:"Allantoin",                     p:0.20,c:500},
        {n:"Phenoxyethanol",                p:0.50,c:400},
        {n:"Panthenol",                     p:0.50,c:500},
        {n:"Cucumber Extract",              p:1,   c:400},
      ],
      process:["Sprinkle Carbopol ETD 2020 onto water + aloe vera juice — let swell 30 min without stirring","Add glycerin + allantoin + panthenol + cucumber extract — stir gently","Neutralise with TEA dropwise (gel forms rapidly) — target pH 6.0–7.0","Add phenoxyethanol at 35 °C","Fill","QC: clarity, pH 6–7, syneresis test (centrifuge), viscosity 15000–40000 cps"],
      equipment:["Paddle mixer (low shear)","pH meter","Centrifuge for syneresis","Brookfield viscometer"] },
    { id:"co6", name:"Toothpaste (Fluoride, Spearmint)", sub:"IS:6356, RDA compliant, fluoride 1000 ppm", score:90, tags:["toothpaste","fluoride","IS:6356"],
      ingredients:[
        {n:"Hydrated Silica (abrasive)",  p:20,  c:180},
        {n:"Glycerin 99%",               p:20,  c:80},
        {n:"Sorbitol 70% solution",      p:10,  c:55},
        {n:"DM Water",                   p:30,  c:0.05},
        {n:"CMC / Carrageenan binder",   p:1,   c:200},
        {n:"SLS 30% (foaming)",          p:1.5, c:60},
        {n:"Sodium Fluoride",            p:0.32,c:380},
        {n:"Sodium Saccharin",           p:0.20,c:300},
        {n:"Spearmint Flavour",          p:1,   c:1200},
        {n:"TiO2 (opacifier)",           p:0.50,c:200},
      ],
      process:["Pre-gel CMC/carrageenan in warm glycerin + sorbitol + water at 60 °C, 20 min — smooth gel","Cool to 40 °C, add hydrated silica in planetary mixer — mix 15 min at medium speed (avoid air entrainment)","Add SLS 30% solution, mix 10 min","Add NaF + saccharin + TiO2, mix 10 min","Add spearmint flavour last, mix 5 min","Fill into tubes under vacuum seal","QC: fluoride content by ISE electrode, pH 6.5–8.0, RDA abrasivity <250, viscosity, microbial"],
      equipment:["Planetary vacuum mixer","Tube filling + heat-seal machine","Ion selective electrode for F-","RDA abrasion test rig"] },
    { id:"co7", name:"Roll-On Deodorant (Aluminium-free)", sub:"Zinc ricinoleate based odour neutraliser", score:85, tags:["deodorant","roll-on"],
      ingredients:[
        {n:"DM Water",                       p:60,  c:0.05},
        {n:"Glycerin",                       p:5,   c:80},
        {n:"PEG-40 Hydrogenated Castor Oil", p:2,   c:200},
        {n:"Ethanol 96%",                    p:15,  c:55},
        {n:"Zinc Ricinoleate",               p:2,   c:350},
        {n:"Piroctone Olamine",              p:0.20,c:800},
        {n:"Fragrance",                      p:2,   c:800},
        {n:"Phenoxyethanol",                 p:0.50,c:400},
        {n:"HEC Thickener",                  p:0.50,c:200},
      ],
      process:["Dissolve HEC in DM water at 60 °C, swell 30 min","Cool to 40 °C, add glycerin + PEG-40 castor oil","Add ethanol slowly with gentle stirring (watch foam)","Add zinc ricinoleate + piroctone olamine, mix 10 min","Add fragrance + phenoxyethanol at 35 °C","Adjust pH to 4.5–6.0 with citric acid","Fill into roll-on bottles at 35 °C","QC: roll-on delivery rate, odour panel test, pH, microbial, stability"],
      equipment:["SS tank with anchor agitator","Roll-on bottle filler","pH meter","Odour panel","Stability chamber"] },
    { id:"co8", name:"Mouthwash (Antiseptic, Peppermint)", sub:"Alcohol-based, IS:9872, CPC + NaF", score:86, tags:["mouthwash","antiseptic"],
      ingredients:[
        {n:"DM Water",                   p:55,  c:0.05},
        {n:"Ethanol 96%",                p:15,  c:55},
        {n:"Glycerin",                   p:5,   c:80},
        {n:"Sorbitol 70%",               p:10,  c:55},
        {n:"Cetylpyridinium Chloride",   p:0.05,c:900},
        {n:"Polysorbate 80",             p:1,   c:180},
        {n:"Peppermint Oil",             p:0.30,c:1800},
        {n:"Sodium Fluoride",            p:0.05,c:380},
        {n:"Sodium Saccharin",           p:0.10,c:300},
        {n:"FD&C Blue + Green colour",   p:0.01,c:800},
      ],
      process:["Dissolve CPC + saccharin + NaF in DM water at 40 °C","Add glycerin + sorbitol, mix 10 min","Dissolve peppermint oil in polysorbate 80 + ethanol separately","Add oil-polysorbate-ethanol mixture slowly to aqueous phase with stirring","Add colour, check volume, fill","QC: CPC content by HPLC, fluoride by ISE, ethanol % by GC, microbial limit test, pH 5.5–7.0"],
      equipment:["SS tank","HPLC for CPC","Ion selective electrode F-","Gas chromatograph","Filling machine"] },
  ],

  homecare:[
    { id:"hc1", name:"Liquid Dishwash Concentrate (Lemon)", sub:"Grease-cutting, hand wash, IS:1613", score:84, tags:["dishwash","lemon"], free:true,
      ingredients:[
        {n:"Water",                p:52,  c:0.05},
        {n:"SLES 70%",             p:18,  c:90},
        {n:"CAPB 35%",             p:8,   c:120},
        {n:"LAS (neutralised)",    p:6,   c:40},
        {n:"NaCl",                 p:2,   c:5},
        {n:"Citric Acid",          p:0.50,c:60},
        {n:"Preservative",         p:0.30,c:350},
        {n:"Lemon Fragrance",      p:0.50,c:800},
      ],
      process:["Heat water to 50 °C","Neutralise LAS with NaOH 50% in separate vessel (exothermic — add NaOH to acid slowly, cool to <60 °C)","Add SLES 70% to main tank gently (avoid foam)","Add neutralised LAS + CAPB, mix 15 min","Cool to 40 °C, add NaCl for viscosity (Newtonian salt curve)","Adjust pH 6.5–7.5 with citric acid","Add preservative + fragrance + colour at 35 °C","QC: viscosity 1500–4000 cps, pH 6.5–7.5, actives content"],
      equipment:["SS tank with anchor agitator","Neutralisation vessel","pH meter","Brookfield viscometer"] },
    { id:"hc2", name:"Toilet Bowl Cleaner (HCl-based)", sub:"Viscous, limescale removal, IS:4955 type", score:88, tags:["toilet","HCl"], free:true,
      ingredients:[
        {n:"Water",                    p:75,  c:0.05},
        {n:"Hydrochloric Acid 32%",    p:12,  c:12},
        {n:"HEC (Natrosol)",           p:0.80,c:200},
        {n:"Nonionic Surfactant",      p:3,   c:80},
        {n:"Benzalkonium Chloride 50%",p:0.50,c:180},
        {n:"Blue Colour",              p:0.05,c:800},
        {n:"Floral Perfume",           p:0.30,c:800},
      ],
      process:["PPE MANDATORY: acid-resistant gloves, goggles, face shield, apron — HCl fumes are toxic","Dissolve HEC in DM water at 60 °C, stir 30 min — do NOT add acid yet","Cool to 30 °C — ALWAYS add acid to water, NEVER reverse","Add HCl 32% slowly with stirring (fumes — ventilate)","Add nonionic surfactant + BAC","Add colour + perfume at ambient","QC: pH <2, viscosity 1500–3000 cps (Brookfield LV spindle 3), active HCl content"],
      equipment:["Acid-resistant PP or FRP tank","Acid-proof PVDF pump","pH meter","Safety shower + eyewash station"] },
    { id:"hc3", name:"Floor Cleaner (Pine Phenyl)", sub:"White or pine phenyl concentrate, IS:14613", score:82, tags:["floor","phenyl"], free:true,
      ingredients:[
        {n:"Water",                      p:60,  c:0.05},
        {n:"Pine Oil / Terpineol",       p:10,  c:120},
        {n:"Castor Oil Soap (saponified)",p:8,  c:60},
        {n:"LAS (neutralised)",          p:6,   c:40},
        {n:"Sodium Xylene Sulphonate 40%",p:3,  c:50},
        {n:"Colour",                     p:0.05,c:800},
        {n:"Pine Fragrance",             p:0.50,c:800},
      ],
      process:["Prepare castor oil soap: saponify castor oil with NaOH at 80 °C until clear","Add LAS neutralised + SXS to warm water with stirring","Add pine oil / terpineol slowly with vigorous stirring (emulsification)","Add colour + fragrance","Fill into drums","Dilution: 1:10 to 1:20 with water for mopping","QC: emulsion stability (no separation 48 h), pine oil content, pH 9–11"],
      equipment:["SS tank","Emulsification mixer","Refractometer","pH meter"] },
    { id:"hc4", name:"Glass Cleaner (Streak-free, IPA)", sub:"Ammonia + IPA, spray bottle", score:86, tags:["glass","IPA"],
      ingredients:[
        {n:"DM Water",               p:72,  c:0.05},
        {n:"Isopropyl Alcohol 99%",  p:15,  c:55},
        {n:"Butyl Cellosolve",       p:3,   c:120},
        {n:"Ammonia 25%",            p:2,   c:20},
        {n:"Low-foam Nonionic EO5",  p:0.50,c:80},
        {n:"Blue Colour",            p:0.02,c:800},
        {n:"Light Floral Perfume",   p:0.20,c:800},
      ],
      process:["Mix IPA + butyl cellosolve + ammonia in fume hood first","Add DM water slowly with stirring","Add nonionic surfactant + colour + fragrance","Fill into trigger-spray bottles","QC: streak-free test on glass panel, pH 9.5–10.5, clarity, evaporation rate"],
      equipment:["Fume hood","Glass streak test panel","pH meter","Trigger-spray bottles"] },
    { id:"hc5", name:"Laundry Liquid Detergent (HE, Enzyme-boosted)", sub:"Low foam, front-load compatible", score:88, tags:["laundry","HE"],
      ingredients:[
        {n:"Water",                      p:45,  c:0.05},
        {n:"LAS (neutralised)",          p:12,  c:40},
        {n:"Nonionic C12-14 EO7",        p:8,   c:90},
        {n:"Sodium Citrate",             p:3,   c:45},
        {n:"Sodium Bicarbonate",         p:2,   c:12},
        {n:"Glycerin",                   p:2,   c:80},
        {n:"Protease Enzyme",            p:0.50,c:700},
        {n:"Optical Brightener CBS-X",   p:0.20,c:500},
        {n:"Fragrance",                  p:0.80,c:800},
        {n:"Phenoxyethanol",             p:0.30,c:400},
      ],
      process:["Dissolve sodium citrate + bicarbonate in water at 50 °C","Cool to 40 °C, add LAS (neutralised) + nonionic surfactant","Add glycerin + optical brightener, mix 10 min","Add protease enzyme at 35 °C (temperature critical — enzyme denatures >40 °C)","Add fragrance + phenoxyethanol at 30 °C","Adjust pH 7.5–9.0","Fill","QC: standard stain wash test ASTM D4265, enzyme activity, pH, suds control"],
      equipment:["SS tank","Washing machine test rig","Stain removal test kit","Enzyme activity assay","pH meter"] },
  ],

  inks:[
    { id:"ik1", name:"Flexographic Ink — Process Cyan (Water-based)", sub:"Water-based, LDPE / paper", score:88, tags:["flexo","water-based","cyan"], free:true,
      ingredients:[
        {n:"Pigment Blue 15:3 (Cyan)",  p:8,   c:900},
        {n:"Styrene Acrylic Emulsion 40%",p:35, c:110},
        {n:"Water",                     p:45,  c:0.10},
        {n:"Isopropanol",               p:5,   c:55},
        {n:"Wax Emulsion",              p:2,   c:120},
        {n:"Dispersant",                p:1,   c:200},
        {n:"Defoamer",                  p:0.30,c:200},
        {n:"Ammonia (pH adjustment)",   p:0.20,c:20},
      ],
      process:"Water-based flexo ink manufactured by pre-dispersing pigment with dispersant in water using a bead mill (D50 <1 µm target), then let-down with styrene acrylic emulsion. IPA improves substrate wetting and drying. pH adjusted to 8-9 with ammonia. Contact us for Process Flow Diagram.",
      equipment:["Bead mill (horizontal)","Particle size analyser","Viscosity cup (Zahn #2)","pH meter"] },
    { id:"ik2", name:"Gravure Ink — Black (Toluene-based)", sub:"High speed rotogravure, publication", score:90, tags:["gravure","solvent","black"], free:true,
      ingredients:[
        {n:"Carbon Black",              p:12,  c:130},
        {n:"Toluene",                   p:50,  c:25},
        {n:"Polyamide Resin",           p:25,  c:220},
        {n:"Nitrocellulose 1/4 sec",    p:8,   c:280},
        {n:"Isopropanol",               p:3,   c:55},
        {n:"Plasticiser (DOP)",         p:1.5, c:55},
        {n:"Wax",                       p:0.50,c:150},
      ],
      process:"Solvent-based gravure ink. Carbon black pre-dispersed in part toluene + polyamide using bead mill to D50 <0.5 µm. NC resin dissolved separately in toluene/IPA blend. Combined at let-down. Contact us for Process Flow Diagram. Note: Ex-proof facility required.",
      equipment:["Bead mill (ex-proof)","Rotary viscometer","Particle size analyser","Ex-proof mixing tank"] },
    { id:"ik3", name:"Offset Lithographic Ink — Black", sub:"Heatset / coldset, mineral oil vehicle", score:87, tags:["offset","lithographic","black"],
      ingredients:[
        {n:"Carbon Black (furnace)",    p:18,  c:130},
        {n:"Mineral Oil (Heatset)",     p:30,  c:22},
        {n:"Alkyd Varnish (6P bodied)", p:30,  c:95},
        {n:"Rosin Modified Phenolic Resin",p:15,c:180},
        {n:"Co/Mn Drier",              p:1,   c:300},
        {n:"PTFE/Wax Compound",        p:2,   c:200},
        {n:"Anti-skinning Agent MEKO", p:0.30,c:300},
      ],
      process:"Offset ink is a high-viscosity paste system. Carbon black is milled with varnish in a 3-roll mill to achieve tack and fineness. The process requires multiple mill passes. Rheology (tack, flow) is critical. Contact us for Process Flow Diagram.",
      equipment:["3-roll mill","Inkometer (tack)","Laray viscometer","Fineness of grind gauge"] },
    { id:"ik4", name:"UV Offset Ink — Process Cyan", sub:"UV curable, sheetfed offset", score:94, tags:["UV","offset","curable"],
      ingredients:[
        {n:"Pigment Blue 15:3",         p:12,  c:900},
        {n:"Epoxy Acrylate Oligomer",   p:30,  c:350},
        {n:"TPGDA Reactive Diluent",    p:20,  c:150},
        {n:"HDDA Reactive Diluent",     p:10,  c:140},
        {n:"Irgacure 819 Photoinitiator",p:4,  c:1200},
        {n:"Benzophenone",              p:3,   c:120},
        {n:"Wax",                       p:1.50,c:200},
        {n:"Flow Additive",             p:0.50,c:400},
      ],
      process:"UV-curable offset ink manufactured under yellow/filtered light to prevent premature cure. Pigment dispersed in oligomer using 3-roll mill to D50 <1 µm. UV cure with mercury or LED lamps. Contact us for Process Flow Diagram.",
      equipment:["3-roll mill (dark room)","UV LED/mercury cure unit","Tack meter","Fineness gauge"] },
    { id:"ik5", name:"Screen Printing Ink — White (Plastisol)", sub:"PVC plastisol, textile screen printing", score:91, tags:["screen","plastisol","textile"],
      ingredients:[
        {n:"PVC Resin (Paste grade K=70)",p:30, c:85},
        {n:"DOP Plasticiser",            p:40,  c:55},
        {n:"TiO2 Rutile",               p:20,  c:360},
        {n:"Thermal Stabiliser (Ca/Zn)", p:1,   c:250},
        {n:"Gelling Agent",             p:1,   c:200},
        {n:"Rheology Modifier",         p:0.50,c:180},
      ],
      process:"PVC plastisol ink — PVC resin wetted out in DOP plasticiser under low shear to form a paste. TiO2 dispersed in part plastisol using 3-roll mill. Combined and de-aired. Cures at 150–170 °C on textile. Contact us for Process Flow Diagram.",
      equipment:["3-roll mill","Viscometer","Curing oven / flash cure","Wash fastness tester"] },
    { id:"ik6", name:"Inkjet Ink — Pigmented Black (Water-based)", sub:"Desktop / wide format, pigment encapsulated", score:93, tags:["inkjet","pigmented","water-based"],
      ingredients:[
        {n:"Carbon Black (encapsulated dispersion 15%)",p:20,c:400},
        {n:"Water (DI)",                p:60,  c:0.10},
        {n:"Humectant (Glycerol)",      p:10,  c:80},
        {n:"Co-solvent (1,2-Propanediol)",p:6,  c:65},
        {n:"Surfactant (Surfynol 465)", p:0.50,c:500},
        {n:"Biocide (Proxel)",          p:0.20,c:800},
      ],
      process:"Pigmented inkjet ink requires encapsulated pigment dispersion (particle size D99 <200 nm — critical for nozzle reliability). Formulation is a simple blend but requires sub-micron filtration (0.5 µm) before fill. Contact us for Process Flow Diagram.",
      equipment:["Sub-micron bead mill","0.5 µm membrane filter","Particle size analyser (DLS)","Surface tension meter"] },
  ],

  sizing:[
    { id:"sz1", name:"Warp Sizing Agent — PVA / Starch Blend", sub:"Textile warp sizing, weaving efficiency", score:86, tags:["textile","warp sizing","PVA"], free:true,
      ingredients:[
        {n:"Modified Corn Starch (oxidised)",p:30, c:22},
        {n:"PVAc Emulsion 55%",             p:20,  c:60},
        {n:"Water (process)",               p:44,  c:0.10},
        {n:"Softener (Acrylic PAM)",        p:2,   c:90},
        {n:"Wax Emulsion",                  p:1.50,c:80},
        {n:"Preservative",                  p:0.10,c:350},
        {n:"Lubricant (mineral oil emulsion)",p:1.50,c:40},
      ],
      process:"Warp sizing agent prepared by cooking oxidised starch at 90 °C for 30 min to full gelatinisation, then cooling to 60 °C before adding PVAc emulsion, softener and lubricants. Applied on sizing machine at 85–90 °C onto warp beam. Contact us for Process Flow Diagram.",
      equipment:["Jacketed cooking vessel with anchor agitator","Sizing machine","Add-on % measurement","Abrasion tester"] },
    { id:"sz2", name:"Warp Sizing — Pure PVA Film Former", sub:"High tenacity yarn, filament sizing", score:90, tags:["textile","warp sizing","PVA film"], free:true,
      ingredients:[
        {n:"PVA (fully hydrolysed, Mw 125000)",p:10, c:160},
        {n:"Water (DM)",                       p:85, c:0.10},
        {n:"Lubricant (PE wax emulsion)",      p:2,  c:80},
        {n:"Softener",                         p:1.50,c:90},
        {n:"Antistatic Agent",                 p:0.50,c:180},
      ],
      process:"PVA solution prepared by dissolving in hot water (90 °C, 60 min) with stirring. Additions of lubricant and antistatic at 60 °C. Applied hot at 4–8% add-on. Contact us for Process Flow Diagram.",
      equipment:["SS dissolution tank with high-shear agitator","Sizing machine","Viscosity cup","Add-on % tester"] },
    { id:"sz3", name:"Paper Surface Sizing — Oxidised Starch", sub:"Surface sizing press, paper / board", score:83, tags:["paper","surface sizing","starch"], free:true,
      ingredients:[
        {n:"Oxidised Corn / Tapioca Starch",   p:8,  c:22},
        {n:"Water (process)",                  p:91, c:0.10},
        {n:"Optical Brightener (stilbene type)",p:0.20,c:500},
        {n:"Biocide",                          p:0.05,c:350},
      ],
      process:"Starch cooked at 4–8% concentration in jacketed vessel at 95 °C for 20–30 min. Optical brightener and biocide added after cooking and cooling to 60 °C. Applied at size press at 50–60 °C. Contact us for Process Flow Diagram.",
      equipment:["Jacketed cooking vessel","Size press (puddle or metered)","Cobb tester","Viscometer"] },
    { id:"sz4", name:"Paper Internal Sizing — AKD (Alkyl Ketene Dimer)", sub:"Neutral / alkaline sizing for offset paper", score:91, tags:["paper","internal sizing","AKD"],
      ingredients:[
        {n:"AKD Emulsion (14% active)",        p:0.20,c:400},
        {n:"Cationic Starch (retention aid)",  p:0.50,c:120},
        {n:"Water (process — added at wet end)",p:99.30,c:0.10},
      ],
      process:"AKD is added to the paper machine wet end at low dosage (0.05–0.2% on fibre). Cationic starch as retention aid fixes AKD to fibres. AKD reacts with cellulose during drying/calendering to form covalent ester bond. Contact us for dosage optimisation and Process Flow Diagram.",
      equipment:["Dosing pump (wet end)","Cobb tester","HST sizing tester","Zeta potential meter"] },
    { id:"sz5", name:"Paper Internal Sizing — ASA (Alkenyl Succinic Anhydride)", sub:"High speed sizing, neutral pH", score:92, tags:["paper","internal sizing","ASA"],
      ingredients:[
        {n:"ASA Emulsion (freshly prepared, 10% active)",p:0.30,c:350},
        {n:"Cationic Starch",                           p:0.50,c:120},
        {n:"Water (wet end make-up)",                   p:99.20,c:0.10},
      ],
      process:"ASA must be emulsified fresh immediately before addition to the paper machine (30 min shelf life maximum). Emulsified using cationic starch in high-shear emulsifier inline. More reactive than AKD — faster sizing development. Contact us for dosage and process guidance.",
      equipment:["Inline ASA emulsifier","Dosing pump","Cobb tester","HST tester"] },
    { id:"sz6", name:"Textile Finish — Softener (Cationic)", sub:"After-treatment, fabric softness and drape", score:87, tags:["textile","softener","cationic"],
      ingredients:[
        {n:"Distearyldimethyl Ammonium Chloride 75%",p:8,c:180},
        {n:"Cetyl Alcohol",                          p:2,c:180},
        {n:"Water (DM)",                             p:87,c:0.10},
        {n:"Acetic Acid (pH adjustment)",            p:0.50,c:60},
        {n:"Silicone Emulsion (amino-functional)",   p:2,c:400},
        {n:"Preservative",                           p:0.20,c:350},
      ],
      process:"Cationic softener emulsion prepared by melting DSDMAC + cetyl alcohol at 70 °C, then emulsifying into hot water under high shear. Silicone emulsion added after cooling to 40 °C. pH adjusted to 4.5–5.5 with acetic acid. Applied by exhaust or pad process. Contact us for Process Flow Diagram.",
      equipment:["Jacketed homogeniser","pH meter","Conditioning evaluation","Hand evaluation panel"] },
    { id:"sz7", name:"Textile Sizing — CMC / MHEC Blend", sub:"Synthetic sizing, polyester / cotton blends", score:85, tags:["textile","CMC","MHEC","sizing"],
      ingredients:[
        {n:"CMC (DS 0.7, medium viscosity)",  p:5,  c:90},
        {n:"MHEC (viscosity 15000 cps)",      p:2,  c:275},
        {n:"Water (DM)",                      p:88, c:0.10},
        {n:"Lubricant (Tallow / PE wax)",     p:2,  c:50},
        {n:"Antistatic Agent",               p:0.50,c:180},
        {n:"Preservative",                    p:0.10,c:350},
      ],
      process:"CMC and MHEC dissolved sequentially in hot water (80 °C) to form a stable viscous solution. Lubricant and antistatic added at 60 °C. Applied on sizing machine. Offers excellent film formation with easy desizing (water soluble). Contact us for Process Flow Diagram.",
      equipment:["SS dissolution tank","Sizing machine","Viscometer","Film strength tester"] },
  ],

  pharma:[
    { id:"ph1", name:"ABACAVIR SULFATE", sub:"Antiviral — HIV/AIDS", score:90, tags:["ANTIVIRAL","API","Pharma"], free:true, pharma:true,
      description:"Nucleoside reverse transcriptase inhibitor (NRTI). Used in HIV treatment as part of combination antiretroviral therapy.",
      ingredients:[{n:"ABACAVIR SULFATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph2", name:"ABAFUNGIN", sub:"Antifungal", score:90, tags:["ANTIVIRAL","API","Pharma"], free:true, pharma:true,
      description:"Topical antifungal for dermatophytosis and candidiasis.",
      ingredients:[{n:"ABAFUNGIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph3", name:"ABANOQUIL MESYLATE", sub:"Alpha-1 blocker", score:90, tags:["OTHER","API","Pharma"], free:true, pharma:true,
      description:"Selective alpha-1 adrenoceptor antagonist.",
      ingredients:[{n:"ABANOQUIL MESYLATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph4", name:"ABARELIX", sub:"GnRH antagonist — Prostate cancer", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Gonadotropin-releasing hormone receptor antagonist used in advanced prostate cancer.",
      ingredients:[{n:"ABARELIX API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph5", name:"ABIRATERONE", sub:"Anticancer — Prostate", score:90, tags:["BONE / OSTEOPOROSIS","API","Pharma"], free:false, pharma:true,
      description:"CYP17A1 inhibitor. Reduces androgen synthesis in castration-resistant prostate cancer.",
      ingredients:[{n:"ABIRATERONE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph6", name:"ACAMPROSATE CALCIUM", sub:"CNS — Alcohol dependence", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"GABA agonist / glutamate antagonist. Reduces cravings in alcohol dependence.",
      ingredients:[{n:"ACAMPROSATE CALCIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph7", name:"ACARBOSE", sub:"Antidiabetic", score:90, tags:["DIABETES / METABOLIC","API","Pharma"], free:false, pharma:true,
      description:"Alpha-glucosidase inhibitor. Slows carbohydrate absorption, reduces post-meal blood glucose.",
      ingredients:[{n:"ACARBOSE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph8", name:"ACEBUTOLOL", sub:"Beta-blocker — Cardiovascular", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Cardioselective beta-1 adrenergic blocker for hypertension and arrhythmia.",
      ingredients:[{n:"ACEBUTOLOL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph9", name:"ACECLOFENAC", sub:"NSAID — Anti-inflammatory", score:90, tags:["ANTI-INFLAMMATORY / ANALGESIC","API","Pharma"], free:false, pharma:true,
      description:"COX inhibitor with better GI tolerability than diclofenac. Used for osteoarthritis and rheumatoid arthritis.",
      ingredients:[{n:"ACECLOFENAC API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph10", name:"ACITRETIN", sub:"Retinoid — Dermatology", score:90, tags:["DERMATOLOGY","API","Pharma"], free:false, pharma:true,
      description:"Oral retinoid for severe psoriasis and other keratinization disorders.",
      ingredients:[{n:"ACITRETIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph11", name:"ADAPALENE", sub:"Retinoid — Acne", score:90, tags:["DERMATOLOGY","API","Pharma"], free:false, pharma:true,
      description:"Topical retinoid for acne vulgaris. Modulates follicular epithelial differentiation.",
      ingredients:[{n:"ADAPALENE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph12", name:"ALBENDAZOLE", sub:"Anthelmintic", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Broad-spectrum benzimidazole anthelmintic for roundworm, tapeworm, and hydatid disease.",
      ingredients:[{n:"ALBENDAZOLE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph13", name:"ALBUTEROL", sub:"Beta-2 agonist — Respiratory", score:90, tags:["RESPIRATORY","API","Pharma"], free:false, pharma:true,
      description:"Short-acting beta-2 adrenergic agonist bronchodilator for asthma and COPD.",
      ingredients:[{n:"ALBUTEROL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph14", name:"ALENDRONATE SODIUM TRIHYDRATE", sub:"Bisphosphonate — Osteoporosis", score:90, tags:["BONE / OSTEOPOROSIS","API","Pharma"], free:false, pharma:true,
      description:"Inhibits osteoclast-mediated bone resorption. First-line for osteoporosis.",
      ingredients:[{n:"ALENDRONATE SODIUM TRIHYDRATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph15", name:"ALOSETRON HYDROCHLORIDE", sub:"5-HT3 antagonist — GI", score:90, tags:["GI / GASTROENTEROLOGY","API","Pharma"], free:false, pharma:true,
      description:"Selective 5-HT3 receptor antagonist for severe diarrhoea-predominant IBS in women.",
      ingredients:[{n:"ALOSETRON HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph16", name:"AMIFOSTINE", sub:"Cytoprotective agent", score:90, tags:["IMMUNOLOGY","API","Pharma"], free:false, pharma:true,
      description:"Organic thiophosphate prodrug. Protects normal tissues from cisplatin and radiation damage.",
      ingredients:[{n:"AMIFOSTINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph17", name:"AMLODIPINE BESYLATE", sub:"Calcium channel blocker — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Dihydropyridine CCB for hypertension and angina. Long half-life, once daily dosing.",
      ingredients:[{n:"AMLODIPINE BESYLATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph18", name:"AMOXICILLIN", sub:"Beta-lactam antibiotic", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Broad-spectrum aminopenicillin. First-line for respiratory, urinary, and ENT infections.",
      ingredients:[{n:"AMOXICILLIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph19", name:"ANAGRELIDE HYDROCHLORIDE", sub:"Platelet-reducing agent", score:90, tags:["IMMUNOLOGY","API","Pharma"], free:false, pharma:true,
      description:"Inhibits platelet aggregation and reduces platelet count in essential thrombocythaemia.",
      ingredients:[{n:"ANAGRELIDE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph20", name:"ANASTRAZOLE", sub:"Aromatase inhibitor — Breast cancer", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Non-steroidal aromatase inhibitor. First-line for hormone receptor-positive breast cancer in postmenopausal women.",
      ingredients:[{n:"ANASTRAZOLE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph21", name:"ARIPIPRAZOLE", sub:"Atypical antipsychotic", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Partial D2/D3 dopamine agonist and 5-HT1A agonist. For schizophrenia and bipolar disorder.",
      ingredients:[{n:"ARIPIPRAZOLE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph22", name:"ATORVASTATIN CALCIUM", sub:"Statin — Lipid lowering", score:90, tags:["LIPID LOWERING","API","Pharma"], free:false, pharma:true,
      description:"HMG-CoA reductase inhibitor. Most widely used statin for hypercholesterolaemia and CVD prevention.",
      ingredients:[{n:"ATORVASTATIN CALCIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph23", name:"ATOSIBAN", sub:"Oxytocin antagonist — Tocolytic", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Competitive oxytocin/vasopressin receptor antagonist. Delays premature labour.",
      ingredients:[{n:"ATOSIBAN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph24", name:"AZACITIDINE", sub:"Antineoplastic — DNA methylation", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Pyrimidine nucleoside analogue. Hypomethylating agent for myelodysplastic syndrome.",
      ingredients:[{n:"AZACITIDINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph25", name:"BECLOMETHASONE DIPROPIONATE", sub:"Corticosteroid — Respiratory", score:90, tags:["RESPIRATORY","API","Pharma"], free:false, pharma:true,
      description:"Inhaled glucocorticoid for asthma and allergic rhinitis. Anti-inflammatory in airways.",
      ingredients:[{n:"BECLOMETHASONE DIPROPIONATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph26", name:"BENAZEPRIL HYDROCHLORIDE", sub:"ACE inhibitor — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Inhibits angiotensin-converting enzyme. Used for hypertension and heart failure.",
      ingredients:[{n:"BENAZEPRIL HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph27", name:"BICALUTAMIDE", sub:"Antiandrogen — Prostate cancer", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Non-steroidal androgen receptor antagonist for localised and advanced prostate cancer.",
      ingredients:[{n:"BICALUTAMIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph28", name:"BIVALIRUDIN", sub:"Direct thrombin inhibitor", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Synthetic analogue of hirudin. Anticoagulant for PCI and HIT.",
      ingredients:[{n:"BIVALIRUDIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph29", name:"BOSENTAN", sub:"Endothelin receptor antagonist", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Dual ETA/ETB antagonist for pulmonary arterial hypertension.",
      ingredients:[{n:"BOSENTAN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph30", name:"BUDESONIDE", sub:"Corticosteroid — Respiratory/GI", score:90, tags:["RESPIRATORY","API","Pharma"], free:false, pharma:true,
      description:"Inhaled corticosteroid for asthma/COPD; oral formulation for Crohn\'s disease.",
      ingredients:[{n:"BUDESONIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph31", name:"BUPROPION HYDROCHLORIDE", sub:"Antidepressant / Smoking cessation", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"NDRI — norepinephrine-dopamine reuptake inhibitor. For depression and nicotine dependence.",
      ingredients:[{n:"BUPROPION HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph32", name:"CALCIPOTRIOL", sub:"Vitamin D analogue — Dermatology", score:90, tags:["DERMATOLOGY","API","Pharma"], free:false, pharma:true,
      description:"Synthetic Vitamin D3 analogue for plaque psoriasis. Inhibits keratinocyte proliferation.",
      ingredients:[{n:"CALCIPOTRIOL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph33", name:"CALCITONIN", sub:"Hormone — Bone metabolism", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Peptide hormone that inhibits osteoclast activity. For Paget\'s disease and hypercalcaemia.",
      ingredients:[{n:"CALCITONIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph34", name:"CANDESARTAN CILEXETIL", sub:"ARB — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Angiotensin II type 1 receptor blocker. Prodrug. For hypertension and heart failure.",
      ingredients:[{n:"CANDESARTAN CILEXETIL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph35", name:"CAPECITABINE", sub:"Antineoplastic — Oral", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Oral fluoropyrimidine prodrug of 5-FU. For colorectal and breast cancer.",
      ingredients:[{n:"CAPECITABINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph36", name:"CARBIDOPA", sub:"Decarboxylase inhibitor — Parkinson\'s", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Combined with levodopa to reduce peripheral conversion and side effects in Parkinson\'s.",
      ingredients:[{n:"CARBIDOPA API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph37", name:"CARBOPLATIN", sub:"Platinum antineoplastic", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"DNA crosslinking agent. Less toxic alternative to cisplatin for ovarian, lung, and head/neck cancers.",
      ingredients:[{n:"CARBOPLATIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph38", name:"CARVEDILOL", sub:"Alpha/Beta blocker — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Non-selective beta and alpha-1 adrenergic antagonist. For heart failure, hypertension.",
      ingredients:[{n:"CARVEDILOL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph39", name:"CEFACLOR", sub:"2nd generation cephalosporin", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Beta-lactam antibiotic for respiratory, urinary tract, and skin infections.",
      ingredients:[{n:"CEFACLOR API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph40", name:"CEFADROXIL", sub:"1st generation cephalosporin", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Oral beta-lactam. Long half-life, once-daily dosing for skin and UTI.",
      ingredients:[{n:"CEFADROXIL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph41", name:"CEFDINIR", sub:"3rd generation cephalosporin", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Broad-spectrum oral cephalosporin for community-acquired pneumonia and ENT infections.",
      ingredients:[{n:"CEFDINIR API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph42", name:"CEFPODOXIME PROXETIL", sub:"3rd generation cephalosporin — oral", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Prodrug. For respiratory and urinary tract infections.",
      ingredients:[{n:"CEFPODOXIME PROXETIL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph43", name:"CEFPROZIL", sub:"2nd generation cephalosporin", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Oral cephalosporin for upper and lower respiratory tract infections.",
      ingredients:[{n:"CEFPROZIL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph44", name:"CEFTRIAXONE SODIUM", sub:"3rd generation cephalosporin — IV", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Parenteral broad-spectrum. For meningitis, sepsis, gonorrhoea. Once daily IV/IM.",
      ingredients:[{n:"CEFTRIAXONE SODIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph45", name:"CEFUROXIME", sub:"2nd generation cephalosporin", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Parenteral and oral forms. For pneumonia, meningitis, Lyme disease.",
      ingredients:[{n:"CEFUROXIME API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph46", name:"CELECOXIB", sub:"COX-2 inhibitor — NSAID", score:90, tags:["ANTI-INFLAMMATORY / ANALGESIC","API","Pharma"], free:false, pharma:true,
      description:"Selective cyclooxygenase-2 inhibitor. For arthritis with reduced GI side effects.",
      ingredients:[{n:"CELECOXIB API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph47", name:"CELIPROLOL", sub:"Beta-1 blocker — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Cardioselective beta blocker with mild beta-2 agonist activity. For hypertension.",
      ingredients:[{n:"CELIPROLOL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph48", name:"CEPHALEXIN", sub:"1st generation cephalosporin", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Oral broad-spectrum for skin, urinary, and respiratory infections.",
      ingredients:[{n:"CEPHALEXIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph49", name:"CETIRIZINE DIHYDROCHLORIDE", sub:"Antihistamine — 2nd generation", score:90, tags:["ANTIHISTAMINE / ALLERGY","API","Pharma"], free:false, pharma:true,
      description:"Selective H1 receptor antagonist. Non-sedating. For allergic rhinitis and urticaria.",
      ingredients:[{n:"CETIRIZINE DIHYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph50", name:"CIPROFLOXACIN", sub:"Fluoroquinolone antibiotic", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Broad-spectrum DNA gyrase inhibitor. For GI, urinary, respiratory, and bone infections.",
      ingredients:[{n:"CIPROFLOXACIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph51", name:"CISPLATIN", sub:"Platinum antineoplastic", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"DNA crosslinking agent. For testicular, ovarian, bladder, and head/neck cancers.",
      ingredients:[{n:"CISPLATIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph52", name:"CITALOPRAM HYDROBROMIDE", sub:"SSRI antidepressant", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Highly selective serotonin reuptake inhibitor. For depression and anxiety disorders.",
      ingredients:[{n:"CITALOPRAM HYDROBROMIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph53", name:"CLARITHROMYCIN", sub:"Macrolide antibiotic", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Semisynthetic macrolide. For H. pylori eradication, respiratory, and atypical infections.",
      ingredients:[{n:"CLARITHROMYCIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph54", name:"CLOMIPRAMINE", sub:"Tricyclic antidepressant", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"TCA with strong serotonin reuptake inhibition. For OCD, depression, panic disorder.",
      ingredients:[{n:"CLOMIPRAMINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph55", name:"CLONAZEPAM", sub:"Benzodiazepine — Anticonvulsant", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Enhances GABA. For epilepsy, panic disorder, and restless leg syndrome.",
      ingredients:[{n:"CLONAZEPAM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph56", name:"CLOPIDOGREL SULFATE", sub:"Antiplatelet", score:90, tags:["Pharmaceutical","API","Pharma"], free:false, pharma:true,
      description:"Prodrug — P2Y12 ADP receptor antagonist. Prevents platelet aggregation in ACS and stroke.",
      ingredients:[{n:"CLOPIDOGREL SULFATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph57", name:"CLORAZEPATE DIPOTASSIUM", sub:"Benzodiazepine — Anxiolytic", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"GABA potentiator. For anxiety and alcohol withdrawal.",
      ingredients:[{n:"CLORAZEPATE DIPOTASSIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph58", name:"CYPROTERONE ACETATE", sub:"Antiandrogen / Progestogen", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Androgen receptor blocker and progestogen. For prostate cancer and hirsutism.",
      ingredients:[{n:"CYPROTERONE ACETATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph59", name:"DANAZOL", sub:"Androgen — Endocrinology", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Synthetic androgen with antigonadotropic activity. For endometriosis and fibrocystic breast.",
      ingredients:[{n:"DANAZOL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph60", name:"DESLORATADINE", sub:"Antihistamine — 2nd generation", score:90, tags:["ANTIHISTAMINE / ALLERGY","API","Pharma"], free:false, pharma:true,
      description:"Active metabolite of loratadine. Non-sedating H1 antagonist for allergic rhinitis.",
      ingredients:[{n:"DESLORATADINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph61", name:"DESMOPRESSIN", sub:"ADH analogue — Hormone", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Synthetic vasopressin analogue. For diabetes insipidus and nocturnal enuresis.",
      ingredients:[{n:"DESMOPRESSIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph62", name:"DILTIAZEM HYDROCHLORIDE", sub:"Non-dihydropyridine CCB — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Calcium channel blocker. For angina, hypertension, and supraventricular arrhythmias.",
      ingredients:[{n:"DILTIAZEM HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph63", name:"DIVALPROEX SODIUM", sub:"Anticonvulsant / Mood stabiliser", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Valproic acid prodrug. For epilepsy, bipolar disorder, and migraine prevention.",
      ingredients:[{n:"DIVALPROEX SODIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph64", name:"DOBUTAMINE", sub:"Inotrope — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Beta-1 adrenergic agonist. Positive inotrope for acute heart failure.",
      ingredients:[{n:"DOBUTAMINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph65", name:"DOCETAXEL", sub:"Taxane antineoplastic", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Promotes microtubule assembly, inhibits depolymerisation. For breast, lung, and prostate cancer.",
      ingredients:[{n:"DOCETAXEL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph66", name:"DONEPEZIL HYDROCHLORIDE", sub:"Acetylcholinesterase inhibitor — CNS", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Reversible AChE inhibitor. First-line for mild-to-moderate Alzheimer\'s disease.",
      ingredients:[{n:"DONEPEZIL HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph67", name:"DOXAZOSIN MESYLATE", sub:"Alpha-1 blocker — CVS/Urology", score:90, tags:["OTHER","API","Pharma"], free:false, pharma:true,
      description:"Selective alpha-1 adrenoceptor antagonist. For hypertension and benign prostatic hyperplasia.",
      ingredients:[{n:"DOXAZOSIN MESYLATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph68", name:"DOXERCALCIFEROL", sub:"Vitamin D analogue", score:90, tags:["BONE / OSTEOPOROSIS","API","Pharma"], free:false, pharma:true,
      description:"Synthetic Vitamin D2 analogue. For secondary hyperparathyroidism in chronic kidney disease.",
      ingredients:[{n:"DOXERCALCIFEROL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph69", name:"DOXYCYCLINE", sub:"Tetracycline antibiotic", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Broad-spectrum bacteriostatic. For chlamydia, malaria prophylaxis, acne, and Lyme disease.",
      ingredients:[{n:"DOXYCYCLINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph70", name:"DROSPIRENONE", sub:"Progestogen — Contraception", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Spironolactone-derived progestogen. In combined oral contraceptives.",
      ingredients:[{n:"DROSPIRENONE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph71", name:"DYDROGESTERONE", sub:"Progestogen — Hormonal", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Retroprogesterone. For dysmenorrhoea, endometriosis, and luteal phase support.",
      ingredients:[{n:"DYDROGESTERONE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph72", name:"EFAVIRENZ", sub:"NNRTI — HIV", score:90, tags:["ANTIVIRAL","API","Pharma"], free:false, pharma:true,
      description:"Non-nucleoside reverse transcriptase inhibitor. Once-daily HIV treatment, part of first-line regimens.",
      ingredients:[{n:"EFAVIRENZ API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph73", name:"ENTACAPONE", sub:"COMT inhibitor — Parkinson\'s", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Catechol-O-methyltransferase inhibitor. Adjunct to levodopa/carbidopa in Parkinson\'s.",
      ingredients:[{n:"ENTACAPONE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph74", name:"EPINEPHRINE", sub:"Catecholamine — Emergency", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Alpha and beta adrenergic agonist. For anaphylaxis, cardiac arrest, and severe asthma.",
      ingredients:[{n:"EPINEPHRINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph75", name:"EPOPROSTENOL SODIUM", sub:"Prostacyclin — PAH", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Potent vasodilator and platelet aggregation inhibitor. For pulmonary arterial hypertension.",
      ingredients:[{n:"EPOPROSTENOL SODIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph76", name:"ETHAMBUTOL HYDROCHLORIDE", sub:"Antitubercular", score:90, tags:["Pharmaceutical","API","Pharma"], free:false, pharma:true,
      description:"Inhibits arabinosyl transferase in mycobacterial cell wall synthesis. Part of TB regimen.",
      ingredients:[{n:"ETHAMBUTOL HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph77", name:"ETHINYLESTRADIOL", sub:"Synthetic oestrogen", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Used in combined oral contraceptives and hormone replacement therapy.",
      ingredients:[{n:"ETHINYLESTRADIOL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph78", name:"ETOPOSIDE", sub:"Topoisomerase II inhibitor", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Semisynthetic podophyllotoxin derivative. For lung, testicular, and lymphoma cancers.",
      ingredients:[{n:"ETOPOSIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph79", name:"EXEMESTANE", sub:"Aromatase inhibitor — Breast cancer", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Steroidal aromatase inactivator. For hormone receptor-positive breast cancer.",
      ingredients:[{n:"EXEMESTANE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph80", name:"FELODIPINE", sub:"Dihydropyridine CCB — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Vascular-selective calcium channel blocker. For hypertension and angina.",
      ingredients:[{n:"FELODIPINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph81", name:"FENOFIBRATE", sub:"Fibrate — Lipid lowering", score:90, tags:["LIPID LOWERING","API","Pharma"], free:false, pharma:true,
      description:"PPARalpha activator. Reduces triglycerides and increases HDL cholesterol.",
      ingredients:[{n:"FENOFIBRATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph82", name:"FEXOFENADINE HYDROCHLORIDE", sub:"Antihistamine — 2nd generation", score:90, tags:["ANTIHISTAMINE / ALLERGY","API","Pharma"], free:false, pharma:true,
      description:"Non-sedating H1 antagonist. Active metabolite of terfenadine. For seasonal allergic rhinitis.",
      ingredients:[{n:"FEXOFENADINE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph83", name:"FINASTERIDE", sub:"5-alpha reductase inhibitor", score:90, tags:["UROLOGY","API","Pharma"], free:false, pharma:true,
      description:"Inhibits conversion of testosterone to DHT. For BPH and androgenetic alopecia.",
      ingredients:[{n:"FINASTERIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph84", name:"FLUCONAZOLE", sub:"Triazole antifungal", score:90, tags:["ANTIVIRAL","API","Pharma"], free:false, pharma:true,
      description:"CYP51 inhibitor — blocks ergosterol synthesis. For candidiasis and cryptococcal meningitis.",
      ingredients:[{n:"FLUCONAZOLE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph85", name:"FLURBIPROFEN", sub:"NSAID — Anti-inflammatory", score:90, tags:["ANTI-INFLAMMATORY / ANALGESIC","API","Pharma"], free:false, pharma:true,
      description:"COX inhibitor. For arthritis, dysmenorrhoea, and topical ocular inflammation.",
      ingredients:[{n:"FLURBIPROFEN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph86", name:"FLUTAMIDE", sub:"Antiandrogen — Prostate cancer", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Non-steroidal androgen receptor antagonist. For prostate cancer.",
      ingredients:[{n:"FLUTAMIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph87", name:"FLUTICASONE PROPIONATE", sub:"Corticosteroid — Respiratory", score:90, tags:["RESPIRATORY","API","Pharma"], free:false, pharma:true,
      description:"Potent inhaled glucocorticoid. For asthma, COPD, and allergic rhinitis.",
      ingredients:[{n:"FLUTICASONE PROPIONATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph88", name:"FLUVASTATIN SODIUM", sub:"Statin — Lipid lowering", score:90, tags:["LIPID LOWERING","API","Pharma"], free:false, pharma:true,
      description:"HMG-CoA reductase inhibitor. For hypercholesterolaemia and CVD prevention.",
      ingredients:[{n:"FLUVASTATIN SODIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph89", name:"FLUVOXAMINE MALEATE", sub:"SSRI — CNS", score:90, tags:["OTHER","API","Pharma"], free:false, pharma:true,
      description:"Selective serotonin reuptake inhibitor. For OCD and social anxiety disorder.",
      ingredients:[{n:"FLUVOXAMINE MALEATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph90", name:"FOSINOPRIL SODIUM", sub:"ACE inhibitor — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Phosphonate-containing ACE inhibitor. For hypertension and heart failure.",
      ingredients:[{n:"FOSINOPRIL SODIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph91", name:"FOSPHENYTOIN SODIUM", sub:"Anticonvulsant — IV", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Prodrug of phenytoin. For status epilepticus and seizure prophylaxis.",
      ingredients:[{n:"FOSPHENYTOIN SODIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph92", name:"GABAPENTIN", sub:"Anticonvulsant / Analgesic", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"GABA analogue. For focal seizures, neuropathic pain, and restless legs.",
      ingredients:[{n:"GABAPENTIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph93", name:"GALANTAMINE", sub:"AChE inhibitor — CNS", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Reversible AChE inhibitor with allosteric nicotinic modulation. For Alzheimer\'s disease.",
      ingredients:[{n:"GALANTAMINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph94", name:"GANIRELIX ACETATE", sub:"GnRH antagonist — Reproductive", score:90, tags:["IMMUNOLOGY","API","Pharma"], free:false, pharma:true,
      description:"Synthetic GnRH antagonist. Prevents premature LH surge in controlled ovarian hyperstimulation.",
      ingredients:[{n:"GANIRELIX ACETATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph95", name:"GEMCITABINE", sub:"Antimetabolite antineoplastic", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Nucleoside analogue. For pancreatic, lung, bladder, and breast cancer.",
      ingredients:[{n:"GEMCITABINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph96", name:"GLATIRAMER ACETATE", sub:"Immunomodulator — MS", score:90, tags:["ANTIVIRAL","API","Pharma"], free:false, pharma:true,
      description:"Synthetic peptide mixture. Modifies immune response in relapsing-remitting multiple sclerosis.",
      ingredients:[{n:"GLATIRAMER ACETATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph97", name:"GLYCOPYRROLATE", sub:"Anticholinergic — Respiratory", score:90, tags:["RESPIRATORY","API","Pharma"], free:false, pharma:true,
      description:"Quaternary ammonium muscarinic antagonist. For COPD and hyperhidrosis.",
      ingredients:[{n:"GLYCOPYRROLATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph98", name:"GRANISETRON HYDROCHLORIDE", sub:"5-HT3 antagonist — Antiemetic", score:90, tags:["GI / GASTROENTEROLOGY","API","Pharma"], free:false, pharma:true,
      description:"Selective serotonin 5-HT3 receptor antagonist. For chemotherapy-induced nausea and vomiting.",
      ingredients:[{n:"GRANISETRON HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph99", name:"IMIPENEM", sub:"Carbapenem antibiotic", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Broad-spectrum beta-lactam for severe nosocomial infections including MDR organisms.",
      ingredients:[{n:"IMIPENEM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph100", name:"IOPAMIDOL", sub:"Iodinated contrast agent", score:90, tags:["OTHER","API","Pharma"], free:false, pharma:true,
      description:"Non-ionic, water-soluble iodinated contrast medium for CT, angiography, and myelography.",
      ingredients:[{n:"IOPAMIDOL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph101", name:"IPRATROPIUM BROMIDE", sub:"Anticholinergic bronchodilator", score:90, tags:["RESPIRATORY","API","Pharma"], free:false, pharma:true,
      description:"Muscarinic antagonist. Short-acting bronchodilator for COPD and acute severe asthma.",
      ingredients:[{n:"IPRATROPIUM BROMIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph102", name:"IRBESARTAN", sub:"ARB — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Angiotensin II receptor blocker. For hypertension and diabetic nephropathy.",
      ingredients:[{n:"IRBESARTAN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph103", name:"IRINOTECAN HYDROCHLORIDE", sub:"Topoisomerase I inhibitor", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Camptothecin analogue. For colorectal cancer, often combined with 5-FU.",
      ingredients:[{n:"IRINOTECAN HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph104", name:"ISOTRETINOIN", sub:"Retinoid — Dermatology", score:90, tags:["DERMATOLOGY","API","Pharma"], free:false, pharma:true,
      description:"Oral retinoid. For severe nodular acne. Reduces sebum production and normalises keratinisation.",
      ingredients:[{n:"ISOTRETINOIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph105", name:"LAMIVUDINE", sub:"NRTI — HIV/HBV", score:90, tags:["ANTIVIRAL","API","Pharma"], free:false, pharma:true,
      description:"Nucleoside reverse transcriptase inhibitor. For HIV and chronic hepatitis B.",
      ingredients:[{n:"LAMIVUDINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph106", name:"LAMOTRIGINE", sub:"Anticonvulsant — CNS", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Sodium channel blocker. For focal and generalised epilepsy and bipolar disorder.",
      ingredients:[{n:"LAMOTRIGINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph107", name:"LANSOPRAZOLE", sub:"PPI — GI", score:90, tags:["GI / GASTROENTEROLOGY","API","Pharma"], free:false, pharma:true,
      description:"Proton pump inhibitor. For peptic ulcer, GERD, and H. pylori eradication.",
      ingredients:[{n:"LANSOPRAZOLE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph108", name:"LEFLUNOMIDE", sub:"DMARD — Rheumatology", score:90, tags:["Pharmaceutical","API","Pharma"], free:false, pharma:true,
      description:"Pyrimidine synthesis inhibitor. For rheumatoid and psoriatic arthritis.",
      ingredients:[{n:"LEFLUNOMIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph109", name:"LETROZOLE", sub:"Aromatase inhibitor — Breast cancer", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Non-steroidal aromatase inhibitor. For hormone-positive breast cancer and ovulation induction.",
      ingredients:[{n:"LETROZOLE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph110", name:"LEUPROLIDE ACETATE", sub:"GnRH agonist", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Long-acting GnRH agonist. For prostate cancer, endometriosis, and uterine fibroids.",
      ingredients:[{n:"LEUPROLIDE ACETATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph111", name:"LEVALBUTEROL HYDROCHLORIDE", sub:"R-Albuterol — Respiratory", score:90, tags:["RESPIRATORY","API","Pharma"], free:false, pharma:true,
      description:"Active enantiomer of albuterol. Short-acting beta-2 agonist bronchodilator.",
      ingredients:[{n:"LEVALBUTEROL HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph112", name:"LEVETIRACETAM", sub:"Anticonvulsant", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"SV2A synaptic protein modulator. For focal and generalised epilepsy.",
      ingredients:[{n:"LEVETIRACETAM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph113", name:"LEVODOPA", sub:"Dopamine precursor — Parkinson\'s", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Primary treatment for Parkinson\'s disease. Converted to dopamine in the brain.",
      ingredients:[{n:"LEVODOPA API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph114", name:"LEVOFLOXACIN", sub:"Fluoroquinolone antibiotic", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Broad-spectrum. For respiratory, urinary, and skin infections. Active against atypicals.",
      ingredients:[{n:"LEVOFLOXACIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph115", name:"LEVOTHYROXINE SODIUM", sub:"Thyroid hormone", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Synthetic T4. For hypothyroidism and thyroid cancer suppression.",
      ingredients:[{n:"LEVOTHYROXINE SODIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph116", name:"LIOTHYRONINE", sub:"Thyroid hormone T3", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Synthetic T3. For hypothyroidism and myxoedema coma. Faster onset than T4.",
      ingredients:[{n:"LIOTHYRONINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph117", name:"LISINOPRIL", sub:"ACE inhibitor — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Lysine derivative of enalapril. For hypertension, heart failure, and post-MI.",
      ingredients:[{n:"LISINOPRIL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph118", name:"LOPINAVIR", sub:"Protease inhibitor — HIV", score:90, tags:["ANTIVIRAL","API","Pharma"], free:false, pharma:true,
      description:"HIV aspartyl protease inhibitor. Used in combination with ritonavir (lopinavir/ritonavir).",
      ingredients:[{n:"LOPINAVIR API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph119", name:"LORATADINE", sub:"Antihistamine — 2nd generation", score:90, tags:["ANTIHISTAMINE / ALLERGY","API","Pharma"], free:false, pharma:true,
      description:"Non-sedating H1 antagonist. For allergic rhinitis and urticaria.",
      ingredients:[{n:"LORATADINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph120", name:"LORAZEPAM", sub:"Benzodiazepine — CNS", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"GABA potentiator. For anxiety, status epilepticus, and pre-operative sedation.",
      ingredients:[{n:"LORAZEPAM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph121", name:"LOSARTAN POTASSIUM", sub:"ARB — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"First ARB approved. For hypertension, diabetic nephropathy, and heart failure.",
      ingredients:[{n:"LOSARTAN POTASSIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph122", name:"LOTEPREDNOL ETABONATE", sub:"Corticosteroid — Ophthalmic", score:90, tags:["OTHER","API","Pharma"], free:false, pharma:true,
      description:"Soft corticosteroid for ocular inflammation and allergic conjunctivitis.",
      ingredients:[{n:"LOTEPREDNOL ETABONATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph123", name:"MEBENDAZOLE", sub:"Anthelmintic", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Tubulin polymerisation inhibitor. For intestinal nematodes including threadworm and hookworm.",
      ingredients:[{n:"MEBENDAZOLE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph124", name:"MELOXICAM", sub:"COX-2 preferential NSAID", score:90, tags:["ANTI-INFLAMMATORY / ANALGESIC","API","Pharma"], free:false, pharma:true,
      description:"Preferential COX-2 inhibitor. For osteoarthritis and rheumatoid arthritis.",
      ingredients:[{n:"MELOXICAM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph125", name:"MEMANTINE", sub:"NMDA antagonist — CNS", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Uncompetitive NMDA receptor antagonist. For moderate-to-severe Alzheimer\'s disease.",
      ingredients:[{n:"MEMANTINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph126", name:"MEROPENEM", sub:"Carbapenem antibiotic", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Ultra-broad spectrum. For severe hospital-acquired and polymicrobial infections.",
      ingredients:[{n:"MEROPENEM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph127", name:"MESALAMINE", sub:"Aminosalicylate — GI", score:90, tags:["GI / GASTROENTEROLOGY","API","Pharma"], free:false, pharma:true,
      description:"5-ASA. Anti-inflammatory in colonic mucosa. For ulcerative colitis and Crohn\'s disease.",
      ingredients:[{n:"MESALAMINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph128", name:"METAXALONE", sub:"Muscle relaxant", score:90, tags:["OTHER","API","Pharma"], free:false, pharma:true,
      description:"CNS muscle relaxant. Mechanism not fully established. For acute musculoskeletal pain.",
      ingredients:[{n:"METAXALONE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph129", name:"METFORMIN HYDROCHLORIDE", sub:"Biguanide antidiabetic", score:90, tags:["DIABETES / METABOLIC","API","Pharma"], free:false, pharma:true,
      description:"Reduces hepatic glucose production. First-line oral antidiabetic for type 2 diabetes.",
      ingredients:[{n:"METFORMIN HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph130", name:"METHYLPHENIDATE HYDROCHLORIDE", sub:"CNS stimulant", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Dopamine/norepinephrine reuptake inhibitor. For ADHD and narcolepsy.",
      ingredients:[{n:"METHYLPHENIDATE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph131", name:"METOPROLOL TARTRATE", sub:"Beta-1 blocker — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Cardioselective beta-1 blocker. For hypertension, angina, and heart failure.",
      ingredients:[{n:"METOPROLOL TARTRATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph132", name:"MIDAZOLAM MALEATE", sub:"Benzodiazepine — Sedation", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Short-acting. For procedural sedation, pre-anaesthetic medication, and status epilepticus.",
      ingredients:[{n:"MIDAZOLAM MALEATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph133", name:"MIFEPRISTONE", sub:"Antiprogestogen", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Progesterone and glucocorticoid receptor antagonist. For medical termination of pregnancy.",
      ingredients:[{n:"MIFEPRISTONE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph134", name:"MIRTAZAPINE", sub:"NaSSA antidepressant", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Noradrenergic and specific serotonergic antidepressant. Alpha-2 antagonist. Sedating.",
      ingredients:[{n:"MIRTAZAPINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph135", name:"MOMETASONE FUROATE", sub:"Corticosteroid — Dermatology/Respiratory", score:90, tags:["DERMATOLOGY","API","Pharma"], free:false, pharma:true,
      description:"Potent topical and inhaled glucocorticoid. For psoriasis, eczema, and asthma.",
      ingredients:[{n:"MOMETASONE FUROATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph136", name:"MONTELUKAST SODIUM", sub:"Leukotriene antagonist — Respiratory", score:90, tags:["RESPIRATORY","API","Pharma"], free:false, pharma:true,
      description:"Selective CysLT1 receptor antagonist. For asthma and allergic rhinitis.",
      ingredients:[{n:"MONTELUKAST SODIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph137", name:"NABUMETONE", sub:"NSAID — Anti-inflammatory", score:90, tags:["ANTI-INFLAMMATORY / ANALGESIC","API","Pharma"], free:false, pharma:true,
      description:"Prodrug converted to active 6-MNA. COX inhibitor for osteoarthritis and rheumatoid arthritis.",
      ingredients:[{n:"NABUMETONE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph138", name:"NALOXONE", sub:"Opioid antagonist — Emergency", score:90, tags:["OTHER","API","Pharma"], free:false, pharma:true,
      description:"Competitive mu-opioid receptor antagonist. Reverses opioid overdose rapidly.",
      ingredients:[{n:"NALOXONE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph139", name:"NALTREXONE", sub:"Opioid antagonist — Addiction", score:90, tags:["OTHER","API","Pharma"], free:false, pharma:true,
      description:"Long-acting mu-opioid antagonist. For opioid and alcohol dependence.",
      ingredients:[{n:"NALTREXONE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph140", name:"NAPROXEN", sub:"NSAID — Anti-inflammatory", score:90, tags:["ANTI-INFLAMMATORY / ANALGESIC","API","Pharma"], free:false, pharma:true,
      description:"Non-selective COX inhibitor with long half-life. For arthritis, dysmenorrhoea, and pain.",
      ingredients:[{n:"NAPROXEN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph141", name:"NARATRIPTAN", sub:"Triptan — Migraine", score:90, tags:["MIGRAINE","API","Pharma"], free:false, pharma:true,
      description:"Selective 5-HT1B/1D receptor agonist. For acute migraine with slower onset but longer duration.",
      ingredients:[{n:"NARATRIPTAN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph142", name:"NEVIRAPINE", sub:"NNRTI — HIV", score:90, tags:["ANTIVIRAL","API","Pharma"], free:false, pharma:true,
      description:"Non-nucleoside reverse transcriptase inhibitor. For HIV in adults and paediatrics.",
      ingredients:[{n:"NEVIRAPINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph143", name:"OCTREOTIDE ACETATE", sub:"Somatostatin analogue", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Long-acting somatostatin analogue. For acromegaly, carcinoid syndrome, and GI bleeding.",
      ingredients:[{n:"OCTREOTIDE ACETATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph144", name:"OFLOXACIN", sub:"Fluoroquinolone antibiotic", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Racemic fluoroquinolone. For urinary, respiratory, and ophthalmic infections.",
      ingredients:[{n:"OFLOXACIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph145", name:"OLANZAPINE", sub:"Atypical antipsychotic", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Thienobenzodiazepine. D2, 5-HT2A, H1 antagonist. For schizophrenia and bipolar disorder.",
      ingredients:[{n:"OLANZAPINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph146", name:"OLOPATADINE", sub:"Antihistamine + Mast cell stabiliser", score:90, tags:["ANTIHISTAMINE / ALLERGY","API","Pharma"], free:false, pharma:true,
      description:"Selective H1 antagonist with mast cell stabilising activity. For allergic conjunctivitis.",
      ingredients:[{n:"OLOPATADINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph147", name:"OMEPRAZOLE", sub:"PPI — GI", score:90, tags:["GI / GASTROENTEROLOGY","API","Pharma"], free:false, pharma:true,
      description:"First proton pump inhibitor. Irreversibly inhibits H+/K+-ATPase. For GERD and peptic ulcer.",
      ingredients:[{n:"OMEPRAZOLE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph148", name:"ONDANSETRON HYDROCHLORIDE DIHYDRATE", sub:"5-HT3 antagonist — Antiemetic", score:90, tags:["GI / GASTROENTEROLOGY","API","Pharma"], free:false, pharma:true,
      description:"Selective 5-HT3 antagonist. Gold standard for chemotherapy-induced nausea and vomiting.",
      ingredients:[{n:"ONDANSETRON HYDROCHLORIDE DIHYDRATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph149", name:"OSELTAMIVIR PHOSPHATE", sub:"Neuraminidase inhibitor — Antiviral", score:90, tags:["ANTIVIRAL","API","Pharma"], free:false, pharma:true,
      description:"Inhibits influenza neuraminidase. For treatment and prophylaxis of influenza A and B.",
      ingredients:[{n:"OSELTAMIVIR PHOSPHATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph150", name:"OXETHAZINE", sub:"Local anaesthetic — GI", score:90, tags:["GI / GASTROENTEROLOGY","API","Pharma"], free:false, pharma:true,
      description:"Mucosal local anaesthetic antacid for gastric pain and oesophagitis.",
      ingredients:[{n:"OXETHAZINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph151", name:"PACLITAXEL", sub:"Taxane antineoplastic", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Stabilises microtubules, prevents depolymerisation. For ovarian, breast, and lung cancer.",
      ingredients:[{n:"PACLITAXEL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph152", name:"PAMIDRONATE SODIUM", sub:"Bisphosphonate — Bone", score:90, tags:["BONE / OSTEOPOROSIS","API","Pharma"], free:false, pharma:true,
      description:"IV bisphosphonate for Paget\'s disease, hypercalcaemia of malignancy, and bone metastases.",
      ingredients:[{n:"PAMIDRONATE SODIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph153", name:"PANTOPRAZOLE SODIUM", sub:"PPI — GI", score:90, tags:["GI / GASTROENTEROLOGY","API","Pharma"], free:false, pharma:true,
      description:"Proton pump inhibitor. For GERD, erosive oesophagitis, and Zollinger-Ellison syndrome.",
      ingredients:[{n:"PANTOPRAZOLE SODIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph154", name:"PAROXETINE HYDROCHLORIDE", sub:"SSRI — CNS", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Potent serotonin reuptake inhibitor. For depression, panic disorder, OCD, and PTSD.",
      ingredients:[{n:"PAROXETINE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph155", name:"PENTAZOCINE HYDROCHLORIDE", sub:"Opioid agonist-antagonist — Analgesic", score:90, tags:["ANTI-INFLAMMATORY / ANALGESIC","API","Pharma"], free:false, pharma:true,
      description:"Mixed kappa agonist / mu antagonist. For moderate-to-severe pain.",
      ingredients:[{n:"PENTAZOCINE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph156", name:"PENTOXIFYLLINE", sub:"Xanthine derivative — CVS", score:90, tags:["OTHER","API","Pharma"], free:false, pharma:true,
      description:"Reduces blood viscosity and improves erythrocyte flexibility. For peripheral vascular disease.",
      ingredients:[{n:"PENTOXIFYLLINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph157", name:"PERINDOPRIL ERBUMINE", sub:"ACE inhibitor — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Long-acting ACE inhibitor. For hypertension, stable coronary artery disease, and heart failure.",
      ingredients:[{n:"PERINDOPRIL ERBUMINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph158", name:"PHENTERMINE HYDROCHLORIDE", sub:"Sympathomimetic — Obesity", score:90, tags:["UROLOGY","API","Pharma"], free:false, pharma:true,
      description:"Releases catecholamines, suppresses appetite. Short-term treatment of obesity.",
      ingredients:[{n:"PHENTERMINE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph159", name:"PHENYLEPHRINE HYDROCHLORIDE", sub:"Alpha-1 agonist", score:90, tags:["Pharmaceutical","API","Pharma"], free:false, pharma:true,
      description:"Selective alpha-1 adrenergic agonist. For nasal decongestion and hypotension.",
      ingredients:[{n:"PHENYLEPHRINE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph160", name:"PIOGLITAZONE HYDROCHLORIDE", sub:"Thiazolidinedione antidiabetic", score:90, tags:["DIABETES / METABOLIC","API","Pharma"], free:false, pharma:true,
      description:"PPARgamma agonist. Improves insulin sensitivity in type 2 diabetes.",
      ingredients:[{n:"PIOGLITAZONE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph161", name:"PRAMIPEXOLE DIHYDROCHLORIDE", sub:"Dopamine agonist — Parkinson\'s", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"D2/D3 receptor agonist. For Parkinson\'s disease and restless leg syndrome.",
      ingredients:[{n:"PRAMIPEXOLE DIHYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph162", name:"PRAZIQUANTEL", sub:"Anthelmintic — Cestocide", score:90, tags:["ANTIBIOTIC / ANTIMICROBIAL","API","Pharma"], free:false, pharma:true,
      description:"Increases cell membrane permeability of parasites. For schistosomiasis and tapeworm.",
      ingredients:[{n:"PRAZIQUANTEL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph163", name:"QUETIAPINE FUMARATE", sub:"Atypical antipsychotic", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"D2, 5-HT2A, H1, alpha-1 antagonist. For schizophrenia, bipolar disorder, and MDD.",
      ingredients:[{n:"QUETIAPINE FUMARATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph164", name:"QUINAPRIL HYDROCHLORIDE HYDRATE", sub:"ACE inhibitor — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Prodrug ACE inhibitor. For hypertension and congestive heart failure.",
      ingredients:[{n:"QUINAPRIL HYDROCHLORIDE HYDRATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph165", name:"RABEPRAZOLE", sub:"PPI — GI", score:90, tags:["GI / GASTROENTEROLOGY","API","Pharma"], free:false, pharma:true,
      description:"Proton pump inhibitor. For peptic ulcer and GERD. Faster acid suppression than omeprazole.",
      ingredients:[{n:"RABEPRAZOLE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph166", name:"RAMIPRIL", sub:"ACE inhibitor — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Long-acting ACE inhibitor. Reduces cardiovascular events in high-risk patients (HOPE trial).",
      ingredients:[{n:"RAMIPRIL API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph167", name:"RANITIDINE", sub:"H2 blocker — GI", score:90, tags:["GI / GASTROENTEROLOGY","API","Pharma"], free:false, pharma:true,
      description:"Histamine H2 receptor antagonist. For peptic ulcer and GERD (note: withdrawn in some markets due to NDMA).",
      ingredients:[{n:"RANITIDINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph168", name:"REPAGLINIDE", sub:"Meglitinide antidiabetic", score:90, tags:["DIABETES / METABOLIC","API","Pharma"], free:false, pharma:true,
      description:"Closes pancreatic beta-cell K+ATP channels. Rapid-acting insulin secretagogue.",
      ingredients:[{n:"REPAGLINIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph169", name:"RILUZOLE", sub:"Neuroprotective — ALS", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Glutamate release inhibitor. Only disease-modifying drug approved for ALS/motor neurone disease.",
      ingredients:[{n:"RILUZOLE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph170", name:"RISEDRONATE SODIUM", sub:"Bisphosphonate — Osteoporosis", score:90, tags:["BONE / OSTEOPOROSIS","API","Pharma"], free:false, pharma:true,
      description:"Nitrogen-containing bisphosphonate. For osteoporosis and Paget\'s disease.",
      ingredients:[{n:"RISEDRONATE SODIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph171", name:"RISPERIDONE", sub:"Atypical antipsychotic", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"D2/5-HT2A antagonist. For schizophrenia, bipolar disorder, and irritability in autism.",
      ingredients:[{n:"RISPERIDONE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph172", name:"RITONAVIR", sub:"HIV protease inhibitor", score:90, tags:["ANTIVIRAL","API","Pharma"], free:false, pharma:true,
      description:"Booster dose inhibits CYP3A4, increasing levels of other PIs. Standard pharmacokinetic booster in HIV.",
      ingredients:[{n:"RITONAVIR API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph173", name:"RIZATRIPTAN BENZOATE", sub:"Triptan — Migraine", score:90, tags:["MIGRAINE","API","Pharma"], free:false, pharma:true,
      description:"5-HT1B/1D agonist. Rapid-acting oral triptan for acute migraine.",
      ingredients:[{n:"RIZATRIPTAN BENZOATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph174", name:"SERTRALINE HYDROCHLORIDE", sub:"SSRI — CNS", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Selective serotonin reuptake inhibitor. For depression, OCD, PTSD, and panic disorder.",
      ingredients:[{n:"SERTRALINE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph175", name:"SEVELAMER HYDROCHLORIDE", sub:"Phosphate binder — Renal", score:90, tags:["IMMUNOLOGY","API","Pharma"], free:false, pharma:true,
      description:"Non-absorbed polymer. Binds dietary phosphate in GI tract in chronic kidney disease.",
      ingredients:[{n:"SEVELAMER HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph176", name:"SIMVASTATIN", sub:"Statin — Lipid lowering", score:90, tags:["LIPID LOWERING","API","Pharma"], free:false, pharma:true,
      description:"HMG-CoA reductase inhibitor prodrug. For hypercholesterolaemia and CVD prevention.",
      ingredients:[{n:"SIMVASTATIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph177", name:"SUMATRIPTAN SUCCINATE", sub:"Triptan — Migraine", score:90, tags:["MIGRAINE","API","Pharma"], free:false, pharma:true,
      description:"5-HT1B/1D agonist. First triptan. For acute migraine and cluster headache.",
      ingredients:[{n:"SUMATRIPTAN SUCCINATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph178", name:"TAMSULOSIN HYDROCHLORIDE", sub:"Alpha-1A blocker — Urology", score:90, tags:["UROLOGY","API","Pharma"], free:false, pharma:true,
      description:"Uroselective alpha-1A antagonist. For symptomatic benign prostatic hyperplasia.",
      ingredients:[{n:"TAMSULOSIN HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph179", name:"TEGAFUR", sub:"Antineoplastic — GI", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Prodrug of 5-FU. For gastric, colorectal, and breast cancer.",
      ingredients:[{n:"TEGAFUR API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph180", name:"TELMISARTAN", sub:"ARB — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Angiotensin II receptor blocker. Longest half-life ARB. For hypertension and CV risk reduction.",
      ingredients:[{n:"TELMISARTAN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph181", name:"TEMOZOLOMIDE", sub:"Alkylating antineoplastic", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Imidazotetrazine prodrug. For glioblastoma multiforme and anaplastic astrocytoma.",
      ingredients:[{n:"TEMOZOLOMIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph182", name:"TERBINAFINE HYDROCHLORIDE", sub:"Allylamine antifungal", score:90, tags:["DERMATOLOGY","API","Pharma"], free:false, pharma:true,
      description:"Squalene epoxidase inhibitor. For dermatophytosis and onychomycosis.",
      ingredients:[{n:"TERBINAFINE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph183", name:"TESTOSTERONE CYPIONATE", sub:"Androgen — Hormone replacement", score:90, tags:["HORMONAL / ENDOCRINE","API","Pharma"], free:false, pharma:true,
      description:"Long-acting ester of testosterone. For hypogonadism and androgen deficiency.",
      ingredients:[{n:"TESTOSTERONE CYPIONATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph184", name:"TIAGABINE HYDROCHLORIDE", sub:"GABA reuptake inhibitor — CNS", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Selective GABA transporter 1 (GAT-1) inhibitor. Adjunct for focal seizures.",
      ingredients:[{n:"TIAGABINE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph185", name:"TIZANIDINE HYDROCHLORIDE", sub:"Alpha-2 agonist — Muscle relaxant", score:90, tags:["OTHER","API","Pharma"], free:false, pharma:true,
      description:"Central alpha-2 adrenergic agonist. For spasticity in MS and spinal cord injury.",
      ingredients:[{n:"TIZANIDINE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph186", name:"TOLTERODINE TARTRATE", sub:"Antimuscarinic — Urology", score:90, tags:["UROLOGY","API","Pharma"], free:false, pharma:true,
      description:"Competitive muscarinic receptor antagonist. For overactive bladder.",
      ingredients:[{n:"TOLTERODINE TARTRATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph187", name:"TOPIRAMATE", sub:"Anticonvulsant / Migraine prophylaxis", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Multiple mechanisms: Na+ channel block, GABA enhancement, AMPA/kainate antagonism. For epilepsy and migraine.",
      ingredients:[{n:"TOPIRAMATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph188", name:"TRAMADOL HYDROCHLORIDE", sub:"Opioid analgesic + SNRI", score:90, tags:["ANTI-INFLAMMATORY / ANALGESIC","API","Pharma"], free:false, pharma:true,
      description:"Weak mu-agonist with norepinephrine/serotonin reuptake inhibition. For moderate-to-severe pain.",
      ingredients:[{n:"TRAMADOL HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph189", name:"TRIMETAZIDINE", sub:"Anti-ischaemic — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Fatty acid oxidation inhibitor. Improves myocardial glucose utilisation in angina.",
      ingredients:[{n:"TRIMETAZIDINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph190", name:"TRIPROLIDINE", sub:"Antihistamine — 1st generation", score:90, tags:["ANTIHISTAMINE / ALLERGY","API","Pharma"], free:false, pharma:true,
      description:"H1 receptor antagonist. For allergic rhinitis and common cold. Sedating.",
      ingredients:[{n:"TRIPROLIDINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph191", name:"VALACYCLOVIR", sub:"Antiviral — Herpes", score:90, tags:["ANTIVIRAL","API","Pharma"], free:false, pharma:true,
      description:"Prodrug of acyclovir. Better oral bioavailability. For herpes simplex and zoster.",
      ingredients:[{n:"VALACYCLOVIR API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph192", name:"VALPROATE SODIUM", sub:"Anticonvulsant / Mood stabiliser", score:90, tags:["OTHER","API","Pharma"], free:false, pharma:true,
      description:"Multiple mechanisms. For epilepsy, bipolar disorder, and migraine prophylaxis.",
      ingredients:[{n:"VALPROATE SODIUM API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph193", name:"VALSARTAN", sub:"ARB — CVS", score:90, tags:["CARDIOVASCULAR","API","Pharma"], free:false, pharma:true,
      description:"Angiotensin II receptor blocker. For hypertension, heart failure, and post-MI.",
      ingredients:[{n:"VALSARTAN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph194", name:"VENLAFAXINE HYDROCHLORIDE", sub:"SNRI antidepressant", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Serotonin-norepinephrine reuptake inhibitor. For depression, anxiety, and neuropathic pain.",
      ingredients:[{n:"VENLAFAXINE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph195", name:"VIGABATRIN", sub:"GABA transaminase inhibitor — CNS", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Irreversible GABA-T inhibitor. For infantile spasms and refractory focal epilepsy.",
      ingredients:[{n:"VIGABATRIN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph196", name:"VINBLASTINE SULFATE", sub:"Vinca alkaloid antineoplastic", score:90, tags:["ANTICANCER","API","Pharma"], free:false, pharma:true,
      description:"Inhibits tubulin polymerisation. For Hodgkin\'s lymphoma, testicular, and bladder cancer.",
      ingredients:[{n:"VINBLASTINE SULFATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph197", name:"VITAMIN A", sub:"Fat-soluble vitamin", score:90, tags:["VITAMINS / SUPPLEMENTS","API","Pharma"], free:false, pharma:true,
      description:"Retinol. Essential for vision, immune function, and epithelial integrity. Retinoid prodrug.",
      ingredients:[{n:"VITAMIN A API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph198", name:"VITAMIN E", sub:"Antioxidant vitamin", score:90, tags:["VITAMINS / SUPPLEMENTS","API","Pharma"], free:false, pharma:true,
      description:"Tocopherol. Fat-soluble antioxidant protecting cell membranes from oxidative damage.",
      ingredients:[{n:"VITAMIN E API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph199", name:"VOGLIBOSE", sub:"Alpha-glucosidase inhibitor", score:90, tags:["DIABETES / METABOLIC","API","Pharma"], free:false, pharma:true,
      description:"Inhibits intestinal alpha-glucosidase. For type 2 diabetes and IGT. Minimal systemic absorption.",
      ingredients:[{n:"VOGLIBOSE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph200", name:"VORICONAZOLE", sub:"Triazole antifungal", score:90, tags:["ANTIVIRAL","API","Pharma"], free:false, pharma:true,
      description:"Broad-spectrum. Inhibits ergosterol synthesis. For invasive aspergillosis and candidiasis.",
      ingredients:[{n:"VORICONAZOLE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph201", name:"ZIDOVUDINE", sub:"NRTI — HIV/AIDS", score:90, tags:["ANTIVIRAL","API","Pharma"], free:false, pharma:true,
      description:"First antiretroviral approved. Nucleoside reverse transcriptase inhibitor for HIV.",
      ingredients:[{n:"ZIDOVUDINE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph202", name:"ZIPRASIDONE HYDROCHLORIDE", sub:"Atypical antipsychotic", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"D2/D3/5-HT2A antagonist with 5-HT1A agonism. For schizophrenia and bipolar mania.",
      ingredients:[{n:"ZIPRASIDONE HYDROCHLORIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph203", name:"ZOLEDRONIC ACID", sub:"Bisphosphonate — IV", score:90, tags:["BONE / OSTEOPOROSIS","API","Pharma"], free:false, pharma:true,
      description:"Most potent bisphosphonate. Annual IV infusion for osteoporosis; for bone metastases and Paget\'s.",
      ingredients:[{n:"ZOLEDRONIC ACID API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph204", name:"ZOLMITRIPTAN", sub:"Triptan — Migraine", score:90, tags:["MIGRAINE","API","Pharma"], free:false, pharma:true,
      description:"5-HT1B/1D agonist available oral, nasal, and ODT. For acute migraine.",
      ingredients:[{n:"ZOLMITRIPTAN API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph205", name:"ZOLPIDEM TARTRATE", sub:"Non-benzodiazepine hypnotic", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Imidazopyridine GABA-A agonist. For short-term insomnia. Less dependence than benzodiazepines.",
      ingredients:[{n:"ZOLPIDEM TARTRATE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph206", name:"ZONISAMIDE", sub:"Anticonvulsant", score:90, tags:["CNS / NEUROLOGICAL","API","Pharma"], free:false, pharma:true,
      description:"Multiple mechanisms: Na+/Ca2+ channel block, carbonic anhydrase inhibition. For focal epilepsy.",
      ingredients:[{n:"ZONISAMIDE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
    { id:"ph207", name:"β-CAROTENE", sub:"Provitamin A — Carotenoid", score:90, tags:["VITAMINS / SUPPLEMENTS","API","Pharma"], free:false, pharma:true,
      description:"Precursor to Vitamin A. Antioxidant. For Vitamin A deficiency and erythropoietic protoporphyria.",
      ingredients:[{n:"β-CAROTENE API",p:100,c:500}],
      process:"This is a pharmaceutical active pharmaceutical ingredient (API). Complete formulation, synthesis route, specifications, regulatory documentation (DMF/CEP), analytical methods (HPLC, dissolution), and manufacturing process are available after payment. Request a quote for detailed technical package." },
  ],

  chemeng:[
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
  ],
};

// ─── Shared Components ─────────────────────────────────────────────────────
const Pill = ({label, color="#64748b"}) => (
  <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:99,fontSize:9,fontWeight:700,padding:"2px 7px",letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>
);

function Ring({score, size=44}){
  const r=size/2-5, circ=2*Math.PI*r, dash=(score/100)*circ;
  const col=score>=90?"#34d399":score>=80?"#e8a838":"#f87171";
  return(
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="4" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"all 1s"}}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" fill={col} fontSize="11" fontWeight="800" style={{transform:`rotate(90deg)`,transformOrigin:`${size/2}px ${size/2}px`}}>{score}</text>
    </svg>
  );
}

// ─── Payment Redirect Simulation ───────────────────────────────────────────
function PaymentPortal({plan, currency, onSuccess, onCancel}){
  const [step, setStep]=useState("confirm"); // confirm | processing | done
  const price = currency==="INR" ? `₹${plan.inr}/mo` : `$${plan.usd}/mo`;

  useEffect(()=>{
    if(step==="processing"){
      const t=setTimeout(()=>setStep("done"),2500);
      return()=>clearTimeout(t);
    }
    if(step==="done"){
      const t=setTimeout(()=>onSuccess(),1000);
      return()=>clearTimeout(t);
    }
  },[step]);

  return(
    <div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:20,padding:28,maxWidth:380,width:"100%",textAlign:"center"}}>
        {step==="confirm"&&<>
          <div style={{fontSize:36,marginBottom:12}}>💳</div>
          <div style={{color:"#f1f5f9",fontWeight:900,fontSize:18,marginBottom:6}}>Complete Payment</div>
          <div style={{color:"#64748b",fontSize:13,marginBottom:6}}>Subscribing to <strong style={{color:plan.color}}>{plan.name}</strong></div>
          <div style={{color:plan.color,fontWeight:900,fontSize:28,marginBottom:20}}>{price}</div>
          <div style={{background:"#0d1626",border:"1px solid #1e293b",borderRadius:12,padding:14,marginBottom:20,textAlign:"left"}}>
            <div style={{color:"#475569",fontSize:11,marginBottom:8,fontWeight:700}}>PAYMENT METHOD</div>
            {currency==="INR"
              ?<div style={{display:"flex",flexDirection:"column",gap:8}}>
                {["UPI / Google Pay / PhonePe","Net Banking","Credit / Debit Card","Paytm Wallet"].map(m=>(
                  <div key={m} style={{background:"#1e293b",borderRadius:8,padding:"9px 12px",color:"#94a3b8",fontSize:12,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>{m}</span><span style={{color:"#34d399",fontSize:10}}>via Razorpay</span>
                  </div>
                ))}
              </div>
              :<div style={{display:"flex",flexDirection:"column",gap:8}}>
                {["Credit / Debit Card","Apple Pay","Google Pay"].map(m=>(
                  <div key={m} style={{background:"#1e293b",borderRadius:8,padding:"9px 12px",color:"#94a3b8",fontSize:12,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>{m}</span><span style={{color:"#34d399",fontSize:10}}>via Stripe</span>
                  </div>
                ))}
              </div>
            }
          </div>
          <div style={{display:"flex",gap:9}}>
            <button onClick={onCancel} style={{flex:1,padding:"11px",background:"transparent",border:"1px solid #1e293b",borderRadius:10,color:"#475569",fontWeight:600,fontSize:13,cursor:"pointer"}}>← Back</button>
            <button onClick={()=>setStep("processing")} style={{flex:2,padding:"11px",background:`linear-gradient(135deg,${plan.color},${plan.color}aa)`,border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>Pay {price} →</button>
          </div>
          <div style={{color:"#334155",fontSize:10,marginTop:12}}>🔒 Secure · 7-day free trial · Cancel anytime</div>
        </>}
        {step==="processing"&&<>
          <div style={{fontSize:36,marginBottom:14}}>⏳</div>
          <div style={{color:"#f1f5f9",fontWeight:700,fontSize:16,marginBottom:6}}>Processing payment...</div>
          <div style={{color:"#475569",fontSize:12}}>Please wait, do not close this window</div>
          <div style={{background:"#1e293b",borderRadius:99,height:4,marginTop:20,overflow:"hidden"}}>
            <div style={{height:4,background:`linear-gradient(90deg,${plan.color},${plan.color}88)`,borderRadius:99,animation:"progressBar 2.5s ease-in-out forwards"}}/>
          </div>
          <style>{`@keyframes progressBar{from{width:0%}to{width:100%}}`}</style>
        </>}
        {step==="done"&&<>
          <div style={{fontSize:44,marginBottom:10}}>🎉</div>
          <div style={{color:"#34d399",fontWeight:900,fontSize:18,marginBottom:6}}>Payment Successful!</div>
          <div style={{color:"#64748b",fontSize:13}}>Welcome to <span style={{color:plan.color,fontWeight:700}}>{plan.name}</span>. Loading your dashboard...</div>
        </>}
      </div>
    </div>
  );
}

// ─── OTP Login ────────────────────────────────────────────────────────────
function LoginScreen({onLogin}){
  const [step,setStep]=useState("form");
  const [contact,setContact]=useState("");
  const [otp,setOtp]=useState("");
  const [otpSent,setOtpSent]=useState("");
  const [name,setName]=useState("");
  const [city,setCity]=useState("");
  const [country,setCountry]=useState("");
  const [industry,setIndustry]=useState("");
  const [err,setErr]=useState("");

  const sendOtp=()=>{
    if(!contact.trim()){setErr("Enter email or phone number");return;}
    const code=Math.floor(100000+Math.random()*900000).toString();
    setOtpSent(code); setErr(`Demo OTP: ${code}`); setStep("otp");
  };
  const verifyOtp=()=>{
    if(otp===otpSent){setStep("profile");setErr("");}
    else setErr("Incorrect OTP. Try again.");
  };
  const complete=()=>{
    if(!name.trim()||!industry){setErr("Name and industry are required");return;}
    onLogin({name,contact,city,country,industry,plan:"free"});
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}>
      <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:20,padding:28,maxWidth:400,width:"90%"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{width:40,height:40,borderRadius:11,background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,margin:"0 auto 10px"}}>⚗</div>
          <div style={{color:"#f1f5f9",fontWeight:900,fontSize:18}}>ChemForm <span style={{color:"#4f9cf9"}}>Pro</span></div>
          <div style={{color:"#475569",fontSize:12,marginTop:3}}>AI Formulation Platform</div>
        </div>

        {step==="form"&&<>
          <div style={{color:"#94a3b8",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Sign in with OTP — no password</div>
          <input value={contact} onChange={e=>setContact(e.target.value)} placeholder="Email or +91 phone number" style={{width:"100%",background:"#060b14",border:"1px solid #1e293b",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:13,outline:"none",marginBottom:14,boxSizing:"border-box"}}/>
          {err&&<div style={{color:"#fbbf24",fontSize:12,padding:"8px",background:"#fbbf2411",borderRadius:7,marginBottom:10}}>{err}</div>}
          <button onClick={sendOtp} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>Send OTP →</button>
          <div style={{color:"#334155",fontSize:11,textAlign:"center",marginTop:10}}>Free plan available · No card required to start</div>
        </>}

        {step==="otp"&&<>
          <div style={{color:"#94a3b8",fontSize:12,marginBottom:12}}>OTP sent to <strong style={{color:"#f1f5f9"}}>{contact}</strong></div>
          <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} style={{width:"100%",background:"#060b14",border:"1px solid #1e293b",borderRadius:8,padding:"12px",color:"#f1f5f9",fontSize:20,outline:"none",marginBottom:12,textAlign:"center",letterSpacing:"0.3em",boxSizing:"border-box"}}/>
          {err&&<div style={{color:"#fbbf24",fontSize:12,padding:"8px",background:"#fbbf2411",borderRadius:7,marginBottom:10}}>{err}</div>}
          <button onClick={verifyOtp} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#34d399,#10b981)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",marginBottom:9}}>Verify OTP ✓</button>
          <button onClick={()=>{setStep("form");setErr("");}} style={{width:"100%",padding:"9px",background:"transparent",border:"1px solid #1e293b",borderRadius:10,color:"#475569",fontWeight:600,fontSize:12,cursor:"pointer"}}>← Change contact</button>
        </>}

        {step==="profile"&&<>
          <div style={{color:"#34d399",fontWeight:700,fontSize:13,marginBottom:14}}>✓ Verified! Tell us about yourself</div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name *" style={{width:"100%",background:"#060b14",border:"1px solid #1e293b",borderRadius:8,padding:"9px 12px",color:"#f1f5f9",fontSize:13,outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <input value={city} onChange={e=>setCity(e.target.value)} placeholder="City" style={{flex:1,background:"#060b14",border:"1px solid #1e293b",borderRadius:8,padding:"9px 12px",color:"#f1f5f9",fontSize:13,outline:"none"}}/>
            <input value={country} onChange={e=>setCountry(e.target.value)} placeholder="Country" style={{flex:1,background:"#060b14",border:"1px solid #1e293b",borderRadius:8,padding:"9px 12px",color:"#f1f5f9",fontSize:13,outline:"none"}}/>
          </div>
          <div style={{color:"#94a3b8",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Your Industry * <span style={{color:"#475569",fontWeight:400,fontSize:10,textTransform:"none"}}>(unlocks relevant formulas first)</span></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
            {INDUSTRIES.map(ind=>(
              <div key={ind.id} onClick={()=>setIndustry(ind.id)} style={{padding:"8px 10px",borderRadius:9,border:`1px solid ${industry===ind.id?"#4f9cf9":"#1e293b"}`,background:industry===ind.id?"#4f9cf915":"#060b14",cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13}}>{ind.icon}</span>
                <span style={{color:industry===ind.id?"#4f9cf9":"#64748b",fontSize:10,fontWeight:600,lineHeight:1.3}}>{ind.label}</span>
              </div>
            ))}
          </div>
          {err&&<div style={{color:"#f87171",fontSize:12,padding:"8px",background:"#f8717111",borderRadius:7,marginBottom:10}}>{err}</div>}
          <button onClick={complete} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>Enter ChemForm Pro →</button>
        </>}
      </div>
    </div>
  );
}

// ─── Pricing Modal ────────────────────────────────────────────────────────
function PricingModal({onClose, currency, onSelectPlan}){
  const featureMap = {
    free:       ["3 free formulas per category","3 AI optimizations/month","RM price editor (all plans)","Batch calculator","Ads shown"],
    starter:    ["All formulas unlocked","10 AI optimizations/month","5 process views/month","5 equipment views/month","RM price editor","No ads"],
    pro:        ["All formulas unlocked","50 AI optimizations/month","5 process views/month","5 equipment views/month","Basic engineering design","RM price editor","No ads","Priority support"],
    enterprise: ["All formulas + ChemEng Pro","Unlimited AI","Unlimited process & equipment","Basic + Detailed engineering","Quote requests for plant design","RM price editor","No ads"],
  };
  return(
    <div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{maxWidth:840,width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:20,padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{color:"#f1f5f9",fontWeight:900,fontSize:19}}>Plans & Pricing</div>
            <div style={{color:"#475569",fontSize:11,marginTop:3}}>Single-user · 7-day free trial on paid · No card for free plan · Cancel anytime</div>
          </div>
          <button onClick={onClose} style={{background:"#1e293b",border:"none",color:"#94a3b8",width:30,height:30,borderRadius:7,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginBottom:16}}>
          {Object.entries(PLANS).map(([key,plan])=>(
            <div key={key} style={{background:plan.color+"11",border:`1px solid ${plan.color}33`,borderRadius:14,padding:14,display:"flex",flexDirection:"column"}}>
              <div style={{color:plan.color,fontWeight:900,fontSize:14,marginBottom:4}}>{plan.name}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:2,marginBottom:12}}>
                {plan.price===0
                  ?<span style={{color:"#f1f5f9",fontWeight:900,fontSize:20}}>Free</span>
                  :<><span style={{color:"#f1f5f9",fontWeight:900,fontSize:20}}>{currency==="INR"?`₹${plan.inr}`:`$${plan.usd}`}</span><span style={{color:"#475569",fontSize:10}}>/mo</span></>
                }
              </div>
              <div style={{flex:1,marginBottom:12}}>
                {featureMap[key].map(f=>(
                  <div key={f} style={{color:"#94a3b8",fontSize:10,marginBottom:4,display:"flex",gap:4,lineHeight:1.4}}>
                    <span style={{color:plan.color,flexShrink:0}}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={()=>onSelectPlan(key,plan)} style={{padding:"8px",borderRadius:9,border:"none",background:key==="free"?"#1e293b":`linear-gradient(135deg,${plan.color},${plan.color}cc)`,color:key==="free"?"#94a3b8":"#fff",fontWeight:700,fontSize:11,cursor:"pointer"}}>
                {key==="free"?"Use Free":"Start Free Trial →"}
              </button>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",color:"#334155",fontSize:11}}>🔒 Stripe (USD) · Razorpay (INR/UPI/Paytm) · No card required for free plan</div>
      </div>
    </div>
  );
}

// ─── Quota Badge ──────────────────────────────────────────────────────────
function QBadge({used, limit, label, color="#34d399"}){
  const left=limit===999?999:Math.max(0,limit-used);
  const pct=limit>0&&limit!==999?Math.min(100,(used/limit)*100):0;
  const c=left===0?"#f87171":left<=2?"#e8a838":color;
  return(
    <div style={{background:"#0a0f1e",border:`1px solid ${c}33`,borderRadius:8,padding:"4px 8px",textAlign:"center",minWidth:48}}>
      <div style={{color:c,fontWeight:800,fontSize:12}}>{left===999?"∞":left}</div>
      <div style={{color:"#475569",fontSize:8}}>{label}</div>
      {limit!==999&&limit>0&&<div style={{background:"#1e293b",borderRadius:99,height:2,marginTop:2}}><div style={{width:`${pct}%`,height:2,borderRadius:99,background:c}}/></div>}
    </div>
  );
}

// ─── Formula Detail ───────────────────────────────────────────────────────
function FormulaDetail({formula, currency, planKey, usage, onUseQuota, onUpgrade}){
  const [tab,setTab]=useState("formula");
  // RM prices in INR — user edits per their local market
  const [rmPrices,setRmPrices]=useState({});
  const [showRME,setShowRME]=useState(false);

  useEffect(()=>{
    // Reset to formula defaults when formula changes
    const defaults={};
    formula.ingredients.forEach(i=>{ defaults[i.n]=i.c; });
    setRmPrices(defaults);
    setTab("formula");
    setShowRME(false);
  },[formula.id]);

  const plan=PLANS[planKey];
  const cat=CATEGORIES.find(c=>FORMULAS[c.id]?.some(f=>f.id===formula.id));
  const color=cat?.color||"#4f9cf9";

  // CORRECT CALCULATION: sum of (percentage/100 * price_per_kg) for each ingredient
  const customCostINR = formula.ingredients.reduce((total,ing)=>{
    const price=Number(rmPrices[ing.n]??ing.c);
    return total + (Number(ing.p)/100)*price;
  },0);

  const handleTab=(id)=>{
    const canProcess=planKey==="starter"||planKey==="pro"||planKey==="enterprise";
    const canEquip=canProcess;
    const canEngBasic=plan.engBasic;
    const canEngDetailed=plan.engDetailed;
    if(id==="process"){ if(!canProcess){onUpgrade("Manufacturing Process (Starter+)");return;} if(usage.process>=plan.process){onUpgrade(`Process quota full (${plan.process}/mo) — upgrade for more`);return;} onUseQuota("process"); }
    if(id==="equipment"){ if(!canEquip){onUpgrade("Equipment Sizing (Starter+)");return;} if(usage.equipment>=plan.equipment){onUpgrade(`Equipment quota full (${plan.equipment}/mo) — upgrade`);return;} onUseQuota("equipment"); }
    if((id==="engbasic"||id==="engdetailed")&&!canEngBasic){onUpgrade("Engineering Design (Pro+)");return;}
    if(id==="engdetailed"&&!canEngDetailed){onUpgrade("Detailed Engineering (Enterprise only)");return;}
    setTab(id);
  };

  return(
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div style={{flex:1,marginRight:8}}>
          <div style={{color:"#f1f5f9",fontSize:17,fontWeight:800,lineHeight:1.2}}>{formula.name}</div>
          <div style={{color:"#64748b",fontSize:11,marginTop:2}}>{formula.sub}</div>
          <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>{formula.tags.map(t=><Pill key={t} label={t} color={color}/>)}</div>
        </div>
        <Ring score={formula.score} size={50}/>
      </div>

      {/* Stats */}
      <div style={{display:"flex",gap:7,marginBottom:10}}>
        <div style={{flex:1,background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"8px",textAlign:"center"}}>
          <div style={{fontSize:14}}>🧪</div>
          <div style={{color:"#f1f5f9",fontWeight:700,fontSize:13}}>{formula.ingredients.length}</div>
          <div style={{color:"#475569",fontSize:9}}>Ingredients</div>
        </div>
        <div style={{flex:2,background:color+"11",border:`1px solid ${color}33`,borderRadius:9,padding:"8px",textAlign:"center"}}>
          <div style={{color:"#64748b",fontSize:10}}>Formula Cost/kg</div>
          <div style={{color:color,fontWeight:900,fontSize:20}}>{fmtCur(customCostINR,currency)}</div>
          <div style={{color:"#475569",fontSize:9}}>raw material cost only (excl. overheads, packaging, margin)</div>
        </div>
        <div onClick={()=>setShowRME(v=>!v)} style={{flex:1,background:showRME?"#34d39918":"#0a0f1e",border:`1px solid ${showRME?"#34d39966":"#34d39933"}`,borderRadius:9,padding:"8px",textAlign:"center",cursor:"pointer"}}>
          <div style={{fontSize:14}}>✏️</div>
          <div style={{color:"#34d399",fontWeight:700,fontSize:10}}>Edit RM</div>
          <div style={{color:"#475569",fontSize:9}}>Prices</div>
        </div>
      </div>

      {/* RM Editor — available to ALL plans */}
      {showRME&&(
        <div style={{background:"#060b14",border:"1px solid #34d39944",borderRadius:12,padding:14,marginBottom:10}}>
          <div style={{color:"#34d399",fontWeight:700,fontSize:12,marginBottom:4}}>✏️ Enter your local raw material prices (₹/kg)</div>
          <div style={{color:"#475569",fontSize:10,marginBottom:10}}>App automatically calculates formula cost = Σ (% × price/kg) for each ingredient</div>
          {formula.ingredients.map(ing=>{
            const localPrice=Number(rmPrices[ing.n]??ing.c);
            const contribution=(Number(ing.p)/100)*localPrice;
            return(
              <div key={ing.n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:"#94a3b8",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ing.n}</div>
                  <div style={{color:"#334155",fontSize:9}}>{ing.p}% → contributes {fmtCur(contribution,currency)}/kg to formula</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                  <span style={{color:"#475569",fontSize:10}}>₹</span>
                  <input type="number" step="0.01" min="0" value={localPrice}
                    onChange={e=>{
                      const v=parseFloat(e.target.value)||0;
                      setRmPrices(prev=>({...prev,[ing.n]:v}));
                    }}
                    style={{width:70,background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:6,padding:"5px 7px",color:"#f1f5f9",fontSize:12,outline:"none",textAlign:"right"}}/>
                  <span style={{color:"#334155",fontSize:9}}>/kg</span>
                </div>
              </div>
            );
          })}
          <div style={{borderTop:"1px solid #1e293b",marginTop:12,paddingTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{color:"#64748b",fontSize:10}}>Your Local Formula Cost/kg</div>
              <div style={{color:"#34d399",fontWeight:900,fontSize:22}}>{fmtCur(customCostINR,currency)}</div>
            </div>
            <div style={{textAlign:"right",color:"#475569",fontSize:10,maxWidth:160}}>
              Add 20–40% for overheads, packaging, profit to get selling price
            </div>
          </div>
        </div>
      )}

      {/* Inner tabs */}
      <div style={{display:"flex",borderBottom:"1px solid #1e293b",marginBottom:12,overflowX:"auto"}}>
        {[
          {id:"formula",l:"📋 Formula"},
          {id:"process",l:"⚙️ Process",lock:!(planKey==="starter"||planKey==="pro"||planKey==="enterprise")},
          {id:"equipment",l:"🏭 Equipment",lock:!(planKey==="starter"||planKey==="pro"||planKey==="enterprise")},
          {id:"engbasic",l:"📐 Basic Eng",lock:!plan.engBasic},
          {id:"engdetailed",l:"🔬 Detailed",lock:!plan.engDetailed},
        ].map(t=>(
          <button key={t.id} onClick={()=>handleTab(t.id)} style={{padding:"6px 10px",border:"none",background:"none",cursor:"pointer",color:tab===t.id?color:"#475569",borderBottom:`2px solid ${tab===t.id?color:"transparent"}`,fontWeight:tab===t.id?700:500,fontSize:10,transition:"all 0.2s",marginBottom:-1,whiteSpace:"nowrap"}}>
            {t.l}{t.lock?" 🔒":""}
          </button>
        ))}
      </div>

      {tab==="formula"&&(
        <div>
          {formula.ingredients.map((ing,i)=>{
            const bw=(ing.p/Math.max(...formula.ingredients.map(x=>x.p)))*100;
            const price=Number(rmPrices[ing.n]??ing.c);
            const contrib=(Number(ing.p)/100)*price;
            return(
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{color:"#cbd5e1",fontSize:12,flex:1,marginRight:8}}>{ing.n}</span>
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    <span style={{color:color,fontSize:12,fontWeight:700}}>{ing.p}%</span>
                    <span style={{color:"#475569",fontSize:11,minWidth:65,textAlign:"right"}}>{fmtCur(price,currency)}/kg</span>
                    <span style={{color:"#64748b",fontSize:11,minWidth:60,textAlign:"right"}}>=&nbsp;{fmtCur(contrib,currency)}</span>
                  </div>
                </div>
                <div style={{background:"#1e293b",borderRadius:4,height:4}}>
                  <div style={{width:`${bw}%`,background:`linear-gradient(90deg,${color},${color}55)`,height:4,borderRadius:4,transition:"width 0.6s"}}/>
                </div>
              </div>
            );
          })}
          {(()=>{
            const totalPct = formula.ingredients.reduce((s,i)=>s+Number(i.p),0);
            const pctColor = totalPct>105?"#f87171":totalPct>=99?"#34d399":"#e8a838";
            return (
              <div style={{marginTop:12,display:"flex",gap:7}}>
                <div style={{flex:1,padding:"10px 14px",background:color+"11",border:`1px solid ${color}33`,borderRadius:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:"#64748b",fontSize:12}}>Total RM Cost/kg:</span>
                  <span style={{color:color,fontWeight:900,fontSize:18}}>{fmtCur(customCostINR,currency)}</span>
                </div>
                <div style={{padding:"10px 14px",background:pctColor+"11",border:`1px solid ${pctColor}33`,borderRadius:9,textAlign:"center",minWidth:90}}>
                  <div style={{color:pctColor,fontWeight:900,fontSize:18}}>{totalPct.toFixed(1)}%</div>
                  <div style={{color:"#475569",fontSize:9}}>Total %</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tab==="process"&&(planKey==="starter"||planKey==="pro"||planKey==="enterprise")&&(
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:9}}>Manufacturing Process</div>
          {typeof formula.process === "string" ? (
            <div>
              <div style={{color:"#94a3b8",fontSize:13,lineHeight:1.8,padding:"14px 16px",background:"#0a0f1e",borderRadius:12,border:"1px solid #1e293b",marginBottom:12}}>{formula.process}</div>
              <div style={{background:color+"11",border:`1px solid ${color}33`,borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                <div>
                  <div style={{color:color,fontWeight:700,fontSize:12}}>📄 Process Flow Diagram & Detailed SOP</div>
                  <div style={{color:"#475569",fontSize:11,marginTop:2}}>Get the complete PFD, equipment sizing, and step-by-step manufacturing SOP</div>
                </div>
                <button onClick={()=>alert("Quote request sent! Our engineering team will contact you within 24 hours with the Process Flow Diagram.")} style={{background:color,border:"none",color:"#fff",fontWeight:700,fontSize:11,padding:"7px 14px",borderRadius:8,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Request PFD →</button>
              </div>
            </div>
          ) : (
            formula.process?.map((step,i)=>(
              <div key={i} style={{display:"flex",gap:9,marginBottom:8,padding:"9px 12px",background:"#0a0f1e",borderRadius:10,border:"1px solid #1e293b"}}>
                <div style={{width:19,height:19,borderRadius:"50%",background:color+"22",border:`1px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",color,fontSize:9,fontWeight:800,flexShrink:0}}>{i+1}</div>
                <div style={{color:"#94a3b8",fontSize:12,lineHeight:1.6}}>{step}</div>
              </div>
            ))
          )}
        </div>
      )}
      {tab==="equipment"&&(planKey==="starter"||planKey==="pro"||planKey==="enterprise")&&(
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:9}}>Equipment Required</div>
          {formula.equipment?.map((eq,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:7,padding:"8px 11px",background:"#0a0f1e",borderRadius:9,border:"1px solid #1e293b"}}>
              <span style={{fontSize:13}}>🔧</span><span style={{color:"#cbd5e1",fontSize:12}}>{eq}</span>
            </div>
          ))}
          <div style={{marginTop:12,background:"#4f9cf911",border:"1px solid #4f9cf922",borderRadius:11,padding:12}}>
            <div style={{color:"#4f9cf9",fontWeight:700,fontSize:12,marginBottom:7}}>📐 General Sizing Rules</div>
            <div style={{color:"#64748b",fontSize:11,lineHeight:1.8}}>
              • Mixer volume = batch size × 1.25 (80% fill factor)<br/>
              • Ribbon blender: ~1.5 kW / 100 L, throughput 8–10 batches/shift<br/>
              • Disperser (Cowles): ~3 kW / 50 L at 2000 rpm<br/>
              • Bagging machine: 600–1200 bags/h (25 kg bags)<br/>
              • Sieve area: 1 m² per 2 T/h throughput
            </div>
          </div>
        </div>
      )}
      {tab==="engbasic"&&plan.engBasic&&(
        <div style={{background:"#4f9cf911",border:"1px solid #4f9cf922",borderRadius:12,padding:14}}>
          <div style={{color:"#4f9cf9",fontWeight:700,fontSize:13,marginBottom:9}}>📄 Basic Engineering Package</div>
          {["Process Flow Diagram (PFD)","Equipment list with capacities","Utility requirements (power, water, air)","Site area & plot plan estimation","Capital cost estimate ±30%","Operating cost model"].map(item=>(
            <div key={item} style={{color:"#94a3b8",fontSize:11,marginBottom:5,display:"flex",gap:5}}><span style={{color:"#4f9cf9"}}>→</span>{item}</div>
          ))}
          <button onClick={()=>alert("Quote request sent! Our team will contact you within 24 hours.")} style={{marginTop:10,width:"100%",padding:"9px",borderRadius:9,background:"linear-gradient(135deg,#4f9cf9,#0ea5e9)",border:"none",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>📧 Request Quote for Basic Engineering</button>
        </div>
      )}
      {tab==="engdetailed"&&plan.engDetailed&&(
        <div style={{background:"#a78bfa11",border:"1px solid #a78bfa22",borderRadius:12,padding:14}}>
          <div style={{color:"#a78bfa",fontWeight:700,fontSize:13,marginBottom:9}}>🔬 Detailed Engineering Package</div>
          {["P&ID (Piping & Instrumentation Diagram)","Equipment datasheets & specifications","Electrical single-line diagram","Civil/structural design basis","HAZOP study report","Procurement specifications","Commissioning & startup procedures"].map(item=>(
            <div key={item} style={{color:"#94a3b8",fontSize:11,marginBottom:5,display:"flex",gap:5}}><span style={{color:"#a78bfa"}}>→</span>{item}</div>
          ))}
          <button onClick={()=>alert("Detailed engineering quote sent! Team will contact you within 48 hours.")} style={{marginTop:10,width:"100%",padding:"9px",borderRadius:9,background:"linear-gradient(135deg,#a78bfa,#8b5cf6)",border:"none",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>📧 Request Detailed Engineering Quote</button>
        </div>
      )}
    </div>
  );
}

// ─── AI Optimizer ─────────────────────────────────────────────────────────
function AIOptimizer({formula, planKey, currency, usage, onUseQuota, onUpgrade}){
  const [goal,setGoal]=useState("balanced");
  const [targetCost,setTargetCost]=useState("");
  const [targetPerf,setTargetPerf]=useState("90");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState(null);
  const plan=PLANS[planKey];

  useEffect(()=>{
    setResult(null); setError(null);
    if(formula) setTargetCost((formula.ingredients.reduce((t,i)=>(t+(i.p/100)*i.c),0)*0.85).toFixed(0));
  },[formula?.id]);

  const cat=CATEGORIES.find(c=>FORMULAS[c.id]?.some(f=>f.id===formula?.id));
  const color=cat?.color||"#4f9cf9";
  const creditsLeft=Math.max(0,plan.ai-usage.ai);

  const run=async()=>{
    if(!formula) return;
    if(creditsLeft<=0){ onUpgrade("More AI Optimizations"); return; }
    setLoading(true); setResult(null); setError(null);

    const currentCost=formula.ingredients.reduce((t,i)=>(t+(i.p/100)*i.c),0);
    const ingredientsList=formula.ingredients.map(i=>`- ${i.n}: ${i.p}% at ₹${i.c}/kg (contribution: ₹${((i.p/100)*i.c).toFixed(2)}/kg)`).join("\n");
    const goalText=goal==="cost"
      ?`COST REDUCTION ONLY: Reduce raw material cost from ₹${currentCost.toFixed(2)}/kg to approximately ₹${targetCost}/kg. Suggest cheaper alternatives, reduce expensive ingredient percentages. Maintain minimum acceptable performance.`
      :goal==="performance"
      ?`MAXIMUM PERFORMANCE ONLY: Ignore cost completely. Your single goal is to maximise product performance, quality, durability and functional properties. Increase high-performance ingredients. Suggest premium alternatives even if more expensive. Do NOT reduce any ingredient for cost reasons. Do NOT mention savings. Only add or increase ingredients that boost performance.`
      :`BALANCED: Improve performance where possible while also reducing cost. Find the best trade-off.`;

    const prompt=`You are a senior expert formulation chemist with 25+ years experience. You must follow the optimization goal STRICTLY.

Formula: ${formula.name} (${formula.sub})
Current raw material cost: ₹${currentCost.toFixed(2)}/kg
Current performance score: ${formula.score}/100

Ingredients (name | % by weight | ₹/kg | cost contribution ₹/kg of formula):
${ingredientsList}

OPTIMIZATION GOAL — READ CAREFULLY AND FOLLOW EXACTLY:
${goalText}

Rules:
- For COST goal: reduce expensive ingredients, find cheaper substitutes, do not mention performance gains as primary objective
- For PERFORMANCE goal: ONLY increase quality-driving ingredients. NEVER reduce a functional ingredient to save cost. You may suggest adding new premium ingredients not in the list. The estimated_cost_inr will likely be HIGHER than current — that is correct and expected for max performance.
- For BALANCED goal: find genuine trade-offs

Formula cost/kg = SUM of (percentage/100 × price/kg) for each ingredient. Recalculate estimated_cost_inr correctly.

Respond ONLY with valid JSON (no markdown, no text outside):
{"summary":"2-3 sentences explaining WHAT you changed and WHY, specific to the goal","optimized_ingredients":[{"name":"exact ingredient name from the list above","original_pct":0.0,"new_pct":0.0,"change":"increase|decrease|unchanged|new","reason":"specific technical reason for this change"}],"estimated_cost_inr":0.0,"estimated_performance":0,"cost_savings_pct":0.0,"key_changes":["specific change 1","specific change 2"],"warnings":["any formulation risks or constraints"]}`;

    try{
      const res=await fetch("https://nameless-heart-9c9c.vaanienterprises2411.workers.dev/",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1500,messages:[{role:"user",content:prompt}]})
      });
      if(!res.ok){
        const e=await res.json().catch(()=>({}));
        throw new Error(`API ${res.status}: ${e.error?.message||res.statusText}`);
      }
      const data=await res.json();
      const text=(data.content||[]).map(c=>c.type==="text"?c.text:"").join("").trim();
      // Clean any accidental markdown
      const clean=text.replace(/^```(?:json)?\s*/im,"").replace(/\s*```\s*$/im,"").trim();
      const parsed=JSON.parse(clean);
      setResult(parsed);
      onUseQuota("ai");
    }catch(e){
      setError(e.message||"Optimization failed. Please try again.");
    }
    setLoading(false);
  };

  if(!formula) return(
    <div style={{textAlign:"center",padding:"50px 20px",color:"#475569"}}>
      <div style={{fontSize:38,marginBottom:10}}>🤖</div>
      <div style={{fontSize:14,fontWeight:600}}>Select a formula to optimize</div>
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div><div style={{color:"#f1f5f9",fontSize:17,fontWeight:800}}>AI Optimizer</div><div style={{color:"#64748b",fontSize:11}}>{formula.name}</div></div>
        <QBadge used={usage.ai} limit={plan.ai} label="AI left" color={color}/>
      </div>

      {creditsLeft===0&&(
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{color:"#64748b",fontSize:12}}>Monthly AI credits used up</span>
          <button onClick={()=>onUpgrade("More AI Optimizations")} style={{background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontSize:11,fontWeight:700,padding:"5px 12px",borderRadius:6,cursor:"pointer"}}>Upgrade</button>
        </div>
      )}

      <div style={{marginBottom:12}}>
        <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:7}}>Optimization Goal</div>
        <div style={{display:"flex",gap:7,flexDirection:"column"}}>
          {[
            {id:"cost",      l:"💰 Reduce Cost",    d:"Lower RM cost. Quality maintained at minimum acceptable level."},
            {id:"performance",l:"⚡ Max Performance", d:"Best possible quality. Cost IGNORED — expect higher cost output."},
            {id:"balanced",  l:"⚖️ Balanced",        d:"Best cost-quality trade-off. Moderate improvements in both."},
          ].map(g=>(
            <div key={g.id} onClick={()=>setGoal(g.id)} style={{padding:"9px 12px",borderRadius:9,cursor:"pointer",border:`1px solid ${goal===g.id?color:"#1e293b"}`,background:goal===g.id?color+"15":"#0a0f1e",transition:"all 0.2s",display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:13,fontWeight:800,color:goal===g.id?color:"#64748b",flexShrink:0}}>{g.l}</div>
              <div style={{fontSize:10,color:"#475569",lineHeight:1.3}}>{g.d}</div>
              {goal===g.id&&<div style={{marginLeft:"auto",color,fontSize:14,flexShrink:0}}>✓</div>}
            </div>
          ))}
        </div>
      </div>

      {goal==="cost"&&(
        <div style={{marginBottom:12}}>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Target Cost (₹/kg)</div>
          <input type="number" value={targetCost} onChange={e=>setTargetCost(e.target.value)}
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:8,padding:"9px 12px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
      )}
      {goal==="performance"&&(
        <div style={{marginBottom:12}}>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Target Score (0–100)</div>
          <input type="number" min="0" max="100" value={targetPerf} onChange={e=>setTargetPerf(e.target.value)}
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:8,padding:"9px 12px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
      )}

      <button onClick={run} disabled={loading||creditsLeft===0} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:loading||creditsLeft===0?"#1e293b":`linear-gradient(135deg,${color},${color}aa)`,color:loading||creditsLeft===0?"#475569":"#fff",fontWeight:800,fontSize:13,cursor:loading||creditsLeft===0?"not-allowed":"pointer",marginBottom:12}}>
        {loading?"🤖 Analyzing...":creditsLeft===0?"No credits — upgrade to continue":"✨ Optimize with AI"}
      </button>

      {error&&<div style={{color:"#f87171",fontSize:12,padding:"10px",background:"#f8717111",borderRadius:8,marginBottom:10}}>⚠️ {error}</div>}

      {result&&(
        <div style={{animation:"fadeIn 0.4s ease"}}>
          <div style={{background:color+"11",border:`1px solid ${color}33`,borderRadius:11,padding:12,marginBottom:11}}>
            <div style={{color:color,fontWeight:700,fontSize:11,marginBottom:4}}>AI Analysis</div>
            <div style={{color:"#cbd5e1",fontSize:12,lineHeight:1.6}}>{result.summary}</div>
          </div>
          <div style={{display:"flex",gap:7,marginBottom:11}}>
            {[
              {l:"New Cost/kg",v:fmtCur(result.estimated_cost_inr||0,currency),g:(result.estimated_cost_inr||0)<formula.ingredients.reduce((t,i)=>t+(i.p/100)*i.c,0)},
              {l:"Performance",v:`${result.estimated_performance||0}/100`,g:(result.estimated_performance||0)>=formula.score},
              {l:"Cost Saving",v:`${Number(result.cost_savings_pct||0).toFixed(1)}%`,g:(result.cost_savings_pct||0)>0}
            ].map(m=>(
              <div key={m.l} style={{flex:1,background:"#0a0f1e",border:`1px solid ${m.g?"#34d39944":"#f8717144"}`,borderRadius:9,padding:"7px 8px",textAlign:"center"}}>
                <div style={{color:m.g?"#34d399":"#f87171",fontWeight:800,fontSize:12}}>{m.v}</div>
                <div style={{color:"#475569",fontSize:9}}>{m.l}</div>
              </div>
            ))}
          </div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:7}}>Suggested Changes</div>
          {(result.optimized_ingredients||[]).map((ing,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",background:"#0a0f1e",borderRadius:8,marginBottom:4,border:`1px solid ${ing.change==="increase"?"#34d39933":ing.change==="decrease"?"#f8717133":"#1e293b"}`}}>
              <div style={{flex:1,marginRight:8}}>
                <div style={{color:"#cbd5e1",fontSize:11}}>{ing.name}</div>
                <div style={{color:"#475569",fontSize:9,lineHeight:1.3}}>{ing.reason}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{color:"#64748b",fontSize:9}}>{ing.original_pct}%</div>
                <div style={{color:ing.change==="increase"?"#34d399":ing.change==="decrease"?"#f87171":"#94a3b8",fontWeight:700,fontSize:12}}>{ing.new_pct}%</div>
              </div>
            </div>
          ))}
          {(result.warnings||[]).filter(Boolean).length>0&&(
            <div style={{marginTop:10,background:"#e8a83811",border:"1px solid #e8a83844",borderRadius:9,padding:11}}>
              <div style={{color:"#e8a838",fontWeight:700,fontSize:11,marginBottom:4}}>⚠️ Warnings</div>
              {result.warnings.filter(Boolean).map((w,i)=><div key={i} style={{color:"#fbbf24",fontSize:11}}>• {w}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Batch Calc ───────────────────────────────────────────────────────────
function BatchCalc({formula, currency}){
  const [size,setSize]=useState("100");
  const [unit,setUnit]=useState("kg");
  const [rmPrices,setRmPrices]=useState({});

  useEffect(()=>{
    if(formula){ const d={}; formula.ingredients.forEach(i=>{d[i.n]=i.c;}); setRmPrices(d); }
  },[formula?.id]);

  const cat=CATEGORIES.find(c=>FORMULAS[c.id]?.some(f=>f.id===formula?.id));
  const color=cat?.color||"#4f9cf9";

  if(!formula) return(
    <div style={{textAlign:"center",padding:"50px 20px",color:"#475569"}}>
      <div style={{fontSize:38,marginBottom:10}}>⚖️</div>
      <div style={{fontSize:14,fontWeight:600}}>Select a formula</div>
    </div>
  );

  const sz=parseFloat(size)||0;
  // CORRECT: formula cost per kg = sum(p/100 * price)
  const costPerKgINR=formula.ingredients.reduce((total,ing)=>{
    const price=Number(rmPrices[ing.n]??ing.c);
    return total+(Number(ing.p)/100)*price;
  },0);
  const totalCostINR=sz*costPerKgINR;

  return(
    <div>
      <div style={{color:"#f1f5f9",fontSize:17,fontWeight:800,marginBottom:3}}>Batch Calculator</div>
      <div style={{color:"#64748b",fontSize:11,marginBottom:14}}>{formula.name}</div>

      <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:10,padding:12,marginBottom:12}}>
        <div style={{color:"#475569",fontSize:10,fontWeight:700,marginBottom:8}}>ENTER YOUR LOCAL RM PRICES (₹/kg)</div>
        {formula.ingredients.map(ing=>(
          <div key={ing.n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{color:"#94a3b8",fontSize:11,flex:1,marginRight:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ing.n} <span style={{color:"#334155"}}>({ing.p}%)</span></span>
            <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
              <span style={{color:"#334155",fontSize:10}}>₹</span>
              <input type="number" step="0.01" min="0" value={Number(rmPrices[ing.n]??ing.c)}
                onChange={e=>setRmPrices(p=>({...p,[ing.n]:parseFloat(e.target.value)||0}))}
                style={{width:64,background:"#060b14",border:"1px solid #1e293b",borderRadius:5,padding:"4px 6px",color:"#f1f5f9",fontSize:11,outline:"none",textAlign:"right"}}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:9,marginBottom:12}}>
        <div style={{flex:1}}>
          <div style={{color:"#94a3b8",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Batch Size</div>
          <input value={size} onChange={e=>setSize(e.target.value)} type="number"
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:7,padding:"8px 11px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{color:"#94a3b8",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Unit</div>
          <select value={unit} onChange={e=>setUnit(e.target.value)}
            style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:7,padding:"8px 11px",color:"#f1f5f9",fontSize:13,outline:"none"}}>
            {["kg","g","lbs","MT"].map(u=><option key={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div style={{background:`linear-gradient(135deg,${color}22,${color}08)`,border:`1px solid ${color}44`,borderRadius:11,padding:13,marginBottom:12,textAlign:"center"}}>
        <div style={{color:"#64748b",fontSize:11}}>Total Raw Material Cost</div>
        <div style={{color:color,fontSize:28,fontWeight:900}}>{fmtCur(totalCostINR,currency)}</div>
        <div style={{color:"#64748b",fontSize:10}}>{fmtCur(costPerKgINR,currency)}/kg × {sz} {unit}</div>
      </div>

      <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Ingredient Breakdown</div>
      {formula.ingredients.map((ing,i)=>{
        const price=Number(rmPrices[ing.n]??ing.c);
        const qty=(Number(ing.p)/100)*sz;
        const ingCostINR=qty*price;
        return(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 11px",background:"#0a0f1e",borderRadius:7,marginBottom:5,border:"1px solid #1e293b"}}>
            <div style={{minWidth:0,flex:1,marginRight:8}}>
              <div style={{color:"#cbd5e1",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ing.n}</div>
              <div style={{color:"#475569",fontSize:9}}>{ing.p}% of batch</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{color:color,fontWeight:700,fontSize:12}}>{qty.toFixed(3)} {unit}</div>
              <div style={{color:"#475569",fontSize:10}}>{fmtCur(ingCostINR,currency)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ─── Request Formulation Tab ──────────────────────────────────────────────
function RequestFormula({user, planKey, currency, onUpgrade}){
  const isFree    = planKey === "free";
  const isStarter = planKey === "starter";
  const isPaid    = planKey === "pro" || planKey === "enterprise"; // these get it free
  // Pricing for pay-per-request
  const REQ_PRICE_INR = 499;
  const REQ_PRICE_USD = 6;
  const priceStr = currency === "INR" ? `₹${REQ_PRICE_INR}` : `$${REQ_PRICE_USD}`;

  const [form,setForm]=useState({name:"",category:"",application:"",requirements:"",email:user?.contact||""});
  const [payStep,setPayStep]=useState("form"); // form | payment | processing | done
  const [countdown,setCountdown]=useState(0);

  const cats=["Drymix / Construction Chemicals","Paints & Coatings","Adhesives & Sealants","Cosmetics / Personal Care","Homecare / Cleaners","Inks","Textile Sizing","Paper Sizing","Chemical Manufacturing","Other"];

  const canFormFill = !!(form.name && form.category && form.application && form.email);

  // Payment countdown effect
  useEffect(()=>{
    if(payStep==="processing"){
      setCountdown(3);
      const t=setInterval(()=>setCountdown(c=>{
        if(c<=1){clearInterval(t);setPayStep("done");return 0;}
        return c-1;
      }),1000);
      return()=>clearInterval(t);
    }
  },[payStep]);

  const handleSubmit=()=>{
    if(!canFormFill) return;
    const base="https://docs.google.com/forms/d/e/1FAIpQLScgoC0zigEeu7onY8n-wZM0KjMQ_cNgM6VvlHxyF7ZA74w6lg/viewform";
    const params=new URLSearchParams({
      "entry.2005620554": form.name,
      "entry.1065046570": form.category,
      "entry.1045781291": form.application,
      "entry.1166974658": form.requirements||"",
      "entry.839337160":  form.email,
    });
    window.open(base+"?usp=pp_url&"+params.toString(), "_blank");
    if(isPaid){ setPayStep("done"); return; }
    setPayStep("payment");
  };

  // ── Done state ──
  if(payStep==="done") return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 24px",textAlign:"center",flex:1}}>
      <div style={{fontSize:52,marginBottom:14}}>✅</div>
      <div style={{color:"#34d399",fontWeight:900,fontSize:20,marginBottom:8}}>Request Confirmed!</div>
      <div style={{color:"#64748b",fontSize:14,lineHeight:1.8,maxWidth:420}}>
        {!isPaid&&<div style={{color:"#34d399",fontSize:13,fontWeight:700,marginBottom:10}}>Payment of {priceStr} received ✓</div>}
        Our expert formulation team will prepare a complete formulation for<br/>
        <strong style={{color:"#f1f5f9"}}>{form.name}</strong><br/>
        and email it to <strong style={{color:"#f1f5f9"}}>{form.email}</strong> within{" "}
        <strong style={{color:"#34d399"}}>24 hours</strong>.<br/><br/>
        The formulation will also be added to ChemForm Pro for all users.
      </div>
      <button onClick={()=>{setPayStep("form");setForm(f=>({...f,name:"",category:"",application:"",requirements:""}));}}
        style={{marginTop:22,background:"#1e293b",border:"none",color:"#94a3b8",fontWeight:700,fontSize:13,padding:"10px 24px",borderRadius:10,cursor:"pointer"}}>
        Submit Another Request
      </button>
    </div>
  );

  // ── Payment simulation overlay ──
  if(payStep==="payment"||payStep==="processing") return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",textAlign:"center",flex:1}}>
      <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:20,padding:28,maxWidth:380,width:"100%"}}>
        {payStep==="payment"&&<>
          <div style={{fontSize:36,marginBottom:10}}>💳</div>
          <div style={{color:"#f1f5f9",fontWeight:900,fontSize:17,marginBottom:4}}>Complete Payment</div>
          <div style={{color:"#64748b",fontSize:13,marginBottom:6}}>Custom formulation request for:</div>
          <div style={{color:"#f59e0b",fontWeight:700,fontSize:14,marginBottom:16}}>"{form.name}"</div>
          <div style={{color:"#f1f5f9",fontWeight:900,fontSize:30,marginBottom:4}}>{priceStr}</div>
          <div style={{color:"#475569",fontSize:12,marginBottom:20}}>one-time · response within 24h</div>

          {/* What you get */}
          <div style={{background:"#f59e0b11",border:"1px solid #f59e0b33",borderRadius:12,padding:14,marginBottom:18,textAlign:"left"}}>
            <div style={{color:"#f59e0b",fontWeight:700,fontSize:12,marginBottom:8}}>What you receive:</div>
            {["Complete formulation with ingredient %","Raw material costs (INR/kg)","Brief manufacturing process overview","Key performance parameters","Added to ChemForm Pro library"].map(i=>(
              <div key={i} style={{color:"#94a3b8",fontSize:11,marginBottom:4,display:"flex",gap:6}}><span style={{color:"#f59e0b"}}>✓</span>{i}</div>
            ))}
          </div>

          {/* Payment methods */}
          <div style={{textAlign:"left",marginBottom:18}}>
            <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Pay via</div>
            {(currency==="INR"
              ?["UPI / Google Pay / PhonePe","Net Banking","Credit / Debit Card","Paytm"]
              :["Credit / Debit Card","Apple Pay / Google Pay"]
            ).map(m=>(
              <div key={m} style={{background:"#1e293b",borderRadius:8,padding:"9px 12px",color:"#94a3b8",fontSize:12,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}
                onClick={()=>setPayStep("processing")}>
                <span>{m}</span>
                <span style={{color:"#475569",fontSize:10}}>{currency==="INR"?"via Razorpay":"via Stripe"} →</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:9}}>
            <button onClick={()=>setPayStep("form")} style={{flex:1,padding:"10px",background:"transparent",border:"1px solid #1e293b",borderRadius:10,color:"#475569",fontWeight:600,fontSize:12,cursor:"pointer"}}>← Back</button>
          </div>
          <div style={{color:"#334155",fontSize:10,marginTop:12}}>🔒 Secure · No card stored · One-time charge</div>

          {/* Upgrade nudge */}
          <div style={{borderTop:"1px solid #1e293b",marginTop:16,paddingTop:14}}>
            <div style={{color:"#475569",fontSize:11,marginBottom:8}}>Or get unlimited free requests with</div>
            <button onClick={()=>{setPayStep("form");onUpgrade("Unlimited formula requests included in Pro & Enterprise");}}
              style={{width:"100%",padding:"9px",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontWeight:700,fontSize:12,borderRadius:9,cursor:"pointer"}}>
              ✨ Upgrade to Pro — ₹2,399/mo → Unlimited requests
            </button>
          </div>
        </>}
        {payStep==="processing"&&<>
          <div style={{fontSize:36,marginBottom:14}}>⏳</div>
          <div style={{color:"#f1f5f9",fontWeight:700,fontSize:15,marginBottom:6}}>Processing payment...</div>
          <div style={{color:"#475569",fontSize:12,marginBottom:20}}>Please wait, do not close this window</div>
          <div style={{background:"#1e293b",borderRadius:99,height:5,overflow:"hidden"}}>
            <div style={{height:5,background:"linear-gradient(90deg,#f59e0b,#d97706)",borderRadius:99,animation:"progressBar 3s ease-in-out forwards"}}/>
          </div>
          <style>{`@keyframes progressBar{from{width:0%}to{width:100%}}`}</style>
        </>}
      </div>
    </div>
  );

  // ── Main form ──
  return(
    <div style={{maxWidth:600,margin:"0 auto",padding:"20px 16px"}}>

      {/* Access tier banner */}
      {isPaid?(
        <div style={{background:"#34d39911",border:"1px solid #34d39933",borderRadius:12,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>🎁</span>
          <div>
            <div style={{color:"#34d399",fontWeight:700,fontSize:13}}>Included in your {PLANS[planKey].name} plan</div>
            <div style={{color:"#475569",fontSize:11}}>Custom formulation requests are free for Pro & Enterprise users — unlimited.</div>
          </div>
        </div>
      ):(
        <div style={{background:"#f59e0b11",border:"1px solid #f59e0b33",borderRadius:12,padding:"12px 16px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
            <div>
              <div style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>Custom Formulation Request — {priceStr} per request</div>
              <div style={{color:"#475569",fontSize:11,marginTop:3}}>Free plan & Starter users pay {priceStr} per custom request. Pro & Enterprise get unlimited requests included.</div>
            </div>
            <button onClick={()=>onUpgrade("Unlimited custom formula requests (Pro & Enterprise)")}
              style={{background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontSize:10,fontWeight:700,padding:"5px 12px",borderRadius:7,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
              Upgrade for Free
            </button>
          </div>
          {/* Per-request value breakdown */}
          <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
            {["Complete formulation","RM cost breakdown","Process overview","Added to app library"].map(v=>(
              <div key={v} style={{background:"#f59e0b22",borderRadius:6,padding:"3px 8px",color:"#f59e0b",fontSize:10,fontWeight:600}}>✓ {v}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{textAlign:"center",marginBottom:22}}>
        <div style={{fontSize:32,marginBottom:6}}>📩</div>
        <div style={{color:"#f1f5f9",fontWeight:900,fontSize:19,marginBottom:5}}>Request a Custom Formulation</div>
        <div style={{color:"#64748b",fontSize:13,lineHeight:1.6}}>Can't find the formulation you need? Tell us exactly what you're looking for and our expert team will prepare it within 24 hours.</div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:13}}>
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Formulation Name / Product *</div>
          <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
            placeholder="e.g. Waterproof tile adhesive for swimming pools"
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Category *</div>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:form.category?"#f1f5f9":"#475569",fontSize:13,outline:"none"}}>
            <option value="">Select category...</option>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Application / End Use *</div>
          <input value={form.application} onChange={e=>setForm(f=>({...f,application:e.target.value}))}
            placeholder="e.g. Bonding ceramic tiles in wet areas, outdoor use"
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Performance Requirements & Target Cost <span style={{color:"#334155",fontWeight:400,textTransform:"none"}}>(recommended)</span></div>
          <textarea value={form.requirements} onChange={e=>setForm(f=>({...f,requirements:e.target.value}))}
            placeholder="e.g. Bond strength >1.5 MPa, waterproof, target cost ₹25/kg, IS:15477 C2TE compliant, no toxic raw materials..."
            rows={3} style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",resize:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Email to receive formulation *</div>
          <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
            placeholder="your@email.com"
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>

        {/* Submit button — changes label based on plan */}
        <button onClick={handleSubmit} disabled={!canFormFill}
          style={{padding:"14px",borderRadius:11,border:"none",
            background:!canFormFill?"#1e293b":isPaid?"linear-gradient(135deg,#34d399,#10b981)":"linear-gradient(135deg,#f59e0b,#d97706)",
            color:!canFormFill?"#475569":"#fff",fontWeight:800,fontSize:15,
            cursor:!canFormFill?"not-allowed":"pointer"}}>
          {!canFormFill
            ? "Fill all required fields to continue"
            : isPaid
            ? "📩 Submit Request — Free (included in your plan)"
            : `📩 Submit & Pay ${priceStr} →`}
        </button>

        <div style={{textAlign:"center",color:"#334155",fontSize:11}}>
          {isPaid
            ? "Unlimited requests included · Response within 24h · Formula added to ChemForm Pro"
            : `${priceStr} one-time · Response within 24h · Formula added to app for all users`}
        </div>
      </div>
    </div>
  );
}


// ─── Pharma Panel ─────────────────────────────────────────────────────────────
function PharmaPanel({planKey, currency, onUpgrade}){
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");
  const isPaid = planKey==="pro"||planKey==="enterprise"||planKey==="starter";

  const compounds = FORMULAS.pharma||[];
  const categories = ["All","ANTIVIRAL","ANTICANCER","CARDIOVASCULAR","CNS / NEUROLOGICAL","ANTIBIOTIC / ANTIMICROBIAL","ANTI-INFLAMMATORY / ANALGESIC","RESPIRATORY","DIABETES / METABOLIC","DERMATOLOGY","HORMONAL / ENDOCRINE","ANTIHISTAMINE / ALLERGY","GI / GASTROENTEROLOGY","LIPID LOWERING","UROLOGY","BONE / OSTEOPOROSIS","MIGRAINE","VITAMINS / SUPPLEMENTS"];

  const filtered = compounds.filter(f=>{
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filter==="All" || f.tags.includes(filter);
    return matchSearch && matchCat;
  });

  const handleSelect = (f) => {
    if(!isPaid && !f.free){ onUpgrade("Pharma API Formulations (Starter+)"); return; }
    setSelected(f);
  };

  const handleRequestQuote = () => {
    alert("Quote request sent! Our pharmaceutical team will contact you within 24 hours with the complete technical package including synthesis route, specifications, and regulatory documentation.");
  };

  return(
    <div style={{display:"flex",flex:1,minHeight:0,overflow:"hidden"}}>
      {/* Left list */}
      <div style={{width:260,borderRight:"1px solid #1e293b",overflowY:"auto",padding:10,flexShrink:0,display:"flex",flexDirection:"column"}}>
        <div style={{color:"#e879f9",fontWeight:800,fontSize:12,marginBottom:2}}>💊 Pharma API</div>
        <div style={{color:"#475569",fontSize:9,marginBottom:8}}>{compounds.length} Active Pharmaceutical Ingredients</div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search API..."
          style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:7,padding:"7px 10px",color:"#f1f5f9",fontSize:11,outline:"none",marginBottom:8}}/>
        <select value={filter} onChange={e=>setFilter(e.target.value)}
          style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:7,padding:"7px 10px",color:filter==="All"?"#64748b":"#e879f9",fontSize:10,outline:"none",marginBottom:8}}>
          {categories.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        {!isPaid&&(
          <div style={{background:"#e879f911",border:"1px solid #e879f922",borderRadius:7,padding:"6px 9px",marginBottom:8,fontSize:10,color:"#64748b"}}>
            🔒 {compounds.filter(f=>!f.free).length} compounds locked · <span onClick={()=>onUpgrade("Pharma API Library")} style={{color:"#e879f9",cursor:"pointer",fontWeight:700}}>Unlock all</span>
          </div>
        )}
        <div style={{flex:1,overflowY:"auto"}}>
          {filtered.map(f=>{
            const locked=!isPaid&&!f.free;
            return(
              <div key={f.id} onClick={()=>handleSelect(f)} style={{background:selected?.id===f.id?"#1a0a2e":"#0a0f1e",border:`1px solid ${selected?.id===f.id?"#e879f9":"#1e293b"}`,borderRadius:10,padding:"9px 10px",cursor:"pointer",marginBottom:5,opacity:locked?0.5:1,transition:"all 0.2s"}}>
                <div style={{color:"#f1f5f9",fontWeight:700,fontSize:11,marginBottom:2}}>{locked?"🔒 ":""}{f.name}</div>
                <div style={{color:"#475569",fontSize:9,lineHeight:1.3}}>{f.sub}</div>
                <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
                  {f.tags.slice(0,1).map(t=><span key={t} style={{background:"#e879f922",color:"#e879f9",border:"1px solid #e879f944",borderRadius:99,fontSize:8,fontWeight:700,padding:"1px 6px",letterSpacing:"0.05em",textTransform:"uppercase"}}>{t}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right detail */}
      <div style={{flex:1,overflowY:"auto",padding:20}}>
        {!selected&&(
          <div style={{textAlign:"center",padding:"60px 20px",color:"#475569"}}>
            <div style={{fontSize:44,marginBottom:12}}>💊</div>
            <div style={{fontSize:15,fontWeight:700,color:"#64748b"}}>Select an API compound</div>
            <div style={{fontSize:11,marginTop:5,color:"#334155"}}>{compounds.length} Active Pharmaceutical Ingredients</div>
          </div>
        )}
        {selected&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{color:"#f1f5f9",fontSize:18,fontWeight:800,lineHeight:1.2}}>{selected.name}</div>
                <div style={{color:"#e879f9",fontSize:12,fontWeight:700,marginTop:3}}>{selected.sub}</div>
                <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
                  {selected.tags.map(t=><span key={t} style={{background:"#e879f922",color:"#e879f9",border:"1px solid #e879f944",borderRadius:99,fontSize:9,fontWeight:700,padding:"2px 7px",textTransform:"uppercase"}}>{t}</span>)}
                </div>
              </div>
              <div style={{width:46,height:46,borderRadius:23,border:"3px solid #e879f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💊</div>
            </div>

            {/* Description */}
            <div style={{background:"#e879f911",border:"1px solid #e879f933",borderRadius:12,padding:14,marginBottom:14}}>
              <div style={{color:"#e879f9",fontWeight:700,fontSize:11,marginBottom:5}}>Mechanism / Description</div>
              <div style={{color:"#94a3b8",fontSize:13,lineHeight:1.7}}>{selected.description}</div>
            </div>

            {/* What's in the paid package */}
            <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:12,padding:14,marginBottom:14}}>
              <div style={{color:"#f1f5f9",fontWeight:700,fontSize:13,marginBottom:10}}>📦 Complete Technical Package</div>
              {[
                {icon:"📋",title:"Formulation",desc:"Complete tablet/capsule/injectable formulation with excipients, grades, and percentages"},
                {icon:"⚗️",title:"Synthesis Route",desc:"Step-by-step synthesis process, reaction conditions, reagents, yields"},
                {icon:"📊",title:"Specifications",desc:"IP/BP/USP/EP specifications, assay, impurity limits, dissolution"},
                {icon:"🔬",title:"Analytical Methods",desc:"HPLC, dissolution, related substances, dissolution methods"},
                {icon:"📄",title:"Regulatory Docs",desc:"DMF reference, CEP status, ICH stability data overview"},
                {icon:"🏭",title:"Manufacturing Process",desc:"Batch manufacturing record template, in-process controls, equipment"},
              ].map(item=>(
                <div key={item.title} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10,padding:"9px 12px",background:"#060b14",borderRadius:9,border:"1px solid #1e293b"}}>
                  <span style={{fontSize:16,flexShrink:0}}>{item.icon}</span>
                  <div>
                    <div style={{color:"#cbd5e1",fontSize:12,fontWeight:700}}>{item.title}</div>
                    <div style={{color:"#475569",fontSize:11,marginTop:2,lineHeight:1.4}}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Process overview */}
            <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:12,padding:14,marginBottom:14}}>
              <div style={{color:"#94a3b8",fontSize:13,lineHeight:1.7}}>{selected.process}</div>
            </div>

            {/* CTA buttons */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {isPaid?(
                <>
                  <button onClick={handleRequestQuote} style={{width:"100%",padding:"13px",borderRadius:11,background:"linear-gradient(135deg,#e879f9,#a855f7)",border:"none",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>
                    📩 Request Complete Technical Package
                  </button>
                  <div style={{color:"#334155",fontSize:11,textAlign:"center"}}>Response within 24 hours · Included in your plan</div>
                </>
              ):(
                <>
                  <div style={{background:"#e879f911",border:"1px solid #e879f933",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                    <div style={{color:"#e879f9",fontWeight:700,fontSize:13,marginBottom:4}}>Unlock Full Technical Package</div>
                    <div style={{color:"#64748b",fontSize:11,marginBottom:12}}>Subscribe to access complete formulation, synthesis route, specifications, and analytical methods for all {compounds.length} APIs</div>
                    <button onClick={()=>onUpgrade("Full Pharma API Technical Package")} style={{padding:"10px 24px",borderRadius:9,background:"linear-gradient(135deg,#e879f9,#a855f7)",border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                      ✨ Upgrade to Access →
                    </button>
                  </div>
                  <div style={{color:"#334155",fontSize:10,textAlign:"center"}}>Or pay ₹499 per compound → Request a Quote</div>
                  <button onClick={handleRequestQuote} style={{width:"100%",padding:"11px",borderRadius:10,border:"1px solid #e879f9",background:"transparent",color:"#e879f9",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                    📩 Pay ₹499 — Request This Compound Package
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Banner Ad ────────────────────────────────────────────────────────────
function BannerAd({onUpgrade}){
  const [i,setI]=useState(0);
  const ads=[
    {b:"BASF India",t:"Acronal® & Lutensol® — premium raw materials for coatings"},
    {b:"Amazon Business",t:"Lab equipment & chemicals — bulk pricing, GST invoice"},
    {b:"Dow Chemical India",t:"WALOCEL™ cellulosics for drymix & construction"},
    {b:"Merck India",t:"High purity chemicals for R&D, pilot and scale-up"},
    {b:"Flipkart Business",t:"Industrial supplies & packaging at wholesale rates"},
    {b:"Pidilite Industries",t:"Specialty chemicals & raw materials for formulators"},
  ];
  useEffect(()=>{ const t=setInterval(()=>setI(x=>(x+1)%ads.length),5000); return()=>clearInterval(t); },[]);
  return(
    <div style={{borderTop:"1px solid #1e293b",background:"#060b14",padding:"6px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
        <span style={{background:"#1e293b",color:"#475569",fontSize:8,fontWeight:700,padding:"2px 4px",borderRadius:3,letterSpacing:"0.08em",flexShrink:0}}>AD</span>
        <span style={{color:"#64748b",fontSize:10,fontWeight:700,flexShrink:0}}>{ads[i].b}</span>
        <span style={{color:"#334155",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ads[i].t}</span>
      </div>
      <button onClick={onUpgrade} style={{background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontSize:10,padding:"4px 9px",borderRadius:5,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>Remove Ads ✨</button>
    </div>
  );
}

// ─── ChemEng Panel ────────────────────────────────────────────────────────
function ChemEngPanel({planKey, currency}){
  const [sel,setSel]=useState(null);
  const [reqSent,setReqSent]=useState({});
  if(planKey!=="enterprise") return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"50px 24px",textAlign:"center",flex:1}}>
      <div style={{fontSize:44,marginBottom:12}}>⚗️</div>
      <div style={{color:"#fb923c",fontWeight:900,fontSize:18,marginBottom:8}}>ChemEng Pro</div>
      <div style={{color:"#64748b",fontSize:13,lineHeight:1.7,maxWidth:360,marginBottom:16}}>Industrial chemical manufacturing processes — emulsion polymerisation, cellulose ethers, fermentation, resin synthesis and more.<br/><br/><strong style={{color:"#94a3b8"}}>Enterprise plan exclusive.</strong></div>
    </div>
  );
  return(
    <div style={{display:"flex",flex:1,minHeight:0,overflow:"hidden"}}>
      <div style={{width:255,borderRight:"1px solid #1e293b",overflowY:"auto",padding:11,flexShrink:0}}>
        <div style={{color:"#fb923c",fontWeight:800,fontSize:12,marginBottom:2}}>⚗️ ChemEng Pro</div>
        <div style={{color:"#475569",fontSize:9,marginBottom:10}}>Enterprise · Industrial processes</div>
        {FORMULAS.chemeng.map(f=>(
          <div key={f.id} onClick={()=>setSel(f)} style={{background:sel?.id===f.id?"#0f172a":"#0a0f1e",border:`1px solid ${sel?.id===f.id?"#fb923c":"#1e293b"}`,borderRadius:10,padding:"10px 11px",cursor:"pointer",marginBottom:6,transition:"all 0.2s"}}>
            <div style={{color:"#f1f5f9",fontWeight:700,fontSize:11,marginBottom:2}}>{f.name}</div>
            <div style={{color:"#475569",fontSize:9,marginBottom:4}}>{f.sub}</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{f.tags.slice(0,2).map(t=><Pill key={t} label={t} color="#fb923c"/>)}</div>
          </div>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:18}}>
        {!sel&&<div style={{textAlign:"center",padding:"60px 20px",color:"#475569"}}><div style={{fontSize:40,marginBottom:10}}>⚗️</div><div style={{fontSize:14,fontWeight:700,color:"#64748b"}}>Select a chemical process</div></div>}
        {sel&&(
          <div>
            <div style={{color:"#f1f5f9",fontSize:17,fontWeight:800,marginBottom:2}}>{sel.name}</div>
            <div style={{color:"#64748b",fontSize:11,marginBottom:9}}>{sel.sub}</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:12}}>{sel.tags.map(t=><Pill key={t} label={t} color="#fb923c"/>)}</div>
            <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Feedstocks / Raw Materials</div>
            {sel.ingredients.filter(i=>i.p>0).map((ing,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 11px",background:"#0a0f1e",borderRadius:8,marginBottom:4,border:"1px solid #1e293b"}}>
                <span style={{color:"#cbd5e1",fontSize:12}}>{ing.n}</span>
                <div style={{display:"flex",gap:9}}>
                  <span style={{color:"#fb923c",fontWeight:700,fontSize:11}}>{ing.p}%</span>
                  <span style={{color:"#475569",fontSize:10}}>₹{ing.c}/kg</span>
                </div>
              </div>
            ))}
            <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8,marginTop:14}}>Process Steps</div>
            {sel.process?.map((step,i)=>(
              <div key={i} style={{display:"flex",gap:9,marginBottom:7,padding:"8px 11px",background:"#0a0f1e",borderRadius:9,border:"1px solid #1e293b"}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:"#fb923c22",border:"1px solid #fb923c44",display:"flex",alignItems:"center",justifyContent:"center",color:"#fb923c",fontSize:9,fontWeight:800,flexShrink:0}}>{i+1}</div>
                <div style={{color:"#94a3b8",fontSize:12,lineHeight:1.6}}>{step}</div>
              </div>
            ))}
            <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8,marginTop:14}}>Key Equipment</div>
            {sel.equipment?.map((eq,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:5,padding:"7px 11px",background:"#0a0f1e",borderRadius:8,border:"1px solid #1e293b"}}>
                <span style={{fontSize:12}}>⚙️</span><span style={{color:"#cbd5e1",fontSize:12}}>{eq}</span>
              </div>
            ))}
            <div style={{marginTop:18}}>
              <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Engineering Services — Request a Quote</div>
              {[
                {key:"basic",label:"📄 Basic Engineering",desc:"PFD, equipment list, cost estimate ±30%",color:"#4f9cf9"},
                {key:"detailed",label:"🔬 Detailed Engineering",desc:"P&ID, datasheets, HAZOP, procurement",color:"#a78bfa"},
                {key:"plant",label:"🏭 Full Plant Setup",desc:"Turnkey design, vendor selection, commissioning",color:"#fb923c"},
              ].map(svc=>(
                <div key={svc.key} style={{background:svc.color+"11",border:`1px solid ${svc.color}33`,borderRadius:10,padding:12,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                  <div>
                    <div style={{color:svc.color,fontWeight:700,fontSize:12}}>{svc.label}</div>
                    <div style={{color:"#475569",fontSize:10,marginTop:2}}>{svc.desc}</div>
                  </div>
                  <button onClick={()=>setReqSent(r=>({...r,[sel.id+svc.key]:true}))} style={{background:reqSent[sel.id+svc.key]?"#34d399":svc.color,border:"none",color:"#fff",fontWeight:700,fontSize:10,padding:"6px 12px",borderRadius:7,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    {reqSent[sel.id+svc.key]?"✅ Sent":"Request Quote"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [planKey,setPlanKey]=useState("free");
  const [currency,setCurrency]=useState("INR");
  const [catId,setCatId]=useState("drymix");
  const [selected,setSelected]=useState(null);
  const [rightTab,setRightTab]=useState("formula");
  const [search,setSearch]=useState("");
  const [showPricing,setShowPricing]=useState(false);
  const [paywallMsg,setPaywallMsg]=useState(null);
  const [usage,setUsage]=useState({ai:0,process:0,equipment:0});
  const [paymentPortal,setPaymentPortal]=useState(null); // {plan, currency}

  const plan=PLANS[planKey];
  const isChemEng=catId==="chemeng";
  const isRequest=catId==="request";
  const isPharma=catId==="pharma";
  const priority=user?INDUSTRY_PRIORITY[user.industry]||[]:[];

  const handleLogin=useCallback((u)=>{
    setUser(u);
    if(INDUSTRY_PRIORITY[u.industry]?.[0]) setCatId(INDUSTRY_PRIORITY[u.industry][0]);
  },[]);

  const allFormulas=FORMULAS[catId]||[];
  const cat=CATEGORIES.find(c=>c.id===catId);
  const catColor=cat?.color||"#4f9cf9";

  const handleSelect=(f)=>{
    if(planKey==="free"&&!f.free){setPaywallMsg("Full Formula Library (Starter+)");return;}
    setSelected(f); setRightTab("formula");
  };

  const handleUpgrade=(msg)=>{ setPaywallMsg(msg||null); setShowPricing(true); };

  const handleSelectPlan=(key,planObj)=>{
    if(key==="free"){ setPlanKey("free"); setShowPricing(false); setPaywallMsg(null); return; }
    // Show payment portal for paid plans
    setShowPricing(false);
    setPaymentPortal({plan:planObj, key});
  };

  const handlePaymentSuccess=()=>{
    setPlanKey(paymentPortal.key);
    setUsage({ai:0,process:0,equipment:0});
    setPaymentPortal(null);
    setPaywallMsg(null);
  };

  const useQuota=(type)=>setUsage(u=>({...u,[type]:u[type]+1}));

  if(!user) return <LoginScreen onLogin={handleLogin}/>;

  return(
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif",background:"#060b14",height:"100vh",color:"#f1f5f9",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:7px;height:7px}
        ::-webkit-scrollbar-track{background:#0d1626}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:4px;border:1px solid #0d1626}
        ::-webkit-scrollbar-thumb:hover{background:#475569}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        input,select,button{font-family:inherit}
      `}</style>

      {/* Payment Portal */}
      {paymentPortal&&<PaymentPortal plan={paymentPortal.plan} currency={currency} onSuccess={handlePaymentSuccess} onCancel={()=>setPaymentPortal(null)}/>}

      {/* Pricing Modal */}
      {showPricing&&!paymentPortal&&<PricingModal onClose={()=>{setShowPricing(false);setPaywallMsg(null);}} currency={currency} onSelectPlan={handleSelectPlan}/>}

      {/* Paywall prompt */}
      {paywallMsg&&!showPricing&&!paymentPortal&&(
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:18,padding:24,maxWidth:300,width:"90%",textAlign:"center"}}>
            <div style={{fontSize:34,marginBottom:9}}>🔒</div>
            <div style={{color:"#f1f5f9",fontWeight:800,fontSize:15,marginBottom:6}}>Premium Feature</div>
            <div style={{color:"#64748b",fontSize:12,lineHeight:1.6,marginBottom:16}}><strong style={{color:"#94a3b8"}}>{paywallMsg}</strong></div>
            <button onClick={()=>setShowPricing(true)} style={{width:"100%",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontWeight:800,fontSize:13,padding:"11px",borderRadius:10,cursor:"pointer",marginBottom:8}}>View Plans & Upgrade</button>
            <button onClick={()=>setPaywallMsg(null)} style={{width:"100%",background:"transparent",border:"1px solid #1e293b",color:"#475569",fontWeight:600,fontSize:12,padding:"8px",borderRadius:10,cursor:"pointer"}}>← Go Back</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{borderBottom:"1px solid #1e293b",padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#060b14",flexShrink:0,gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>⚗</div>
          <div>
            <div style={{fontWeight:900,fontSize:13}}>ChemForm <span style={{color:"#4f9cf9"}}>Pro</span></div>
            <div style={{fontSize:8,color:"#475569",textTransform:"uppercase",letterSpacing:"0.04em"}}>{user.name} · {INDUSTRIES.find(i=>i.id===user.industry)?.label}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:5,flex:1,justifyContent:"center",flexWrap:"wrap"}}>
          <QBadge used={usage.ai} limit={plan.ai} label="AI" color="#4f9cf9"/>
          {planKey!=="free"&&<QBadge used={usage.process} limit={plan.process} label="Process" color="#34d399"/>}
          {planKey!=="free"&&<QBadge used={usage.equipment} limit={plan.equipment} label="Equip" color="#e8a838"/>}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
          <div style={{display:"flex",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:6,overflow:"hidden"}}>
            {["INR","USD"].map(c=>(
              <button key={c} onClick={()=>setCurrency(c)} style={{padding:"4px 9px",border:"none",background:currency===c?"#1e293b":"transparent",color:currency===c?"#f1f5f9":"#475569",fontSize:10,fontWeight:700,cursor:"pointer"}}>{c==="INR"?"₹ INR":"$ USD"}</button>
            ))}
          </div>
          <button onClick={()=>setShowPricing(true)} style={{background:planKey==="free"?"linear-gradient(135deg,#4f9cf9,#a78bfa)":"transparent",border:`1px solid ${plan.color}`,color:planKey==="free"?"#fff":plan.color,fontSize:10,fontWeight:800,padding:"5px 11px",borderRadius:6,cursor:"pointer"}}>
            {planKey==="free"?"✨ Upgrade":`● ${plan.name}`}
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{display:"flex",borderBottom:"1px solid #1e293b",background:"#060b14",flexShrink:0,overflowX:"auto"}}>
        {CATEGORIES.map(c=>(
          <button key={c.id} onClick={()=>{setCatId(c.id);setSelected(null);setSearch("");}} style={{padding:"8px 12px",border:"none",background:"none",cursor:"pointer",color:catId===c.id?c.color:"#475569",borderBottom:`2px solid ${catId===c.id?c.color:"transparent"}`,fontWeight:catId===c.id?700:500,fontSize:10,transition:"all 0.2s",marginBottom:-1,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:3}}>
            {c.icon} {c.label}
            {c.enterprise&&<span style={{background:"#fb923c22",color:"#fb923c",fontSize:7,fontWeight:800,padding:"1px 4px",borderRadius:3}}>ENT</span>}
            {c.paid&&<span style={{background:"#e879f922",color:"#e879f9",fontSize:7,fontWeight:800,padding:"1px 4px",borderRadius:3}}>PRO</span>}
            {c.special&&<span style={{background:"#f59e0b22",color:"#f59e0b",fontSize:7,fontWeight:800,padding:"1px 4px",borderRadius:3}}>NEW</span>}
            {priority.includes(c.id)&&!c.enterprise&&!c.special&&<span style={{background:"#34d39922",color:"#34d399",fontSize:7,fontWeight:800,padding:"1px 4px",borderRadius:3}}>★</span>}
          </button>
        ))}
      </div>

      {/* Body */}
      {isRequest?(
        <div style={{flex:1,overflowY:"auto"}}>
          <RequestFormula user={user} planKey={planKey} currency={currency} onUpgrade={handleUpgrade}/>
        </div>
      ):isPharma?(
        <div style={{flex:1,display:"flex",minHeight:0,overflow:"hidden"}}>
          <PharmaPanel planKey={planKey} currency={currency} onUpgrade={handleUpgrade}/>
        </div>
      ):isChemEng?(
        <div style={{flex:1,display:"flex",minHeight:0,overflow:"hidden"}}>
          <ChemEngPanel planKey={planKey} currency={currency}/>
        </div>
      ):(
        <div style={{display:"flex",flex:1,minHeight:0,overflow:"hidden"}}>
          <div style={{width:252,borderRight:"1px solid #1e293b",overflowY:"auto",padding:10,flexShrink:0,display:"flex",flexDirection:"column"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`🔍  Search ${cat?.label||""}...`}
              style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:7,padding:"7px 10px",color:"#f1f5f9",fontSize:11,outline:"none",marginBottom:8}}/>
            {planKey==="free"&&(
              <div style={{background:catColor+"11",border:`1px solid ${catColor}22`,borderRadius:7,padding:"6px 9px",marginBottom:8,fontSize:10,color:"#475569"}}>
                🔒 {allFormulas.filter(f=>!f.free).length} locked · <span onClick={()=>handleUpgrade()} style={{color:catColor,cursor:"pointer",fontWeight:700}}>Unlock all formulas</span>
              </div>
            )}
            <div style={{flex:1,overflowY:"auto"}}>
              {allFormulas.filter(f=>!search||(f.name.toLowerCase().includes(search.toLowerCase())||f.sub?.toLowerCase().includes(search.toLowerCase()))).map(f=>{
                const locked=planKey==="free"&&!f.free;
                const costINR=f.ingredients.reduce((t,i)=>t+(i.p/100)*i.c,0);
                return(
                  <div key={f.id} onClick={()=>handleSelect(f)} style={{background:selected?.id===f.id?"#0f172a":"#0a0f1e",border:`1px solid ${selected?.id===f.id?catColor:"#1e293b"}`,borderRadius:10,padding:"10px 11px",cursor:"pointer",marginBottom:6,opacity:locked?0.5:1,transition:"all 0.2s",boxShadow:selected?.id===f.id?`0 0 12px ${catColor}33`:"none"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{minWidth:0,marginRight:5}}>
                        <div style={{color:"#f1f5f9",fontWeight:700,fontSize:11,marginBottom:1}}>{locked?"🔒 ":""}{f.name}</div>
                        <div style={{color:"#475569",fontSize:9,marginBottom:4,lineHeight:1.3}}>{f.sub}</div>
                        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{f.tags.slice(0,2).map(t=><Pill key={t} label={t} color={catColor}/>)}</div>
                      </div>
                      <Ring score={f.score} size={37}/>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:6}}>
                      <span style={{color:"#64748b",fontSize:9}}>💰 <span style={{color:"#94a3b8"}}>{fmtCur(costINR,currency)}/kg</span></span>
                      <span style={{color:"#64748b",fontSize:9}}>🧪 <span style={{color:"#94a3b8"}}>{f.ingredients.length} ingr.</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,minWidth:0}}>
            <div style={{borderBottom:"1px solid #1e293b",display:"flex",padding:"0 12px",background:"#060b14",flexShrink:0}}>
              {[{id:"formula",l:"📋 Formula"},{id:"optimizer",l:"🤖 AI Optimize"},{id:"batch",l:"⚖️ Batch Calc"}].map(t=>(
                <button key={t.id} onClick={()=>setRightTab(t.id)} style={{padding:"8px 12px",border:"none",background:"none",cursor:"pointer",color:rightTab===t.id?"#4f9cf9":"#475569",borderBottom:`2px solid ${rightTab===t.id?"#4f9cf9":"transparent"}`,fontWeight:rightTab===t.id?700:500,fontSize:11,transition:"all 0.2s",marginBottom:-1,whiteSpace:"nowrap"}}>{t.l}</button>
              ))}
            </div>
            <div style={{flex:1,overflowY:"auto",padding:16,minWidth:0}}>
              {!selected&&(
                <div style={{textAlign:"center",padding:"60px 20px",color:"#475569"}}>
                  <div style={{fontSize:40,marginBottom:10}}>{cat?.icon||"⚗️"}</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#64748b"}}>Select a formula</div>
                  <div style={{fontSize:11,marginTop:5,color:"#334155"}}>{allFormulas.length} formulas · {allFormulas.filter(f=>f.free).length} free</div>
                  {priority.includes(catId)&&<div style={{color:"#34d399",fontSize:11,marginTop:4}}>★ Priority category for your industry</div>}
                </div>
              )}
              {selected&&rightTab==="formula"&&<FormulaDetail formula={selected} currency={currency} planKey={planKey} usage={usage} onUseQuota={useQuota} onUpgrade={handleUpgrade}/>}
              {selected&&rightTab==="optimizer"&&<AIOptimizer formula={selected} planKey={planKey} currency={currency} usage={usage} onUseQuota={useQuota} onUpgrade={handleUpgrade}/>}
              {selected&&rightTab==="batch"&&<BatchCalc formula={selected} currency={currency}/>}
            </div>
          </div>
        </div>
      )}

      {planKey==="free"&&<BannerAd onUpgrade={()=>handleUpgrade()}/>}
    </div>
  );
}
